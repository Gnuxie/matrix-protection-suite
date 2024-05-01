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
import { ProtectionsManager } from './ProtectionsManager/ProtectionsManager';
import { PowerLevelsEvent } from '../MatrixTypes/PowerLevels';
import { Protection, ProtectionDescription } from './Protection';
import {
  MissingPermissionsChange,
  PowerLevelsMirror,
} from '../Client/PowerLevelsMirror';
import { ProtectedRoomsManager } from './ProtectedRoomsManager/ProtectedRoomsManager';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';

export interface ProtectedRoomsSet {
  readonly issuerManager: PolicyListConfig;
  readonly protectedRoomsManager: ProtectedRoomsManager;
  readonly protections: ProtectionsManager;
  readonly setMembership: SetMembership;
  readonly setRoomState: SetRoomState;
  readonly userID: StringUserID;
  readonly allProtectedRooms: MatrixRoomID[];
  handleTimelineEvent(roomID: StringRoomID, event: RoomEvent): void;
  handleEventReport(report: EventReport): void;
  isProtectedRoom(roomID: StringRoomID): boolean;
}

export type ProtectionPermissionsChange = {
  protection: Protection<ProtectionDescription>;
  permissionsChange: MissingPermissionsChange;
};

export type HandleMissingProtectionPermissions = (
  roomID: StringRoomID,
  protectionPermissions: ProtectionPermissionsChange[]
) => void;

export class StandardProtectedRoomsSet implements ProtectedRoomsSet {
  private readonly membershipChangeListener: SetMembershipListener =
    this.setMembershipChangeListener.bind(this);
  private readonly policyChangeListener: RevisionListener =
    this.policyRevisionChangeListener.bind(this);
  private readonly stateChangeListener: SetRoomStateListener =
    this.stateRevisionChangeListener.bind(this);

  constructor(
    public readonly issuerManager: PolicyListConfig,
    public readonly protectedRoomsManager: ProtectedRoomsManager,
    public readonly protections: ProtectionsManager,
    public readonly userID: StringUserID,
    private readonly handleMissingProtectionPermissions?: HandleMissingProtectionPermissions
  ) {
    this.setMembership.on('membership', this.membershipChangeListener);
    this.setRoomState.on('revision', this.stateChangeListener);
    issuerManager.policyListRevisionIssuer.on(
      'revision',
      this.policyChangeListener
    );
  }
  public get setRoomState() {
    return this.protectedRoomsManager.setRoomState;
  }
  public get setMembership() {
    return this.protectedRoomsManager.setMembership;
  }
  public get allProtectedRooms() {
    return this.protectedRoomsManager.allProtectedRooms;
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
    const room = this.protectedRoomsManager.getProtectedRoom(roomID);
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
    return this.protectedRoomsManager.isProtectedRoom(roomID);
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

  private powerLevelsChange(
    nextRevision: RoomStateRevision,
    previousRevision: RoomStateRevision
  ): void {
    const previousPowerLevels =
      previousRevision.getStateEvent<PowerLevelsEvent>(
        'm.room.power_levels',
        ''
      );
    const nextPowerLevels = nextRevision.getStateEvent<PowerLevelsEvent>(
      'm.room.power_levels',
      ''
    );
    const missingPermissionsInfo: ProtectionPermissionsChange[] = [];
    for (const protection of this.protections.allProtections) {
      const permissionsChange =
        PowerLevelsMirror.calculateNewMissingPermissions(this.userID, {
          nextPowerLevelsContent: nextPowerLevels?.content,
          previousPowerLevelsContent: previousPowerLevels?.content,
          requiredEventPermissions: protection.requiredEventPermissions,
          requiredPermissions: protection.requiredPermissions,
          requiredStatePermissions: protection.requiredStatePermissions,
        });
      const {
        isPrivilidgedInNextPowerLevels,
        isPrivilidgedInPriorPowerLevels,
      } = permissionsChange;
      if (!isPrivilidgedInNextPowerLevels) {
        missingPermissionsInfo.push({
          protection,
          permissionsChange,
        });
      }
      if (isPrivilidgedInNextPowerLevels && !isPrivilidgedInPriorPowerLevels) {
        protection.handlePermissionRequirementsMet?.(nextRevision.room);
      }
    }
    if (missingPermissionsInfo.length !== 0) {
      this.handleMissingProtectionPermissions?.(
        nextRevision.room.toRoomIDOrAlias(),
        missingPermissionsInfo
      );
    }
  }

  private stateRevisionChangeListener(
    _roomID: StringRoomID,
    nextRevision: RoomStateRevision,
    changes: StateChange[],
    previousRevision: RoomStateRevision
  ): void {
    const powerLevelsEvent = changes.find(
      (change) => change.eventType === 'm.room.power_levels'
    );
    if (powerLevelsEvent !== undefined) {
      this.powerLevelsChange(nextRevision, previousRevision);
    }
    for (const protection of this.protections.allProtections) {
      if (protection.handleStateChange === undefined) {
        continue;
      }
      void Task(protection.handleStateChange(nextRevision, changes));
    }
  }
}
