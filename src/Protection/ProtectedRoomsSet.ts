import { ActionResult } from '../Interface/Action';
import { MatrixRoomID } from '../MatrixTypes/MatrixRoomReference';
import { PolicyListRevisionIssuer } from '../PolicyList/PolicyListRevisionIssuer';
import { Protection } from './Protection';

/**
 * Is also responsible for persisting this information.
 */
export interface ProtectedRoomSetConfig {
  readonly allRooms: MatrixRoomID[];
  addRoom(room: MatrixRoomID): Promise<ActionResult<void>>;
  removeRoom(room: MatrixRoomID): Promise<ActionResult<void>>;
  addSpace(room: MatrixRoomID): Promise<ActionResult<void>>;
  removeSpace(room: MatrixRoomID): Promise<ActionResult<void>>;
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
