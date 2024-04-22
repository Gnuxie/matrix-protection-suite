// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { Type } from '@sinclair/typebox';
import { ActionResult } from '../../../Interface/Action';
import {
  StringEventID,
  StringRoomID,
} from '../../../MatrixTypes/StringlyTypedMatrix';
import { describeCapabilityInterface } from '../CapabilityInterface';
import { Capability } from '../CapabilityProvider';
import { CapabilityMethodSchema } from './CapabilityMethodSchema';

export interface EventConsequences extends Capability {
  consequenceForEvent(
    roomID: StringRoomID,
    eventID: StringEventID,
    reason: string
  ): Promise<ActionResult<void>>;
}

export const EventConsequences = Type.Intersect([
  Type.Object({
    consequenceForEvent: CapabilityMethodSchema,
  }),
  Capability,
]);

describeCapabilityInterface({
  name: 'EventConsequences',
  description: 'Capabilities for consequences against Matrix events',
  schema: EventConsequences,
});
