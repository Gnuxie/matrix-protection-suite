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
import { ActionResult, Ok, isError } from '../Interface/Action';
import { Value } from '../Interface/Value';
import { PolicyListRevisionIssuer } from '../PolicyList/PolicyListRevisionIssuer';
import { PolicyRoomManager } from '../PolicyList/PolicyRoomManger';

export type MjolnirWatchedPolicyRoomsEvent = Static<
  typeof MjolnirWatchedPolicyRoomsEvent
>;
export const MjolnirWatchedPolicyRoomsEvent = Type.Object({
  references: Type.Array(Permalink),
});
Value.Compile(MjolnirWatchedPolicyRoomsEvent);

export function isMjolnirWatchedPolicyRoomsEvent(
  value: unknown
): value is MjolnirWatchedPolicyRoomsEvent {
  return Value.Check(MjolnirWatchedPolicyRoomsEvent, value);
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
Value.Compile(PolicyListIssuerDescription);

export function isPolicyListIssuerDescription(
  value: unknown
): value is PolicyListIssuerDescription {
  return Value.Check(PolicyListIssuerDescription, value);
}

export interface PolicyListRevisionIssuerConfig {
  readonly policyListRevisionIssuer: PolicyListRevisionIssuer;
}

export abstract class AbstractPolicyListRevisionIssuerConfig
  extends PersistentData<PolicyListIssuerDescription & RawSchemedData>
  implements PolicyListRevisionIssuerConfig
{
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
  protected constructor(
    protected readonly policyRoomManager: PolicyRoomManager
  ) {
    super();
  }
  protected async handleDataChange(rawData: PolicyListIssuerDescription): Promise<void> {
    const rawDataResult = Value.Decode(PolicyListIssuerDescription, rawData);
    if (isError(rawDataResult)) {
      throw new TypeError();
    }
    const policyRoomRevisionIssuers

  }

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
