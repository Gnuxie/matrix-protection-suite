// SPDX-FileCopyrightText: 2025 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: Apache-2.0

import { ULID } from 'ulidx';

export type ExtractDeltaShape<TProjectionNode extends ProjectionNode> =
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TProjectionNode extends ProjectionNode<infer _, infer TDeltaShape>
    ? TDeltaShape
    : never;

export type ExtractInputDeltaShapes<TInputs extends readonly ProjectionNode[]> =
  ExtractDeltaShape<TInputs[number]>;

export interface ProjectionNode<
  TInputs extends ProjectionNode[] = never[],
  TDeltaShape = unknown,
> {
  readonly ulid: ULID;
  // Whether the projection has no state at all.
  isEmpty(): boolean;
  reduceInput(input: ExtractInputDeltaShapes<TInputs>): TDeltaShape;
  reduceDelta(input: TDeltaShape): ProjectionNode<TInputs, TDeltaShape>;
  /**
   * Produces the initial delta, can only be used when the revision is empty.
   * Otherwise you must use reduceRebuild.
   */
  reduceInitialInputs(input: TInputs): TDeltaShape;
  // only needed for persistent storage
  reduceRebuild?(inputs: TInputs): TDeltaShape;
}
