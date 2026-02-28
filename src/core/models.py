"""Core data models for Open Safe Frame."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional
from uuid import uuid4


class Decision(Enum):
    APPROVE = "approve"
    REJECT = "reject"
    REQUEST_APPROVAL = "request_approval"
    DEFER = "defer"


class RiskCategory(Enum):
    PHYSICAL_HARM = "physical_harm"
    PSYCHOLOGICAL_HARM = "psychological_harm"
    FINANCIAL_HARM = "financial_harm"
    PRIVACY_VIOLATION = "privacy_violation"
    SECURITY_BREACH = "security_breach"
    SOCIETAL_HARM = "societal_harm"
    ENVIRONMENTAL_HARM = "environmental_harm"


class PermissionLevel(Enum):
    LEVEL_0 = 0
    LEVEL_1 = 1
    LEVEL_2 = 2
    LEVEL_3 = 3
    LEVEL_4 = 4


class Severity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class RiskScore:
    probability: float
    impact: float
    category: RiskCategory
    
    @property
    def combined(self) -> float:
        return self.probability * self.impact
    
    @property
    def level(self) -> Severity:
        combined = self.combined
        if combined >= 0.7:
            return Severity.CRITICAL
        elif combined >= 0.4:
            return Severity.HIGH
        elif combined >= 0.2:
            return Severity.MEDIUM
        return Severity.LOW


@dataclass
class Goal:
    description: str
    priority: int = 1
    constraints: list[str] = field(default_factory=list)


@dataclass
class Ambiguity:
    description: str
    possible_interpretations: list[str]
    confidence: float = 0.0


@dataclass
class StructuredIntent:
    id: str = field(default_factory=lambda: str(uuid4()))
    raw_input: str = ""
    parsed_intent: str = ""
    goals: list[Goal] = field(default_factory=list)
    ambiguities: list[Ambiguity] = field(default_factory=list)
    confidence: float = 0.0
    risk_flags: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class SecurityAssessment:
    intent_id: str
    value_alignment_score: float = 0.0
    constraint_compliance_score: float = 0.0
    risk_level: Severity = Severity.LOW
    risk_scores: list[RiskScore] = field(default_factory=list)
    violations: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    
    @property
    def overall_score(self) -> float:
        return (self.value_alignment_score + self.constraint_compliance_score) / 2
    
    @property
    def is_safe(self) -> bool:
        return (
            self.overall_score >= 0.8
            and self.risk_level != Severity.CRITICAL
            and len(self.violations) == 0
        )


@dataclass
class Action:
    id: str = field(default_factory=lambda: str(uuid4()))
    intent_id: str = ""
    action_type: str = ""
    description: str = ""
    parameters: dict[str, Any] = field(default_factory=dict)
    required_permission_level: PermissionLevel = PermissionLevel.LEVEL_0
    risk_level: Severity = Severity.LOW
    requires_human_approval: bool = False
    estimated_impact: dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class Permission:
    id: str = field(default_factory=lambda: str(uuid4()))
    name: str = ""
    level: PermissionLevel = PermissionLevel.LEVEL_0
    scope: list[str] = field(default_factory=list)
    granted_at: datetime = field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None
    granted_by: str = ""
    conditions: dict[str, Any] = field(default_factory=dict)
    
    @property
    def is_expired(self) -> bool:
        if self.expires_at is None:
            return False
        return datetime.now() > self.expires_at
    
    @property
    def is_valid(self) -> bool:
        return not self.is_expired
