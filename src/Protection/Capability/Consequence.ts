// Copyright 2023 - 2024 Gnuxie <Gnuxie@protonmail.com>
// Copyright 2022 The Matrix.org Foundation C.I.C.
//
// SPDX-License-Identifier: AFL-3.0 AND Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from mjolnir
// https://github.com/matrix-org/mjolnir
// </text>

import { ActionResult } from '../../Interface/Action';
import { ServerACLContent } from '../../MatrixTypes/ServerACL';
import {
  StringEventID,
  StringRoomID,
  StringUserID,
} from '../../MatrixTypes/StringlyTypedMatrix';
import { PolicyListRevision } from '../../PolicyList/PolicyListRevision';
import { SetMembership } from '../../Membership/SetMembership';
import { ProtectedRoomsSet } from '../ProtectedRoomsSet';
import { CapabilityProvider } from './CapabilityProvider';
import { DescriptionMeta } from '../DescriptionMeta';

export const DEFAULT_CONSEQUENCE_PROVIDER = 'DefaultConsequenceProvider';

/**
 * We are string to draft out the consequence provider detail that will
 * put names to providers and then we can implement the draupnir
 * commands for adding configs with a little more ease.
 */

/**
 * This has to be provided to all protections, they can't configure it themselves.
 */
export interface BasicConsequenceProvider extends CapabilityProvider {
  consequenceForUserInRoom(
    protectionDescription: DescriptionMeta,
    roomID: StringRoomID,
    user: StringUserID,
    reason: string
  ): Promise<ActionResult<void>>;
  renderConsequenceForUserInRoom(
    protectionDescription: DescriptionMeta,
    roomID: StringRoomID,
    user: StringUserID,
    reason: string
  ): Promise<ActionResult<void>>;
  consequenceForUsersInRevision(
    protectionDescription: DescriptionMeta,
    membershipSet: SetMembership,
    revision: PolicyListRevision
  ): Promise<ActionResult<void>>;
  consequenceForServerInRoom(
    protectionDescription: DescriptionMeta,
    roomID: StringRoomID,
    serverName: string,
    reason: string
  ): Promise<ActionResult<void>>;
  consequenceForEvent(
    protectionDescription: DescriptionMeta,
    roomID: StringRoomID,
    eventID: StringEventID,
    reason: string
  ): Promise<ActionResult<void>>;
  consequenceForServerACL(
    protectionDescription: DescriptionMeta,
    content: ServerACLContent
  ): Promise<ActionResult<void>>;
  consequenceForServerACLInRoom(
    protectionDescription: DescriptionMeta,
    roomID: StringRoomID,
    content: ServerACLContent
  ): Promise<ActionResult<void>>;
  unbanUserFromRoomsInSet(
    protectionDescription: DescriptionMeta,
    userID: StringUserID,
    set: ProtectedRoomsSet
  ): Promise<ActionResult<void>>;
}
