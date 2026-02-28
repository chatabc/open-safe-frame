"""Risk matrix for assessment."""

from dataclasses import dataclass
from enum import Enum
from typing import Optional

from open_safe_frame.core.models import RiskScore, Severity


class MitigationAction(Enum):
    NONE = "none"
    MONITOR = "monitor"
    ALERT = "alert"
    RESTRICT = "restrict"
    BLOCK = "block"


@dataclass
class MitigationStrategy:
    action: MitigationAction
    description: str
    requires_approval: bool = False
    approval_timeout_seconds: int = 300


@dataclass
class RiskMatrixEntry:
    probability_range: tuple[float, float]
    impact_range: tuple[float, float]
    severity: Severity
    mitigation: MitigationStrategy


RISK_MATRIX: list[RiskMatrixEntry] = [
    RiskMatrixEntry(
        probability_range=(0.0, 0.1),
        impact_range=(0.0, 1.0),
        severity=Severity.LOW,
        mitigation=MitigationStrategy(
            action=MitigationAction.NONE,
            description="风险可接受，正常执行",
        ),
    ),
    RiskMatrixEntry(
        probability_range=(0.1, 0.3),
        impact_range=(0.0, 0.5),
        severity=Severity.LOW,
        mitigation=MitigationStrategy(
            action=MitigationAction.MONITOR,
            description="低风险，持续监控",
        ),
    ),
    RiskMatrixEntry(
        probability_range=(0.1, 0.3),
        impact_range=(0.5, 1.0),
        severity=Severity.MEDIUM,
        mitigation=MitigationStrategy(
            action=MitigationAction.ALERT,
            description="中等风险，发送告警",
        ),
    ),
    RiskMatrixEntry(
        probability_range=(0.3, 0.6),
        impact_range=(0.0, 0.5),
        severity=Severity.MEDIUM,
        mitigation=MitigationStrategy(
            action=MitigationAction.ALERT,
            description="中等风险，发送告警",
        ),
    ),
    RiskMatrixEntry(
        probability_range=(0.3, 0.6),
        impact_range=(0.5, 1.0),
        severity=Severity.HIGH,
        mitigation=MitigationStrategy(
            action=MitigationAction.RESTRICT,
            description="高风险，需要审批",
            requires_approval=True,
        ),
    ),
    RiskMatrixEntry(
        probability_range=(0.6, 1.0),
        impact_range=(0.0, 0.5),
        severity=Severity.HIGH,
        mitigation=MitigationStrategy(
            action=MitigationAction.RESTRICT,
            description="高风险，需要审批",
            requires_approval=True,
        ),
    ),
    RiskMatrixEntry(
        probability_range=(0.6, 1.0),
        impact_range=(0.5, 1.0),
        severity=Severity.CRITICAL,
        mitigation=MitigationStrategy(
            action=MitigationAction.BLOCK,
            description="极高风险，阻止执行",
        ),
    ),
]


class RiskMatrix:
    def __init__(self, custom_matrix: Optional[list[RiskMatrixEntry]] = None):
        self._matrix = custom_matrix or RISK_MATRIX
    
    def get_score(self, probability: float, impact: float) -> RiskScore:
        entry = self._find_entry(probability, impact)
        
        return RiskScore(
            probability=probability,
            impact=impact,
            category=None,
        )
    
    def get_mitigation(self, score: RiskScore) -> MitigationStrategy:
        entry = self._find_entry(score.probability, score.impact)
        return entry.mitigation
    
    def get_severity(self, probability: float, impact: float) -> Severity:
        entry = self._find_entry(probability, impact)
        return entry.severity
    
    def _find_entry(self, probability: float, impact: float) -> RiskMatrixEntry:
        for entry in self._matrix:
            prob_min, prob_max = entry.probability_range
            impact_min, impact_max = entry.impact_range
            
            if prob_min <= probability < prob_max and impact_min <= impact < impact_max:
                return entry
        
        return RISK_MATRIX[-1]
    
    def add_entry(self, entry: RiskMatrixEntry) -> None:
        self._matrix.append(entry)
    
    def get_all_entries(self) -> list[RiskMatrixEntry]:
        return self._matrix.copy()
