// Copyright (C) 2023 - 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: AFL-3.0

import { MatrixRoomID } from '@the-draupnir-project/matrix-basic-types';
import { ActionError, ActionResult, Ok, isError } from '../../Interface/Action';
import { Logger } from '../../Logging/Logger';
import { PolicyRoomRevisionIssuer } from '../../PolicyList/PolicyListRevisionIssuer';
import { PolicyRoomManager } from '../../PolicyList/PolicyRoomManger';
import {
  DirectPropagationPolicyListRevisionIssuer,
  StandardDirectPropagationPolicyListRevisionIssuer,
} from '../DirectPropagationPolicyListRevisionIssuer';
import { PolicyListConfig, PropagationType } from './PolicyListConfig';

const log = new Logger('AbstractPolicyListConfig');
export class AbstractPolicyListConfig implements PolicyListConfig {
  protected constructor(
    public readonly policyListRevisionIssuer: DirectPropagationPolicyListRevisionIssuer,
    private readonly policyRoomManager: PolicyRoomManager,
    private readonly watchedLists: Set<MatrixRoomID>
  ) {
    // nothing to do.
  }

  public get allWatchedLists() {
    return [...this.watchedLists].map((room) => ({
      room,
      propagation: PropagationType.Direct,
    }));
  }

  logCurrentConfig(): void {
    log.info(
      `current config`,
      JSON.stringify(
        this.allWatchedLists.map((room) => room.room.toPermalink())
      )
    );
  }

  public async watchList<T>(
    propagation: PropagationType,
    list: MatrixRoomID,
    _options: T
  ): Promise<ActionResult<void>> {
    // The enum could be changed to add more variants:
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (propagation !== PropagationType.Direct) {
      return ActionError.Result(
        `The AbstractProtectedRoomsConfig does not support watching a list ${list.toPermalink()} with propagation type ${propagation}.`
      );
    }
    const issuerResult =
      await this.policyRoomManager.getPolicyRoomRevisionIssuer(list);
    if (isError(issuerResult)) {
      return issuerResult;
    }
    this.policyListRevisionIssuer.addIssuer(issuerResult.ok);
    this.watchedLists.add(issuerResult.ok.currentRevision.room);
    return Ok(undefined);
  }
  public async unwatchList(
    propagation: PropagationType,
    list: MatrixRoomID
  ): Promise<ActionResult<void>> {
    // The enum could be changed to add more variants:
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (propagation !== PropagationType.Direct) {
      return ActionError.Result(
        `The MjolnirProtectedRoomsConfigUnable does not support watching a list ${list.toPermalink()} with propagation type ${propagation}.`
      );
    }
    const issuerResult =
      await this.policyRoomManager.getPolicyRoomRevisionIssuer(list);
    if (isError(issuerResult)) {
      return issuerResult;
    }
    this.policyListRevisionIssuer.removeIssuer(issuerResult.ok);
    this.watchedLists.delete(issuerResult.ok.currentRevision.room);
    return Ok(undefined);
  }
}

export class FakePolicyListConfig extends AbstractPolicyListConfig {
  constructor(
    policyRoomManager: PolicyRoomManager,
    watchedListIssuers: PolicyRoomRevisionIssuer[] = []
  ) {
    super(
      new StandardDirectPropagationPolicyListRevisionIssuer(watchedListIssuers),
      policyRoomManager,
      new Set(
        watchedListIssuers.map((revision) => revision.currentRevision.room)
      )
    );
  }
}
