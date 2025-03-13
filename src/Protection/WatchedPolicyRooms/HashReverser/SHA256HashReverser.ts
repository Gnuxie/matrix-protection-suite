/**
 * The purpose of the hash reverser is to implement the PolicyListRevisionIssuer interface by taking another PolicyListRevision,
 * and matching the HashedLiteral policies against known entities, and issuing new policies that
 * have a plain text literal instead of a hash.
 */

import { StringRoomID } from '@the-draupnir-project/matrix-basic-types';
import {
  HashedLiteralPolicyRule,
  LiteralPolicyRule,
  makeReversedHashedPolicy,
  PolicyRuleMatchType,
} from '../../../PolicyList/PolicyRule';
import {
  PolicyListRevisionIssuer,
  RevisionListener,
} from '../../../PolicyList/PolicyListRevisionIssuer';
import { PolicyListRevision } from '../../../PolicyList/PolicyListRevision';
import { PolicyRuleChange } from '../../../PolicyList/PolicyRuleChange';
import EventEmitter from 'events';
import { isError, Ok, Result } from '@gnuxie/typescript-result';
import { PolicyRuleType } from '../../../MatrixTypes/PolicyEvents';
import { StandardPolicyListRevision } from '../../../PolicyList/StandardPolicyListRevision';
import { SimpleChangeType } from '../../../Interface/SimpleChangeType';
import { Logger } from '../../../Logging/Logger';
import { Task } from '../../../Interface/Task';

const log = new Logger('SHA256RoomHashReverser');

/** What are the situations we need to consider for a reverser that targets rooms?
 * 1. When new room policies are created, we need to check that hash against known room hashes
 * 2. When a new room is discovered, we need to check the room hash against known all room policy hashes
 * 3. We need to inform the reverser when policies are modified or removed.
 */

/**
 * This is all very much something that can be handled just be speciifc modules
 * implementing the PolicyListRevisionIssuer interface.
 *
 * We need to consider a programmatic way of adding issuers to the WatchedPolicyRooms
 * in a way where they can have a circular dependency on the issuer produced by
 * the WatchedPolicyRooms.
 */

export type SHA256RoomHashListener = (
  roomID: StringRoomID,
  hash: string
) => void;

export type RoomHashRecord = { room_id: StringRoomID; sha256: string };

export interface SHA256RoomHashStore {
  on(event: 'RoomHash', listener: SHA256RoomHashListener): this;
  off(event: 'RoomHash', listener: SHA256RoomHashListener): this;
  findRoomHash(hash: string): Promise<Result<StringRoomID | undefined>>;
  reverseHashedRoomPolicies(
    policies: HashedLiteralPolicyRule[]
  ): Promise<Result<LiteralPolicyRule[]>>;
  storeUndiscoveredRooms(
    roomIDs: StringRoomID[]
  ): Promise<Result<RoomHashRecord[]>>;
}

