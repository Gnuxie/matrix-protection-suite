/**
 * The purpose of the hash reverser is to implement the PolicyListRevisionIssuer interface by taking another PolicyListRevision,
 * and matching the HashedLiteral policies against known entities, and issuing new policies that
 * have a plain text literal instead of a hash.
 */

import {
  StringRoomID,
  StringServerName,
  StringUserID,
} from '@the-draupnir-project/matrix-basic-types';
import {
  HashedLiteralPolicyRule,
  LiteralPolicyRule,
  PolicyRuleMatchType,
} from '../../../PolicyList/PolicyRule';
import {
  PolicyRoomRevisionIssuer,
  RevisionListener,
} from '../../../PolicyList/PolicyListRevisionIssuer';
import { PolicyListRevision } from '../../../PolicyList/PolicyListRevision';
import {
  PolicyRuleChange,
  PolicyRuleChangeType,
} from '../../../PolicyList/PolicyRuleChange';
import EventEmitter from 'events';
import { isError, Result } from '@gnuxie/typescript-result';
import { PolicyRuleType } from '../../../MatrixTypes/PolicyEvents';
import { Logger } from '../../../Logging/Logger';
import { Task } from '../../../Interface/Task';
import { reversePoliciesOfType } from './Reversal';
import { StandardDirectPropagationPolicyListRevisionIssuer } from '../../DirectPropagationPolicyListRevisionIssuer';

const log = new Logger('SHA256HashReverser');

// FIXME: We need to think reversing...
// The issue is that on appservice draupnir, i'm not sure that it makes
// sense for the reverser to be duplicated and independent when the store isn't
// it will just mean there are duplicate policies for every policy room
// in common -- not good.
// So i'm thinking instead that the hash reverser work more closely with
// the PolicyRoomManager. To reverse policies directly in watched lists...
// that will cause some issues though. It will mean that -- ok it won't work
// because of the way that PolicyRoomRevisions intern policies...
// would it matter though? a reversed policy just replaces an existing one...
// We could special case that code....

// The second issue is --

// We should add this to the PolicyRoomManager.. it should hook directly
// into the revision process if it can and reverse policies in the background.
// we'd need to check that fetching revisions goes through a central piece
// and not a capability....

// OK that's not how it works.
// We need the hash reverser to accept policy room revision issuers
// And it needs to be able to watch their revisoins
// and it needs to also give the revision issuers reversed policies in return...
// probably by a method... that we normally expect the manager to call.

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
export type UserHashRecord = {
  user_id: StringUserID;
  sha256: string;
  server_name: StringServerName;
};
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
  emit(
    event: 'ReversedHashes',
    ...args: Parameters<SHA256RerversedHashListener>
  ): void;
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

/**
 * The hash reverser works against a hash store to reveal policies.
 * The way it does this is by taking the hashed literal rules from a policy list revision,
 * and comparing them against the store. When policies are revealed, the reverser
 * goes to the original policy revision sourcing the policy, and tells the store
 * that the policy is now revealed.
 *
 * The policy room revision then updates its cache to show a literal rule with the
 * plain text entity rather than the hashed literal rule.
 */
interface SHA256HashReverser {
  addPolicyRoomRevisionIssuer(issuer: PolicyRoomRevisionIssuer): void;
  unregisterListeners(): void;
}

