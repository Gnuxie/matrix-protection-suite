/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { StaticDecode } from '@sinclair/typebox';
import {
  MembershipEvent,
  MembershipEventContent,
} from '../MatrixTypes/MembershipEvent';
import {
  StringEventID,
  StringRoomID,
  StringUserID,
} from '../MatrixTypes/StringlyTypedMatrix';

export enum Membership {
  Join = 'join',
  Invite = 'invite',
  Knock = 'knock',
  Leave = 'leave',
  Ban = 'ban',
}

export enum MembershipChangeType {
  /** A genuine join to the room. */
  Joined = 'joined',
  /** A join to the room when the user has recently left, was removed or banned.
   * This distinction exists because bridged users from IRC or XMPP will do this all the time.
   * And things like greeter bots would break.
   */
  Rejoined = 'rejoined',
  /** The user left the room by their own command. */
  Left = 'left',
  /** The user was kicked by another user. */
  Kicked = 'kicked',
  /** The user was banned by another user. */
  Banned = 'banned',
  /** The user was unbanned by another user. */
  Unbanned = 'unbanned',
  /** The user made a genuine knock on the room. */
  Knocked = 'knocked',
  /** The user renocked on the room after recently leaving @see {@link MembershipChangeType.Rejoin}. */
  Reknocked = 'renocked',
  /** The user was invited by another user. */
  Invited = 'invited',
  /** There was no change to the membership, but there may have been changes to their profile. */
  NoChange = 'no-change',
}

export function membershipChangeType(
  nextMembership: StaticDecode<typeof MembershipEvent>,
  previousMembershipContent?: MembershipEventContent
): MembershipChangeType {
  const previousMembership =
    previousMembershipContent?.membership ?? 'external';
  switch (nextMembership.content.membership) {
    case Membership.Join:
      switch (previousMembership) {
        case Membership.Join:
          return MembershipChangeType.NoChange;
        case Membership.Leave:
          return MembershipChangeType.Rejoined;
        default:
          return MembershipChangeType.Joined;
      }
    case Membership.Invite:
      switch (previousMembership) {
        case Membership.Invite:
          return MembershipChangeType.NoChange;
        default:
          return MembershipChangeType.Invited;
      }
    case Membership.Knock:
      switch (previousMembership) {
        case Membership.Leave:
          return MembershipChangeType.Reknocked;
        case Membership.Knock:
          return MembershipChangeType.NoChange;
        default:
          return MembershipChangeType.Knocked;
      }
    case Membership.Leave:
      switch (previousMembership) {
        case Membership.Join:
          if (nextMembership.sender === nextMembership.state_key) {
            return MembershipChangeType.Left;
          } else {
            return MembershipChangeType.Kicked;
          }
        case Membership.Ban:
          return MembershipChangeType.Unbanned;
        default:
          return MembershipChangeType.Kicked;
      }
    case Membership.Ban:
      return MembershipChangeType.Banned;
    default:
      throw new TypeError(
        `Unknown membership ${nextMembership.content.membership}`
      );
  }
}

export enum ProfileChangeType {
  InitialProfile = 'initial-profile',
  Displayname = 'displayname',
  Avatar = 'avatar',
  DisplaynameAndAvatar = 'displayname-and-avatar',
  NoChange = 'no-change',
}

export function profileChangeType(
  nextMembership: MembershipEvent,
  previousMembershipContent?: MembershipEventContent
): ProfileChangeType {
  if (previousMembershipContent === undefined) {
    return ProfileChangeType.InitialProfile;
  }
  const isDisplaynameNew =
    nextMembership.content.displayname !==
    previousMembershipContent.displayname;
  const isAvatarNew =
    nextMembership.content.avatar_url !== previousMembershipContent.avatar_url;
  if (isDisplaynameNew && isAvatarNew) {
    return ProfileChangeType.DisplaynameAndAvatar;
  }
  if (isDisplaynameNew) {
    return ProfileChangeType.Displayname;
  }
  if (isAvatarNew) {
    return ProfileChangeType.Avatar;
  }
  return ProfileChangeType.NoChange;
}

export class MembershipChange {
  constructor(
    public readonly userID: StringUserID,
    public readonly sender: StringUserID,
    public readonly roomID: StringRoomID,
    public readonly eventID: StringEventID,
    public readonly membership: 'join' | 'invite' | 'knock' | 'leave' | 'ban',
    public readonly membershipChangeType: MembershipChangeType,
    public readonly profileChangeType: ProfileChangeType,
    public readonly content: MembershipEventContent
  ) {
    // nothing to do.
  }
}
