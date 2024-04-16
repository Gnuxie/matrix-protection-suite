// Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { ActionResult } from '../../Interface/Action';
import { LoggableConfig } from '../../Interface/LoggableConfig';
import { MatrixRoomID } from '../../MatrixTypes/MatrixRoomReference';
import { PolicyListRevisionIssuer } from '../../PolicyList/PolicyListRevisionIssuer';

export interface PolicyRoomWatchProfile<T = unknown> {
  room: MatrixRoomID;
  propagation: string;
  options?: T;
}

export interface PolicyListConfig extends LoggableConfig {
  readonly policyListRevisionIssuer: PolicyListRevisionIssuer;
  watchList<T>(
    propagation: string,
    list: MatrixRoomID,
    options: T
  ): Promise<ActionResult<void>>;
  unwatchList(
    propagation: string,
    list: MatrixRoomID
  ): Promise<ActionResult<void>>;
  allWatchedLists: PolicyRoomWatchProfile[];
}

export enum PropagationType {
  Direct = 'direct',
}
