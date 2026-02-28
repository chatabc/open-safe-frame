"""Constraint checker for behavior validation."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from open_safe_frame.core.models import Action, StructuredIntent
from open_safe_frame.core.results import CheckResult, ValidationResult
from open_safe_frame.security.constraints.constraint_definitions import (
    Constraint,
    ConstraintType,
    get_all_constraints,
    get_hard_constraints,
    get_soft_constraints,
)


@dataclass
class ConstraintCheckResult:
    constraint: Constraint
    passed: bool
    reason: str = ""
    score: float = 1.0


@dataclass
class CombinedCheckResult:
    hard_constraints_passed: bool
    soft_constraints_score: float
    results: list[ConstraintCheckResult]
    violations: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    
    @property
    def overall_passed(self) -> bool:
        return self.hard_constraints_passed and self.soft_constraints_score >= 0.6


class ConstraintChecker:
    def __init__(self):
        self._hard_constraints = get_hard_constraints()
        self._soft_constraints = get_soft_constraints()
        self._custom_constraints: list[Constraint] = []
    
    def check_hard_constraints(self, action: Action) -> ValidationResult:
        checks = []
        errors = []
        
        for constraint in self._hard_constraints:
            passed, reason = constraint.evaluate(action.description)
            
            checks.append(CheckResult(
                passed=passed,
                check_name=constraint.name,
                reason=reason,
                details={"constraint_id": constraint.id, "type": "hard"},
            ))
            
            if not passed:
                errors.append(reason)
        
        return ValidationResult(
            valid=len(errors) == 0,
            checks=checks,
            errors=errors,
        )
    
    def check_soft_constraints(self, action: Action) -> ValidationResult:
        checks = []
        warnings = []
        total_score = 0.0
        total_weight = 0.0
        
        for constraint in self._soft_constraints:
            passed, reason = constraint.evaluate(action.description)
            score = 1.0 if passed else 0.5
            
            weighted_score = score * constraint.weight
            total_score += weighted_score
            total_weight += constraint.weight
            
            checks.append(CheckResult(
                passed=passed,
                check_name=constraint.name,
                reason=reason,
                details={
                    "constraint_id": constraint.id,
                    "type": "soft",
                    "score": score,
                    "weight": constraint.weight,
                },
            ))
            
            if not passed:
                warnings.append(reason)
        
        overall_score = total_score / total_weight if total_weight > 0 else 1.0
        
        return ValidationResult(
            valid=overall_score >= 0.6,
            checks=checks,
            warnings=warnings,
        )
    
    def check_all(self, action: Action) -> CombinedCheckResult:
        hard_result = self.check_hard_constraints(action)
        soft_result = self.check_soft_constraints(action)
        
        results = []
        violations = []
        warnings = []
        
        for check in hard_result.checks:
            constraint = self._find_constraint(check.check_name)
            if constraint:
                results.append(ConstraintCheckResult(
                    constraint=constraint,
                    passed=check.passed,
                    reason=check.reason,
                ))
            if not check.passed:
                violations.append(check.reason)
        
        for check in soft_result.checks:
            constraint = self._find_constraint(check.check_name)
            if constraint:
                score = check.details.get("score", 1.0)
                results.append(ConstraintCheckResult(
                    constraint=constraint,
                    passed=check.passed,
                    reason=check.reason,
                    score=score,
                ))
            if not check.passed:
                warnings.append(check.reason)
        
        soft_score = 1.0
        if soft_result.checks:
            passed_count = sum(1 for c in soft_result.checks if c.passed)
            soft_score = passed_count / len(soft_result.checks)
        
        return CombinedCheckResult(
            hard_constraints_passed=hard_result.valid,
            soft_constraints_score=soft_score,
            results=results,
            violations=violations,
            warnings=warnings,
        )
    
    def check_intent(self, intent: StructuredIntent) -> CombinedCheckResult:
        action = Action(
            intent_id=intent.id,
            description=intent.parsed_intent,
        )
        return self.check_all(action)
    
    def add_custom_constraint(self, constraint: Constraint) -> None:
        self._custom_constraints.append(constraint)
        if constraint.constraint_type == ConstraintType.HARD:
            self._hard_constraints.append(constraint)
        else:
            self._soft_constraints.append(constraint)
    
    def remove_constraint(self, constraint_id: str) -> bool:
        for constraint_list in [self._hard_constraints, self._soft_constraints, self._custom_constraints]:
            for i, c in enumerate(constraint_list):
                if c.id == constraint_id:
                    constraint_list.pop(i)
                    return True
        return False
    
    def _find_constraint(self, name: str) -> Optional[Constraint]:
        for constraint in get_all_constraints() + self._custom_constraints:
            if constraint.name == name:
                return constraint
        return None
