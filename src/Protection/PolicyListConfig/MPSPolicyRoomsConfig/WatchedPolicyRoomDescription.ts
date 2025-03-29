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

// We probably need our own versions of these just because of unstable identifiers.
// because otherwise the config format will be fucked when we upgrade.
// sigh, we'll just have to let them be string and then find the most appropriate
// variant for each one... sucks balls mare but it's how to do it.

// Remember that this system allows configuration to happen for lists that
// are not being watched, so that the preview can be dynamically updated...
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

const PolicyTypeConfigurationSchema = Type.Partial(
  Type.Record(
    PolicyTypeSchema,
    Type.Object({
      recommendations: Type.Partial(
        Type.Record(
          PolicyRecommendationSchema,
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
