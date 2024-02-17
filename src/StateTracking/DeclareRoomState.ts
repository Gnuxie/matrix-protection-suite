// Copyright (C) 2023 - 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { randomUUID } from 'crypto';
import { StateEvent } from '../MatrixTypes/Events';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { MembershipEvent } from '../MatrixTypes/MembershipEvent';
import { StringRoomID, StringUserID } from '../MatrixTypes/StringlyTypedMatrix';
import { randomRoomID, randomUserID } from '../TestUtilities/EventGeneration';
import { Membership } from '../Membership/MembershipChange';
import { StandardRoomStateRevision } from './StandardRoomStateRevision';
import { DefaultEventDecoder } from '../MatrixTypes/EventDecoder';
import { isError } from '../Interface/Action';
import { Recommendation } from '../PolicyList/PolicyRule';
import { PolicyRuleEvent, PolicyRuleType } from '../MatrixTypes/PolicyEvents';
import { StandardRoomMembershipRevision } from '../Membership/StandardRoomMembershipRevision';
import { StandardPolicyRoomRevision } from '../PolicyList/StandardPolicyRoomRevision';
import {
  ProtectedRoomsSet,
  StandardProtectedRoomsSet,
} from '../Protection/ProtectedRoomsSet';
import { FakeProtectedRoomsConfig } from '../Protection/ProtectedRoomsConfig/FakeProtectedRoomsConfig';
import { FakeRoomStateRevisionIssuer } from './FakeRoomStateRevisionIssuer';
import { FakeProtectionsConfig } from '../Protection/ProtectionsConfig/FakeProtectionsConfig';
import { FakeRoomStateManager } from './FakeRoomStateManager';
import { StandardSetMembership } from '../Membership/StandardSetMembershp';
import { FakeRoomMembershipManager } from '../Membership/FakeRoomMembershipManager';
import { FakePolicyRoomManager } from './FakePolicyRoomManager';
import { StandardSetRoomState } from './StandardSetRoomState';
import { FakePolicyListConfig } from '../Protection/PolicyListConfig/FakePolicyListConfig';
import { FakePolicyRoomRevisionIssuer } from '../PolicyList/FakePolicyRoomRevisionIssuer';
import { FakeRoomMembershipRevisionIssuer } from '../Membership/FakeRoomMembershipRevisionIssuer';
import { buildPolicyEvent } from '../PolicyList/PolicyRuleEventBuilder';

// TODO:
// all describe* methods need to return description objects, not concrete
// instances
// then things that return concrete instances need to be define* using
// the same syntax.

export type DescribeProtectedRoomsSet = {
  rooms?: DescribeRoomOptions[];
  lists?: DescribeRoomOptions[];
  clientUserID?: StringUserID;
};

export type ProtectedRoomsSetDescription = {
  protectedRoomsSet: ProtectedRoomsSet;
  roomStateManager: FakeRoomStateManager;
  policyRoomManager: FakePolicyRoomManager;
  roomMembershipManager: FakeRoomMembershipManager;
};

export async function describeProtectedRoomsSet({
  rooms = [],
  lists = [],
  clientUserID = randomUserID(),
}: DescribeProtectedRoomsSet): Promise<ProtectedRoomsSetDescription> {
  const listDescriptions = lists.map(describeRoom);
  const roomDescriptions = [...listDescriptions, ...rooms.map(describeRoom)];
  const roomStateManager = new FakeRoomStateManager(
    roomDescriptions.map((description) => description.stateRevisionIssuer)
  );
  const roomMembershipManager = new FakeRoomMembershipManager(
    roomDescriptions.map((description) => description.membershipRevisionIssuer)
  );
  const policyRoomManager = new FakePolicyRoomManager(
    roomDescriptions.map((description) => description.policyRevisionIssuer)
  );
  const protectedRoomsConfig = new FakeProtectedRoomsConfig(
    roomDescriptions.map((room) => room.stateRevisionIssuer.room)
  );
  const setMembership = await StandardSetMembership.create(
    roomMembershipManager,
    protectedRoomsConfig
  );
  if (isError(setMembership)) {
    throw setMembership.error;
  }
  const setRoomState = await StandardSetRoomState.create(
    roomStateManager,
    protectedRoomsConfig
  );
  if (isError(setRoomState)) {
    throw setRoomState;
  }
  const protectedRoomsSet = new StandardProtectedRoomsSet(
    new FakePolicyListConfig(
      policyRoomManager,
      listDescriptions.map((description) => description.policyRevisionIssuer)
    ),
    protectedRoomsConfig,
    new FakeProtectionsConfig(),
    setMembership.ok,
    setRoomState.ok,
    clientUserID
  );
  return {
    protectedRoomsSet,
    roomStateManager,
    policyRoomManager,
    roomMembershipManager,
  };
}

export type RoomDescription = {
  stateRevisionIssuer: FakeRoomStateRevisionIssuer;
  membershipRevisionIssuer: FakeRoomMembershipRevisionIssuer;
  policyRevisionIssuer: FakePolicyRoomRevisionIssuer;
};

export type DescribeRoomOptions = {
  room?: MatrixRoomID;
  stateDescriptions?: DescribeStateEventOptions[];
  membershipDescriptions?: DescribeRoomMemberOptions[];
  policyDescriptions?: DescribePolicyRule[];
};

