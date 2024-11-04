// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { MjolnirProtectionsConfig } from '../ProtectionsConfig/StandardProtectionsConfig';
import { StandardProtectionsManager } from './StandardProtectionsManager';

export function FakeProtectionsManager(): StandardProtectionsManager {
  return new StandardProtectionsManager(new MjolnirProtectionsConfig());
}
