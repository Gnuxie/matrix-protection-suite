// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { Ok, isError } from '../../Interface/Action';
import { FakeMatrixAccountData } from '../../Interface/FakePersistentMatrixData';
import { PolicyRuleType } from '../../MatrixTypes/PolicyEvents';
import { isStringRoomID } from '../../MatrixTypes/StringlyTypedMatrix';
import { Recommendation } from '../../PolicyList/PolicyRule';
import { describeRoom } from '../../StateTracking/DeclareRoomState';
import { FakePolicyRoomManager } from '../../StateTracking/FakePolicyRoomManager';
import { MjolnirPolicyRoomsConfig } from './MjolnirPolicyRoomsConfig';
import { MjolnirWatchedPolicyRoomsEvent } from './MjolnirWatchedListsEvent';

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
  const policyRoomsConfigResult =
    await MjolnirPolicyRoomsConfig.createFromStore(
      policyListConfigAccountData,
      policyRoomManager,
      // this really should be made to use the roomJoiner clientCapability
      // then we can just make a fake for that rather than this hacky thing.
      {
        resolveRoom: async (roomID) => {
          if (!isStringRoomID(roomID)) {
            throw new TypeError(`This dumb fake can't handle this`);
          }
          return Ok(roomID);
        },
      }
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
