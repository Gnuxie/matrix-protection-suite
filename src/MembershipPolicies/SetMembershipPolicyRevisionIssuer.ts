// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import EventEmitter from 'events';
import {
  SetMembershipDelta,
  SetMembershipRevision,
} from '../Membership/SetMembershipRevision';
import {
  SetMembershipRevisionIssuer,
  SetMembershipRevisionListener,
} from '../Membership/SetMembershipRevisionIssuer';
import {
  PolicyListRevisionIssuer,
  RevisionListener,
} from '../PolicyList/PolicyListRevisionIssuer';
import {
  MembershipPolicyRevisionDelta,
  SetMembershipPolicyRevision,
} from './MembershipPolicyRevision';
import { StandardSetMembershipPolicyRevision } from './StandardSetMembershipPolicyRevision';
import { PolicyListRevision } from '../PolicyList/PolicyListRevision';
import { PolicyRuleChange } from '../PolicyList/PolicyRuleChange';
import { Logger } from '../Logging/Logger';
import {
  SetRoomMembership,
  SetRoomMembershipListener,
} from '../Membership/SetRoomMembership';

const log = new Logger('SetMembershipPolicyRevisionIssuer');

export type SetMembershipPolicyRevisionListener = (
  nextRevision: SetMembershipPolicyRevision,
  changes: MembershipPolicyRevisionDelta,
  previousRevision: SetMembershipPolicyRevision
) => void;

export interface SetMembershipPolicyRevisionIssuer {
  readonly currentRevision: SetMembershipPolicyRevision;
  on(event: 'revision', listener: SetMembershipPolicyRevisionListener): this;
  off(event: 'revision', listener: SetMembershipPolicyRevisionListener): this;
  emit(
    event: 'revision',
    ...args: Parameters<SetMembershipPolicyRevisionListener>
  ): boolean;
  unregisterListeners(): void;
}

export class StandardMembershipPolicyRevisionIssuer
  extends EventEmitter
  implements SetMembershipPolicyRevisionIssuer
{
  currentRevision: SetMembershipPolicyRevision;
  private readonly setMembershipRevisionListener: SetMembershipRevisionListener;
  private readonly policyRevisionListener: RevisionListener;
  constructor(
    private readonly setMembershipRevisionIssuer: SetMembershipRevisionIssuer,
    private readonly setRoomMembership: SetRoomMembership,
    private readonly policyRevisionIssuer: PolicyListRevisionIssuer
  ) {
    super();
    log.info(
      'Creating a SetMembershipPolicyRevision, this may take some time.'
    );
    this.currentRevision = StandardSetMembershipPolicyRevision.blankRevision();
    this.currentRevision = this.currentRevision.reviseFromChanges(
      this.currentRevision.changesFromInitialRevisions(
        policyRevisionIssuer.currentRevision,
        setMembershipRevisionIssuer.currentRevision
      ),
      this.setRoomMembership
    );
    log.info('Finished creating a SetMembershipPolicyRevision.');
    this.setMembershipRevisionListener = this.setMembershipRevision.bind(this);
    this.policyRevisionListener = this.policyRevision.bind(this);
    setMembershipRevisionIssuer.on(
      'revision',
      this.setMembershipRevisionListener
    );
    policyRevisionIssuer.on('revision', this.policyRevisionListener);
    setRoomMembership.on(
      'membership',
      this.setRoomMembershipMembershipListener
    );
  }

  private setMembershipRevision(
    nextRevision: SetMembershipRevision,
    setMembershipDelta: SetMembershipDelta
  ): void {
    const previousRevision = this.currentRevision;
    const changes = this.currentRevision.changesFromMembershipChanges(
      setMembershipDelta,
      this.policyRevisionIssuer.currentRevision
    );
    if (
      changes.addedMemberMatches.length === 0 &&
      changes.removedMemberMatches.length === 0
    ) {
      return;
    }
    this.currentRevision = this.currentRevision.reviseFromChanges(
      changes,
      this.setRoomMembership
    );
    this.emit('revision', this.currentRevision, changes, previousRevision);
  }

  private policyRevision(
    nextRevision: PolicyListRevision,
    policyChanges: PolicyRuleChange[]
  ): void {
    const previousRevision = this.currentRevision;
    const changes = this.currentRevision.changesFromPolicyChanges(
      policyChanges,
      this.setMembershipRevisionIssuer.currentRevision
    );
    this.currentRevision = this.currentRevision.reviseFromChanges(
      changes,
      this.setRoomMembership
    );
    this.emit('revision', this.currentRevision, changes, previousRevision);
  }

  private readonly setRoomMembershipMembershipListener = (
    function (
      this: StandardMembershipPolicyRevisionIssuer,
      roomID,
      revision,
      setMembershipChanges
    ) {
      const changes = this.currentRevision.changedFromRoomMembershipChanges(
        revision,
        setMembershipChanges
      );
      const previousRevision = this.currentRevision;
      this.currentRevision = previousRevision.reviseFromChanges(
        changes,
        this.setRoomMembership
      );
    } satisfies SetRoomMembershipListener
  ).bind(this);

  public unregisterListeners(): void {
    this.setMembershipRevisionIssuer.off(
      'revision',
      this.setMembershipRevisionListener
    );
    this.policyRevisionIssuer.off('revision', this.policyRevisionListener);
    this.setRoomMembership.off(
      'membership',
      this.setRoomMembershipMembershipListener
    );
  }
}
