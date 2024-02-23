// SPDX-FileCopyrightText: 2023-2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { BasicConsequenceProvider } from '../Capability/Consequence';
import { createMock } from 'ts-auto-mock';
import { Protection, findProtection } from '../Protection';
import './MemberBanSynchronisation';
import { isError, isOk } from '../../Interface/Action';
import {
  randomRoomID,
  randomUserID,
} from '../../TestUtilities/EventGeneration';
import { StringUserID } from '../../MatrixTypes/StringlyTypedMatrix';
import {
  describeProtectedRoomsSet,
  describeRoomMember,
} from '../../StateTracking/DeclareRoomState';
import {
  Membership,
  MembershipChangeType,
} from '../../Membership/MembershipChange';
import waitForExpect from 'wait-for-expect';
import { PolicyRuleType } from '../../MatrixTypes/PolicyEvents';
import { ProtectedRoomsSet } from '../ProtectedRoomsSet';

function createMemberBanSynchronisationProtection(
  consequenceProvider: BasicConsequenceProvider,
  protectedRoomsSet: ProtectedRoomsSet
): Protection {
  const description = findProtection('MemberBanSynchronisationProtection');
  if (description === undefined) {
    throw new TypeError(
      'Should be able to find the member ban synchronisation protection'
    );
  }
  const protectionResult = description.factory(
    description,
    consequenceProvider,
    protectedRoomsSet,
    undefined,
    {}
  );
  if (isError(protectionResult)) {
    throw new TypeError('Should be able to construct the protection');
  }
  return protectionResult.ok;
}

// handleTimelineEvent
test('A membership event recieved from the timeline that matches an existing policy should be acted upon, later this can be made a setting but it should be on by default.', async function () {
  const spammerToBanUserID = `@spam:example.com` as StringUserID;
  const policyRoom = randomRoomID([]);
  const protectedRoom = randomRoomID([]);
  const { protectedRoomsSet } = await describeProtectedRoomsSet({
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
            entity: spammerToBanUserID,
            type: PolicyRuleType.User,
            reason: 'spam',
          },
        ],
      },
    ],
  });

  const consequenceProvider = createMock<BasicConsequenceProvider>();
  const consequenceSpy = jest.spyOn(
    consequenceProvider,
    'consequenceForUserInRoom'
  );

  const protection = createMemberBanSynchronisationProtection(
    consequenceProvider,
    protectedRoomsSet
  );

  if (protection.handleTimelineEvent === undefined) {
    throw new TypeError(
      `Protection should have the method to handle a timeline event defined, is this test out of date?`
    );
  }
  const protectionHandlerResult = await protection.handleTimelineEvent.call(
    protection,
    protectedRoom,
    describeRoomMember({
      sender: spammerToBanUserID,
      target: spammerToBanUserID,
      room_id: protectedRoom.toRoomIDOrAlias(),
      membership: Membership.Join,
    })
  );
  expect(isOk(protectionHandlerResult)).toBeTruthy();
  expect(consequenceSpy).toBeCalled();
});

// handleMembershipChange
test('Membership changes that should result in a ban when matching an existing policy', async function () {
  const policyRoom = randomRoomID([]);
  const protectedRoom = randomRoomID([]);
  const changesToTest = [
    MembershipChangeType.Invited,
    MembershipChangeType.Joined,
    MembershipChangeType.Knocked,
    MembershipChangeType.Rejoined,
  ];
  const usersToTest = changesToTest.map((_change) => randomUserID());
  const { protectedRoomsSet, roomStateManager, roomMembershipManager } =
    await describeProtectedRoomsSet({
      rooms: [
        {
          room: protectedRoom,
          membershipDescriptions: [
            {
              // we need this for the user who will rejoin the room.
              sender: usersToTest[3],
              membership: Membership.Leave,
            },
          ],
        },
      ],
      lists: [
        {
          room: policyRoom,
          policyDescriptions: usersToTest.map((userID) => ({
            entity: userID,
            type: PolicyRuleType.User,
          })),
        },
      ],
    });
  const consequenceProvider = createMock<BasicConsequenceProvider>();
  const consequenceSpy = jest.spyOn(
    consequenceProvider,
    'consequenceForUserInRoom'
  );
  const protection = createMemberBanSynchronisationProtection(
    consequenceProvider,
    protectedRoomsSet
  );
  const membershipRevisionIssuer =
    roomMembershipManager.getFakeRoomMembershpRevisionIssuer(protectedRoom);
  roomStateManager.appendState({
    room: protectedRoom,
    membershipDescriptions: changesToTest.map((changeType, index) => {
      const membership = (() => {
        switch (changeType) {
          case MembershipChangeType.Invited:
            return Membership.Invite;
          case MembershipChangeType.Joined:
          case MembershipChangeType.Rejoined:
            return Membership.Join;
          case MembershipChangeType.Knocked:
            return Membership.Knock;
          default:
            throw new TypeError(`Unexpected membership change type in test`);
        }
      })();
      return {
        state_key: usersToTest[index],
        sender: usersToTest[index],
        membership: membership,
      };
    }),
  });
  await waitForExpect(() => {
    expect(membershipRevisionIssuer.getNumberOfRevisions()).toBe(1);
  });
  const revisionEntry = membershipRevisionIssuer.getLastRevision();
  if (protection.handleMembershipChange === undefined) {
    throw new TypeError(
      `Protection should have the method to handle a membership change defined, is this test out of date?`
    );
  }
  const protectionHandlerResult = await protection.handleMembershipChange.call(
    protection,
    revisionEntry[0],
    revisionEntry[1]
  );
  expect(isOk(protectionHandlerResult)).toBeTruthy();
  expect(consequenceSpy).toBeCalledTimes(usersToTest.length);
});

// handlePolicyRevision
// We need to test the consequence method itself in another test?
test('A policy change banning a user on a directly watched list will call the consequence to update for the revision', async function () {
  const spammerToBanUserID = `@spam:example.com` as StringUserID;
  const policyRoom = randomRoomID([]);
  const { protectedRoomsSet, roomStateManager, policyRoomManager } =
    await describeProtectedRoomsSet({
      rooms: [
        {
          membershipDescriptions: [
            {
              sender: spammerToBanUserID,
              membership: Membership.Join,
            },
          ],
        },
      ],
      lists: [
        {
          room: policyRoom,
        },
      ],
    });

  const consequenceProvider = createMock<BasicConsequenceProvider>();
  const consequenceSpy = jest.spyOn(
    consequenceProvider,
    'consequenceForUsersInRevision'
  );

  const protection = createMemberBanSynchronisationProtection(
    consequenceProvider,
    protectedRoomsSet
  );

  const policyRoomRevisionIssuer =
    policyRoomManager.getFakePolicyRoomRevisionIssuer(policyRoom);
  roomStateManager.appendState({
    room: policyRoom,
    policyDescriptions: [
      { entity: spammerToBanUserID, type: PolicyRuleType.User },
    ],
  });
  await waitForExpect(() => {
    expect(policyRoomRevisionIssuer.getNumberOfRevisions()).toBe(1);
  });
  const revisionEntry = policyRoomRevisionIssuer.getLastRevision();
  if (protection.handlePolicyChange === undefined) {
    throw new TypeError(
      `Protection should have the method to handle a policy change defined, is this test out of date?`
    );
  }
  const protectionHandlerResult = await protection.handlePolicyChange.call(
    protection,
    revisionEntry[0],
    revisionEntry[1]
  );
  expect(isOk(protectionHandlerResult)).toBeTruthy();
  expect(consequenceSpy).toBeCalled();
});
