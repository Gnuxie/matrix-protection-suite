/**
 * Copyright (C) 2022-2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file is modified and is NOT licensed under the Apache License.
 * This modified file incorperates work from mjolnir
 * https://github.com/matrix-org/mjolnir
 * which included the following license notice:

Copyright 2019-2021 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 *
 * However, this file is modified and the modifications in this file
 * are NOT distributed, contributed, committed, or licensed under the Apache License.
 */

import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { PolicyRuleEvent, PolicyRuleType } from '../MatrixTypes/PolicyEvents';
import { PolicyRule, Recommendation } from './PolicyRule';
import { PolicyRuleChange } from './PolicyRuleChange';
import { Revision } from './Revision';

/** MSC3784 support. Please note that policy lists predate room types. So there will be lists in the wild without this type. */
export const POLICY_ROOM_TYPE = 'support.feline.policy.lists.msc.v1';
export const POLICY_ROOM_TYPE_VARIANTS = [POLICY_ROOM_TYPE];
export const SHORTCODE_EVENT_TYPE = 'org.matrix.mjolnir.shortcode';

export interface PolicyListRevision {
  readonly room: MatrixRoomID;
  readonly revisionID: Revision;
  allRules(): PolicyRule[];
  userRules(recommendation?: Recommendation): PolicyRule[];
  serverRules(recommendation?: Recommendation): PolicyRule[];
  roomRules(recommendation?: Recommendation): PolicyRule[];
  rulesMatchingEntity(entity: string, ruleKind?: PolicyRuleType): PolicyRule[];
  rulesOfKind(kind: PolicyRuleType, recommendation?: string): PolicyRule[];
  changes(state: PolicyRuleEvent[]): PolicyRuleChange[];
  revise(policyState: PolicyRuleEvent[]): PolicyListRevision;
}
