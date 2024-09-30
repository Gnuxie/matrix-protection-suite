// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { isError } from '../../Interface/Action';
import { FakePersistentConfigBackend } from '../../Interface/FakePersistentMatrixData';
import { PolicyRuleType } from '../../MatrixTypes/PolicyEvents';
import { Recommendation } from '../../PolicyList/PolicyRule';
import { describeRoom } from '../../StateTracking/DeclareRoomState';
import { FakePolicyRoomManager } from '../../StateTracking/FakePolicyRoomManager';
import { MjolnirPolicyRoomsConfig } from './MjolnirPolicyRoomsConfig';
import { MjolnirWatchedPolicyRoomsEvent } from './MjolnirWatchedListsEvent';
import { DummyRoomJoiner } from '../../Client/DummyClientPlatform';

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
    new FakePersistentConfigBackend<MjolnirWatchedPolicyRoomsEvent>({
      references: [policyRoom.policyRevisionIssuer.room],
    });
  const policyRoomsConfigResult =
    await MjolnirPolicyRoomsConfig.createFromStore(
      policyListConfigAccountData,
      policyRoomManager,
      DummyRoomJoiner
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
