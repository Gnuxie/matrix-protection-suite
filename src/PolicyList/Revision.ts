/**
 * Copyright (C) 2022 Gnuxie <Gnuxie@protonmail.com>
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

import { monotonicFactory } from 'ulidx';

/**
 * Represents a specific version of the state contained in `PolicyListRevision`.
 * These are unique and can be compared with `supersedes`.
 * We use a ULID to work out whether a revision supersedes another.
 * @see {@link PolicyListRevision}.
 */
export class Revision {
  /**
   * Ensures that ULIDs are monotonic.
   */
  private static makeULID = monotonicFactory();

  /**
   * Is only public for the comparison method,
   * I feel like I'm missing something here and it is possible without
   */
  public readonly ulid = Revision.makeULID();

  constructor() {
    // nothing to do.
  }

  /**
   * Check whether this revision supersedes another revision.
   * @param revision The revision we want to check this supersedes.
   * @returns True if this Revision supersedes the other revision.
   */
  public supersedes(revision: Revision): boolean {
    return this.ulid > revision.ulid;
  }
}
