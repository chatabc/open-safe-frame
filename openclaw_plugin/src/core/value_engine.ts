import { ValueJudgment, UserIntent, Consequence, ToolContext } from './types';

export interface ValueAlignmentResult {
  judgment: ValueJudgment;
  reasoning: string;
  userInterestScore: number;
  riskScore: number;
}

export class ValueEngine {
  
  private readonly coreValues = [
    { name: 'data_safety', weight: 1.0, description: '保护用户数据安全' },
    { name: 'financial_safety', weight: 0.95, description: '保护用户财务安全' },
    { name: 'privacy', weight: 0.9, description: '保护用户隐私' },
    { name: 'intent_alignment', weight: 0.85, description: '行为符合用户意图' },
    { name: 'reversibility', weight: 0.7, description: '操作可逆性' },
    { name: 'efficiency', weight: 0.5, description: '操作效率' },
  ];

  async evaluate(
    intent: UserIntent,
    consequences: Consequence[],
    toolContext: ToolContext
  ): Promise<ValueAlignmentResult> {
    
    const valueScores = await this.evaluateCoreValues(intent, consequences, toolContext);
    const userInterestScore = this.calculateUserInterestScore(valueScores);
    const riskScore = this.calculateRiskScore(consequences);
    const judgment = this.makeJudgment(intent, consequences, userInterestScore, riskScore);
    const reasoning = this.generateReasoning(intent, consequences, valueScores);

    return {
      judgment,
      reasoning,
      userInterestScore,
      riskScore,
    };
  }

  private async evaluateCoreValues(
    intent: UserIntent,
    consequences: Consequence[],
    toolContext: ToolContext
  ): Promise<Map<string, number>> {
    const scores = new Map<string, number>();

    scores.set('data_safety', this.evaluateDataSafety(consequences));
    scores.set('financial_safety', this.evaluateFinancialSafety(consequences, intent));
    scores.set('privacy', this.evaluatePrivacy(consequences));
    scores.set('intent_alignment', this.evaluateIntentAlignment(intent, toolContext));
    scores.set('reversibility', this.evaluateReversibility(consequences));
    scores.set('efficiency', this.evaluateEfficiency(intent, toolContext));

    return scores;
  }

  private evaluateDataSafety(consequences: Consequence[]): number {
    const dataLossConsequences = consequences.filter(c => c.type === 'data_loss');
    
    if (dataLossConsequences.length === 0) return 1.0;

    let score = 1.0;
    for (const c of dataLossConsequences) {
      switch (c.severity) {
        case 'critical': score -= 0.5; break;
        case 'high': score -= 0.3; break;
        case 'medium': score -= 0.15; break;
        case 'low': score -= 0.05; break;
      }
    }

    return Math.max(0, score);
  }

  private evaluateFinancialSafety(consequences: Consequence[], intent: UserIntent): number {
    const financialConsequences = consequences.filter(c => c.type === 'financial_loss');
    
    if (financialConsequences.length === 0) return 1.0;

    const hasUnauthorized = financialConsequences.some(c => c.severity === 'critical');
    if (hasUnauthorized) return 0;

    const hasExplicitIntent = /买|购买|支付|purchase|buy|pay/i.test(intent.raw);
    if (!hasExplicitIntent) return 0.3;

    return 0.7;
  }

  private evaluatePrivacy(consequences: Consequence[]): number {
    const privacyConsequences = consequences.filter(c => c.type === 'privacy_breach');
    
    if (privacyConsequences.length === 0) return 1.0;

    return privacyConsequences.some(c => c.severity === 'critical') ? 0 : 0.5;
  }

