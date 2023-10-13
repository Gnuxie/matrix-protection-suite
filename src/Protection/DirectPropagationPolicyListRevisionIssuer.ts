/**
 * Copyright (C) 2022-2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file is modified and is NOT licensed under the Apache License.
 * This modified file incorperates work from mjolnir
 * https://github.com/matrix-org/mjolnir
 * which included the following license notice:

Copyright 2019, 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 *
 * However, this file is modified and the modifications in this file
 * are NOT distributed, contributed, committed, or licensed under the Apache License.
 */

import { EventEmitter } from 'events';
import { PolicyListRevisionIssuer } from '../PolicyList/PolicyListRevisionIssuer';
import { PolicyListRevision } from '../PolicyList/PolicyListRevision';
import { StandardPolicyListRevision } from '../PolicyList/StandardPolicyListRevision';
import { ChangeType, PolicyRuleChange } from '../PolicyList/PolicyRuleChange';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';

export interface DirectPropagationPolicyListRevisionIssuer
  extends PolicyListRevisionIssuer {
  addIssuer(issuer: PolicyListRevisionIssuer): void;
  removeIssuer(issuer: PolicyListRevisionIssuer): void;
  references: MatrixRoomID[];
}

export class StandardDirectPropagationPolicyListRevisionIssuer
  extends EventEmitter
  implements DirectPropagationPolicyListRevisionIssuer
{
  private revision = StandardPolicyListRevision.blankRevision();
  private revisionListener = this.handleRevision.bind(this);
  private readonly policyListRevisionIssuers =
    new Set<PolicyListRevisionIssuer>();
  public constructor(issuers: PolicyListRevisionIssuer[]) {
    super();
    this.addIssuers(issuers);
  }

  public handleRevision(
    _newRevision: PolicyListRevision,
    changes: PolicyRuleChange[]
  ) {
    const oldRevision = this.revision;
    this.revision = this.revision.reviseFromChanges(changes);
    this.emit('revision', this.revision, changes, oldRevision);
  }

  public get currentRevision() {
    return this.revision;
  }
  unregisterListeners(): void {
    for (const issuer of this.policyListRevisionIssuers) {
      issuer.off('revision', this.revisionListener);
    }
  }

  public get references(): MatrixRoomID[] {
    const references: MatrixRoomID[] = [];
    for (const issuer of this.policyListRevisionIssuers) {
      // i don't like this adhoc structural typing, but we don't really have a choice.
      if ('room' in issuer && issuer.room instanceof MatrixRoomID) {
        references.push(issuer.room);
      }
    }
    return references;
  }

  public previewIncorperationOfRevision(
    revision: PolicyListRevision
  ): PolicyRuleChange[] {
    const changes: PolicyRuleChange[] = [];
    for (const policy of revision.allRules()) {
      changes.push({
        // FIXME: Need to have a special change type for watching/unwatching.
        changeType: ChangeType.Added,
        event: policy.sourceEvent,
        sender: policy.sourceEvent.sender,
        rule: policy,
      });
    }
    return changes;
  }

  public previewRemovalOfRevision(
    revision: PolicyListRevision
  ): PolicyRuleChange[] {
    const changes: PolicyRuleChange[] = [];
    for (const policy of revision.allRules()) {
      changes.push({
        // FIXME: Need to have a special change type for watching/unwatching.
        changeType: ChangeType.Removed,
        event: policy.sourceEvent,
        sender: policy.sourceEvent.sender,
        rule: policy,
      });
    }
    return changes;
  }

  private addIssuers(issuers: PolicyListRevisionIssuer[]): void {
    const changes: PolicyRuleChange[] = [];
    for (const issuer of issuers) {
      this.policyListRevisionIssuers.add(issuer);
      issuer.on('revision', this.revisionListener);
      changes.concat(
        this.previewIncorperationOfRevision(issuer.currentRevision)
      );
    }
    this.revision = this.revision.reviseFromChanges(changes);
  }

  public addIssuer(issuer: PolicyListRevisionIssuer): void {
    this.addIssuers([issuer]);
  }

  public removeIssuer(issuer: PolicyListRevisionIssuer): void {
    issuer.off('revision', this.revisionListener);
    this.policyListRevisionIssuers.delete(issuer);
    const changes = this.previewRemovalOfRevision(issuer.currentRevision);
    this.revision = this.revision.reviseFromChanges(changes);
  }
}