export class SHA256RoomHashReverser
  extends EventEmitter
  implements PolicyListRevisionIssuer
{
  private constructor(
    public currentRevision: PolicyListRevision,
    private readonly parentIssuer: PolicyListRevisionIssuer,
    private readonly store: SHA256RoomHashStore
  ) {
    super();
    this.store.on('RoomHash', this.handleDiscoveredRoomHash);
    this.parentIssuer.on('revision', this.handlePolicyListRevision);
  }

  private readonly handleDiscoveredRoomHash: SHA256RoomHashListener = function (
    this: SHA256RoomHashReverser,
    roomID: StringRoomID,
    hash: string
  ) {
    const matchingPolicies = this.parentIssuer.currentRevision
      .allRulesOfType(PolicyRuleType.Room)
      .filter(
        (policy) =>
          policy.matchType === PolicyRuleMatchType.HashedLiteral &&
          policy.hashes['sha256'] === hash
      ) as HashedLiteralPolicyRule[];
    const reversedPolicies = matchingPolicies
      .map((policy) => makeReversedHashedPolicy(roomID, policy))
      .filter((policy) =>
        this.currentRevision.hasPolicy(policy.sourceEvent.event_id)
      );
    const changes = reversedPolicies.map(
      (policy) =>
        ({
          rule: policy,
          sender: policy.sourceEvent.sender,
          changeType: SimpleChangeType.Added,
          event: policy.sourceEvent,
        }) satisfies PolicyRuleChange
    );
    const previousRevision = this.currentRevision;
    this.currentRevision = this.currentRevision.reviseFromChanges(changes);
    this.emit('revision', this.currentRevision, changes, previousRevision);
  }.bind(this);

  private readonly handlePolicyListRevision: RevisionListener = function (
    this: SHA256RoomHashReverser,
    revision: PolicyListRevision,
    mixedChanges: PolicyRuleChange[]
  ) {
    void Task(
      (async () => {
        const addedPoliciesToCheck: HashedLiteralPolicyRule[] = [];
        for (const change of mixedChanges) {
          if (
            change.changeType === SimpleChangeType.Added &&
            change.rule.matchType === PolicyRuleMatchType.HashedLiteral
          ) {
            addedPoliciesToCheck.push(change.rule);
          }
        }
        const newlyReversedPolicies =
          await this.store.reverseHashedRoomPolicies(addedPoliciesToCheck);
        if (isError(newlyReversedPolicies)) {
          log.error(
            'Unable to reverse new policies',
            newlyReversedPolicies.error
          );
          return;
        }
        const changes: PolicyRuleChange[] = [];
        for (const policy of newlyReversedPolicies.ok) {
          changes.push({
            changeType: SimpleChangeType.Added,
            rule: policy,
            sender: policy.sourceEvent.sender,
            event: policy.sourceEvent,
          });
        }
        const upstreamHashedPolicyChanges = mixedChanges.filter(
          (change) =>
            change.rule.matchType === PolicyRuleMatchType.HashedLiteral
        );
        for (const change of upstreamHashedPolicyChanges) {
          if (
            change.changeType === SimpleChangeType.Modified ||
            change.changeType === SimpleChangeType.Removed
          ) {
            const reversedPolicy = this.currentRevision.getPolicy(
              change.event.event_id
            );
            if (reversedPolicy) {
              if (
                reversedPolicy.matchType === PolicyRuleMatchType.HashedLiteral
              ) {
                throw new TypeError(
                  "There shouldn't be any hashed policies in this revision"
                );
              }
              changes.push({
                ...change,
                rule: makeReversedHashedPolicy(
                  reversedPolicy.entity,
                  change.rule as HashedLiteralPolicyRule
                ),
              });
            }
          }
        }
        const previousRevision = this.currentRevision;
        this.currentRevision = previousRevision.reviseFromChanges(changes);
        this.emit('revision', this.currentRevision, changes, previousRevision);
      })()
    );
  }.bind(this);

  public async create(
    parentIssuer: PolicyListRevisionIssuer,
    store: SHA256RoomHashStore
  ): Promise<Result<SHA256RoomHashReverser>> {
    const initialReversedPolicies = await store.reverseHashedRoomPolicies(
      parentIssuer.currentRevision
        .allRulesOfType(PolicyRuleType.Room)
        .filter(
          (policy) => policy.matchType === PolicyRuleMatchType.HashedLiteral
        )
    );
    if (isError(initialReversedPolicies)) {
      return initialReversedPolicies.elaborate(
        'Unable to use the store to reverse any of the known hashed policies'
      );
    }
    const revision =
      StandardPolicyListRevision.blankRevision().reviseFromChanges(
        initialReversedPolicies.ok.map(
          (policy) =>
            ({
              changeType: SimpleChangeType.Added,
              event: policy.sourceEvent,
              rule: policy,
              sender: policy.sourceEvent.sender,
            }) satisfies PolicyRuleChange
        )
      );
    return Ok(new SHA256RoomHashReverser(revision, parentIssuer, store));
  }

  unregisterListeners(): void {
    this.store.off('RoomHash', this.handleDiscoveredRoomHash);
    this.parentIssuer.off('revision', this.handlePolicyListRevision);
  }
}
