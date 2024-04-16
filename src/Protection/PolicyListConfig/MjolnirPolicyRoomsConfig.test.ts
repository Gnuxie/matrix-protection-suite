// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { createMock } from 'ts-auto-mock';
import { RoomJoiner } from '../../Client/RoomJoiner';
import { Ok, isError } from '../../Interface/Action';
import { FakeMatrixAccountData } from '../../Interface/FakePersistentMatrixData';
import { PolicyRuleType } from '../../MatrixTypes/PolicyEvents';
import { isStringRoomID } from '../../MatrixTypes/StringlyTypedMatrix';
import { Recommendation } from '../../PolicyList/PolicyRule';
import { describeRoom } from '../../StateTracking/DeclareRoomState';
import { FakePolicyRoomManager } from '../../StateTracking/FakePolicyRoomManager';
import { MjolnirPolicyRoomsConfig } from './MjolnirPolicyRoomsConfig';
import { MjolnirWatchedPolicyRoomsEvent } from './MjolnirWatchedListsEvent';
import {
  MatrixRoomAlias,
  MatrixRoomReference,
} from '../../MatrixTypes/MatrixRoomReference';

async function resolveRoomFake(roomID: MatrixRoomReference | string) {
  if (typeof roomID === 'string') {
    if (!isStringRoomID(roomID)) {
      throw new TypeError(`Fake can't deal with aliases.`);
    } else {
      return Ok(MatrixRoomReference.fromRoomID(roomID));
    }
  } else if (roomID instanceof MatrixRoomAlias) {
    throw new TypeError(`Fake can't deal with aliases.`);
  } else {
    return Ok(roomID);
  }
}

test('That creating a MjolnirPolicyRoomsConfig will correctly load rooms that already have policies in them', async function () {
  const targetUser = '@spam:example.com';
  const policyRoom = describeRoom({
    policyDescriptions: [
      {
        entity: targetUser,
        type: PolicyRuleType.User,
      },
    ],
  });
  const policyRoomManager = new FakePolicyRoomManager([
    policyRoom.policyRevisionIssuer,
  ]);
  const policyListConfigAccountData =
    new FakeMatrixAccountData<MjolnirWatchedPolicyRoomsEvent>({
      references: [policyRoom.policyRevisionIssuer.room],
    });
  const fakeRoomJoiner = createMock<RoomJoiner>({
    resolveRoom: resolveRoomFake,
    joinRoom: async (roomID) => {
      return await resolveRoomFake(roomID);
    },
  });
  const policyRoomsConfigResult =
    await MjolnirPolicyRoomsConfig.createFromStore(
      policyListConfigAccountData,
      policyRoomManager,
      fakeRoomJoiner
    );
  if (isError(policyRoomsConfigResult)) {
    throw new TypeError(
      `Couldn't create the fake policy rooms config to setup the test`
    );
  }
  const mainRevisionIssuer =
    policyRoomsConfigResult.ok.policyListRevisionIssuer;
  expect(mainRevisionIssuer.currentRevision.allRules().length).toBe(1);
  expect(
    mainRevisionIssuer.currentRevision.findRuleMatchingEntity(
      targetUser,
      PolicyRuleType.User,
      Recommendation.Ban
    )
  ).toBeDefined();
});
