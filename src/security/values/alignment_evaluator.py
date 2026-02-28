"""Value alignment evaluator."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from open_safe_frame.core.models import StructuredIntent
from open_safe_frame.core.results import EvaluationResult
from open_safe_frame.security.values.core_values import CoreValue, ValueGraph


@dataclass
class AlignmentScore:
    value_name: str
    score: float
    weight: float
    weighted_score: float
    violations: list[str] = field(default_factory=list)


@dataclass
class AlignmentAssessment:
    overall_score: float
    alignment_scores: list[AlignmentScore]
    passed: bool
    threshold: float = 0.8
    created_at: datetime = field(default_factory=datetime.now)
    
    @property
    def violations(self) -> list[str]:
        violations = []
        for score in self.alignment_scores:
            violations.extend(score.violations)
        return violations


class AlignmentEvaluator:
    def __init__(self, threshold: float = 0.8):
        self.threshold = threshold
        self.value_graph = ValueGraph()
    
    def evaluate(self, intent: StructuredIntent) -> AlignmentAssessment:
        behavior = intent.parsed_intent
        raw_scores = self.value_graph.evaluate_alignment(behavior)
        
        alignment_scores = []
        total_weighted_score = 0.0
        total_weight = 0.0
        
        for value in self.value_graph.get_all_values():
            score = raw_scores.get(value.name, 1.0)
            weighted_score = score * value.weight
            
            violations = []
            if score < self.threshold:
                violations.append(f"违反价值观 '{value.description}'")
            
            alignment_scores.append(AlignmentScore(
                value_name=value.name,
                score=score,
                weight=value.weight,
                weighted_score=weighted_score,
                violations=violations,
            ))
            
            total_weighted_score += weighted_score
            total_weight += value.weight
        
        overall_score = total_weighted_score / total_weight if total_weight > 0 else 0.0
        
        return AlignmentAssessment(
            overall_score=overall_score,
            alignment_scores=alignment_scores,
            passed=overall_score >= self.threshold,
            threshold=self.threshold,
        )
    
    def check_alignment(
        self,
        behavior: str,
        values: Optional[list[CoreValue]] = None,
    ) -> EvaluationResult:
        if values is None:
            values = self.value_graph.get_all_values()
        
        scores = {}
        for value in values:
            scores[value.name] = value.evaluate_compliance(behavior)
        
        overall = sum(scores.values()) / len(scores) if scores else 0.0
        
        recommendations = []
        for name, score in scores.items():
            if score < self.threshold:
                recommendations.append(f"建议改进 '{name}' 方面的合规性")
        
        return EvaluationResult(
            score=overall,
            passed=overall >= self.threshold,
            threshold=self.threshold,
            details=scores,
            recommendations=recommendations,
        )
    
    def add_custom_value(self, value: CoreValue) -> None:
        self.value_graph.add_value(value)
    
    def set_threshold(self, threshold: float) -> None:
        self.threshold = threshold
