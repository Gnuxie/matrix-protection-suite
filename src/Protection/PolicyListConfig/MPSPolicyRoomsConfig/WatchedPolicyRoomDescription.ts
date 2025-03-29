// SPDX-FileCopyrightText: 2025 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { Type } from '@sinclair/typebox';
import { describeConfig } from '../../../Config/describeConfig';
import { EDStatic } from '../../../Interface/Static';
import { PolicyRuleType } from '../../../MatrixTypes/PolicyEvents';
import { Recommendation } from '../../../PolicyList/PolicyRule';
import {
  StringRoomIDSchema,
  StringUserIDSchema,
} from '../../../MatrixTypes/StringlyTypedMatrix';

// Remember that this system allows configuration to happen for lists that
// are not being watched, so that the preview can be dynamically updated...

const PolicyPropagationConfigurationSchema = Type.Union([
  Type.Array(StringUserIDSchema),
  Type.Literal('all'),
]);

const PolicyRecommendationConfigurationSchema = Type.Partial(
  Type.Object({
    direct_propagation_senders: PolicyPropagationConfigurationSchema,
    approval_propagation_senders: PolicyPropagationConfigurationSchema,
  })
);

/**
 * The reason we don't have a schema for policy types and recommendations here
 * is to not create a mess when the stable identifier for unstable MSCs change.
 * Such as takedown. We can just pull out any of the variants in order
 * until we get one that sticks.
 */
const PolicyTypeConfigurationSchema = Type.Partial(
  Type.Record(
    Type.String({ description: 'The policy type' }),
    Type.Object({
      recommendations: Type.Partial(
        Type.Record(
          Type.String({ description: 'The policy recommendation' }),
          PolicyRecommendationConfigurationSchema
        )
      ),
    })
  )
);

export type WatchedRoomConfigurationSchema = EDStatic<
  typeof WatchedRoomConfigurationSchema
>;
export const WatchedRoomConfigurationSchema = Type.Object({
  room_id: StringRoomIDSchema,
  policy_types: PolicyTypeConfigurationSchema,
});

export const DefaultWatchProfile = Object.freeze({
  policy_types: {
    [PolicyRuleType.Room]: {
      recommendations: {
        [Recommendation.Ban]: {
          direct_propagation_senders: 'all',
        },
        [Recommendation.Takedown]: {
          direct_propagation_senders: 'all',
        },
      },
    },
    [PolicyRuleType.User]: {
      recommendations: {
        [Recommendation.Ban]: {
          direct_propagation_senders: 'all',
        },
        [Recommendation.Takedown]: {
          direct_propagation_senders: 'all',
        },
      },
    },
    [PolicyRuleType.Server]: {
      recommendations: {
        [Recommendation.Ban]: {
          direct_propagation_senders: 'all',
        },
        [Recommendation.Takedown]: {
          direct_propagation_senders: 'all',
        },
      },
    },
  },
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
