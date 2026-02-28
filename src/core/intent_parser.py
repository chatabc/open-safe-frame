"""Intent parser for Open Safe Frame."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from uuid import uuid4

from open_safe_frame.core.models import Ambiguity, Goal, StructuredIntent


@dataclass
class ParseResult:
    intent: StructuredIntent
    success: bool = True
    error: Optional[str] = None
    processing_time_ms: float = 0.0


class IntentParser:
    def __init__(self):
        self._patterns: dict[str, list[str]] = {}
        self._keyword_weights: dict[str, float] = {}
    
    def parse(self, user_input: str) -> ParseResult:
        start_time = datetime.now()
        
        try:
            intent = StructuredIntent(
                raw_input=user_input,
                parsed_intent=self._extract_intent(user_input),
                goals=self._extract_goals(user_input),
                ambiguities=self._detect_ambiguities(user_input),
                confidence=self._calculate_confidence(user_input),
                risk_flags=self._detect_risk_flags(user_input),
            )
            
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            
            return ParseResult(
                intent=intent,
                success=True,
                processing_time_ms=processing_time,
            )
        except Exception as e:
            return ParseResult(
                intent=StructuredIntent(raw_input=user_input),
                success=False,
                error=str(e),
            )
    
    def _extract_intent(self, user_input: str) -> str:
        return user_input.strip()
    
    def _extract_goals(self, user_input: str) -> list[Goal]:
        goals = []
        sentences = user_input.split(".")
        
        for i, sentence in enumerate(sentences):
            sentence = sentence.strip()
            if sentence:
                goals.append(Goal(
                    description=sentence,
                    priority=len(sentences) - i,
                ))
        
        return goals
    
    def _detect_ambiguities(self, user_input: str) -> list[Ambiguity]:
        ambiguities = []
        
        ambiguous_words = ["可能", "也许", "大概", "maybe", "might", "possibly"]
        
        for word in ambiguous_words:
            if word.lower() in user_input.lower():
                ambiguities.append(Ambiguity(
                    description=f"检测到模糊词汇: {word}",
                    possible_interpretations=["需要进一步澄清"],
                    confidence=0.7,
                ))
        
        return ambiguities
    
    def _calculate_confidence(self, user_input: str) -> float:
        confidence = 1.0
        
        if len(user_input) < 10:
            confidence *= 0.8
        
        ambiguous_count = len(self._detect_ambiguities(user_input))
        confidence *= max(0.5, 1.0 - ambiguous_count * 0.1)
        
        return min(1.0, max(0.0, confidence))
    
    def _detect_risk_flags(self, user_input: str) -> list[str]:
        flags = []
        
        risk_keywords = [
            "删除", "delete", "remove",
            "修改", "modify", "change",
            "权限", "permission", "access",
            "密码", "password", "secret",
            "绕过", "bypass", "skip",
        ]
        
        user_lower = user_input.lower()
        for keyword in risk_keywords:
            if keyword in user_lower:
                flags.append(f"检测到风险关键词: {keyword}")
        
        return flags
    
    def register_pattern(self, name: str, patterns: list[str]) -> None:
        self._patterns[name] = patterns
    
    def set_keyword_weight(self, keyword: str, weight: float) -> None:
        self._keyword_weights[keyword] = weight
