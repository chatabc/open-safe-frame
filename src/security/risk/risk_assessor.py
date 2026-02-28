"""Risk assessment engine."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

from open_safe_frame.core.models import Action, RiskCategory, RiskScore, Severity, StructuredIntent


@dataclass
class RiskAssessment:
    action_id: str
    overall_risk: Severity
    risk_scores: list[RiskScore]
    combined_score: float
    mitigations: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    
    @property
    def is_acceptable(self) -> bool:
        return self.overall_risk in [Severity.LOW, Severity.MEDIUM]


class RiskAssessor:
    def __init__(self, high_threshold: float = 0.4, critical_threshold: float = 0.7):
        self.high_threshold = high_threshold
        self.critical_threshold = critical_threshold
        self._category_weights: dict[RiskCategory, float] = {
            RiskCategory.PHYSICAL_HARM: 1.0,
            RiskCategory.PSYCHOLOGICAL_HARM: 0.8,
            RiskCategory.FINANCIAL_HARM: 0.7,
            RiskCategory.PRIVACY_VIOLATION: 0.85,
            RiskCategory.SECURITY_BREACH: 0.9,
            RiskCategory.SOCIETAL_HARM: 0.75,
            RiskCategory.ENVIRONMENTAL_HARM: 0.6,
        }
        self._risk_keywords: dict[RiskCategory, list[str]] = {
            RiskCategory.PHYSICAL_HARM: [
                "伤害", "harm", "攻击", "attack", "暴力", "violence",
                "武器", "weapon", "危险", "danger",
            ],
            RiskCategory.PSYCHOLOGICAL_HARM: [
                "恐吓", "intimidate", "骚扰", "harass", "欺凌", "bully",
                "精神", "mental", "心理", "psychological",
            ],
            RiskCategory.FINANCIAL_HARM: [
                "欺诈", "fraud", "盗窃", "theft", "财务", "financial",
                "金钱", "money", "损失", "loss",
            ],
            RiskCategory.PRIVACY_VIOLATION: [
                "隐私", "privacy", "泄露", "leak", "数据", "data",
                "监控", "surveillance", "窃取", "steal",
            ],
            RiskCategory.SECURITY_BREACH: [
                "入侵", "intrusion", "漏洞", "vulnerability", "黑客", "hack",
                "安全", "security", "攻击", "attack",
            ],
            RiskCategory.SOCIETAL_HARM: [
                "社会", "societal", "公众", "public", "群体", "group",
                "歧视", "discrimination", "偏见", "bias",
            ],
            RiskCategory.ENVIRONMENTAL_HARM: [
                "环境", "environment", "污染", "pollution", "生态", "ecology",
                "破坏", "destroy", "浪费", "waste",
            ],
        }
    
    def assess(self, action: Action) -> RiskAssessment:
        risk_scores = []
        
        for category in RiskCategory:
            probability = self.calculate_probability(action, category)
            impact = self.calculate_impact(action, category)
            
            risk_scores.append(RiskScore(
                probability=probability,
                impact=impact,
                category=category,
            ))
        
        combined_score = self._calculate_combined_score(risk_scores)
        overall_risk = self._determine_severity(combined_score)
        mitigations = self._generate_mitigations(risk_scores)
        
        return RiskAssessment(
            action_id=action.id,
            overall_risk=overall_risk,
            risk_scores=risk_scores,
            combined_score=combined_score,
            mitigations=mitigations,
        )
    
    def assess_intent(self, intent: StructuredIntent) -> RiskAssessment:
        action = Action(
            intent_id=intent.id,
            description=intent.parsed_intent,
        )
        return self.assess(action)
    
    def calculate_probability(self, action: Action, category: RiskCategory) -> float:
        keywords = self._risk_keywords.get(category, [])
        description_lower = action.description.lower()
        
        match_count = sum(1 for kw in keywords if kw.lower() in description_lower)
        base_probability = min(1.0, match_count * 0.15)
        
        if action.risk_level == Severity.HIGH:
            base_probability *= 1.3
        elif action.risk_level == Severity.CRITICAL:
            base_probability *= 1.5
        
        return min(1.0, base_probability)
    
    def calculate_impact(self, action: Action, category: RiskCategory) -> float:
        base_impact = 0.3
        
        weight = self._category_weights.get(category, 0.5)
        base_impact *= weight
        
        high_impact_keywords = ["严重", "severe", "重大", "major", "灾难", "disaster"]
        description_lower = action.description.lower()
        
        for keyword in high_impact_keywords:
            if keyword in description_lower:
                base_impact *= 1.5
                break
        
        return min(1.0, base_impact)
    
    def _calculate_combined_score(self, risk_scores: list[RiskScore]) -> float:
        if not risk_scores:
            return 0.0
        
        total_weighted_score = 0.0
        total_weight = 0.0
        
        for score in risk_scores:
            weight = self._category_weights.get(score.category, 0.5)
            total_weighted_score += score.combined * weight
            total_weight += weight
        
        return total_weighted_score / total_weight if total_weight > 0 else 0.0
    
    def _determine_severity(self, combined_score: float) -> Severity:
        if combined_score >= self.critical_threshold:
            return Severity.CRITICAL
        elif combined_score >= self.high_threshold:
            return Severity.HIGH
        elif combined_score >= 0.2:
            return Severity.MEDIUM
        return Severity.LOW
    
    def _generate_mitigations(self, risk_scores: list[RiskScore]) -> list[str]:
        mitigations = []
        
        for score in risk_scores:
            if score.combined >= 0.3:
                mitigations.append(
                    f"建议针对 '{score.category.value}' 风险采取缓解措施"
                )
        
        return mitigations
    
    def set_category_weight(self, category: RiskCategory, weight: float) -> None:
        self._category_weights[category] = weight
    
    def add_risk_keywords(self, category: RiskCategory, keywords: list[str]) -> None:
        if category not in self._risk_keywords:
            self._risk_keywords[category] = []
        self._risk_keywords[category].extend(keywords)
