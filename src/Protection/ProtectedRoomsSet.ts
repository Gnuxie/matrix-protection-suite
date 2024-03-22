// SPDX-FileCopyrightText: 2023-2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { Task } from '../Interface/Task';
import { RoomEvent } from '../MatrixTypes/Events';
import { StringRoomID, StringUserID } from '../MatrixTypes/StringlyTypedMatrix';
import { PolicyListRevision } from '../PolicyList/PolicyListRevision';
import { RevisionListener } from '../PolicyList/PolicyListRevisionIssuer';
import { PolicyRuleChange } from '../PolicyList/PolicyRuleChange';
import { EventReport } from '../Reporting/EventReport';
import { MembershipChange } from '../Membership/MembershipChange';
import { RoomMembershipRevision } from '../Membership/MembershipRevision';
import {
  SetMembership,
  SetMembershipListener,
} from '../Membership/SetMembership';
import {
  SetRoomState,
  SetRoomStateListener,
} from '../StateTracking/SetRoomState';
import {
  RoomStateRevision,
  StateChange,
} from '../StateTracking/StateRevisionIssuer';
import { PolicyListConfig } from './PolicyListConfig/PolicyListConfig';
import { ProtectedRoomsConfig } from './ProtectedRoomsConfig/ProtectedRoomsConfig';
import { ProtectionsConfig } from './ProtectionsConfig/ProtectionsConfig';

export interface ProtectedRoomsSet {
  readonly issuerManager: PolicyListConfig;
  readonly protectedRoomsConfig: ProtectedRoomsConfig;
  readonly protections: ProtectionsConfig;
  readonly setMembership: SetMembership;
  readonly setRoomState: SetRoomState;
  readonly userID: StringUserID;
  handleTimelineEvent(roomID: StringRoomID, event: RoomEvent): void;
  handleEventReport(report: EventReport): void;
  isProtectedRoom(roomID: StringRoomID): boolean;
}

export class StandardProtectedRoomsSet implements ProtectedRoomsSet {
  private readonly membershipChangeListener: SetMembershipListener =
    this.setMembershipChangeListener.bind(this);
  private readonly policyChangeListener: RevisionListener =
    this.policyRevisionChangeListener.bind(this);
  private readonly stateChangeListener: SetRoomStateListener =
    this.stateRevisionChangeListener.bind(this);

  constructor(
    public readonly issuerManager: PolicyListConfig,
    public readonly protectedRoomsConfig: ProtectedRoomsConfig,
    public readonly protections: ProtectionsConfig,
    public readonly setMembership: SetMembership,
    public readonly setRoomState: SetRoomState,
    public readonly userID: StringUserID
  ) {
    setMembership.on('membership', this.membershipChangeListener);
    setRoomState.on('revision', this.stateChangeListener);
    issuerManager.policyListRevisionIssuer.on(
      'revision',
      this.policyChangeListener
    );
  }
  public handleTimelineEvent(roomID: StringRoomID, event: RoomEvent): void {
    // this should only be responsible for passing through to protections.
    // The RoomMembershipManage (and its dependants)
    // The PolicyListManager (and its dependents)
    // The RoomStateManager (and its dependents)
    // should get informed directly elsewhere, since there's no reason
    // they cannot be shared across protected rooms sets.
    // The only slightly dodgy thing about that is the PolicyListManager
    // can depend on the RoomStateManager but i don't suppose it'll matter
    // they both are programmed to de-duplicate repeat events.
    const room = this.protectedRoomsConfig.getProtectedRoom(roomID);
    if (room === undefined) {
      throw new TypeError(
        `The protected rooms set should not be being informed about events that it is not protecting`
      );
    }
    for (const protection of this.protections.allProtections) {
      if (protection.handleTimelineEvent === undefined) {
        continue;
      }
      void Task(protection.handleTimelineEvent(room, event));
    }
  }

  public handleEventReport(report: EventReport): void {
    for (const protection of this.protections.allProtections) {
      if (protection.handleEventReport === undefined) {
        continue;
      }
      void Task(protection.handleEventReport(report));
    }
  }

  public isProtectedRoom(roomID: StringRoomID): boolean {
    return this.protectedRoomsConfig.isProtectedRoom(roomID);
  }

  private setMembershipChangeListener(
    _roomID: StringRoomID,
    nextRevision: RoomMembershipRevision,
    changes: MembershipChange[],
    _previousRevision: RoomMembershipRevision
  ): void {
    for (const protection of this.protections.allProtections) {
      if (protection.handleMembershipChange === undefined) {
        continue;
      }
      void Task(protection.handleMembershipChange(nextRevision, changes));
    }
  }

  private policyRevisionChangeListener(
    nextRevision: PolicyListRevision,
    changes: PolicyRuleChange[],
    _previousRevision: PolicyListRevision
  ): void {
    for (const protection of this.protections.allProtections) {
      if (protection.handlePolicyChange === undefined) {
        continue;
      }
      void Task(protection.handlePolicyChange(nextRevision, changes));
    }
  }

  private stateRevisionChangeListener(
    _roomID: StringRoomID,
    nextRevision: RoomStateRevision,
    changes: StateChange[],
    _previousRevision: RoomStateRevision
  ): void {
    for (const protection of this.protections.allProtections) {
      if (protection.handleStateChange === undefined) {
        continue;
      }
      void Task(protection.handleStateChange(nextRevision, changes));
    }
  }
}
