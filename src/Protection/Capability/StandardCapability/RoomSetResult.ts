// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { ActionResult, isError } from '../../../Interface/Action';
import { StringRoomID } from '../../../MatrixTypes/StringlyTypedMatrix';

export interface RoomSetResult {
  readonly isEveryResultOk: boolean;
  readonly numberOfFailedResults: number;
  readonly map: Map<StringRoomID, ActionResult<void>>;
}

export class RoomSetResultBuilder {
  private isEveryResultOk = false;
  private numberOfFailedResults = 0;
  private map = new Map<StringRoomID, ActionResult<void>>();

  public addResult(roomID: StringRoomID, result: ActionResult<void>): void {
    if (isError(result)) {
      this.numberOfFailedResults += 1;
      this.isEveryResultOk = false;
    }
    this.map.set(roomID, result);
  }

  public getResult(): RoomSetResult {
    return {
      isEveryResultOk: this.isEveryResultOk,
      numberOfFailedResults: this.numberOfFailedResults,
      map: this.map,
    };
  }
}
