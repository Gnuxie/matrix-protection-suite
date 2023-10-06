import { PolicyListRevisionIssuer } from '../PolicyList/PolicyListRevisionIssuer';
import { ProtectedRoomsConfig } from './ProtectedRoomsConfig';
import { ProtectionsConfig } from './ProtectionsConfig';

export interface ProtectedRoomsSet {
  readonly issuer: PolicyListRevisionIssuer;
  readonly protections: ProtectionsConfig;
  readonly protectedRooms: ProtectedRoomsConfig;
}
