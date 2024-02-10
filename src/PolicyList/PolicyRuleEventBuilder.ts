// Copyright (C) 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import {
  ALL_RULE_TYPES,
  PolicyRuleEvent,
  PolicyRuleType,
  UnredactedPolicyContent,
  normalisePolicyRuleType,
} from '../MatrixTypes/PolicyEvents';
import { SHA256 } from 'crypto-js';
import Base64 from 'crypto-js/enc-base64';

export type PolicyRuleEventDescription = {
  state_key: string;
  type: (typeof ALL_RULE_TYPES)[number];
  policyRuleType: PolicyRuleType;
  content: UnredactedPolicyContent | Record<string, never>;
};

export type DescribeBuildPolicyEvent = {
  state_key?: string;
  type?: (typeof ALL_RULE_TYPES)[number];
  content?: UnredactedPolicyContent;
  copyFrom?: PolicyRuleEvent;
  remove?: PolicyRuleEvent;
};

export function policyStateKeyFromContent(
  content: UnredactedPolicyContent
): string {
  return Base64.stringify(SHA256(content.entity + content.recommendation));
}

export function buildPolicyEvent({
  state_key,
  type,
  content,
  copyFrom,
  remove,
}: DescribeBuildPolicyEvent): PolicyRuleEventDescription {
  if (remove !== undefined) {
    return {
      state_key: remove.state_key,
      type: remove.type,
      content: {},
      policyRuleType: normalisePolicyRuleType(remove.type),
    };
  } else if (copyFrom !== undefined) {
    return {
      state_key: state_key ?? copyFrom.state_key,
      type: type ?? copyFrom.type,
      content: content ?? copyFrom.content,
      policyRuleType: normalisePolicyRuleType(copyFrom.type),
    };
  } else if (content !== undefined) {
    if (type === undefined) {
      throw new TypeError(
        `type cannot be undefined while creating empty policy rule content`
      );
    }
    return {
      state_key: state_key ?? policyStateKeyFromContent(content),
      type,
      content,
      policyRuleType: normalisePolicyRuleType(type),
    };
  } else {
    if (state_key === undefined || type === undefined) {
      throw new TypeError(
        `Can't create a policy event with empty content without the state_key and type`
      );
    }
    return {
      state_key,
      type,
      content: {},
      policyRuleType: normalisePolicyRuleType(type),
    };
  }
}
