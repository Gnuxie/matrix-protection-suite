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

import { Static, Type } from '@sinclair/typebox';
import {
  PersistentData,
  RawSchemedData,
  SCHEMA_VERSION_KEY,
} from '../Interface/PersistentData';
import { Permalink } from '../MatrixTypes/MatrixRoomReference';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { ActionResult, Ok, isError } from '../Interface/Action';

export type MjolnirWatchedPolicyRoomsEvent = Static<
  typeof MjolnirWatchedPolicyRoomsEvent
>;
export const MjolnirWatchedPolicyRoomsEvent = Type.Object({
  references: Type.Array(Permalink),
});

const TMjolnirWatchedPolicyRoomsEvent = TypeCompiler.Compile(
  MjolnirWatchedPolicyRoomsEvent
);

export function isMjolnirWatchedPolicyRoomsEvent(
  value: unknown
): value is MjolnirWatchedPolicyRoomsEvent {
  return TMjolnirWatchedPolicyRoomsEvent.Check(value);
}
export const PROPAGATION_TYPE_DIRECT = 'ge.applied-langua.ge.draupnir.direct';

export const PolicyListIssuerDescription = Type.Recursive((This) =>
  Type.Object({
    propagation: Type.Union([
      Type.Literal(PROPAGATION_TYPE_DIRECT),
      Type.String(),
    ]),
    issuers: Type.Array(This),
    references: Type.Array(Permalink),
  })
);

export type PolicyListIssuerDescription = Static<
  typeof PolicyListIssuerDescription
>;

const CPolicyListIssuerDescription = TypeCompiler.Compile(
  PolicyListIssuerDescription
);

export function isPolicyListIssuerDescription(
  value: unknown
): value is PolicyListIssuerDescription {
  return CPolicyListIssuerDescription.Check(value);
}

export abstract class ProtectedRoomsSetPolicyListIssuerDescriptionConfig extends PersistentData<
  PolicyListIssuerDescription & RawSchemedData
> {
  protected readonly isAllowedToInferNoVersionAsZero = true;
  protected readonly upgradeSchema = [
    async (
      watchedListsData: RawSchemedData
    ): Promise<PolicyListIssuerDescription & RawSchemedData> => {
      if (!isMjolnirWatchedPolicyRoomsEvent(watchedListsData)) {
        throw new TypeError(`Failed to validate corrupted Mjolnir data`);
      }
      return {
        propagation: PROPAGATION_TYPE_DIRECT,
        issuers: [],
        references: watchedListsData.references,
        [SCHEMA_VERSION_KEY]: 1,
      };
    },
  ];
  protected readonly downgradeSchema = [
    async (
      policyListIssuerDescriptionData: RawSchemedData
    ): Promise<MjolnirWatchedPolicyRoomsEvent & RawSchemedData> => {
      if (!isPolicyListIssuerDescription(policyListIssuerDescriptionData)) {
        throw new TypeError(
          `Failed to validate corrupted policy issuer description`
        );
      }
      return {
        references: policyListIssuerDescriptionData.references,
        [SCHEMA_VERSION_KEY]: 0,
      };
    },
  ];

  public async createFirstData(): Promise<
    ActionResult<PolicyListIssuerDescription & RawSchemedData>
  > {
    const data = {
      propagation: PROPAGATION_TYPE_DIRECT,
      issuers: [],
      references: [],
      [SCHEMA_VERSION_KEY]: 1,
    };
    const result = await this.storePersistentData(data);
    if (isError(result)) {
      return result;
    }
    return Ok(data);
  }
}

export type MjolnirProtectedRoomsEvent = Static<
  typeof MjolnirProtectedRoomsEvent
>;
export const MjolnirProtectedRoomsEvent = Type.Object({
  rooms: Type.Array(Permalink),
});

export const CMjolnirProtectedRoomsEvent = TypeCompiler.Compile(
  MjolnirProtectedRoomsEvent
);

export function isMjolnirProtectedRoomsEvent(
  value: unknown
): value is MjolnirProtectedRoomsEvent {
  return CMjolnirProtectedRoomsEvent.Check(value);
}

export type ProtectedRoomsConfigEvent = Static<
  typeof ProtectedRoomsConfigEvent
>;

const ProtectedRoomDescriptor = Type.Object({
  reference: Permalink,
});

export const ProtectedRoomsConfigEvent = Type.Object({
  rooms: Type.Array(ProtectedRoomDescriptor),
  spaces: Type.Array(ProtectedRoomDescriptor),
});

export const CProtectedRoomsConfigEvent = TypeCompiler.Compile(
  ProtectedRoomsConfigEvent
);

export function isProtectedRoomsConfigEvent(
  value: unknown
): value is ProtectedRoomsConfigEvent {
  return CProtectedRoomsConfigEvent.Check(value);
}

export abstract class ProtectedRoomsSetProtectedRoomsConfig extends PersistentData<
  ProtectedRoomsConfigEvent & RawSchemedData
> {
  protected readonly isAllowedToInferNoVersionAsZero = true;
  protected readonly upgradeSchema = [
    async (
      mjolnirData: RawSchemedData
    ): Promise<ProtectedRoomsConfigEvent & RawSchemedData> => {
      if (!isMjolnirProtectedRoomsEvent(mjolnirData)) {
        throw TypeError('Mjolnir data is corrupted');
      }
      return {
        rooms: mjolnirData.rooms.map((room) => {
          return { reference: room };
        }),
        spaces: [],
        [SCHEMA_VERSION_KEY]: 1,
      };
    },
  ];
  protected readonly downgradeSchema = [
    async (
      protectedRoomsConfigEvent: RawSchemedData
    ): Promise<MjolnirProtectedRoomsEvent & RawSchemedData> => {
      if (!isProtectedRoomsConfigEvent(protectedRoomsConfigEvent)) {
        throw new TypeError('protected rooms config data is corrupted');
      }
      return {
        rooms: protectedRoomsConfigEvent.rooms.map(
          (roomConfig) => roomConfig.reference
        ),
        [SCHEMA_VERSION_KEY]: 0,
      };
    },
  ];

  public async createFirstData(): Promise<
    ActionResult<ProtectedRoomsConfigEvent & RawSchemedData>
  > {
    const data = {
      rooms: [],
      spaces: [],
      [SCHEMA_VERSION_KEY]: 1,
    };
    const result = await this.storePersistentData(data);
    if (isError(result)) {
      return result;
    }
    return Ok(data);
  }
}
