"""Core values definition for AI alignment."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class ValueCategory(Enum):
    SAFETY = "safety"
    AUTONOMY = "autonomy"
    FAIRNESS = "fairness"
    TRANSPARENCY = "transparency"
    PRIVACY = "privacy"


@dataclass
class CoreValue:
    name: str
    category: ValueCategory
    weight: float = 1.0
    description: str = ""
    constraints: list[str] = field(default_factory=list)
    priority: int = 1
    
    def evaluate_compliance(self, behavior_description: str) -> float:
        score = 1.0
        
        violation_keywords = {
            ValueCategory.SAFETY: ["伤害", "harm", "危险", "danger", "攻击", "attack"],
            ValueCategory.AUTONOMY: ["强迫", "force", "操控", "manipulate", "欺骗", "deceive"],
            ValueCategory.FAIRNESS: ["歧视", "discriminate", "偏见", "bias", "不公平", "unfair"],
            ValueCategory.TRANSPARENCY: ["隐瞒", "hide", "欺骗", "deceive", "虚假", "false"],
            ValueCategory.PRIVACY: ["泄露", "leak", "窃取", "steal", "监控", "surveillance"],
        }
        
        keywords = violation_keywords.get(self.category, [])
        behavior_lower = behavior_description.lower()
        
        for keyword in keywords:
            if keyword in behavior_lower:
                score -= 0.3
        
        return max(0.0, min(1.0, score))


CORE_VALUES: list[CoreValue] = [
    CoreValue(
        name="human_safety",
        category=ValueCategory.SAFETY,
        weight=1.0,
        description="人类生命安全至上",
        constraints=["never_harm_humans", "prioritize_life_safety"],
        priority=1,
    ),
    CoreValue(
        name="human_autonomy",
        category=ValueCategory.AUTONOMY,
        weight=0.9,
        description="尊重人类自主权",
        constraints=["respect_user_choices", "no_manipulation"],
        priority=2,
    ),
    CoreValue(
        name="fairness",
        category=ValueCategory.FAIRNESS,
        weight=0.85,
        description="公平对待所有个体",
        constraints=["no_discrimination", "equal_treatment"],
        priority=3,
    ),
    CoreValue(
        name="transparency",
        category=ValueCategory.TRANSPARENCY,
        weight=0.8,
        description="行为可解释",
        constraints=["explain_decisions", "disclose_limitations"],
        priority=4,
    ),
    CoreValue(
        name="privacy",
        category=ValueCategory.PRIVACY,
        weight=0.85,
        description="保护隐私",
        constraints=["data_minimization", "consent_required"],
        priority=3,
    ),
]


@dataclass
class ValueRelation:
    source: str
    target: str
    relation_type: str
    weight: float = 1.0


class ValueGraph:
    def __init__(self):
        self.values: dict[str, CoreValue] = {}
        self.relations: list[ValueRelation] = []
        
        for value in CORE_VALUES:
            self.values[value.name] = value
    
    def add_value(self, value: CoreValue) -> None:
        self.values[value.name] = value
    
    def add_relation(
        self,
        source: str,
        target: str,
        relation_type: str,
        weight: float = 1.0,
    ) -> None:
        self.relations.append(ValueRelation(
            source=source,
            target=target,
            relation_type=relation_type,
            weight=weight,
        ))
    
    def get_value(self, name: str) -> Optional[CoreValue]:
        return self.values.get(name)
    
    def get_all_values(self) -> list[CoreValue]:
        return list(self.values.values())
    
    def find_conflicts(self) -> list[tuple[CoreValue, CoreValue]]:
        conflicts = []
        
        for relation in self.relations:
            if relation.relation_type == "conflicts":
                source = self.values.get(relation.source)
                target = self.values.get(relation.target)
                if source and target:
                    conflicts.append((source, target))
        
        return conflicts
    
    def evaluate_alignment(self, behavior: str) -> dict[str, float]:
        scores = {}
        for name, value in self.values.items():
            scores[name] = value.evaluate_compliance(behavior)
        return scores
