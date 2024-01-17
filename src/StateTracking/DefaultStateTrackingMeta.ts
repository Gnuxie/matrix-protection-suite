/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { ALL_RULE_TYPES } from '../MatrixTypes/PolicyEvents';
import { MJOLNIR_PROTECTED_ROOMS_EVENT_TYPE } from '../Protection/ProtectedRoomsConfig/MjolnirProtectedRoomsEvent';
import {
  MjolnirEnabledProtectionsEventType,
  MjolnirProtectionSettingsEventType,
} from '../Protection/ProtectionsConfig/MjolnirProtectionsConfig';
import {
  StandardStateTrackingMeta,
  StateTrackingMeta,
} from './StateTrackingMeta';

export let DefaultStateTrackingMeta: StateTrackingMeta =
  new StandardStateTrackingMeta()
    .setInformOnlyStateType('m.room.member')
    .setStoredStateType('m.room.server_acl')
    .setStoredStateType(MjolnirEnabledProtectionsEventType)
    .setStoredStateType(MjolnirProtectionSettingsEventType)
    .setStoredStateType(MJOLNIR_PROTECTED_ROOMS_EVENT_TYPE);

for (const type of ALL_RULE_TYPES) {
  DefaultStateTrackingMeta =
    DefaultStateTrackingMeta.setInformOnlyStateType(type);
}
