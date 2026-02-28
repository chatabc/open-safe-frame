"""Security decision coordinator."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from open_safe_frame.core.models import Action, Decision, SecurityAssessment, Severity, StructuredIntent
from open_safe_frame.core.context import SecurityContext
from open_safe_frame.security.values.alignment_evaluator import AlignmentEvaluator, AlignmentAssessment
from open_safe_frame.security.constraints.constraint_checker import ConstraintChecker, CombinedCheckResult
from open_safe_frame.security.risk.risk_assessor import RiskAssessor, RiskAssessment


@dataclass
class SecurityDecision:
    intent_id: str
    decision: Decision
    alignment: AlignmentAssessment
    constraints: CombinedCheckResult
    risk: RiskAssessment
    reason: str = ""
    requires_approval: bool = False
    approval_timeout_seconds: int = 300
    created_at: datetime = field(default_factory=datetime.now)
    
    @property
    def is_approved(self) -> bool:
        return self.decision == Decision.APPROVE
    
    @property
    def is_rejected(self) -> bool:
        return self.decision == Decision.REJECT


class SecurityDecisionCoordinator:
    def __init__(
        self,
        alignment_threshold: float = 0.8,
        constraint_threshold: float = 0.6,
        risk_threshold: Severity = Severity.HIGH,
    ):
        self.alignment_threshold = alignment_threshold
        self.constraint_threshold = constraint_threshold
        self.risk_threshold = risk_threshold
        
        self.alignment_engine = AlignmentEvaluator(threshold=alignment_threshold)
        self.constraint_engine = ConstraintChecker()
        self.risk_engine = RiskAssessor()
    
    def make_decision(
        self,
        intent: StructuredIntent,
        context: Optional[SecurityContext] = None,
    ) -> SecurityDecision:
        alignment = self.alignment_engine.evaluate(intent)
        constraints = self.constraint_engine.check_intent(intent)
        risk = self.risk_engine.assess_intent(intent)
        
        decision, reason, requires_approval = self._combine_results(
            alignment, constraints, risk
        )
        
        return SecurityDecision(
            intent_id=intent.id,
            decision=decision,
            alignment=alignment,
            constraints=constraints,
            risk=risk,
            reason=reason,
            requires_approval=requires_approval,
        )
    
    def make_decision_for_action(
        self,
        action: Action,
        context: Optional[SecurityContext] = None,
    ) -> SecurityDecision:
        intent = StructuredIntent(
            id=action.intent_id,
            parsed_intent=action.description,
        )
        
        decision = self.make_decision(intent, context)
        
        if action.requires_human_approval and decision.decision == Decision.APPROVE:
            decision.decision = Decision.REQUEST_APPROVAL
            decision.requires_approval = True
            decision.reason = "操作需要人工审批"
        
        return decision
    
    def _combine_results(
        self,
        alignment: AlignmentAssessment,
        constraints: CombinedCheckResult,
        risk: RiskAssessment,
    ) -> tuple[Decision, str, bool]:
        if not alignment.passed:
            return (
                Decision.REJECT,
                f"价值对齐评估未通过: {alignment.overall_score:.2f} < {self.alignment_threshold}",
                False,
            )
        
        if not constraints.hard_constraints_passed:
            violations = "; ".join(constraints.violations[:3])
            return (
                Decision.REJECT,
                f"硬约束违反: {violations}",
                False,
            )
        
        if risk.overall_risk == Severity.CRITICAL:
            return (
                Decision.REJECT,
                f"风险等级过高: {risk.overall_risk.value}",
                False,
            )
        
        if risk.overall_risk == Severity.HIGH:
            return (
                Decision.REQUEST_APPROVAL,
                f"高风险操作需要审批: {risk.overall_risk.value}",
                True,
            )
        
        if constraints.soft_constraints_score < self.constraint_threshold:
            return (
                Decision.REQUEST_APPROVAL,
                f"软约束评分较低: {constraints.soft_constraints_score:.2f}",
                True,
            )
        
        if alignment.overall_score < 0.9:
            return (
                Decision.APPROVE,
                f"批准执行 (对齐评分: {alignment.overall_score:.2f})",
                False,
            )
        
        return (
            Decision.APPROVE,
            "批准执行",
            False,
        )
    
    def quick_check(self, description: str) -> Decision:
        intent = StructuredIntent(parsed_intent=description)
        decision = self.make_decision(intent)
        return decision.decision
    
    def set_alignment_threshold(self, threshold: float) -> None:
        self.alignment_threshold = threshold
        self.alignment_engine.set_threshold(threshold)
    
    def set_risk_threshold(self, threshold: Severity) -> None:
        self.risk_threshold = threshold
