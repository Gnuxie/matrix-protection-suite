/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { MembershipEventContent } from '../MatrixTypes/MembershipEvent';
import { StringRoomID, StringUserID } from '../MatrixTypes/StringlyTypedMatrix';

export enum Membership {
  Join = 'join',
  Invite = 'invite',
  Knock = 'knock',
  Leave = 'leave',
  Ban = 'ban',
}

export enum MembershipChangeType {
  FirstJoin = 'first-join',
  Rejoin = 'rejoin',
  Left = 'left',
  Kicked = 'kicked',
  Banned = 'banned',
  FirstKnock = 'fist-knock',
  Reknock = 'renock',
  Invited = 'invited',
  NoChange = 'no-change',
}

export enum ProfileChangeType {
  InitialProfile = 'initial-profile',
  Displayname = 'displayname',
  Avatar = 'avatar',
  DisplaynameAndAvatar = 'displayname-and-avatar',
  NoChange = 'no-change',
}

export class MembershipChange {
  constructor(
    public readonly userID: StringUserID,
    public readonly sender: StringUserID,
    public readonly roomID: StringRoomID,
    public readonly membership: Membership,
    public readonly membershipChangeType: MembershipChangeType,
    public readonly profileChangeType: ProfileChangeType,
    public readonly content: MembershipEventContent
  ) {
    // nothing to do.
  }
}
