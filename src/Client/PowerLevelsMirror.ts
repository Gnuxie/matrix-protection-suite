// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { PowerLevelsEventContent } from '../MatrixTypes/PowerLevels';
import { StringUserID } from '../MatrixTypes/StringlyTypedMatrix';

export enum PowerLevelPermission {
  Ban = 'ban',
  Invite = 'invite',
  Kick = 'kick',
  Redact = 'redact',
}

export type MissingPermissionsChange = {
  missingStatePermissions: string[];
  missingPermissions: PowerLevelPermission[];
  missingEventPermissions: string[];
  isPrivilidgedInNextPowerLevels: boolean;
  isPrivilidgedInPriorPowerLevels: boolean;
};

export const PowerLevelsMirror = Object.freeze({
  getUserPowerLevel(
    who: StringUserID,
    content?: PowerLevelsEventContent
  ): number {
    return content?.users?.[who] ?? content?.users_default ?? 0;
  },
  getStatePowerLevel(
    eventType: string,
    content?: PowerLevelsEventContent
  ): number {
    return content?.events?.[eventType] ?? content?.state_default ?? 50;
  },
  getEventPowerLevel(
    eventType: string,
    content?: PowerLevelsEventContent
  ): number {
    return content?.events?.[eventType] ?? content?.events_default ?? 0;
  },
  isUserAbleToSendState(
    who: StringUserID,
    eventType: string,
    content?: PowerLevelsEventContent
  ): boolean {
    return (
      this.getUserPowerLevel(who, content) >=
      this.getStatePowerLevel(eventType, content)
    );
  },
  isUserAbleToUse(
    who: StringUserID,
    permission: PowerLevelPermission,
    content?: PowerLevelsEventContent
  ): boolean {
    const userLevel = this.getUserPowerLevel(who, content);
    const defaultPowerLevel = permission === 'invite' ? 0 : 50;
    const permissionLevel = content?.[permission] ?? defaultPowerLevel;
    return userLevel >= permissionLevel;
  },
  isUserAbleToSendEvent(
    who: StringUserID,
    eventType: string,
    content?: PowerLevelsEventContent
  ): boolean {
    return (
      this.getUserPowerLevel(who, content) >=
      this.getStatePowerLevel(eventType, content)
    );
  },
  missingPermissions(
    clientUserID: StringUserID,
    requiredPermissions: PowerLevelPermission[],
    powerLevelsContent?: PowerLevelsEventContent
  ): PowerLevelPermission[] {
    const missingPermissions: PowerLevelPermission[] = [];
    for (const permission of requiredPermissions) {
      if (
        !PowerLevelsMirror.isUserAbleToUse(
          clientUserID,
          permission,
          powerLevelsContent
        )
      ) {
        missingPermissions.push(permission);
      }
    }
    return missingPermissions;
  },
  missingStatePermissions(
    clientUserID: StringUserID,
    requiredStatePermissions: string[],
    powerLevelsContent?: PowerLevelsEventContent
  ): string[] {
    const missingPermissions: string[] = [];
    for (const permission of requiredStatePermissions) {
      if (
        !PowerLevelsMirror.isUserAbleToSendState(
          clientUserID,
          permission,
          powerLevelsContent
        )
      ) {
        missingPermissions.push(permission);
      }
    }
    return missingPermissions;
  },
  missingEventPermissions(
    clientUserID: StringUserID,
    requiredEventPermissions: string[],
    powerLevelsContent?: PowerLevelsEventContent
  ): string[] {
    const missingPermissions: string[] = [];
    for (const permission of requiredEventPermissions) {
      if (
        !PowerLevelsMirror.isUserAbleToSendEvent(
          clientUserID,
          permission,
          powerLevelsContent
        )
      ) {
        missingPermissions.push(permission);
      }
    }
    return missingPermissions;
  },
  calculateNewMissingPermissions(
    userID: StringUserID,
    {
      nextPowerLevelsContent,
      previousPowerLevelsContent,
      requiredEventPermissions,
      requiredPermissions,
      requiredStatePermissions,
    }: {
      nextPowerLevelsContent?: PowerLevelsEventContent;
      previousPowerLevelsContent?: PowerLevelsEventContent;
      requiredEventPermissions: string[];
      requiredPermissions: PowerLevelPermission[];
      requiredStatePermissions: string[];
    }
  ): MissingPermissionsChange {
    const nextMissingPermissions = this.missingPermissions(
      userID,
      requiredPermissions,
      nextPowerLevelsContent
    );
    const previousMissingPermissions = this.missingPermissions(
      userID,
      requiredPermissions,
      previousPowerLevelsContent
    );
    const nextMissingStatePermissions = this.missingStatePermissions(
      userID,
      requiredStatePermissions,
      nextPowerLevelsContent
    );
    const previousMissingStatePermissions = this.missingStatePermissions(
      userID,
      requiredStatePermissions,
      previousPowerLevelsContent
    );
    const nextMissingEventPermissions = this.missingEventPermissions(
      userID,
      requiredEventPermissions,
      nextPowerLevelsContent
    );
    const previousMissingEventPermissions = this.missingEventPermissions(
      userID,
      requiredEventPermissions,
      previousPowerLevelsContent
    );
    const isPrivilidgedInNextRevision =
      nextMissingStatePermissions.length === 0 &&
      nextMissingEventPermissions.length === 0 &&
      nextMissingPermissions.length === 0;
    const isPrivilidgedInPriorRevision =
      previousMissingStatePermissions.length === 0 &&
      previousMissingEventPermissions.length === 0 &&
      previousMissingPermissions.length === 0;
    return {
      missingStatePermissions: nextMissingStatePermissions,
      missingPermissions: nextMissingPermissions,
      missingEventPermissions: nextMissingEventPermissions,
      isPrivilidgedInNextPowerLevels: isPrivilidgedInNextRevision,
      isPrivilidgedInPriorPowerLevels: isPrivilidgedInPriorRevision,
    };
  },
});
