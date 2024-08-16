// Copyright (C) 2023 - 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import AwaitLock from 'await-lock';
import { ActionError, ActionResult, Ok, isError } from '../../Interface/Action';
import { MatrixAccountData } from '../../Interface/PersistentMatrixData';
import { PolicyRoomManager } from '../../PolicyList/PolicyRoomManger';
import {
  DirectPropagationPolicyListRevisionIssuer,
  StandardDirectPropagationPolicyListRevisionIssuer,
} from '../DirectPropagationPolicyListRevisionIssuer';
import { MjolnirWatchedPolicyRoomsEvent } from './MjolnirWatchedListsEvent';
import { AbstractPolicyListConfig } from './FakePolicyListConfig';
import { PolicyListConfig, PropagationType } from './PolicyListConfig';
import { RoomJoiner } from '../../Client/RoomJoiner';
import { Logger } from '../../Logging/Logger';
import { PolicyRoomRevisionIssuer } from '../../PolicyList/PolicyListRevisionIssuer';
import { MatrixRoomID } from '@the-draupnir-project/matrix-basic-types';

const log = new Logger('MjolnirPolicyRoomsConfig');

export class MjolnirPolicyRoomsConfig
  extends AbstractPolicyListConfig
  implements PolicyListConfig
{
  private readonly writeLock = new AwaitLock();
  private constructor(
    private readonly store: MatrixAccountData<MjolnirWatchedPolicyRoomsEvent>,
    policyListRevisionIssuer: DirectPropagationPolicyListRevisionIssuer,
    policyRoomManager: PolicyRoomManager,
    private readonly roomJoiner: RoomJoiner,
    watchedLists: Set<MatrixRoomID>
  ) {
    super(policyListRevisionIssuer, policyRoomManager, watchedLists);
  }

  public static async createFromStore(
    store: MatrixAccountData<MjolnirWatchedPolicyRoomsEvent>,
    policyRoomManager: PolicyRoomManager,
    roomJoiner: RoomJoiner
  ): Promise<ActionResult<MjolnirPolicyRoomsConfig>> {
    const watchedListsResult = await store.requestAccountData();
    if (isError(watchedListsResult)) {
      return watchedListsResult;
    }
    const references = watchedListsResult.ok?.references ?? [];
    const issuers: PolicyRoomRevisionIssuer[] = [];
    for (const reference of references) {
      const joinResult = await roomJoiner.joinRoom(reference);
      if (isError(joinResult)) {
        log.info(`raw app data:`, watchedListsResult.ok);
        return joinResult.elaborate(
          `Could not join a watched list ${reference.toRoomIDOrAlias()}`
        );
      }
      const issuerResult = await policyRoomManager.getPolicyRoomRevisionIssuer(
        joinResult.ok
      );
      if (isError(issuerResult)) {
        return issuerResult;
      }
      issuers.push(issuerResult.ok);
    }
    return Ok(
      new MjolnirPolicyRoomsConfig(
        store,
        new StandardDirectPropagationPolicyListRevisionIssuer(issuers),
        policyRoomManager,
        roomJoiner,
        new Set(issuers.map((revision) => revision.currentRevision.room))
      )
    );
  }

  public async watchList<T>(
    propagation: PropagationType,
    list: MatrixRoomID,
    options: T
  ): Promise<ActionResult<void>> {
    // More variants could be added under our feet as code changes:
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (propagation !== PropagationType.Direct) {
      return ActionError.Result(
        `The MjolnirProtectedRoomsConfig does not support watching a list ${list.toPermalink()} with propagation type ${propagation}.`
      );
    }
    const joinResult = await this.roomJoiner.joinRoom(list);
    if (isError(joinResult)) {
      return joinResult.elaborate(
        `Could not join the policy room in order to begin watching it.`
      );
    }
    await this.writeLock.acquireAsync();
    try {
      const storeUpdateResult = await this.store.storeAccountData({
        references: [...this.policyListRevisionIssuer.references, list],
      });
      if (isError(storeUpdateResult)) {
        return storeUpdateResult;
      }
      return await super.watchList(propagation, list, options);
    } finally {
      this.writeLock.release();
    }
  }
  public async unwatchList(
    propagation: PropagationType,
    list: MatrixRoomID
  ): Promise<ActionResult<void>> {
    // More variants could be added under our feet as code changes:
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (propagation !== PropagationType.Direct) {
      return ActionError.Result(
        `The MjolnirProtectedRoomsConfigUnable does not support watching a list ${list.toPermalink()} with propagation type ${propagation}.`
      );
    }
    await this.writeLock.acquireAsync();
    try {
      const storeUpdateResult = await this.store.storeAccountData({
        references: this.policyListRevisionIssuer.references.filter(
          (roomID) => roomID.toRoomIDOrAlias() === list.toRoomIDOrAlias()
        ),
      });
      if (isError(storeUpdateResult)) {
        return storeUpdateResult;
      }
      return await super.unwatchList(propagation, list);
    } finally {
      this.writeLock.release();
    }
  }
}
