// Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import EventEmitter from 'events';
import { SetRoomState } from './SetRoomState';
import {
  RoomStateManager,
  RoomStateRevision,
  RoomStateRevisionIssuer,
  StateRevisionListener,
} from './StateRevisionIssuer';
import { StringRoomID } from '../MatrixTypes/StringlyTypedMatrix';
import {
  ProtectedRoomChangeType,
  ProtectedRoomsChangeListener,
  ProtectedRoomsConfig,
} from '../Protection/ProtectedRoomsConfig/ProtectedRoomsConfig';
import { ActionResult, Ok, isError } from '../Interface/Action';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { Task } from '../Interface/Task';

export class StandardSetRoomState extends EventEmitter implements SetRoomState {
  private readonly issuers = new Map<StringRoomID, RoomStateRevisionIssuer>();

  private readonly revisionListener: StateRevisionListener<RoomStateRevision>;
  private readonly protectedRoomsChangeListener: ProtectedRoomsChangeListener;

  private constructor(
    private readonly roomStateManager: RoomStateManager,
    private readonly protectedRoomsConfig: ProtectedRoomsConfig
  ) {
    super();
    this.revisionListener = this.stateRevision.bind(this);
    this.protectedRoomsChangeListener = this.protectedRoomsListener.bind(this);
    this.protectedRoomsConfig.on('change', this.protectedRoomsChangeListener);
  }
  getRevision(room: StringRoomID): RoomStateRevision | undefined {
    return this.issuers.get(room)?.currentRevision;
  }

  public static async create(
    roomStateManager: RoomStateManager,
    protectedRoomsConfig: ProtectedRoomsConfig
  ): Promise<ActionResult<SetRoomState>> {
    const setMembership = new StandardSetRoomState(
      roomStateManager,
      protectedRoomsConfig
    );
    const results = await Promise.all(
      protectedRoomsConfig.allRooms.map((room) => setMembership.addRoom(room))
    );
    const failedResults = results.filter((result) => isError(result));
    if (failedResults.length > 0) {
      if (!isError(failedResults[1])) {
        // just make typescript happy.
        throw new TypeError('This is catastrophically wrong');
      }
      return failedResults[1];
    }
    return Ok(setMembership);
  }

  public async addRoom(room: MatrixRoomID): Promise<ActionResult<void>> {
    const issuerResult = await this.roomStateManager.getRoomStateRevisionIssuer(
      room
    );
    if (isError(issuerResult)) {
      return issuerResult;
    }
    this.issuers.set(room.toRoomIDOrAlias(), issuerResult.ok);
    issuerResult.ok.on('revision', this.revisionListener);
    return Ok(undefined);
  }
  public removeRoom(room: MatrixRoomID): void {
    const issuer = this.issuers.get(room.toRoomIDOrAlias());
    if (issuer === undefined) {
      return;
    }
    this.issuers.delete(room.toRoomIDOrAlias());
    issuer.off('revision', this.revisionListener);
  }
  public unregisterListeners(): void {
    for (const issuer of this.issuers.values()) {
      issuer.off('revision', this.revisionListener);
    }
    this.protectedRoomsConfig.off('change', this.protectedRoomsChangeListener);
  }
  public get allRooms(): RoomStateRevision[] {
    return [...this.issuers.values()].map((issuer) => issuer.currentRevision);
  }

  private stateRevision(
    ...[nextRevision, changes, previousRevision]: Parameters<
      StateRevisionListener<RoomStateRevision>
    >
  ) {
    this.emit(
      'membership',
      nextRevision.room.toRoomIDOrAlias(),
      nextRevision,
      changes,
      previousRevision
    );
  }

  private protectedRoomsListener(
    ...[room, changeType]: Parameters<ProtectedRoomsChangeListener>
  ): void {
    void Task(
      (async (): Promise<ActionResult<void>> => {
        return changeType === ProtectedRoomChangeType.Added
          ? await this.addRoom(room)
          : Ok(this.removeRoom(room));
      })()
    );
  }
}
