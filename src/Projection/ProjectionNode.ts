// SPDX-FileCopyrightText: 2025 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: Apache-2.0

import { ULID } from 'ulidx';

export type ExtractDeltaShape<TProjectionNode extends ProjectionNode> =
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TProjectionNode extends ProjectionNode<infer _, infer TDeltaShape>
    ? TDeltaShape
    : never;
type ExtractInputDeltaShapesTuple<TInputs extends ProjectionNode[]> = {
  [K in keyof TInputs]: ExtractDeltaShape<TInputs[K]>;
};
export type ExtractInputDeltaShapes<TInputs extends ProjectionNode[]> =
  ExtractInputDeltaShapesTuple<TInputs>[keyof ExtractInputDeltaShapesTuple<TInputs>];

export interface ProjectionNode<
  TInputs extends ProjectionNode[] = never[],
  TDeltaShape = unknown,
> {
  readonly ulid: ULID;
  reduceInput(input: ExtractInputDeltaShapes<TInputs>): TDeltaShape;
  reduceDelta(input: TDeltaShape): this;
  reduceRebuild(inputs: TInputs): TDeltaShape;
}
