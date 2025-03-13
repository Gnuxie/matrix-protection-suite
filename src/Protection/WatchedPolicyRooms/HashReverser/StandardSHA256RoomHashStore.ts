// SPDX-FileCopyrightText: 2025 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: Apache-2.0

import EventEmitter from 'events';
import { RoomHashRecord, SHA256RoomHashStore } from './SHA256HashReverser';
import { isError, Result } from '@gnuxie/typescript-result';
import { StringRoomID } from '@the-draupnir-project/matrix-basic-types';
import {
  HashedLiteralPolicyRule,
  LiteralPolicyRule,
} from '../../../PolicyList/PolicyRule';

export class StandardSHA256RoomHashStore
  extends EventEmitter
  implements SHA256RoomHashStore
{
  public constructor(
    private readonly baseStore: Omit<SHA256RoomHashStore, 'on' | 'off'>
  ) {
    super();
  }
  public async findRoomHash(
    hash: string
  ): Promise<Result<StringRoomID | undefined>> {
    return await this.baseStore.findRoomHash(hash);
  }
  public async reverseHashedRoomPolicies(
    policies: HashedLiteralPolicyRule[]
  ): Promise<Result<LiteralPolicyRule[]>> {
    return await this.baseStore.reverseHashedRoomPolicies(policies);
  }

  public async storeUndiscoveredRooms(
    roomIDs: StringRoomID[]
  ): Promise<Result<RoomHashRecord[]>> {
    const storeResult = await this.baseStore.storeUndiscoveredRooms(roomIDs);
    if (isError(storeResult)) {
      return storeResult;
    }
    for (const row of storeResult.ok) {
      this.emit('RoomHash', row.room_id, row.sha256);
    }
    return storeResult;
  }
}
