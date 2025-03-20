/**
 * The purpose of the hash reverser is to implement the PolicyListRevisionIssuer interface by taking another PolicyListRevision,
 * and matching the HashedLiteral policies against known entities, and issuing new policies that
 * have a plain text literal instead of a hash.
 */

import {
  StringRoomID,
  StringUserID,
} from '@the-draupnir-project/matrix-basic-types';
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
import { reversePoliciesOfType } from './Reversal';

const log = new Logger('SHA256HashReverser');

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

export type RoomBasicDetails = {
  creator?: StringUserID | undefined;
  room_id: StringRoomID;
  name?: string | undefined;
  topic?: string | undefined;
  avatar?: string | undefined;
  joined_members?: number | undefined;
};

export type SHA256RerversedHashListener = (
  roomHashes: RoomHashRecord[],
  userHashes: UserHashRecord[],
  serverHashes: ServerHashRecord[]
) => void;

export type RoomHashRecord = { room_id: StringRoomID; sha256: string };
export type UserHashRecord = { user_id: StringUserID; sha256: string };
export type ServerHashRecord = { server_name: string; sha256: string };

export type HashedRoomDetails = {
  roomID: StringRoomID;
  creator: StringUserID;
  server: string;
};

/**
 * In the future, when the time comes that we need to reverse all known users,
 * we will probably need a component that just forwards "discovered" users
 * to a store. This would then be a dependency included in the SetMembershipRevision.
 * It will probably want to accept the entire SetMembershipRevision itself
 * for checking at startup. This is so that it can break up the amount of work
 * on the db by breaking up the query size. And then the revision will just forward updates
 * as it discovers users as normal.
 */
export type SHA256Base64FromEntity = (entity: string) => string;

export interface SHA256HashStore {
  on(event: 'ReversedHashes', listener: SHA256RerversedHashListener): this;
  off(event: 'ReversedHashes', listener: SHA256RerversedHashListener): this;
  findUserHash(hash: string): Promise<Result<StringUserID | undefined>>;
  findRoomHash(hash: string): Promise<Result<StringRoomID | undefined>>;
  findServerHash(hash: string): Promise<Result<string | undefined>>;
  reverseHashedPolicies(
    policies: HashedLiteralPolicyRule[]
  ): Promise<Result<LiteralPolicyRule[]>>;
  storeUndiscoveredRooms(
    roomIDs: StringRoomID[]
  ): Promise<Result<RoomHashRecord[]>>;
  // servers are covered by users and rooms for now.
  storeUndiscoveredUsers(
    userIDs: StringUserID[]
  ): Promise<Result<UserHashRecord[]>>;
  storeRoomIdentification(details: HashedRoomDetails): Promise<Result<void>>;
}

export class SHA256HashReverser
  extends EventEmitter
  implements PolicyListRevisionIssuer
{
  private constructor(
    public currentRevision: PolicyListRevision,
    private readonly parentIssuer: PolicyListRevisionIssuer,
    private readonly store: SHA256HashStore
  ) {
    super();
    this.store.on('ReversedHashes', this.handleDiscoveredHashes);
    this.parentIssuer.on('revision', this.handlePolicyListRevision);
  }

  private readonly handleDiscoveredHashes = (
    function (this: SHA256HashReverser, roomHashes, userHashes, serverHashes) {
      const reversedPolicies = [
        ...reversePoliciesOfType(
          roomHashes,
          (record: RoomHashRecord) => record.room_id,
          PolicyRuleType.Room,
          this.parentIssuer.currentRevision,
          this.currentRevision
        ),
        ...reversePoliciesOfType(
          userHashes,
          (record: UserHashRecord) => record.user_id,
          PolicyRuleType.User,
          this.parentIssuer.currentRevision,
          this.currentRevision
        ),
        ...reversePoliciesOfType(
          serverHashes,
          (record: ServerHashRecord) => record.server_name,
          PolicyRuleType.Server,
          this.parentIssuer.currentRevision,
          this.currentRevision
        ),
      ];
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
    } satisfies SHA256RerversedHashListener
  ).bind(this);

  private readonly handlePolicyListRevision: RevisionListener = function (
    this: SHA256HashReverser,
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
          await this.store.reverseHashedPolicies(addedPoliciesToCheck);
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
    store: SHA256HashStore
  ): Promise<Result<SHA256HashReverser>> {
    const initialReversedPolicies = await store.reverseHashedPolicies(
      parentIssuer.currentRevision
        .allRules()
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
    return Ok(new SHA256HashReverser(revision, parentIssuer, store));
  }

  unregisterListeners(): void {
    this.store.off('ReversedHashes', this.handleDiscoveredHashes);
    this.parentIssuer.off('revision', this.handlePolicyListRevision);
  }
}
