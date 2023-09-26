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
import { PolicyListEditor } from './PolicyListEditor';
import { PolicyListRevision } from './PolicyListRevision';

/**
 * This exists only so that clients can hook into the edits made by the editor
 * in order to produce a new revision as quickly as possible.
 * That might not make sense though.
 *
 * It might not make sense since clients shouldn't be operating on raw lists
 * only some kind of a policy aggregator can do that, and the policy list
 * abstractions would only serve to implement that aggregator.
 *
 * This would also imply that the manager itself also only serves to implelment
 * the aggregator, but that would be incorrect as edits still need to be done
 * on the lists at this level of abstraction.
 */
export interface PolicyList extends PolicyListEditor {
  currentRevision: PolicyListRevision;
}