export class StandardSHA256HashReverser
  extends EventEmitter
  implements SHA256HashReverser
{
  public readonly hashedPoliciesRevisionIssuer =
    new StandardDirectPropagationPolicyListRevisionIssuer([], function (
      change
    ) {
      if (change.rule.matchType === PolicyRuleMatchType.HashedLiteral) {
        return true;
        // We do this because we need to allow reversed policies through to remove hashed literals that
        // have been revealed, removed, or modified.
      } else if (change.rule.isReversedFromHashedPolicy) {
        return true;
      } else {
        return false;
      }
    });
  private readonly issuers = new Map<StringRoomID, PolicyRoomRevisionIssuer>();
  public constructor(private readonly store: SHA256HashStore) {
    super();
    this.store.on('ReversedHashes', this.handleDiscoveredHashes);
    this.hashedPoliciesRevisionIssuer.on(
      'revision',
      this.handlePolicyRoomRevision
    );
  }

  public addPolicyRoomRevisionIssuer(issuer: PolicyRoomRevisionIssuer): void {
    this.hashedPoliciesRevisionIssuer.addIssuer(issuer);
    this.issuers.set(issuer.room.toRoomIDOrAlias(), issuer);
    void Task(
      this.checkPoliciesAgainstStore(
        issuer.currentRevision
          .allRules()
          .filter(
            (policy) => policy.matchType === PolicyRuleMatchType.HashedLiteral
          )
      )
    );
  }

  private updateUpstreamWithRevealedPolicies(
    reversedPolicies: LiteralPolicyRule[]
  ): void {
    const policiesByPolicyRoom = new Map<StringRoomID, LiteralPolicyRule[]>();
    for (const policy of reversedPolicies) {
      const entry = policiesByPolicyRoom.get(policy.sourceEvent.room_id);
      if (entry === undefined) {
        policiesByPolicyRoom.set(policy.sourceEvent.room_id, [policy]);
      } else {
        entry.push(policy);
      }
    }
    for (const [roomID, policies] of policiesByPolicyRoom) {
      const issuer = this.issuers.get(roomID);
      if (issuer === undefined) {
        throw new TypeError('Somehow this revision issuer is out of sync');
      }
      issuer.updateForRevealedPolicies(policies);
    }
  }

  private readonly handleDiscoveredHashes = (
    function (
      this: StandardSHA256HashReverser,
      roomHashes,
      userHashes,
      serverHashes
    ) {
      const reversedPolicies = [
        ...reversePoliciesOfType(
          roomHashes,
          (record: RoomHashRecord) => record.room_id,
          PolicyRuleType.Room,
          this.hashedPoliciesRevisionIssuer.currentRevision
        ),
        ...reversePoliciesOfType(
          userHashes,
          (record: UserHashRecord) => record.user_id,
          PolicyRuleType.User,
          this.hashedPoliciesRevisionIssuer.currentRevision
        ),
        ...reversePoliciesOfType(
          serverHashes,
          (record: ServerHashRecord) => record.server_name,
          PolicyRuleType.Server,
          this.hashedPoliciesRevisionIssuer.currentRevision
        ),
      ];
      this.updateUpstreamWithRevealedPolicies(reversedPolicies);
    } satisfies SHA256RerversedHashListener
  ).bind(this);

  private readonly handlePolicyRoomRevision: RevisionListener = function (
    this: StandardSHA256HashReverser,
    revision: PolicyListRevision,
    mixedChanges: PolicyRuleChange[]
  ) {
    void Task(
      (async () => {
        const addedPoliciesToCheck: HashedLiteralPolicyRule[] = [];
        for (const change of mixedChanges) {
          if (
            change.changeType === PolicyRuleChangeType.Added &&
            change.rule.matchType === PolicyRuleMatchType.HashedLiteral
          ) {
            addedPoliciesToCheck.push(change.rule);
          }
        }
        await this.checkPoliciesAgainstStore(addedPoliciesToCheck);
      })()
    );
  }.bind(this);

  private async checkPoliciesAgainstStore(
    policies: HashedLiteralPolicyRule[]
  ): Promise<void> {
    const newlyReversedPolicies =
      await this.store.reverseHashedPolicies(policies);
    if (isError(newlyReversedPolicies)) {
      log.error('Unable to reverse new policies', newlyReversedPolicies.error);
      return;
    }
    this.updateUpstreamWithRevealedPolicies(newlyReversedPolicies.ok);
  }

  unregisterListeners(): void {
    this.store.off('ReversedHashes', this.handleDiscoveredHashes);
    this.hashedPoliciesRevisionIssuer.off(
      'revision',
      this.handlePolicyRoomRevision
    );
    this.hashedPoliciesRevisionIssuer.unregisterListeners();
  }
}