  private evaluateIntentAlignment(intent: UserIntent, toolContext: ToolContext): number {
    if (intent.confidence < 0.5) return 0.5;

    const { toolName, params } = toolContext;
    const lowerIntent = intent.raw.toLowerCase();
    
    const intentActionMap: Array<{ patterns: RegExp[]; tools: string[]; score: number }> = [
      {
        patterns: [/整理|清理|organize|clean/i],
        tools: ['organize', 'clean', 'sort', 'arrange'],
        score: 0.9,
      },
      {
        patterns: [/删除|移除|delete|remove/i],
        tools: ['delete', 'remove', 'del', 'rm'],
        score: 0.85,
      },
      {
        patterns: [/查看|检查|check|view|read/i],
        tools: ['read', 'view', 'check', 'cat', 'ls'],
        score: 0.95,
      },
      {
        patterns: [/发送|发邮件|send|email/i],
        tools: ['send', 'email', 'mail', 'post'],
        score: 0.85,
      },
    ];

    for (const { patterns, tools, score } of intentActionMap) {
      const intentMatches = patterns.some(p => p.test(lowerIntent));
      const toolMatches = tools.some(t => toolName.toLowerCase().includes(t));
      
      if (intentMatches && toolMatches) {
        return score;
      }
    }

    return intent.confidence;
  }

  private evaluateReversibility(consequences: Consequence[]): number {
    if (consequences.length === 0) return 1.0;

    if (consequences.some(c => c.reversibility === 'irreversible')) {
      return 0.2;
    }
    if (consequences.some(c => c.reversibility === 'partially_reversible')) {
      return 0.5;
    }
    return 0.9;
  }

  private evaluateEfficiency(intent: UserIntent, toolContext: ToolContext): number {
    const hasConstraints = intent.constraints.length > 0;
    const hasBatchOperation = intent.dataInvolved.some(d => d.estimatedVolume === 'large');
    
    if (hasBatchOperation && hasConstraints) {
      return 0.6;
    }
    
    return 0.8;
  }

  private calculateUserInterestScore(valueScores: Map<string, number>): number {
    let totalScore = 0;
    let totalWeight = 0;

    for (const value of this.coreValues) {
      const score = valueScores.get(value.name) ?? 0.5;
      totalScore += score * value.weight;
      totalWeight += value.weight;
    }

    return totalScore / totalWeight;
  }

  private calculateRiskScore(consequences: Consequence[]): number {
    if (consequences.length === 0) return 0;

    const severityWeights = { low: 0.1, medium: 0.3, high: 0.6, critical: 1.0 };
    
    let totalRisk = 0;
    for (const c of consequences) {
      totalRisk += severityWeights[c.severity];
    }

    return Math.min(1, totalRisk / consequences.length);
  }

  private makeJudgment(
    intent: UserIntent,
    consequences: Consequence[],
    userInterestScore: number,
    riskScore: number
  ): ValueJudgment {
    const concerns: string[] = [];
    const recommendations: string[] = [];

    const criticalConsequences = consequences.filter(c => c.severity === 'critical');
    const highConsequences = consequences.filter(c => c.severity === 'high');

    if (criticalConsequences.length > 0) {
      concerns.push(...criticalConsequences.map(c => c.description));
      recommendations.push('建议用户确认后再执行');
    }

    if (highConsequences.length > 0 && criticalConsequences.length === 0) {
      concerns.push(...highConsequences.map(c => c.description));
      recommendations.push('建议用户了解风险后确认');
    }

    if (intent.confidence < 0.6) {
      concerns.push('用户意图不够明确');
      recommendations.push('建议与用户确认具体需求');
    }

    const aligned = userInterestScore >= 0.6 && riskScore < 0.5;
    const score = (userInterestScore * (1 - riskScore) + userInterestScore) / 2;

    return {
      aligned,
      score,
      concerns,
      recommendations,
    };
  }

  private generateReasoning(
    intent: UserIntent,
    consequences: Consequence[],
    valueScores: Map<string, number>
  ): string {
    const parts: string[] = [];

    parts.push(`用户意图: "${intent.understood}" (置信度: ${(intent.confidence * 100).toFixed(0)}%)`);

    if (consequences.length > 0) {
      parts.push(`检测到 ${consequences.length} 个潜在后果:`);
      for (const c of consequences.slice(0, 3)) {
        parts.push(`  - [${c.severity.toUpperCase()}] ${c.description}`);
      }
    }

    const lowScores = Array.from(valueScores.entries())
      .filter(([_, score]) => score < 0.6)
      .map(([name, score]) => `${name}: ${(score * 100).toFixed(0)}%`);
    
    if (lowScores.length > 0) {
      parts.push(`需要关注的价值维度: ${lowScores.join(', ')}`);
    }

    return parts.join('\n');
  }
}
