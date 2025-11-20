import { PolicyListRevision } from '../../../PolicyList/PolicyListRevision';
import { PolicyRuleChange } from '../../../PolicyList/PolicyRuleChange';
import { ProjectionNode } from '../../../Projection/ProjectionNode';

export type PolicyListBridgeProjectionNode = ProjectionNode<
  [],
  PolicyRuleChange[],
  PolicyListRevision
>;
