// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { ActionResult, isError } from '../../../Interface/Action';
import {
  StringRoomID,
  StringUserID,
} from '../../../MatrixTypes/StringlyTypedMatrix';

export interface SetResult {
  readonly isEveryResultOk: boolean;
  readonly numberOfFailedResults: number;
}

export interface RoomSetResult extends SetResult {
  readonly map: Map<StringRoomID, ActionResult<void>>;
}

export class RoomSetResultBuilder {
  private isEveryResultOk = false;
  private numberOfFailedResults = 0;
  private map = new Map<StringRoomID, ActionResult<void>>();

  public addResult(
    roomID: StringRoomID,
    result: ActionResult<void>
  ): RoomSetResultBuilder {
    if (isError(result)) {
      this.numberOfFailedResults += 1;
      this.isEveryResultOk = false;
    }
    this.map.set(roomID, result);
    return this;
  }

  public getResult(): RoomSetResult {
    return {
      isEveryResultOk: this.isEveryResultOk,
      numberOfFailedResults: this.numberOfFailedResults,
      map: this.map,
    };
  }
}

export interface ResultForUsersInSet extends SetResult {
  readonly map: Map<StringUserID, RoomSetResult>;
}

export class ResultForUsersInSetBuilder {
  private isEveryResultOk = false;
  private numberOfFailedResults = 0;
  private map = new Map<StringUserID, RoomSetResultBuilder>();

  public addResult(
    userID: StringUserID,
    roomID: StringRoomID,
    result: ActionResult<void>
  ): ResultForUsersInSetBuilder {
    if (isError(result)) {
      this.numberOfFailedResults += 1;
      this.isEveryResultOk = false;
    }
    const entry = this.map.get(userID);
    if (entry === undefined) {
      this.map.set(
        userID,
        new RoomSetResultBuilder().addResult(roomID, result)
      );
    } else {
      entry.addResult(roomID, result);
    }
    return this;
  }

  public getResult(): ResultForUsersInSet {
    return {
      isEveryResultOk: this.isEveryResultOk,
      numberOfFailedResults: this.numberOfFailedResults,
      map: [...this.map.entries()].reduce(
        (nextMap, [userID, roomSetResultBuilder]) => {
          nextMap.set(userID, roomSetResultBuilder.getResult());
          return nextMap;
        },
        new Map<StringUserID, RoomSetResult>()
      ),
    };
  }
}
