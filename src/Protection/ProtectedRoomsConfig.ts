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

import { Static, TSchema, Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value'
import { PersistentData, RawSchemedData, SCHEMA_VERSION_KEY, SchemaMigration } from '../Interface/PersistentData';
import { Permalink } from '../MatrixTypes/MatrixRoomReference';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { ActionResult, Ok, isError } from '../Interface/Action';

export type MjolnirProtectedRoomsEvent = Static<
  typeof MjolnirProtectedRoomsEvent
>;
export const MjolnirProtectedRoomsEvent = Type.Object({
  rooms: Type.Array(Permalink),
});

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

export const PROPAGATION_TYPE_POLICY_ROOM = 'ge.applied-langua.ge.draupnir.policy_room';
export const PROPAGATION_TYPE_DIRECT = 'ge.applied-langua.ge.draupnir.direct';

export const PolicyRoomDescription = Type.Object({
  propagation: Type.Literal(PROPAGATION_TYPE_POLICY_ROOM),
  reference: Permalink,
});

export type PolicyRoomDescription = Static<typeof PolicyRoomDescription>;

export type DirectPolicyListIssuer<IssuerDescription extends TSchema> = Static<
  ReturnType<typeof DirectPolicyListIssuer<IssuerDescription>>
>;
export const DirectPolicyListIssuer = <IssuerDescription extends TSchema>(
  IssuerDescription: IssuerDescription
) =>
  Type.Object({
    propagation: Type.Literal(PROPAGATION_TYPE_DIRECT),
    issuers: Type.Array(IssuerDescription),
  });


// ok a way around this problem is to have both issuers and references on the
// descriptor, maybe?
export const PolicyListIssuerDescription = Type.Recursive((This) =>
  Type.Union([
    PolicyRoomDescription,
    DirectPolicyListIssuer(This),
    Type.Object({
      propagation: Type.String(),
      issuers: Type.Array(This),
    }),
  ])
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

const TProtectedRoomsSetPolicyListIssuerDescriptionConfig = Type.Extract(
  PolicyListIssuerDescription,
  Type.Required(Type.Object({ propagation: Type.Literal(PROPAGATION_TYPE_DIRECT) }))
);

type TProtectedRoomsSetPolicyListIssuerDescriptionConfig = Static<
  typeof TProtectedRoomsSetPolicyListIssuerDescriptionConfig
>;

const CProtectedRoomsSetPolicyListIssuerDescriptionConfig =
  TypeCompiler.Compile(TProtectedRoomsSetPolicyListIssuerDescriptionConfig);

export function isProtectedRoomsSetPolicyListIssuerDescriptionConfig(
  value: unknown
): value is TProtectedRoomsSetPolicyListIssuerDescriptionConfig {
  return CProtectedRoomsSetPolicyListIssuerDescriptionConfig.Check(value);
}

Type.Required

type TProtectedRoomsSetRoomsConfig = PersistentData<
  MjolnirProtectedRoomsEvent & RawSchemedData
>;

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
        issuers: watchedListsData.references.map((reference) => {
          return {
            propagation: PROPAGATION_TYPE_POLICY_ROOM,
            reference: reference,
          };
        }),
        [SCHEMA_VERSION_KEY]: 1,
      };
    },
  ];
  protected readonly downgradeSchema = [
    async (
      policyListIssuerDescriptionData: RawSchemedData
    ): Promise<MjolnirProtectedRoomsEvent & RawSchemedData> => {
      if (
        !isPolicyListIssuerDescription(policyListIssuerDescriptionData) ||
        !isProtectedRoomsSetPolicyListIssuerDescriptionConfig(
          policyListIssuerDescriptionData
        )
      ) {
        throw new TypeError(
          `Failed to validate corrupted policy issuer description`
        );
      }
      return {
        references: policyListIssuerDescriptionData.issuers.
      }
    }
  ]

  public async createFirstData(): Promise<
    ActionResult<PolicyListIssuerDescription & RawSchemedData>
  > {
    const data = {
      propagation: PROPAGATION_TYPE_DIRECT,
      issuers: [],
      [SCHEMA_VERSION_KEY]: 1,
    };
    const result = await this.storePersistentData(data);
    if (isError(result)) {
      return result;
    }
    return Ok(data);
  }
}
