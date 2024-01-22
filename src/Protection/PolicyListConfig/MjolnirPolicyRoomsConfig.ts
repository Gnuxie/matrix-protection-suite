/**
 * Copyright (C) 2023-2024 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import AwaitLock from 'await-lock';
import { ActionError, ActionResult, Ok, isError } from '../../Interface/Action';
import {
  ActionException,
  ActionExceptionKind,
} from '../../Interface/ActionException';
import { MultipleErrors } from '../../Interface/MultipleErrors';
import { PersistentMatrixData } from '../../Interface/PersistentMatrixData';
import {
  MatrixRoomID,
  ResolveRoom,
} from '../../MatrixTypes/MatrixRoomReference';
import { PolicyRoomManager } from '../../PolicyList/PolicyRoomManger';
import {
  DirectPropagationPolicyListRevisionIssuer,
  StandardDirectPropagationPolicyListRevisionIssuer,
} from '../DirectPropagationPolicyListRevisionIssuer';
import { MjolnirWatchedPolicyRoomsEvent } from './MjolnirWatchedListsEvent';
import { AbstractPolicyListConfig } from './FakePolicyListConfig';
import { PolicyListConfig, PropagationType } from './PolicyListConfig';

export class MjolnirPolicyRoomsConfig
  extends AbstractPolicyListConfig
  implements PolicyListConfig
{
  private readonly writeLock = new AwaitLock();
  private constructor(
    private readonly store: PersistentMatrixData<
      typeof MjolnirWatchedPolicyRoomsEvent
    >,
    policyListRevisionIssuer: DirectPropagationPolicyListRevisionIssuer,
    policyRoomManager: PolicyRoomManager,
    watchedLists: Set<MatrixRoomID>
  ) {
    super(policyListRevisionIssuer, policyRoomManager, watchedLists);
  }

  public static async createFromStore(
    store: PersistentMatrixData<typeof MjolnirWatchedPolicyRoomsEvent>,
    policyRoomManager: PolicyRoomManager,
    resolveRoomClient: { resolveRoom: ResolveRoom }
  ): Promise<ActionResult<MjolnirPolicyRoomsConfig>> {
    const watchedListsResult = await store.requestPersistentData();
    if (isError(watchedListsResult)) {
      return watchedListsResult;
    }
    const issuers = await Promise.all(
      watchedListsResult.ok.references.map(async (room) => {
        const resolvedRoomResult = await room.resolve(resolveRoomClient);
        if (isError(resolvedRoomResult)) {
          return resolvedRoomResult;
        }
        return policyRoomManager.getPolicyRoomRevisionIssuer(
          resolvedRoomResult.ok
        );
      })
    ).then(
      (results) =>
        results.every((result) => result.isOkay)
          ? Ok(
              results.map((result) => {
                if (isError(result)) {
                  throw new TypeError(
                    'Should be impossible typescript needs to infer array types from filter operations'
                  );
                }
                return result.ok;
              })
            )
          : MultipleErrors.Result(`Could not load MjolnirPolicyRoomsConfig`, {
              errors: results
                .filter((value) => isError(value))
                .map((value) => {
                  if (isError(value)) {
                    return value.error;
                  }
                  throw new TypeError(
                    'Should be impossible, typescript needs to infer array types from filter operations'
                  );
                }),
            }),
      (exception) =>
        ActionException.Result(`Could not load MjolnirPolicyRoomsConfig`, {
          exception,
          exceptionKind: ActionExceptionKind.Unknown,
        })
    );
    if (isError(issuers)) {
      return issuers;
    }
    return Ok(
      new MjolnirPolicyRoomsConfig(
        store,
        new StandardDirectPropagationPolicyListRevisionIssuer(issuers.ok),
        policyRoomManager,
        new Set(issuers.ok.map((revision) => revision.currentRevision.room))
      )
    );
  }

  public async watchList<T>(
    propagation: string,
    list: MatrixRoomID,
    options: T
  ): Promise<ActionResult<void>> {
    if (propagation !== PropagationType.Direct) {
      return ActionError.Result(
        `The MjolnirProtectedRoomsConfig does not support watching a list ${list.toPermalink()} with propagation type ${propagation}.`
      );
    }
    await this.writeLock.acquireAsync();
    try {
      const storeUpdateResult = await this.store.storePersistentData({
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
    propagation: string,
    list: MatrixRoomID
  ): Promise<ActionResult<void>> {
    if (propagation !== PropagationType.Direct) {
      return ActionError.Result(
        `The MjolnirProtectedRoomsConfigUnable does not support watching a list ${list.toPermalink()} with propagation type ${propagation}.`
      );
    }
    await this.writeLock.acquireAsync();
    try {
      const storeUpdateResult = await this.store.storePersistentData({
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
