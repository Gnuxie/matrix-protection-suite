/**
 * Copyright (C) 2023-2024 Gnuxie <Gnuxie@protonmail.com>
 * All rights reserved.
 */

import { ActionError, ActionResult, Ok, isError } from '../../Interface/Action';
import { MatrixRoomID } from '../../MatrixTypes/MatrixRoomReference';
import { PolicyRoomRevisionIssuer } from '../../PolicyList/PolicyListRevisionIssuer';
import { PolicyRoomManager } from '../../PolicyList/PolicyRoomManger';
import {
  DirectPropagationPolicyListRevisionIssuer,
  StandardDirectPropagationPolicyListRevisionIssuer,
} from '../DirectPropagationPolicyListRevisionIssuer';
import { PolicyListConfig, PropagationType } from './PolicyListConfig';

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

  public async watchList<T>(
    propagation: string,
    list: MatrixRoomID,
    _options: T
  ): Promise<ActionResult<void>> {
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
    propagation: string,
    list: MatrixRoomID
  ): Promise<ActionResult<void>> {
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
