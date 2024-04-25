// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { PowerLevelsEventContent } from '../MatrixTypes/PowerLevels';
import { randomUserID } from '../TestUtilities/EventGeneration';
import { PowerLevelPermission, PowerLevelsMirror } from './PowerLevelsMirror';

test('What happens when we are missing all permissions', function () {
  const userID = randomUserID();
  const powerLevelscontent: PowerLevelsEventContent = {};
  const result = PowerLevelsMirror.calculateNewMissingPermissions(userID, {
    nextPowerLevelsContent: powerLevelscontent,
    previousPowerLevelsContent: powerLevelscontent,
    requiredStatePermissions: ['m.room.server_acl'],
    requiredPermissions: [
      PowerLevelPermission.Ban,
      PowerLevelPermission.Redact,
    ],
    requiredEventPermissions: [],
  });
  expect(result.isPrivilidgedInNextPowerLevels).toBe(false);
  expect(result.isPrivilidgedInPriorPowerLevels).toBe(false);
  expect(result.missingStatePermissions.length).toBe(1);
  expect(result.missingPermissions.length).toBe(2);
});
