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
import { MatrixRoomID, Permalink } from '../MatrixTypes/MatrixRoomReference';
import { ActionResult, Ok, isError } from '../Interface/Action';
import { Value } from '../Interface/Value';
import {
  PolicyListRevisionIssuer,
  PolicyRoomRevisionIssuer,
} from '../PolicyList/PolicyListRevisionIssuer';
import { PolicyRoomManager } from '../PolicyList/PolicyRoomManger';
import {
  DirectPropagationPolicyListRevisionIssuer,
  StandardDirectPropagationPolicyListRevisionIssuer,
} from './DirectPropagationPolicyListRevisionIssuer';

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
  loadData(): Promise<ActionResult<SchemedPolicyListIssuerDescription>>;
  storePersistentData(
    data: SchemedPolicyListIssuerDescription
  ): Promise<ActionResult<void>>;
}

type SchemedPolicyListIssuerDescription = PolicyListIssuerDescription &
  RawSchemedData;

export abstract class AbstractPolicyListRevisionIssuerConfig extends PersistentData<SchemedPolicyListIssuerDescription> {
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

export interface PolicyListRevisionIssuerManager {
  readonly policyListRevisionIssuer: PolicyListRevisionIssuer;
  watchList<T>(
    propagation: string,
    list: MatrixRoomID,
    options: T
  ): Promise<ActionResult<void>>;
  unwatchList(
    propagation: string,
    list: MatrixRoomID
  ): Promise<ActionResult<void>>;
}

export class StandardPolicyListRevisionIssuerManager
  implements PolicyListRevisionIssuerManager
{
  private constructor(
    public readonly policyListRevisionIssuer: DirectPropagationPolicyListRevisionIssuer,
    private readonly policyRoomManager: PolicyRoomManager,
    private readonly config: PolicyListRevisionIssuerConfig
  ) {
    // nowt to do innit.
  }

  public static async createAndLoad(
    config: PolicyListRevisionIssuerConfig,
    policyRoomManager: PolicyRoomManager
  ): Promise<StandardPolicyListRevisionIssuerManager> {
    const data = await (async () => {
      const dataResult = await config.loadData();
      if (isError(dataResult)) {
        throw new TypeError(
          `Couldn't load StandardPolicyListRevisionIssuer because: ${dataResult.error.message}`
        );
      }
      const parseResult = Value.Decode(
        PolicyListIssuerDescription,
        dataResult.ok
      );
      if (isError(parseResult)) {
        throw new TypeError(
          `Couldn't load StandardPolicyListRevisionIssuer because: ${parseResult.error.message}`
        );
      }
      return parseResult.ok;
    })();

    const policyRoomRevisionIssuers: PolicyRoomRevisionIssuer[] = [];
    for (const reference of data.references) {
      const issuerResult = await policyRoomManager.getPolicyRoomRevisionIssuer(
        reference
      );
      if (isError(issuerResult)) {
        throw new TypeError();
      }
      policyRoomRevisionIssuers.push(issuerResult.ok);
    }
    const issuer = new StandardDirectPropagationPolicyListRevisionIssuer(
      policyRoomRevisionIssuers
    );
    return new StandardPolicyListRevisionIssuerManager(
      issuer,
      policyRoomManager,
      config
    );
  }

  public async watchList(
    propagation: string,
    room: MatrixRoomID
  ): Promise<ActionResult<void>> {
    if (propagation !== PROPAGATION_TYPE_DIRECT) {
      throw new TypeError(`Unsupported propagation type ${propagation}`);
    }
    const listResult = await this.policyRoomManager.getPolicyRoomRevisionIssuer(
      room
    );
    if (isError(listResult)) {
      return listResult.addContext(`Watch the list ${room.toPermalink()}`);
    }
    const saveResult = await this.config.storePersistentData({
      propagation: PROPAGATION_TYPE_DIRECT,
      issuers: [],
      references: this.policyListRevisionIssuer.references.map((reference) =>
        reference.toPermalink()
      ),
      [SCHEMA_VERSION_KEY]: 1,
    });
    if (isError(saveResult)) {
      return saveResult.addContext(`Watch the list ${room.toPermalink()}`);
    }
    this.policyListRevisionIssuer.addIssuer(listResult.ok);
    return Ok(undefined);
  }

  public async unwatchList(
    propagation: string,
    room: MatrixRoomID
  ): Promise<ActionResult<void>> {
    if (propagation !== PROPAGATION_TYPE_DIRECT) {
      throw new TypeError(`Unsupported propagation type ${propagation}`);
    }
    const listResult = await this.policyRoomManager.getPolicyRoomRevisionIssuer(
      room
    );
    if (isError(listResult)) {
      return listResult.addContext(`Unwatch the list ${room.toPermalink()}`);
    }
    const saveResult = await this.config.storePersistentData({
      propagation: PROPAGATION_TYPE_DIRECT,
      issuers: [],
      references: this.policyListRevisionIssuer.references
        .filter(
          (reference) => reference.toRoomIdOrAlias() !== room.toRoomIdOrAlias()
        )
        .map((reference) => reference.toPermalink()),
      [SCHEMA_VERSION_KEY]: 1,
    });
    if (isError(saveResult)) {
      return saveResult.addContext(`Unwatch the list ${room.toPermalink()}`);
    }
    this.policyListRevisionIssuer.removeIssuer(listResult.ok);
    return Ok(undefined);
  }
}
