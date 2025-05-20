// SPDX-FileCopyrightText: 2025 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { createMock } from 'ts-auto-mock';
import { PolicyRuleType } from '../../../MatrixTypes/PolicyEvents';
import { Recommendation } from '../../../PolicyList/PolicyRule';
import {
  describeProtectedRoomsSet,
  describeStateEvent,
} from '../../../StateTracking/DeclareRoomState';
import {
  randomRoomID,
  randomUserID,
} from '../../../TestUtilities/EventGeneration';
import { RoomStateEventSender } from '../../../Client/RoomStateEventSender';
import { MatrixRoomReference } from '@the-draupnir-project/matrix-basic-types';
import { Ok } from '@gnuxie/typescript-result';
import { ServerACLConequences } from './ServerACLConsequences';
import { ServerACLEvent } from '../../../MatrixTypes/ServerACL';
import { StandardPolicyListRevision } from '../../../PolicyList/StandardPolicyListRevision';
import { PolicyListRevisionIssuer } from '../../../PolicyList/PolicyListRevisionIssuer';

test('Adding and removing server policies causes the servers to be banned', async function () {
  const badServer = 'badpeople.example.com';
  const policyRoom = randomRoomID([]);
  const protectedRoom = randomRoomID([]);
  const { protectedRoomsSet, roomStateManager } =
    await describeProtectedRoomsSet({
      rooms: [
        {
          room: protectedRoom,
        },
      ],
      lists: [
        {
          room: policyRoom,
          policyDescriptions: [
            {
              entity: badServer,
              recommendation: Recommendation.Ban,
              type: PolicyRuleType.Server,
            },
          ],
        },
      ],
    });
  const policyRevisionIssuer =
    protectedRoomsSet.watchedPolicyRooms.revisionIssuer;
  const protectedRoomIssuer = (
    await roomStateManager.getRoomStateRevisionIssuer(protectedRoom)
  ).expect('Should be able to find the revision issuer');
  const fakeStateEventSender = createMock<RoomStateEventSender>({
    async sendStateEvent(rawRoom, stateType, stateKey, content) {
      const room =
        typeof rawRoom === 'string'
          ? MatrixRoomReference.fromRoomID(rawRoom)
          : rawRoom;
      const event = describeStateEvent({
        state_key: stateKey,
        type: stateType,
        content,
        sender: randomUserID(),
      });
      roomStateManager.appendStateEvents(room, [event]);
      return Ok(event.event_id);
    },
  });
  const serverConsequences = new ServerACLConequences(
    fakeStateEventSender,
    protectedRoomsSet
  );
  const initialACLResult = (
    await serverConsequences.consequenceForServersInRoom(
      protectedRoom.toRoomIDOrAlias(),
      policyRevisionIssuer
    )
  ).expect('Should be able to set the initial ACL');
  expect(initialACLResult).toBe(true);
  const initialACLEvent =
    protectedRoomIssuer.currentRevision.getStateEvent<ServerACLEvent>(
      'm.room.server_acl',
      ''
    );
  if (initialACLEvent === undefined) {
    throw new TypeError('Should be able to find the initial ACL event');
  }
  expect(initialACLEvent.content.deny).toContain(badServer);
  const removeResult = (
    await serverConsequences.consequenceForServersInRoom(
      protectedRoom.toRoomIDOrAlias(),
      {
        currentRevision: StandardPolicyListRevision.blankRevision(),
      } as unknown as PolicyListRevisionIssuer
    )
  ).expect('Should be able to remove the ACL');
  expect(removeResult).toBe(true);
  const removedACLEvent =
    protectedRoomIssuer.currentRevision.getStateEvent<ServerACLEvent>(
      'm.room.server_acl',
      ''
    );
  if (removedACLEvent === undefined) {
    throw new TypeError('Should be able to find the removed ACL event');
  }
  expect(removedACLEvent.content.deny).not.toContain(badServer);
});
