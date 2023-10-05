import { ActionResult } from '../Interface/Action';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { PolicyListRevisionIssuer } from '../PolicyList/PolicyListRevisionIssuer';
import { ProtectedRoomsSetPolicyListIssuerDescriptionConfig, ProtectedRoomsSetProtectedRoomsConfig } from './ProtectedRoomsConfig';
import { Protection } from './Protection';

/**
 * Is also responsible for persisting this information.
 */
export interface ProtectedRoomsSetConfig {
  readonly allRooms: MatrixRoomID[];
  addRoom(room: MatrixRoomID): Promise<ActionResult<void>>;
  removeRoom(room: MatrixRoomID): Promise<ActionResult<void>>;
  addSpace(room: MatrixRoomID): Promise<ActionResult<void>>;
  removeSpace(room: MatrixRoomID): Promise<ActionResult<void>>;
}

export class StandardProtectedRoomsSetConfig
  implements ProtectedRoomsSetConfig
{
  public constructor(
    private readonly issuerDescriptionConfig: ProtectedRoomsSetPolicyListIssuerDescriptionConfig,
    private readonly protectedRoomsSetConfig: ProtectedRoomsSetProtectedRoomsConfig
  ) {
    // nothing to do.
  }

  addRoom(room: MatrixRoomID): Promise<ActionResult<void>> {
    this.protectedRoomsSetConfig.
  }
  removeRoom(room: MatrixRoomID): Promise<ActionResult<void>> {
    throw new Error('Method not implemented.');
  }
  addSpace(room: MatrixRoomID): Promise<ActionResult<void>> {
    throw new Error('Method not implemented.');
  }
  removeSpace(room: MatrixRoomID): Promise<ActionResult<void>> {
    throw new Error('Method not implemented.');
  }


}

/**
 * Problem: how would a client produce a protection from this ?
 * i don't think it can :/
 */
export interface ProtectionsConfig {
  readonly allProtections: Protection[];
  addProtection(protection: Protection): Promise<ActionResult<void>>;
  removeProtection(protection: Protection): Promise<ActionResult<void>>;
}

export interface ProtectedRoomsSet {
  readonly issuer: PolicyListRevisionIssuer;
  readonly protections: ProtectionsConfig;
  readonly protectedRooms: ProtectedRoomSetConfig;
}
