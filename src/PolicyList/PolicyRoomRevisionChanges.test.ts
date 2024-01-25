// please note that the changes calculated from this test need to be tested
// against the standard policy list revision.

import { PolicyRuleType } from '../MatrixTypes/PolicyEvents';
import { describePolicyRule } from '../StateTracking/DeclareRoomState';
import { DefaultStateTrackingMeta } from '../StateTracking/DefaultStateTrackingMeta';
import { StandardRoomStateRevision } from '../StateTracking/StandardRoomStateRevision';
import { randomRoomID, randomUserID } from '../TestUtilities/EventGeneration';
import { ChangeType } from './PolicyRuleChange';

// if events aren't normalized as they are indexed then we really need to make
// sure that the policy room editor removes them according to their source
// event type, not their normalised state type.

// So in case you haven't realised, we've started using the state revision here,
// which might change the meaning of the test.
// in the early days of MPS we allowed policy list revisions to be created
// without depending on a room state revision to be informed of changes.
// that's probably going to change, so that policyRoomRevision don't have
// a method to `reviseFromState`.

test('A new policy rule will be seen as an Added rule by the revision', function () {
  const blankRevision = StandardRoomStateRevision.blankRevision(
    randomRoomID([]),
    DefaultStateTrackingMeta
  );
  const changes = blankRevision.changesFromState([
    describePolicyRule({
      type: PolicyRuleType.User,
      entity: randomUserID(),
    }),
  ]);
  expect(changes.length).toBe(1);
  expect(changes.at(0)?.changeType).toBe(ChangeType.Added);
});
test('A modified rule will be seen as a modification to an existing rule', function () {
  const entity = randomUserID();
  const revision = StandardRoomStateRevision.blankRevision(
    randomRoomID([]),
    DefaultStateTrackingMeta
  ).reviseFromState([
    describePolicyRule({
      type: PolicyRuleType.User,
      entity,
    }),
  ]);
  const changes = revision.changesFromState([
    describePolicyRule({
      type: PolicyRuleType.User,
      entity,
      reason: 'A brand new reason, because the old one was out of date',
    }),
  ]);
  expect(changes.length).toBe(1);
  expect(changes.at(0)?.changeType).toBe(ChangeType.Modified);
});
test('Redacting a rule will be seen as removing a rule', function () {
  const entity = randomUserID();
  const event = describePolicyRule({
    type: PolicyRuleType.User,
    entity,
  });
  const revision = StandardRoomStateRevision.blankRevision(
    randomRoomID([]),
    DefaultStateTrackingMeta
  ).reviseFromState([event]);
  const changes = revision.changesFromState([
    {
      ...event,
      content: {},
    },
  ]);
  expect(changes.length).toBe(1);
  expect(changes.at(0)?.changeType).toBe(ChangeType.Removed);
});
test('Sending a blank state event with the same type-key pair will be seen as removing the rule', function () {
  const entity = randomUserID();
  const policy = describePolicyRule({
    type: PolicyRuleType.User,
    entity,
  });
  const revision = StandardRoomStateRevision.blankRevision(
    randomRoomID([]),
    DefaultStateTrackingMeta
  ).reviseFromState([policy]);
  const changes = revision.changesFromState([
    describePolicyRule({
      remove: policy,
    }),
  ]);
  expect(changes.length).toBe(1);
  expect(changes.at(0)?.changeType).toBe(ChangeType.Removed);
});
test('Sending a blank state event to an already blank type-key pair will result in no change', function () {
  const entity = randomUserID();
  const policy = describePolicyRule({
    type: PolicyRuleType.User,
    entity,
  });
  const revision = StandardRoomStateRevision.blankRevision(
    randomRoomID([]),
    DefaultStateTrackingMeta
  ).reviseFromState([
    describePolicyRule({
      remove: policy,
    }),
  ]);
  const changes = revision.changesFromState([
    describePolicyRule({
      remove: policy,
    }),
  ]);
  expect(changes.length).toBe(0);
});
