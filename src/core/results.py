"""Result types for Open Safe Frame."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional


class ResultStatus(Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    PENDING = "pending"
    TIMEOUT = "timeout"


@dataclass
class CheckResult:
    passed: bool
    check_name: str = ""
    reason: str = ""
    details: dict[str, Any] = field(default_factory=dict)


@dataclass
class ValidationResult:
    valid: bool
    checks: list[CheckResult] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    
    @property
    def passed_checks(self) -> int:
        return sum(1 for c in self.checks if c.passed)
    
    @property
    def failed_checks(self) -> int:
        return sum(1 for c in self.checks if not c.passed)


@dataclass
class EvaluationResult:
    score: float
    passed: bool
    threshold: float = 0.8
    details: dict[str, Any] = field(default_factory=dict)
    recommendations: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class ExecutionResult:
    status: ResultStatus
    execution_id: str
    action_id: str = ""
    output: Any = None
    error: Optional[str] = None
    duration_ms: float = 0.0
    resource_usage: dict[str, Any] = field(default_factory=dict)
    side_effects: list[dict[str, Any]] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    
    @property
    def is_success(self) -> bool:
        return self.status == ResultStatus.SUCCESS


@dataclass
class AuditResult:
    audit_id: str
    execution_id: str
    compliant: bool
    violations: list[str] = field(default_factory=list)
    observations: list[str] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
