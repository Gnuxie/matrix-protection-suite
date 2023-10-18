/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { StringEventID } from '../MatrixTypes/StringlyTypedMatrix';
import { MembershipChange } from './MembershipChange';
import {
  MembershipRevision,
  RoomMembershipRevision,
} from './MembershipRevision';

export type MembershipRevisionListener<
  Revision extends MembershipRevision = MembershipRevision
> = (
  nextRevision: Revision,
  changes: MembershipChange[],
  previousRevision: Revision
) => void;

export declare interface MembershipRevisionIssuer {
  currentRevision: MembershipRevision;
  on(event: 'revision', listener: MembershipRevisionListener): this;
  off(...args: Parameters<MembershipRevisionIssuer['on']>): this;
  emit(
    event: 'revision',
    ...args: Parameters<MembershipRevisionListener>
  ): boolean;
  unregisterListeners(): void;
}

export declare interface RoomMembershipRevisionIssuer
  extends MembershipRevisionIssuer {
  currentRevision: RoomMembershipRevision;
  room: MatrixRoomID;
  updateForEvent({ event_id }: { event_id: StringEventID }): void;
  on(
    event: 'revision',
    listener: MembershipRevisionListener<RoomMembershipRevision>
  ): this;
  off(...args: Parameters<RoomMembershipRevisionIssuer['on']>): this;
  emit(
    event: 'revision',
    ...args: Parameters<MembershipRevisionListener<RoomMembershipRevision>>
  ): boolean;
}
