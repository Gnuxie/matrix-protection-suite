/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import EventEmitter from 'events';
import { RoomEvent } from '../MatrixTypes/Events';
import { StringRoomID, StringUserID } from '../MatrixTypes/StringlyTypedMatrix';
import { JoinedRoomsChange, JoinedRoomsRevision } from './JoinedRoomsRevision';

export type JoinedRoomsRevisionListener = (
  revision: JoinedRoomsRevision,
  changes: JoinedRoomsChange,
  previousRevision: JoinedRoomsRevision
) => void;

/**
 * This is a utility to aid clients using the protection suite.
 * The idea being that if they create this utility, then they
 * only need to be responsible for setting up and informing
 * `JoinedRoomsRevisionIssuer` of events. Everything else will be handled for them.
 * In other words `JoinedRoomsRevisionIssuer` can be used to inform all protectedRoomSets,
 * and all room state manager deriratives of new events.
 *
 * Alternatively can be thought of as the "JoinedRoomsRevisionIssuerRevisionIssuer".
 */
export declare interface JoinedRoomsRevisionIssuer {
  /**
   * A room that is paused or will be parted from shortly will still temporarily report true.
   * Even if, in the case of parting, subsequent events will never be processed.
   * A room that is being joined, but is paused, will report true.
   * @param roomID The room to test whether the user is joined to.
   */
  isJoinedRoom(roomID: StringRoomID): boolean;
  readonly clientUserID: StringUserID;
  readonly currentRevision: JoinedRoomsRevision;
  handleTimelineEvent(roomID: StringRoomID, event: RoomEvent): void;
  on(event: 'revision', listener: JoinedRoomsRevisionListener): this;
  off(...args: Parameters<JoinedRoomsRevisionIssuer['on']>): this;
  emit(
    event: 'revision',
    ...args: Parameters<JoinedRoomsRevisionListener>
  ): boolean;
}

export abstract class AbstractJoinedRoomsRevisionIssuer extends EventEmitter {
  constructor(
    public readonly clientUserID: StringUserID,
    protected joinedRoomsRevision: JoinedRoomsRevision
  ) {
    super();
  }

  public get currentRevision() {
    return this.joinedRoomsRevision;
  }

  public isJoinedRoom(roomID: StringRoomID): boolean {
    return this.joinedRoomsRevision.isJoinedRoom(roomID);
  }
}
