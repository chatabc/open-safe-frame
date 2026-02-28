"""Constraint definitions for behavior control."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class ConstraintType(Enum):
    HARD = "hard"
    SOFT = "soft"


class ConstraintPriority(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class Constraint:
    id: str
    name: str
    description: str
    constraint_type: ConstraintType
    priority: ConstraintPriority = ConstraintPriority.MEDIUM
    scope: list[str] = field(default_factory=list)
    conditions: dict[str, Any] = field(default_factory=dict)
    weight: float = 1.0
    adjustable: bool = False
    
    def evaluate(self, action_description: str) -> tuple[bool, str]:
        if self.constraint_type == ConstraintType.HARD:
            return self._evaluate_hard(action_description)
        return self._evaluate_soft(action_description)
    
    def _evaluate_hard(self, action_description: str) -> tuple[bool, str]:
        passed = True
        reason = ""
        
        for keyword in self.conditions.get("forbidden_keywords", []):
            if keyword.lower() in action_description.lower():
                passed = False
                reason = f"违反硬约束 '{self.name}': 检测到禁止关键词 '{keyword}'"
                break
        
        return passed, reason
    
    def _evaluate_soft(self, action_description: str) -> tuple[bool, str]:
        score = 1.0
        
        for keyword in self.conditions.get("warning_keywords", []):
            if keyword.lower() in action_description.lower():
                score -= 0.2
        
        passed = score >= self.weight
        reason = "" if passed else f"软约束 '{self.name}' 评分: {score:.2f}"
        
        return passed, reason


HARD_CONSTRAINTS: list[Constraint] = [
    Constraint(
        id="hc_001",
        name="no_harm_to_humans",
        description="禁止对人类造成伤害",
        constraint_type=ConstraintType.HARD,
        priority=ConstraintPriority.CRITICAL,
        scope=["global"],
        conditions={
            "forbidden_keywords": [
                "伤害", "harm", "攻击", "attack", "杀", "kill",
                "毒", "poison", "爆炸", "explode",
            ],
        },
    ),
    Constraint(
        id="hc_002",
        name="no_deception",
        description="禁止欺骗行为",
        constraint_type=ConstraintType.HARD,
        priority=ConstraintPriority.CRITICAL,
        scope=["global"],
        conditions={
            "forbidden_keywords": [
                "欺骗", "deceive", "诈骗", "fraud", "伪造", "forge",
                "假冒", "impersonate",
            ],
        },
    ),
    Constraint(
        id="hc_003",
        name="no_unauthorized_access",
        description="禁止未授权访问",
        constraint_type=ConstraintType.HARD,
        priority=ConstraintPriority.CRITICAL,
        scope=["global"],
        conditions={
            "forbidden_keywords": [
                "绕过", "bypass", "破解", "crack", "越权", "unauthorized",
                "入侵", "intrude", "黑客", "hack",
            ],
        },
    ),
    Constraint(
        id="hc_004",
        name="no_self_modification_of_safety",
        description="禁止修改自身安全机制",
        constraint_type=ConstraintType.HARD,
        priority=ConstraintPriority.CRITICAL,
        scope=["global"],
        conditions={
            "forbidden_keywords": [
                "修改安全", "modify safety", "禁用安全", "disable safety",
                "绕过约束", "bypass constraint",
            ],
        },
    ),
]

SOFT_CONSTRAINTS: list[Constraint] = [
    Constraint(
        id="sc_001",
        name="efficiency",
        description="追求高效执行",
        constraint_type=ConstraintType.SOFT,
        priority=ConstraintPriority.MEDIUM,
        weight=0.7,
        adjustable=True,
        conditions={
            "warning_keywords": ["慢", "slow", "延迟", "delay"],
        },
    ),
    Constraint(
        id="sc_002",
        name="user_satisfaction",
        description="提升用户满意度",
        constraint_type=ConstraintType.SOFT,
        priority=ConstraintPriority.HIGH,
        weight=0.8,
        adjustable=True,
        conditions={
            "warning_keywords": ["不满意", "unsatisfied", "抱怨", "complain"],
        },
    ),
    Constraint(
        id="sc_003",
        name="resource_optimization",
        description="优化资源使用",
        constraint_type=ConstraintType.SOFT,
        priority=ConstraintPriority.MEDIUM,
        weight=0.6,
        adjustable=True,
        conditions={
            "warning_keywords": ["浪费", "waste", "过度使用", "excessive"],
        },
    ),
]


def get_all_constraints() -> list[Constraint]:
    return HARD_CONSTRAINTS + SOFT_CONSTRAINTS


def get_hard_constraints() -> list[Constraint]:
    return HARD_CONSTRAINTS


def get_soft_constraints() -> list[Constraint]:
    return SOFT_CONSTRAINTS
