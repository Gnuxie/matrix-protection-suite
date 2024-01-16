import { BasicConsequenceProvider } from '../Consequence/Consequence';
import { createMock } from 'ts-auto-mock';
import { ProtectedRoomsSet } from '../ProtectedRoomsSet';
import { findProtection } from '../Protection';
import './MemberBanSynchronisation';

test('A policy change banning a user on a directly watched list', function () {
  const description = findProtection('MemberBanSynchronisationProtection');
  if (description === undefined) {
    throw new TypeError(
      'Should be able to find the member ban synchronisation protection'
    );
  }
  const consequenceProvider = createMock<BasicConsequenceProvider>();
  const protectedRoomsSet = createMock<ProtectedRoomsSet>();
  const protection = description.factory(
    description,
    consequenceProvider,
    protectedRoomsSet,
    undefined,
    {}
  );
  console.log(protection);
});
