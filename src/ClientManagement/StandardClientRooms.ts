/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { ActionResult, isError } from '../Interface/Action';
import { Value } from '../Interface/Value';
import { RoomEvent } from '../MatrixTypes/Events';
import { MatrixRoomReference } from '../MatrixTypes/MatrixRoomReference';
import { MembershipEvent } from '../MatrixTypes/MembershipEvent';
import { StringRoomID, serverName } from '../MatrixTypes/StringlyTypedMatrix';
import { Membership } from '../StateTracking/MembershipChange';
import { RoomPauser, StandardRoomPauser } from './RoomPauser';
import { AbstractClientRooms, ClientRooms } from './ClientRooms';

export type JoinedRoomsSafe = () => Promise<ActionResult<StringRoomID[]>>;

/**
 * An implementation of `ClientRooms` that will work for both bots and appservice
 * intents.
 */
export class StandardClientRooms
  extends AbstractClientRooms
  implements ClientRooms
{
  private readonly roomPauser: RoomPauser = new StandardRoomPauser();
  protected constructor(
    private readonly joinedRoomsThunk: JoinedRoomsSafe,
    ...rest: ConstructorParameters<typeof AbstractClientRooms>
  ) {
    super(...rest);
  }

  public handleTimelineEvent(roomID: StringRoomID, event: RoomEvent): void {
    if (
      Value.Check(MembershipEvent, event) &&
      event.state_key === this.clientUserID
    ) {
      switch (event.content.membership) {
        case Membership.Join:
          if (this.isJoinedRoom(roomID)) {
            super.handleTimelineEvent(roomID, event);
          } else {
            this.handleRoomJoin(roomID, event);
          }
          break;
        case Membership.Leave:
          if (this.isJoinedRoom(roomID)) {
            this.handleRoomLeave(roomID, event);
          } else {
            this.handleTimelineEvent(roomID, event);
          }
          break;
      }
      return;
    } else if (this.isJoinedRoom(roomID)) {
      super.handleTimelineEvent(roomID, event);
    }
  }

  private handleRoomJoin(roomID: StringRoomID, event: RoomEvent): void {
    if (this.roomPauser.isRoomPaused(roomID)) {
      this.roomPauser.handleTimelineEventInPausedRoom(roomID, event);
    } else {
      this.handleRoomChange(roomID);
      this.roomPauser.handleTimelineEventInPausedRoom(roomID, event);
    }
  }

  private handleRoomLeave(roomID: StringRoomID, event: RoomEvent): void {
    if (this.roomPauser.isRoomPaused(roomID)) {
      this.roomPauser.handleTimelineEventInPausedRoom(roomID, event);
    } else {
      this.handleRoomChange(roomID);
      this.roomPauser.handleTimelineEventInPausedRoom(roomID, event);
    }
  }

  private handleRoomChange(roomID: StringRoomID): void {
    this.roomPauser.pauseRoom(
      roomID,
      async () => {
        const joinedRoomsResult = await this.joinedRoomsThunk();
        if (isError(joinedRoomsResult)) {
          throw joinedRoomsResult.error.addContext(
            `Unable to fetch joined_members when calculating joined rooms`
          );
        }
        const joinedRooms = joinedRoomsResult.ok;
        // We have to mark the room as joined before asking for the room state
        // otherwise appservices will not be able to find an intent to use
        // to fetch the sate with.
        const previousRevision = this.joinedRoomsRevision;
        this.joinedRoomsRevision =
          this.joinedRoomsRevision.reviseFromJoinedRooms(joinedRooms);
        const changes =
          this.joinedRoomsRevision.changesFromJoinedRooms(joinedRooms);
        this.emit(
          'revision',
          this.joinedRoomsRevision,
          changes,
          previousRevision
        );
        for (const join of changes.joined) {
          const roomStateRevisionIssuer =
            await this.roomStateManager.getRoomStateRevisionIssuer(
              MatrixRoomReference.fromRoomID(join, [
                serverName(this.clientUserID),
              ])
            );
          if (isError(roomStateRevisionIssuer)) {
            throw roomStateRevisionIssuer.error.addContext(
              `Unable to fetch the room state for a newly joined room`
            );
          }
        }
      },
      this.handleTimelineEvent.bind(this)
    );
  }
}
