/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { StaticDecode } from '@sinclair/typebox';
import { Value } from '../Interface/Value';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import {
  MembershipEvent,
  MembershipEventContent,
} from '../MatrixTypes/MembershipEvent';
import {
  StringEventID,
  StringUserID,
} from '../MatrixTypes/StringlyTypedMatrix';
import {
  MembershipChange,
  membershipChangeType,
  profileChangeType,
} from './MembershipChange';
import { RoomMembershipRevision } from './MembershipRevision';
import { Map as PersistentMap } from 'immutable';
import { Logger } from '../Logging/Logger';

const log = new Logger('StandardRoomMembershipRevision');

type MembershipByUserID = PersistentMap<StringUserID, MembershipChange>;

type MembershipByEventID = PersistentMap<StringEventID, MembershipChange>;

export class StandardRoomMembershipRevision implements RoomMembershipRevision {
  private constructor(
    public readonly room: MatrixRoomID,
    public readonly membershipByUserID: MembershipByUserID,
    public readonly membershipByEventID: MembershipByEventID
  ) {
    // nothing to do.
  }

  public static blankRevision(
    room: MatrixRoomID
  ): StandardRoomMembershipRevision {
    return new StandardRoomMembershipRevision(
      room,
      PersistentMap(),
      PersistentMap()
    );
  }

  public hasEvent(eventID: StringEventID): boolean {
    return this.membershipByEventID.has(eventID);
  }

  public membershipForUser(userID: StringUserID): MembershipChange | undefined {
    return this.membershipByUserID.get(userID);
  }

  public changesFromMembership(
    membershipEvents: StaticDecode<typeof MembershipEvent>[]
  ): MembershipChange[] {
    const changes: MembershipChange[] = [];
    for (const event of membershipEvents) {
      if (this.hasEvent(event.event_id)) {
        continue;
      }
      // There is a distinguishment between our previous event
      // and the server's claim for prev_content.
      const localPreviousEvent = this.membershipForUser(event.state_key);
      // interestingly, if the parser for MembershipEvent eagerly parsed
      // previous_content and there was an error in the previous_content,
      // but not the top level. Then there would be a very bad situation.
      const citedPreviousMembership =
        event.unsigned.prev_content === undefined
          ? undefined
          : Value.Decode(
              MembershipEventContent,
              event.unsigned.prev_content
            ).match(
              (ok) => ok,
              (error) => {
                log.error(
                  `Unable to decode previous membership for ${
                    event.state_key
                  } within ${this.room.toPermalink()}. This is a serious error and the developers should be notified.`,
                  JSON.stringify(event.unsigned.prev_content),
                  error
                );
                return undefined;
              }
            );
      const membershipChange = membershipChangeType(
        event,
        localPreviousEvent ?? citedPreviousMembership
      );
      const profileChange = profileChangeType(
        event,
        localPreviousEvent ?? citedPreviousMembership
      );
      changes.push(
        new MembershipChange(
          event.state_key,
          event.sender,
          event.room_id,
          event.event_id,
          event.content.membership,
          membershipChange,
          profileChange,
          event.content
        )
      );
    }
    return changes;
  }
  public reviseFromChanges(
    changes: MembershipChange[]
  ): StandardRoomMembershipRevision {
    let nextMembershipByUserID = this.membershipByUserID;
    let nextMembershipByEventID = this.membershipByEventID;
    for (const change of changes) {
      nextMembershipByUserID = nextMembershipByUserID.set(
        change.userID,
        change
      );
      nextMembershipByEventID = nextMembershipByEventID.set(
        change.eventID,
        change
      );
    }
    return new StandardRoomMembershipRevision(
      this.room,
      nextMembershipByUserID,
      nextMembershipByEventID
    );
  }

  public reviseFromMembership(
    membershipEvents: StaticDecode<typeof MembershipEvent>[]
  ): StandardRoomMembershipRevision {
    const changes = this.changesFromMembership(membershipEvents);
    return this.reviseFromChanges(changes);
  }
}
