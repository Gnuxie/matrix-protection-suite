// SPDX-FileCopyrightText: 2025 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: Apache-2.0
//
// SPDX-FileAttributionText: <text>
// This modified file incorporates work from matrix-protection-suite
// https://github.com/Gnuxie/matrix-protection-suite
// </text>

import { EventEmitter } from 'stream';
import {
  AnyProjectionNode,
  ExtractDeltaShape,
  ExtractInputDeltaShapes,
  ExtractInputProjectionNodes,
  ExtractProjectionInputs,
  ProjectionNode,
} from './ProjectionNode';

export type ProjectionNodeListener<
  TProjectionNode extends ProjectionNode = ProjectionNode,
> = (
  currentNode: TProjectionNode,
  delta: ExtractDeltaShape<TProjectionNode>,
  previousNode: TProjectionNode
) => void;

export interface Projection<
  TProjectionNode extends AnyProjectionNode = AnyProjectionNode,
> {
  readonly currentNode: TProjectionNode;
  addOutput(projection: Projection): this;
  removeOutput(projection: Projection): this;
  applyInput(input: ExtractProjectionInputs<TProjectionNode>): void;
  addNodeListener(listener: ProjectionNodeListener<TProjectionNode>): this;
  removeNodeListener(listener: ProjectionNodeListener<TProjectionNode>): this;
}

export class ProjectionOutputHelper<
  TProjectionNode extends ProjectionNode = ProjectionNode,
> {
  private readonly outputs = new Set<Projection<ProjectionNode>>();
  private readonly emitter = new EventEmitter();
  public constructor(public currentNode: TProjectionNode) {
    // nothing to do.
  }

  applyInput(
    input: ExtractInputDeltaShapes<ExtractInputProjectionNodes<TProjectionNode>>
  ): void {
    const previousNode = this.currentNode;
    const delta = previousNode.reduceInput(input);
    this.currentNode = previousNode.reduceDelta(delta) as TProjectionNode;
    for (const output of this.outputs) {
      output.applyInput(delta);
    }
    this.emitter.emit('projection', this.currentNode, delta, previousNode);
  }

  addOutput(projection: Projection): this {
    this.outputs.add(projection);
    return this;
  }

  removeOutput(projection: Projection): this {
    this.outputs.delete(projection);
    return this;
  }

  addNodeListener(listener: ProjectionNodeListener<TProjectionNode>): this {
    this.emitter.addListener('projection', listener);
    return this;
  }
  removeNodeListener(listener: ProjectionNodeListener<TProjectionNode>): this {
    this.emitter.removeListener('projection', listener);
    return this;
  }

  [Symbol.dispose](): void {
    this.emitter.removeAllListeners();
    this.outputs.clear();
  }
}
