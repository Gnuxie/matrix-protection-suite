// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { MatrixAccountData } from './PersistentMatrixData';
import { ActionResult, Ok } from './Action';

export class FakeMatrixAccountData<T> implements MatrixAccountData<T> {
  private fakePersistedData: T;
  constructor(initialData: T) {
    this.fakePersistedData = initialData;
  }
  requestAccountData(): Promise<ActionResult<T | undefined>> {
    return Promise.resolve(Ok(this.fakePersistedData));
  }
  storeAccountData(data: T): Promise<ActionResult<void>> {
    this.fakePersistedData = data;
    return Promise.resolve(Ok(undefined));
  }
}
