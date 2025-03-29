// SPDX-FileCopyrightText: 2025 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { Type } from '@sinclair/typebox';
import { describeConfig } from '../../../Config/describeConfig';
import { EDStatic } from '../../../Interface/Static';
import { PolicyRuleType } from '../../../MatrixTypes/PolicyEvents';
import { Recommendation } from '../../../PolicyList/PolicyRule';
import { StringRoomIDSchema } from '../../../MatrixTypes/StringlyTypedMatrix';

const PolicyTypeSchema = Type.Union([
  Type.Literal(PolicyRuleType.Room),
  Type.Literal(PolicyRuleType.User),
  Type.Literal(PolicyRuleType.Server),
]);

const PolicyRecommendationSchema = Type.Union([
  Type.Literal(Recommendation.Ban),
  Type.Literal(Recommendation.Allow),
  Type.Literal(Recommendation.Takedown),
]);

const PolicyTypeConfigurationSchema = Type.Record(
  PolicyTypeSchema,
  Type.Object({
    recommendations: Type.Union([
      Type.Array(PolicyRecommendationSchema),
      Type.Literal('all'),
    ]),
  })
);

export type WatchedRoomConfigurationSchema = EDStatic<
  typeof WatchedRoomConfigurationSchema
>;
export const WatchedRoomConfigurationSchema = Type.Object({
  room_id: StringRoomIDSchema,
  direct_propagation: PolicyTypeConfigurationSchema,
  sender_propagation: Type.Union([
    Type.Record(Type.String(), PolicyTypeConfigurationSchema),
    Type.Literal('all'),
  ]),
});

export const DefaultWatchProfile = Object.freeze({
  direct_propagation: {
    [PolicyRuleType.Room]: {
      recommendations: [Recommendation.Ban, Recommendation.Takedown],
    },
    [PolicyRuleType.User]: {
      recommendations: [Recommendation.Ban, Recommendation.Takedown],
    },
    [PolicyRuleType.Server]: {
      recommendations: [Recommendation.Ban, Recommendation.Takedown],
    },
  },
  sender_propagation: 'all',
} satisfies Omit<WatchedRoomConfigurationSchema, 'room_id'>);

/**
 * This is for use in a state event to configure the watch profile for a single
 * policy room. This can be used in addition to a filter profile for a specific
 * policy room that acts after this profile. The filter profile can be anything
 * and works like a capability.
 */
export const WatchedPolicyRoomConfigDescription = describeConfig({
  schema: WatchedRoomConfigurationSchema,
});

// Hmm i don't know if we need to specify this format yet...
// especially since i don't know how to give option for "leave unapproved" vs "dispose"
// empty policies, and what if they just want the policies listed to be considered for approval.

// One way would be to just have direct_propagatin, unapproved_propagation, and then
// nest that for each sender on top and work out an application rule that doesn't suck..
// the only reaso nto do this as opposed to repeating it for each type or recommendation
// is to avoid duplication... but it's probably in reality more confusing.
// hmm actually i don't know let me draw this.

// *writes wireframe*
