// Copyright (C) 2023 - 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import AwaitLock from 'await-lock';
import { ActionError, ActionResult, Ok, isError } from '../../Interface/Action';
import {
  ActionException,
  ActionExceptionKind,
} from '../../Interface/ActionException';
import { MultipleErrors } from '../../Interface/MultipleErrors';
import { MatrixAccountData } from '../../Interface/PersistentMatrixData';
import { MatrixRoomID } from '../../MatrixTypes/MatrixRoomReference';
import { PolicyRoomManager } from '../../PolicyList/PolicyRoomManger';
import {
  DirectPropagationPolicyListRevisionIssuer,
  StandardDirectPropagationPolicyListRevisionIssuer,
} from '../DirectPropagationPolicyListRevisionIssuer';
import { MjolnirWatchedPolicyRoomsEvent } from './MjolnirWatchedListsEvent';
import { AbstractPolicyListConfig } from './FakePolicyListConfig';
import { PolicyListConfig, PropagationType } from './PolicyListConfig';
import { RoomJoiner } from '../../Client/RoomJoiner';

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
    const issuers = await Promise.all(
      references.map(async (room) => {
        const resolvedRoomResult = await roomJoiner.resolveRoom(room);
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
          // FIXME: Not sure what to do about this tbh :/
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
        roomJoiner,
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
