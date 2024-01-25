/**
 * Copyright (C) 2022-2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file is modified and is NOT licensed under the Apache License.
 * This modified file incorperates work from mjolnir
 * https://github.com/matrix-org/mjolnir
 * which included the following license notice:

Copyright 2019 The Matrix.org Foundation C.I.C.

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

import { PolicyRuleEvent } from '../MatrixTypes/PolicyEvents';
import { ChangeType } from '../StateTracking/ChangeType';
import { PolicyRule } from './PolicyRule';

/**
 * A way to guage the diff between two revisions.
 * @see {@link PolicyListRevision}.
 */
export interface PolicyRuleChange {
  readonly changeType: ChangeType;
  /**
   * State event that caused the change.
   * If the rule was redacted, this will be the redacted version of the event.
   */
  readonly event: PolicyRuleEvent;
  /**
   * The sender that caused the change.
   * The original event sender unless the change is because `event` was redacted. When the change is `event` being redacted
   * this will be the user who caused the redaction.
   */
  readonly sender: string;
  /**
   * The current rule represented by the event.
   * If the rule has been removed, then this will show what the rule was.
   */
  readonly rule: PolicyRule;
  /**
   * The previous state that has been changed. Only (and always) provided when the change type is `ChangeType.Removed` or `Modified`.
   * This will be a copy of the same event as `event` when a redaction has occurred and this will show its unredacted state.
   */
  readonly previousState?: PolicyRuleEvent;
}
