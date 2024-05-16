// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { ActionError, ActionResult } from '../Interface/Action';

const PaginationTokenSecret = Symbol('PaginationTokenSecret');
export type StringPaginationToken = string & { [PaginationTokenSecret]: true };

export interface ChunkPage<ChunkItem> {
  getNextPage(): Promise<ActionResult<ChunkPage<ChunkItem>>>;
  chunk: ChunkItem[];
  nextToken?: StringPaginationToken;
  previousToken?: StringPaginationToken;
  hasNext(): boolean;
  hasPrevious(): boolean;
  isFirstPage(): boolean;
}

export interface PaginationOptions {
  direction?: 'forwards' | 'backwards';
  from?: StringPaginationToken;
  itemLimitPerPage?: number;
  to?: StringPaginationToken;
}

export type StreamPaginationForEachCB<ChunkItem> = (item: ChunkItem) => void;
export type StreamPaginationTestStopCB<ChunkItem> = (
  item: ChunkItem
) => boolean;

export interface StreamPaginationOptions<ChunkItem> extends PaginationOptions {
  totalItemLimit?: number;
  forEachCB?: StreamPaginationForEachCB<ChunkItem>;
  testStopCB?: StreamPaginationForEachCB<ChunkItem>;
}

export interface StreamPaginationError extends ActionError {
  nextToken?: StringPaginationToken;
  previousToken?: StringPaginationToken;
}
