// SPDX-FileCopyrightText: 2025 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: Apache-2.0

import { ExtractDeltaShape, ProjectionNode } from './ProjectionNode';

export type ProjectionNodeListener<
  TProjectionNode extends ProjectionNode = ProjectionNode,
> = (
  currentNode: TProjectionNode,
  delta: ExtractDeltaShape<TProjectionNode>,
  previousNode: TProjectionNode
) => void;

export interface Projection<
  TProjectionNode extends ProjectionNode = ProjectionNode,
> {
  readonly currentRevision: TProjectionNode;
  addNodeListener(listener: ProjectionNodeListener<TProjectionNode>): this;
  removeNodeListener(listener: ProjectionNodeListener<TProjectionNode>): this;
}
