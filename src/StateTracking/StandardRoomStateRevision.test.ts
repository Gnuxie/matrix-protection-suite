import { PolicyRuleEvent, PolicyRuleType } from '../MatrixTypes/PolicyEvents';
import { Value } from '../Interface/Value';
import { randomUUID } from 'crypto';
import { Recommendation } from '../PolicyList/PolicyRule';
import { isError } from '../Interface/Action';
import { StandardRoomStateRevision } from './StandardRoomStateRevision';
import { ChangeType } from '../PolicyList/PolicyRuleChange';
import {
  StandardStateTrackingMeta,
  StateTrackingMeta,
} from './StateTrackingMeta';
import { Map as PersistentMap, Set as PersistentSet } from 'immutable';
import {
  StringEventID,
  isStringRoomID,
} from '../MatrixTypes/StringlyTypedMatrix';
import {
  MatrixRoomID,
  MatrixRoomReference,
} from '../MatrixTypes/MatrixRoomReference';

function randomPolicyRuleEvent(
  sender: string,
  room_id: string
): PolicyRuleEvent {
  const rawEventJSON = {
    room_id,
    event_id: `$${randomUUID()}:example.com`,
    origin_server_ts: Date.now(),
    state_key: randomUUID(),
    type: PolicyRuleType.User,
    sender,
    content: {
      entity: `@${randomUUID()}:example.com`,
      recommendation: Recommendation.Ban,
      reason: `${randomUUID}`,
    },
  };
  const decodeResult = Value.Decode(PolicyRuleEvent, rawEventJSON);
  if (isError(decodeResult)) {
    const errors = Value.Errors(PolicyRuleEvent, rawEventJSON);
    throw new TypeError(
      `Something is wrong with the event generator ${errors}`
    );
  } else {
    return decodeResult.ok;
  }
}

function randomRoomID(viaServers: string[]): MatrixRoomID {
  const roomID = `!${randomUUID()}:example.com`;
  if (!isStringRoomID(roomID)) {
    throw new TypeError(`RoomID generator is wrong`);
  }
  return MatrixRoomReference.fromRoomId(roomID, viaServers);
}

function testingTrackingMeta(): StateTrackingMeta {
  return new StandardStateTrackingMeta(
    PersistentSet(),
    PersistentSet(),
    PersistentMap()
  );
}

test('New state is detected correctly', function () {
  const room = randomRoomID(['example.org']);
  const nRules = 25;
  const rawState = [...Array(nRules)].map((_) =>
    randomPolicyRuleEvent('@test:example.com', room.toRoomIdOrAlias())
  );
  const blankRevision = StandardRoomStateRevision.blankRevision(
    room,
    testingTrackingMeta()
  );
  const changes = blankRevision.changesFromState(rawState);
  changes.forEach((change) => expect(change.changeType).toBe(ChangeType.Added));
  expect(changes.length).toBe(nRules);
  const revision = blankRevision.reviseFromState(rawState);
  expect(revision.allState.length).toBe(nRules);
});

test('New redactions are detected correctly', function () {
  const room = randomRoomID(['example.org']);
  const nRules = 25;
  const rawState = [...Array(nRules)].map((_) =>
    randomPolicyRuleEvent('@test:example.com', room.toRoomIdOrAlias())
  );
  const blankRevision = StandardRoomStateRevision.blankRevision(
    room,
    testingTrackingMeta()
  );
  const changes = blankRevision.reviseFromState(rawState).changesFromState(
    rawState.map((state) => {
      return {
        ...state,
        ...{
          content: {},
          unsigned: {
            redacted_because: {
              reason: 'unbanning the user',
            },
          },
        },
      };
    })
  );
  changes.forEach((change) =>
    expect(change.changeType).toBe(ChangeType.Removed)
  );
  expect(changes.length).toBe(nRules);
});

test('Modifications and soft redactions are calculated correctly', function () {
  const room = randomRoomID(['example.org']);
  const nRules = 15;
  const rawState = [...Array(nRules)].map((_) =>
    randomPolicyRuleEvent('@test:example.com', room.toRoomIdOrAlias())
  );
  const blankRevision = StandardRoomStateRevision.blankRevision(
    room,
    testingTrackingMeta()
  );
  const changes = blankRevision.reviseFromState(rawState).changesFromState(
    rawState.map((state, i) => {
      if (i < 5) {
        // soft redact
        return {
          ...state,
          ...{
            content: {},
          },
          event_id: `$${randomUUID()}` as StringEventID,
        };
      } else if (i >= nRules - 5) {
        // modify
        return {
          ...state,
          ...{
            content: {
              ...state.content,
              reason: 'Another completely new reason',
            },
            event_id: `$${randomUUID()}` as StringEventID,
          },
        };
      } else {
        return state;
      }
    })
  );
  expect(changes.length).toBe(10);
  expect(
    changes.filter((change) => change.changeType === ChangeType.Modified).length
  ).toBe(5);
  expect(
    changes.filter((change) => change.changeType === ChangeType.Removed).length
  ).toBe(5);
  const revision = blankRevision
    .reviseFromState(rawState)
    .reviseFromChanges(changes);
  expect(revision.allState.length).toBe(10);
});
