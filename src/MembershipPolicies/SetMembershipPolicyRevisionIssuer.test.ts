// SPDX-FileCopyrightText: 2025 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

// Things to test:
// 1. Creating the revision from existing room members and policies
//    correctly calculates existing matches.
// 2. Adding and removing rooms will update the matches.
// 3. Adding and removing watched lists will update the matches
// 4. Edge cases for membership and policy changes.

import { PolicyRuleType } from '../MatrixTypes/PolicyEvents';
import { Membership } from '../Membership/MembershipChange';
import { Recommendation } from '../PolicyList/PolicyRule';
import {
  describeProtectedRoomsSet,
  describeRoom,
} from '../StateTracking/DeclareRoomState';
import { randomUserID } from '../TestUtilities/EventGeneration';

test('That when the SetMembershipPolicyRevisionIssuer is created, the existing room memberships and policies are accounted for.', async function () {
  const targetUser = randomUserID();
  const { protectedRoomsSet } = await describeProtectedRoomsSet({
    rooms: [
      {
        membershipDescriptions: [
          {
            sender: targetUser,
            membership: Membership.Join,
          },
        ],
      },
    ],
    lists: [
      {
        policyDescriptions: [
          {
            entity: targetUser,
            recommendation: Recommendation.Ban,
            type: PolicyRuleType.User,
            reason: 'spam',
          },
        ],
      },
    ],
  });
  expect(
    [...protectedRoomsSet.setMembership.currentRevision.presentMembers()].length
  ).toBe(1);
  expect(
    [
      ...protectedRoomsSet.setPoliciesMatchingMembership.currentRevision.allMembersWithRules(),
    ].length
  ).toBe(1);
});

test('When adding and removing rooms with members will update the matches', async function () {
  const targetUser = randomUserID();
  const { protectedRoomsSet, roomMembershipManager, roomStateManager } =
    await describeProtectedRoomsSet({
      lists: [
        {
          policyDescriptions: [
            {
              entity: targetUser,
              recommendation: Recommendation.Ban,
              type: PolicyRuleType.User,
              reason: 'spam',
            },
          ],
        },
      ],
    });
  expect(
    [
      ...protectedRoomsSet.setPoliciesMatchingMembership.currentRevision.allMembersWithRules(),
    ].length
  ).toBe(0);
  const { stateRevisionIssuer, membershipRevisionIssuer } = describeRoom({
    membershipDescriptions: [
      {
        sender: targetUser,
        membership: Membership.Join,
      },
    ],
  });
  roomStateManager.addIssuer(stateRevisionIssuer);
  roomMembershipManager.addIssuer(membershipRevisionIssuer);
  (
    await protectedRoomsSet.protectedRoomsManager.addRoom(
      stateRevisionIssuer.room
    )
  ).expect('Should be able to add the room');
  expect(
    [
      ...protectedRoomsSet.setPoliciesMatchingMembership.currentRevision.allMembersWithRules(),
    ].length
  ).toBe(1);
  (
    await protectedRoomsSet.protectedRoomsManager.removeRoom(
      stateRevisionIssuer.room
    )
  ).expect('Should be able to remove the room');
  expect(
    [
      ...protectedRoomsSet.setPoliciesMatchingMembership.currentRevision.allMembersWithRules(),
    ].length
  ).toBe(0);
});

test('When adding and removing policy rooms will update the matches.', async function () {
  const targetUser = randomUserID();
  const { protectedRoomsSet, roomStateManager, policyRoomManager } =
    await describeProtectedRoomsSet({
      rooms: [
        {
          membershipDescriptions: [
            {
              sender: targetUser,
              membership: Membership.Join,
            },
          ],
        },
      ],
    });
  expect(
    [...protectedRoomsSet.setMembership.currentRevision.presentMembers()].length
  ).toBe(1);
  expect(
    [
      ...protectedRoomsSet.setPoliciesMatchingMembership.currentRevision.allMembersWithRules(),
    ].length
  ).toBe(0);
  const policyRoom = describeRoom({
    policyDescriptions: [
      {
        entity: targetUser,
        recommendation: Recommendation.Ban,
        type: PolicyRuleType.User,
        reason: 'spam',
      },
    ],
  });
  roomStateManager.addIssuer(policyRoom.stateRevisionIssuer);
  policyRoomManager.addIssuer(policyRoom.policyRevisionIssuer);
  (
    await protectedRoomsSet.watchedPolicyRooms.watchPolicyRoomDirectly(
      policyRoom.stateRevisionIssuer.room
    )
  ).expect('Should be able to watch the list');
  expect(
    [
      ...protectedRoomsSet.setPoliciesMatchingMembership.currentRevision.allMembersWithRules(),
    ].length
  ).toBe(1);
  (
    await protectedRoomsSet.watchedPolicyRooms.unwatchPolicyRoom(
      policyRoom.stateRevisionIssuer.room
    )
  ).expect('Should be able to unwatch the list');
  expect(
    [
      ...protectedRoomsSet.setPoliciesMatchingMembership.currentRevision.allMembersWithRules(),
    ].length
  ).toBe(0);
});

test('Banning a matching member incrementally will not cause spurious revisions to be issued', async function () {
  const targetUser = randomUserID();
  const { protectedRoomsSet, roomStateManager } =
    await describeProtectedRoomsSet({
      rooms: [...Array(5).keys()].map((_) => ({
        membershipDescriptions: [
          {
            sender: targetUser,
            membership: Membership.Join,
          },
        ],
      })),
      lists: [
        {
          policyDescriptions: [
            {
              entity: targetUser,
              recommendation: Recommendation.Ban,
              type: PolicyRuleType.User,
              reason: 'spam',
            },
          ],
          membershipDescriptions: [
            {
              sender: targetUser,
              membership: Membership.Join,
            },
          ],
        },
      ],
    });
  expect(
    [...protectedRoomsSet.setMembership.currentRevision.presentMembers()].length
  ).toBe(1);
  expect(
    [
      ...protectedRoomsSet.setPoliciesMatchingMembership.currentRevision.allMembersWithRules(),
    ].length
  ).toBe(1);
  const initialRevisionID =
    protectedRoomsSet.setPoliciesMatchingMembership.currentRevision.revision;
  for (const [i, room] of protectedRoomsSet.allProtectedRooms.entries()) {
    // ban the user from a protected room.
    roomStateManager.appendState({
      room,
      membershipDescriptions: [
        {
          target: targetUser,
          membership: Membership.Ban,
          sender: randomUserID(),
        },
      ],
    });
    // check that the revision does not update until the user is banned in the last room
    if (i < protectedRoomsSet.allProtectedRooms.length - 1) {
      expect(
        [
          ...protectedRoomsSet.setPoliciesMatchingMembership.currentRevision.allMembersWithRules(),
        ].length
      ).toBe(1);
      expect(
        protectedRoomsSet.setPoliciesMatchingMembership.currentRevision.revision
      ).toBe(initialRevisionID);
    } else {
      expect(
        [
          ...protectedRoomsSet.setPoliciesMatchingMembership.currentRevision.allMembersWithRules(),
        ].length
      ).toBe(0);
      expect(
        protectedRoomsSet.setPoliciesMatchingMembership.currentRevision.revision.supersedes(
          initialRevisionID
        )
      ).toBe(true);
    }
  }
});
