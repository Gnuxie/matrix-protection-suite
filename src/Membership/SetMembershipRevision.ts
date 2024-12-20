// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import {
  Membership,
  MembershipChange,
  MembershipChangeType,
} from './MembershipChange';
import {
  StringRoomID,
  StringUserID,
} from '@the-draupnir-project/matrix-basic-types';
import { RoomMembershipRevision } from './MembershipRevision';
import { Map as PersistentMap, Set as PersistentSet } from 'immutable';

export enum SetMembershipKind {
  // incorporates knock, join, invite
  Present = 'present',
  // incorporates leave, ban, and never present
  Absent = 'absent',
}

export enum SetMembershipChangeType {
  BecamePresent = 'became_present',
  BecameAbsent = 'became_absent',
  NoOverallChange = 'no_overall_change',
}

export type SetMembershipChange = {
  userID: StringUserID;
  changeType: SetMembershipChangeType;
  roomsJoined: number;
  roomsLeft: number;
};

export interface SetMembershipRevision {
  /**
   * Revise from changes to a roomMembershipRevisionIssuer
   */
  reviseFromChanges(changes: MembershipChange[]): SetMembershipRevision;
  /**
   * Revise from a new room in the room set we are modelling.
   */
  reviseFromAddedRoom(
    roomMembershipRevision: RoomMembershipRevision
  ): SetMembershipRevision;
  /**
   * Revise from a room being removed from the room set we are modelling.
   */
  reviseFromRemovedRoom(
    roomMembershipRevision: RoomMembershipRevision
  ): SetMembershipRevision;
  presentMembers(): IterableIterator<StringUserID>;
  membershipForUser(userID: StringUserID): SetMembershipKind;
}

export class StandardSetMembershipRevision {
  constructor(
    private readonly memberships: PersistentMap<StringUserID, number>,
    private readonly internedRooms: PersistentSet<StringRoomID>
  ) {
    // nothing to do.
  }

  private getMembershipCount(userID: StringUserID): number {
    return this.memberships.get(userID, 0);
  }

  reviseFromChanges(changes: MembershipChange[]): SetMembershipRevision {
    if (!changes.every((change) => this.internedRooms.has(change.roomID))) {
      throw new TypeError(
        'Cannot revise from changes that do not all belong to the same room set.'
      );
    }
    return new StandardSetMembershipRevision(
      changes.reduce((memberships, change) => {
        switch (change.membershipChangeType) {
          case MembershipChangeType.Joined:
          case MembershipChangeType.Rejoined:
          case MembershipChangeType.Invited:
          case MembershipChangeType.Knocked:
          case MembershipChangeType.Reknocked:
            return memberships.set(
              change.userID,
              this.getMembershipCount(change.userID) + 1
            );
          case MembershipChangeType.Left:
          case MembershipChangeType.Kicked:
          case MembershipChangeType.Banned: {
            if (this.getMembershipCount(change.userID) === 1) {
              return memberships.delete(change.userID);
            } else {
              return memberships.set(
                change.userID,
                this.getMembershipCount(change.userID) - 1
              );
            }
          }
          default:
            return memberships;
        }
      }, this.memberships),
      this.internedRooms
    );
  }

  reviseFromAddedRoom(
    roomMembershipRevision: RoomMembershipRevision
  ): SetMembershipRevision {
    if (this.internedRooms.has(roomMembershipRevision.room.toRoomIDOrAlias())) {
      throw new TypeError(
        'Cannot revise from a room that is already in the room set.'
      );
    }
    let memberships = this.memberships;
    for (const member of roomMembershipRevision.members()) {
      switch (member.membership) {
        case Membership.Join:
        case Membership.Invite:
        case Membership.Knock:
          memberships = memberships.set(
            member.userID,
            (memberships.get(member.userID) ?? 0) + 1
          );
          break;
      }
    }
    return new StandardSetMembershipRevision(
      memberships,
      this.internedRooms.add(roomMembershipRevision.room.toRoomIDOrAlias())
    );
  }

  reviseFromRemovedRoom(
    roomMembershipRevision: RoomMembershipRevision
  ): SetMembershipRevision {
    let memberships = this.memberships;
    for (const member of roomMembershipRevision.members()) {
      switch (member.membership) {
        case Membership.Join:
        case Membership.Invite:
        case Membership.Knock: {
          if (memberships.get(member.userID) === 1) {
            memberships = memberships.delete(member.userID);
          } else {
            memberships = memberships.set(
              member.userID,
              (memberships.get(member.userID) ?? 0) - 1
            );
          }
        }
      }
    }
    return new StandardSetMembershipRevision(
      memberships,
      this.internedRooms.remove(roomMembershipRevision.room.toRoomIDOrAlias())
    );
  }

  membershipForUser(userID: StringUserID): SetMembershipKind {
    return this.getMembershipCount(userID) > 0
      ? SetMembershipKind.Present
      : SetMembershipKind.Absent;
  }

  presentMembers(): IterableIterator<StringUserID> {
    return this.memberships.keys();
  }
}