export type RoomStateDescription = {
  room: MatrixRoomID;
  stateEvents: StateEvent[];
  policyEvents: PolicyRuleEvent[];
  membershipEvents: MembershipEvent[];
};

export function describeRoomStateEvents({
  room,
  stateDescriptions = [],
  membershipDescriptions = [],
  policyDescriptions = [],
}: Omit<DescribeRoomOptions, 'room'> & {
  room: MatrixRoomID;
}): RoomStateDescription {
  const membershipEvents = membershipDescriptions.map((description) =>
    describeRoomMember({
      ...description,
      room_id: room.toRoomIDOrAlias(),
    })
  );
  const policyEvents = policyDescriptions.map((description) =>
    describePolicyRule({
      ...description,
      room_id: room.toRoomIDOrAlias(),
    })
  );
  const stateEvents = [
    ...stateDescriptions.map((description) =>
      describeStateEvent({
        ...description,
        room_id: room.toRoomIDOrAlias(),
      })
    ),
    ...membershipEvents,
    ...policyEvents,
  ];
  return {
    room,
    stateEvents,
    membershipEvents,
    policyEvents,
  };
}

export function describeRoom({
  room = randomRoomID([]),
  stateDescriptions = [],
  membershipDescriptions = [],
  policyDescriptions = [],
}: DescribeRoomOptions): RoomDescription {
  const { policyEvents, stateEvents, membershipEvents } =
    describeRoomStateEvents({
      room,
      stateDescriptions,
      membershipDescriptions,
      policyDescriptions,
    });
  const stateRevision =
    StandardRoomStateRevision.blankRevision(room).reviseFromState(stateEvents);
  const membershipRevision =
    StandardRoomMembershipRevision.blankRevision(room).reviseFromMembership(
      membershipEvents
    );
  const policyRevision =
    StandardPolicyRoomRevision.blankRevision(room).reviseFromState(
      policyEvents
    );
  const stateRevisionIssuer = new FakeRoomStateRevisionIssuer(
    stateRevision,
    room
  );
  const membershipRevisionIssuer = new FakeRoomMembershipRevisionIssuer(
    room,
    membershipRevision,
    stateRevisionIssuer
  );
  const policyRevisionIssuer = new FakePolicyRoomRevisionIssuer(
    room,
    policyRevision,
    stateRevisionIssuer
  );
  return {
    stateRevisionIssuer,
    membershipRevisionIssuer,
    policyRevisionIssuer,
  };
}

export type DescribeRoomMemberOptions = {
  sender: StringUserID;
  target?: StringUserID;
  membership?: Membership;
  room_id?: StringRoomID;
  avatar_url?: string;
  displayname?: string;
  reason?: string;
};

export function describeRoomMember({
  sender,
  target = sender,
  membership = Membership.Join,
  room_id = randomRoomID([]).toRoomIDOrAlias(),
  avatar_url,
  displayname,
  reason,
}: DescribeRoomMemberOptions): MembershipEvent {
  return describeStateEvent({
    sender,
    state_key: target,
    content: {
      membership,
      avatar_url,
      displayname,
      reason,
    },
    type: 'm.room.member',
    room_id,
  }) as MembershipEvent;
}

export type DescribePolicyRule = {
  sender?: StringUserID;
  room_id?: StringRoomID;
  type?: PolicyRuleType;
  entity?: string;
  reason?: string;
  recommendation?: Recommendation;
  copyFrom?: PolicyRuleEvent;
  remove?: PolicyRuleEvent;
};

export function describePolicyRule({
  sender = randomUserID(),
  room_id,
  type,
  entity,
  reason = '<no reason supplied>',
  recommendation = Recommendation.Ban,
  copyFrom,
  remove,
}: DescribePolicyRule): PolicyRuleEvent {
  const content = (() => {
    if (remove !== undefined) {
      return undefined;
    } else if (copyFrom !== undefined) {
      return undefined;
    } else if (
      entity === undefined ||
      reason === undefined ||
      recommendation === undefined
    ) {
      throw new TypeError(
        `Content fields should be defined when copyFrom and remove aren't being used`
      );
    } else {
      return {
        entity,
        reason,
        recommendation,
      };
    }
  })();
  const description = buildPolicyEvent({
    type,
    content,
    copyFrom,
    remove,
  });
  return describeStateEvent({
    sender,
    state_key: description.state_key,
    room_id,
    type: description.type,
    content: description.content ?? {},
  }) as PolicyRuleEvent;
}

export type DescribeStateEventOptions = {
  sender: StringUserID;
  state_key?: string;
  content?: Record<string, unknown>;
  room_id?: StringRoomID;
  type: string;
};

export function describeStateEvent({
  sender,
  state_key = '',
  type,
  content = {},
  room_id = `!${randomUUID()}:example.com` as StringRoomID,
}: DescribeStateEventOptions): StateEvent {
  const rawEventJSON = {
    room_id,
    event_id: `$${randomUUID()}:example.com`,
    origin_server_ts: Date.now(),
    state_key: state_key,
    type,
    sender,
    content,
  };
  const decodeResult = DefaultEventDecoder.decodeStateEvent(rawEventJSON);
  if (isError(decodeResult)) {
    throw new TypeError(
      `Something is wrong with the event generator ${decodeResult.error.errors}`
    );
  } else {
    return decodeResult.ok;
  }
}
