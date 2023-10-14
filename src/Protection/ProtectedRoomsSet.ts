import { PolicyListRevisionIssuerManager } from './PolicyListRevisionIssuerConfig';
import { ProtectedRoomsConfig } from './ProtectedRoomsConfig';
import { ProtectionsConfig } from './ProtectionsConfig';

export interface ProtectedRoomsSet {
  readonly issuerManager: PolicyListRevisionIssuerManager;
  readonly protections: ProtectionsConfig;
  readonly protectedRooms: ProtectedRoomsConfig;
}
