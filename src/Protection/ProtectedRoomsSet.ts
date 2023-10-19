import { SetMembership } from '../StateTracking/SetMembership';
import { DirectPropagationPolicyListRevisionIssuer } from './DirectPropagationPolicyListRevisionIssuer';
import { PolicyListRevisionIssuerManager } from './PolicyListRevisionIssuerConfig';
import { ProtectedRoomsConfig } from './ProtectedRoomsConfig/ProtectedRoomsConfig';
import { ProtectionsConfig } from './ProtectionsConfig';

export interface ProtectedRoomsSet {
  readonly issuerManager: PolicyListRevisionIssuerManager;
  readonly directIssuer: DirectPropagationPolicyListRevisionIssuer;
  readonly protectedRoomsConfig: ProtectedRoomsConfig;
  readonly protections: ProtectionsConfig;
  readonly setMembership: SetMembership;
}

export class StandardProtectedRoomsSet implements ProtectedRoomsSet {
  constructor(
    public readonly issuerManager: PolicyListRevisionIssuerManager,
    public readonly directIssuer: DirectPropagationPolicyListRevisionIssuer,
    public readonly protectedRoomsConfig: ProtectedRoomsConfig,
    public readonly protections: ProtectionsConfig,
    public readonly setMembership: SetMembership
  ) {
    // nothing to do.
  }
}
