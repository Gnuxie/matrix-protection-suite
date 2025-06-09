// SPDX-FileCopyrightText: 2024 - 2025 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { Result } from '@gnuxie/typescript-result';
import { PaginationChunk } from './PaginationChunk';
import { PaginationRequest } from './PaginationRequest';

/**
 * A generalized paginator over a Matrix endpoint.
 */
export interface MatrixPaginator<
  ChunkItem,
  TRequest extends PaginationRequest = PaginationRequest,
> {
  /**
   * Request a page of results.
   */
  fetchPage(request: TRequest): Promise<Result<PaginationChunk<ChunkItem>>>;
}
