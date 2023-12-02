/**
 * Copyright (C) 2023 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 *
 * This file is modified and is NOT licensed under the Apache License.
 * This modified file incorperates work from synapse
 * https://github.com/matrix-org/synapse
 * which included the following license notice:

Copyright 2019-2021 The Matrix.org Foundation C.I.C.

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

import { StaticDecode, Type } from '@sinclair/typebox';
import { StringUserID } from '../StringlyTypedMatrix';

export type SynapseAdminGetUserAdminResponse = StaticDecode<
  typeof SynapseAdminGetUserAdminResponse
>;
export const SynapseAdminGetUserAdminResponse = Type.Object({
  admin: Type.Optional(Type.Union([Type.Null(), Type.Boolean()])),
});

export type SynapseAdminPostUserDeactivateRequest = StaticDecode<
  typeof SynapseAdminPostUserDeactivateRequest
>;
export const SynapseAdminPostUserDeactivateRequest = Type.Object({
  erase: Type.Optional(Type.Boolean({ default: false })),
});

export type SynapseAdminDeleteRoomRequest = StaticDecode<
  typeof SynapseAdminDeleteRoomRequest
>;
export const SynapseAdminDeleteRoomRequest = Type.Object({
  new_room_user_id: Type.Union([Type.Optional(StringUserID)], {
    description:
      ' If set, a new room will be created with this user ID as the creator and admin, and all users in the old room will be moved into that room. If not set, no new room will be created and the users will just be removed from the old room. The user ID must be on the local server, but does not necessarily have to belong to a registered user.',
  }),
  room_name: Type.Optional(
    Type.String({
      description:
        'A string representing the name of the room that new users will be invited to. Defaults to Content Violation Notification',
    })
  ),
  message: Type.Optional(
    Type.String({
      description:
        'A string containing the first message that will be sent as new_room_user_id in the new room. Ideally this will clearly convey why the original room was shut down. Defaults to Sharing illegal content on this server is not permitted and rooms in violation will be blocked.',
    })
  ),
  block: Type.Optional(
    Type.Boolean({
      description:
        'block - Optional. If set to true, this room will be added to a blocking list, preventing future attempts to join the room. Defaults to true. Defaults to false in Synapse (annoyingly)',
      default: true,
    })
  ),
  purge: Type.Optional(
    Type.Boolean({
      description:
        'If set to true, it will remove all traces of the room from your database. Defaults to true.',
      default: true,
    })
  ),
  force_purge: Type.Optional(
    Type.Boolean({
      description:
        "Optional, and ignored unless purge is true. If set to true, it will force a purge to go ahead even if there are local users still in the room. Do not use this unless a regular purge operation fails, as it could leave those users' clients in a confused state.",
      default: false,
    })
  ),
});

export type SynapseAdminPostMakeRoomAdminRequest = StaticDecode<
  typeof SynapseAdminPostMakeRoomAdminRequest
>;
export const SynapseAdminPostMakeRoomAdminRequest = Type.Object({
  user_id: StringUserID,
});
