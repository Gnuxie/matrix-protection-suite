// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { FormatRegistry, StaticDecode, Type } from '@sinclair/typebox';
import { ActionError, ActionResult, Ok, isError } from '../Interface/Action';

const PaginationTokenSecret = Symbol('PaginationTokenSecret');
export type StringPaginationToken = string & { [PaginationTokenSecret]: true };

FormatRegistry.Set(
  'StringPaginationToken',
  (thing: unknown) => typeof thing === 'string'
);

export const StringPaginationToken = Type.Unsafe<StringPaginationToken>(
  Type.String({ format: 'StringPaginationToken' })
);

export interface ChunkPage<ChunkItem> {
  getNextPage(): Promise<ActionResult<ChunkPage<ChunkItem>, PaginationError>>;
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
  testStopCB?: StreamPaginationTestStopCB<ChunkItem>;
}

export interface PaginationError extends ActionError {
  nextToken?: StringPaginationToken;
  previousToken?: StringPaginationToken;
}

export async function doPagination<ChunkItem>(
  startingPage: ChunkPage<ChunkItem>,
  options: StreamPaginationOptions<ChunkItem>
): Promise<ActionResult<void, PaginationError>> {
  const isUnderLimit = (count: number) =>
    options.totalItemLimit === undefined || count < options.totalItemLimit;
  let itemCount = 0;
  let currentPage = startingPage;
  while (true) {
    let isMarkedAsStop = false;
    for (const item of currentPage.chunk) {
      isMarkedAsStop =
        !isUnderLimit(itemCount) || (options.testStopCB?.(item) ?? false);
      if (isMarkedAsStop) {
        break;
      }
      options.forEachCB?.(item);
      itemCount++;
    }
    if (isMarkedAsStop) {
      break;
    }
    if (!currentPage.hasNext() && !currentPage.isFirstPage()) {
      break; // no more items.
    }
    const nextPageResult = await currentPage.getNextPage();
    if (isError(nextPageResult)) {
      return nextPageResult;
    } else {
      currentPage = nextPageResult.ok;
    }
  }
  return Ok(undefined);
}

export type StandardChunkPageGetter<ChunkItem> = (
  options: PaginationOptions
) => Promise<ActionResult<PaginatedResponse<ChunkItem>, PaginationError>>;

export class StandardChunkPage<ChunkItem> implements ChunkPage<ChunkItem> {
  public readonly nextToken?: StringPaginationToken;
  public readonly previousToken?: StringPaginationToken | undefined;
  readonly #isFirstPage: boolean;
  public static createFirstPage<ChunkItem>(
    chunkGetter: StandardChunkPageGetter<ChunkItem>,
    paginationOptions: StreamPaginationOptions<ChunkItem>
  ): StandardChunkPage<ChunkItem> {
    return new StandardChunkPage<ChunkItem>(
      [],
      chunkGetter,
      true,
      {
        nextToken: paginationOptions.from,
      },
      paginationOptions
    );
  }
  private constructor(
    public readonly chunk: ChunkItem[],
    private readonly chunkGetter: StandardChunkPageGetter<ChunkItem>,
    isFirstPage: boolean,
    {
      nextToken,
      previousToken,
    }: {
      nextToken?: StringPaginationToken;
      previousToken?: StringPaginationToken;
    },
    private readonly paginationOptions: Omit<
      StreamPaginationOptions<ChunkItem>,
      'from'
    >
  ) {
    this.#isFirstPage = isFirstPage;
    this.nextToken = nextToken;
    this.previousToken = previousToken;
  }
  public isFirstPage(): boolean {
    return this.#isFirstPage;
  }
  public hasNext(): boolean {
    return this.nextToken !== undefined;
  }
  public hasPrevious(): boolean {
    return this.previousToken !== undefined;
  }
  public async getNextPage(): Promise<
    ActionResult<ChunkPage<ChunkItem>, PaginationError>
  > {
    if (!this.hasNext() && !this.isFirstPage()) {
      throw new TypeError(
        `You're not checking whether the page hasNext() before iterating further`
      );
    }
    const nextChunk = await this.chunkGetter({
      ...this.paginationOptions,
      from: this.nextToken,
    });
    if (isError(nextChunk)) {
      return nextChunk;
    }
    return Ok(
      new StandardChunkPage(
        nextChunk.ok.chunk,
        this.chunkGetter,
        false,
        {
          nextToken: nextChunk.ok.next_batch,
          previousToken: nextChunk.ok.prev_batch,
        },
        this.paginationOptions
      )
    );
  }
}

export const PaginatedResponse = Type.Object({
  chunk: Type.Array(Type.Unknown()),
  prev_batch: Type.Optional(StringPaginationToken),
  next_batch: Type.Optional(StringPaginationToken),
});
export type PaginatedResponse<ChunkItem = unknown> = Omit<
  StaticDecode<typeof PaginatedResponse>,
  'chunk'
> & { chunk: ChunkItem[] };
