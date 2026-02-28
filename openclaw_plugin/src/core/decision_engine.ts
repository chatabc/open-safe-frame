import { Decision, ConfirmationRequest, UserIntent, Consequence, ValueJudgment } from './types';

export interface DecisionContext {
  intent: UserIntent;
  consequences: Consequence[];
  valueJudgment: ValueJudgment;
  riskScore: number;
  userInterestScore: number;
}

export interface DecisionResult {
  decision: Decision;
  explanation: string;
  shouldNotify: boolean;
  logLevel: 'info' | 'warn' | 'error';
}

export class DecisionEngine {
  
  makeDecision(context: DecisionContext): DecisionResult {
    const { intent, consequences, valueJudgment, riskScore, userInterestScore } = context;

    if (this.shouldReject(valueJudgment, riskScore)) {
      return this.createRejection(context);
    }

    if (this.requiresConfirmation(valueJudgment, riskScore, consequences)) {
      return this.createConfirmationRequest(context);
    }

    return this.createApproval(context);
  }

  private shouldReject(valueJudgment: ValueJudgment, riskScore: number): boolean {
    if (!valueJudgment.aligned && riskScore > 0.7) {
      return true;
    }

    if (valueJudgment.score < 0.3) {
      return true;
    }

    return false;
  }

  private requiresConfirmation(
    valueJudgment: ValueJudgment,
    riskScore: number,
    consequences: Consequence[]
  ): boolean {
    if (riskScore > 0.4) {
      return true;
    }

    if (consequences.some(c => c.severity === 'critical' || c.severity === 'high')) {
      return true;
    }

    if (!valueJudgment.aligned) {
      return true;
    }

    if (valueJudgment.concerns.length > 0) {
      return true;
    }

    return false;
  }

  private createRejection(context: DecisionContext): DecisionResult {
    const { intent, consequences, valueJudgment } = context;

    const reasons: string[] = [];
    
    if (!valueJudgment.aligned) {
      reasons.push('操作与用户利益不一致');
    }
    
    const criticalConsequences = consequences.filter(c => c.severity === 'critical');
    if (criticalConsequences.length > 0) {
      reasons.push(`存在严重风险: ${criticalConsequences.map(c => c.description).join(', ')}`);
    }

    const explanation = this.formatRejectionExplanation(intent, reasons, valueJudgment);

    return {
      decision: {
        action: 'reject',
        reason: explanation,
      },
      explanation,
      shouldNotify: true,
      logLevel: 'warn',
    };
  }

  private createConfirmationRequest(context: DecisionContext): DecisionResult {
    const { intent, consequences, valueJudgment } = context;

    const severity = this.determineConfirmationSeverity(consequences);
    const confirmationType = severity === 'critical' ? 'password' : 'simple';

    const confirmationRequest: ConfirmationRequest = {
      understoodIntent: intent.understood,
      plannedAction: this.formatPlannedAction(intent),
      possibleConsequences: consequences.filter(c => c.severity !== 'low'),
      severity,
      confirmationType,
      timeout: severity === 'critical' ? 300000 : 60000,
    };

    const explanation = this.formatConfirmationExplanation(intent, consequences, severity);

    return {
      decision: {
        action: 'confirm',
        reason: explanation,
        confirmationRequest,
      },
      explanation,
      shouldNotify: true,
      logLevel: 'warn',
    };
  }

  private createApproval(context: DecisionContext): DecisionResult {
    const { intent, consequences, valueJudgment } = context;

    const hasLowRiskConsequences = consequences.some(c => c.severity === 'medium');
    const explanation = this.formatApprovalExplanation(intent, valueJudgment);

    return {
      decision: {
        action: 'proceed',
        reason: explanation,
      },
      explanation,
      shouldNotify: hasLowRiskConsequences,
      logLevel: 'info',
    };
  }

  private determineConfirmationSeverity(consequences: Consequence[]): 'medium' | 'high' | 'critical' {
    if (consequences.some(c => c.severity === 'critical')) {
      return 'critical';
    }
    if (consequences.some(c => c.severity === 'high')) {
      return 'high';
    }
    return 'medium';
  }

  private formatPlannedAction(intent: UserIntent): string {
    const parts: string[] = [];
    
    parts.push(`执行: ${intent.understood}`);
    
    if (intent.keyActions.length > 0) {
      parts.push(`具体操作: ${intent.keyActions.join(', ')}`);
    }
    
    if (intent.dataInvolved.length > 0) {
      parts.push(`涉及数据: ${intent.dataInvolved.map(d => `${d.description}(${d.estimatedVolume})`).join(', ')}`);
    }

    return parts.join('\n');
  }

  private formatRejectionExplanation(
    intent: UserIntent,
    reasons: string[],
    valueJudgment: ValueJudgment
  ): string {
    const lines: string[] = [];
    
    lines.push('⛔ 操作已被阻止');
    lines.push('');
    lines.push(`用户意图: "${intent.understood}"`);
    lines.push('');
    lines.push('阻止原因:');
    for (const reason of reasons) {
      lines.push(`  • ${reason}`);
    }
    
    if (valueJudgment.recommendations.length > 0) {
      lines.push('');
      lines.push('建议:');
      for (const rec of valueJudgment.recommendations) {
        lines.push(`  • ${rec}`);
      }
    }

    return lines.join('\n');
  }

  private formatConfirmationExplanation(
    intent: UserIntent,
    consequences: Consequence[],
    severity: 'medium' | 'high' | 'critical'
  ): string {
    const lines: string[] = [];
    
    const severityEmoji = { medium: '⚠️', high: '🔶', critical: '🔴' };
    const severityLabel = { medium: '中等风险', high: '高风险', critical: '严重风险' };
    
    lines.push(`${severityEmoji[severity]} 需要用户确认 (${severityLabel[severity]})`);
    lines.push('');
    lines.push('【AI理解的意图】');
    lines.push(intent.understood);
    lines.push('');
    lines.push('【要执行的操作】');
    lines.push(intent.keyActions.length > 0 ? intent.keyActions.join(', ') : intent.understood);
    lines.push('');
    lines.push('【可能的后果】');
    
    const significantConsequences = consequences.filter(c => c.severity !== 'low');
    for (const c of significantConsequences) {
      const severityTag = `[${c.severity.toUpperCase()}]`;
      const reversibilityTag = c.reversibility === 'irreversible' ? ' [不可逆]' : '';
      lines.push(`  ${severityTag}${reversibilityTag} ${c.description}`);
    }
    
    lines.push('');
    lines.push(`【严重程度】${severityLabel[severity]}`);
    lines.push('');
    
    if (severity === 'critical') {
      lines.push('⚠️ 此操作风险较高，需要输入密码确认');
    } else {
      lines.push('请确认是否继续执行此操作');
    }

    return lines.join('\n');
  }

  private formatApprovalExplanation(intent: UserIntent, valueJudgment: ValueJudgment): string {
    const lines: string[] = [];
    
    lines.push('✅ 操作已批准');
    lines.push('');
    lines.push(`用户意图: "${intent.understood}"`);
    lines.push(`价值对齐评分: ${(valueJudgment.score * 100).toFixed(0)}%`);
    
    if (valueJudgment.concerns.length > 0) {
      lines.push('');
      lines.push('注意事项:');
      for (const concern of valueJudgment.concerns) {
        lines.push(`  • ${concern}`);
      }
    }

    return lines.join('\n');
  }
}
