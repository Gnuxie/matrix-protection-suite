import { SetMembership } from '../StateTracking/SetMembership';
import { DirectPropagationPolicyListRevisionIssuer } from './DirectPropagationPolicyListRevisionIssuer';
import { PolicyListConfig } from './PolicyListConfig/PolicyListConfig';
import { ProtectedRoomsConfig } from './ProtectedRoomsConfig/ProtectedRoomsConfig';
import { ProtectionsConfig } from './ProtectionsConfig';

export interface ProtectedRoomsSet {
  readonly issuerManager: PolicyListConfig;
  readonly directIssuer: DirectPropagationPolicyListRevisionIssuer;
  readonly protectedRoomsConfig: ProtectedRoomsConfig;
  readonly protections: ProtectionsConfig;
  readonly setMembership: SetMembership;
}

export class StandardProtectedRoomsSet implements ProtectedRoomsSet {
  constructor(
    public readonly issuerManager: PolicyListConfig,
    public readonly directIssuer: DirectPropagationPolicyListRevisionIssuer,
    public readonly protectedRoomsConfig: ProtectedRoomsConfig,
    public readonly protections: ProtectionsConfig,
    public readonly setMembership: SetMembership
  ) {
    // nothing to do.
  }
}
