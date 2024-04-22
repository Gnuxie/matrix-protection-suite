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
    requiredEventPermissions: string[],
    powerLevelsContent?: PowerLevelsEventContent
  ): string[] {
    const missingPermissions: string[] = [];
    for (const permission of requiredEventPermissions) {
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
  calculateNewMissingPermissions(
    userID: StringUserID,
    requiredEventPermissions: string[],
    requiredPermissions: PowerLevelPermission[],
    {
      nextPowerLevelsContent,
      previousPowerLevelsContent,
    }: {
      nextPowerLevelsContent?: PowerLevelsEventContent;
      previousPowerLevelsContent?: PowerLevelsEventContent;
    }
  ): {
    missingStatePermissions: string[];
    missingPermissions: PowerLevelPermission[];
    isPrivilidgedInNextPowerLevels: boolean;
    isPrivilidgedInPriorPowerLevels: boolean;
  } {
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
      requiredEventPermissions,
      nextPowerLevelsContent
    );
    const previousMissingStatePermissions = this.missingStatePermissions(
      userID,
      requiredEventPermissions,
      previousPowerLevelsContent
    );
    const isPrivilidgedInNextRevision =
      nextMissingStatePermissions.length === 0 &&
      nextMissingPermissions.length === 0;
    const isPrivilidgedInPriorRevision =
      previousMissingStatePermissions.length === 0 &&
      previousMissingPermissions.length === 0;
    return {
      missingStatePermissions: nextMissingStatePermissions,
      missingPermissions: nextMissingPermissions,
      isPrivilidgedInNextPowerLevels: isPrivilidgedInNextRevision,
      isPrivilidgedInPriorPowerLevels: isPrivilidgedInPriorRevision,
    };
  },
});
