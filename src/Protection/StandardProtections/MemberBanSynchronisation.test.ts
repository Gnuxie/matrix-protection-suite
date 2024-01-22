import { BasicConsequenceProvider } from '../Consequence/Consequence';
import { createMock } from 'ts-auto-mock';
import { Protection, findProtection } from '../Protection';
import './MemberBanSynchronisation';
import { isError, isOk } from '../../Interface/Action';
import { randomRoomID } from '../../TestUtilities/EventGeneration';
import { StringUserID } from '../../MatrixTypes/StringlyTypedMatrix';
import { describeProtectedRoomsSet } from '../../StateTracking/DeclareRoomState';
import { Membership } from '../../StateTracking/MembershipChange';
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
