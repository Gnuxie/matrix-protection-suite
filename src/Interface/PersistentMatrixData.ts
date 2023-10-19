/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 */

import { StaticDecode, TSchema } from '@sinclair/typebox';
import { ActionResult } from './Action';

export interface PersistentMatrixData<T extends TSchema> {
  requestPersistentData(): Promise<ActionResult<StaticDecode<T>>>;
  storePersistentData(data: StaticDecode<T>): Promise<ActionResult<void>>;
}
