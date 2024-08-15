// Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { MatrixRoomID } from '@the-draupnir-project/matrix-basic-types';
import { ActionResult } from '../../Interface/Action';
import { LoggableConfig } from '../../Interface/LoggableConfig';
import { PolicyListRevisionIssuer } from '../../PolicyList/PolicyListRevisionIssuer';

export interface PolicyRoomWatchProfile<T = unknown> {
  room: MatrixRoomID;
  propagation: string;
  options?: T;
}

export interface PolicyListConfig extends LoggableConfig {
  readonly policyListRevisionIssuer: PolicyListRevisionIssuer;
  watchList<T>(
    propagation: PropagationType,
    list: MatrixRoomID,
    options: T
  ): Promise<ActionResult<void>>;
  unwatchList(
    propagation: PropagationType,
    list: MatrixRoomID
  ): Promise<ActionResult<void>>;
  allWatchedLists: PolicyRoomWatchProfile[];
}

export enum PropagationType {
  Direct = 'direct',
}
