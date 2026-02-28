import { IntentEngine } from './intent_engine';
import { ConsequenceEngine } from './consequence_engine';
import { ValueEngine } from './value_engine';
import { DecisionEngine } from './decision_engine';
import { Decision, UserIntent, ConsequencePrediction, ValueAlignmentResult, ToolContext, SessionEvent } from './types';

export interface SafetyAssessment {
  intent: UserIntent;
  consequencePrediction: ConsequencePrediction;
  valueAlignment: ValueAlignmentResult;
  decision: Decision;
  processingTime: number;
}

export class SafetyCoordinator {
  private intentEngine: IntentEngine;
  private consequenceEngine: ConsequenceEngine;
  private valueEngine: ValueEngine;
  private decisionEngine: DecisionEngine;

  constructor() {
    this.intentEngine = new IntentEngine();
    this.consequenceEngine = new ConsequenceEngine();
    this.valueEngine = new ValueEngine();
    this.decisionEngine = new DecisionEngine();
  }

  async assess(
    userMessage: string,
    toolContext: ToolContext
  ): Promise<SafetyAssessment> {
    const startTime = Date.now();

    const intent = await this.intentEngine.understand(
      userMessage,
      { toolName: toolContext.toolName, params: toolContext.params },
      toolContext.sessionHistory
    );

    const consequencePrediction = await this.consequenceEngine.predict(intent, toolContext);

    const valueAlignment = await this.valueEngine.evaluate(
      intent,
      consequencePrediction.consequences,
      toolContext
    );

    const decision = this.decisionEngine.makeDecision({
      intent,
      consequences: consequencePrediction.consequences,
      valueJudgment: valueAlignment.judgment,
      riskScore: valueAlignment.riskScore,
      userInterestScore: valueAlignment.userInterestScore,
    });

    const processingTime = Date.now() - startTime;

    return {
      intent,
      consequencePrediction,
      valueAlignment,
      decision,
      processingTime,
    };
  }

  formatConfirmationMessage(assessment: SafetyAssessment): string {
    const { decision } = assessment;
    
    if (decision.action !== 'confirm' || !decision.confirmationRequest) {
      return '';
    }

    const req = decision.confirmationRequest;
    const lines: string[] = [];

    lines.push('═'.repeat(50));
    lines.push('🔐 Open Safe Frame - 操作确认请求');
    lines.push('═'.repeat(50));
    lines.push('');
    lines.push('【AI理解的意图】');
    lines.push(`  ${req.understoodIntent}`);
    lines.push('');
    lines.push('【要执行的操作】');
    lines.push(`  ${req.plannedAction}`);
    lines.push('');
    lines.push('【可能的后果】');
    
    for (const c of req.possibleConsequences) {
      const severityIcon = { low: '🟢', medium: '🟡', high: '🟠', critical: '🔴' };
      const reversibilityNote = c.reversibility === 'irreversible' ? ' ⚠️不可逆' : '';
      lines.push(`  ${severityIcon[c.severity]} ${c.description}${reversibilityNote}`);
    }
    
    lines.push('');
    lines.push(`【严重程度】${this.getSeverityLabel(req.severity)}`);
    lines.push('');
    
    if (req.confirmationType === 'password') {
      lines.push('🔑 此操作需要输入密码确认');
      lines.push('');
      lines.push('请输入您的确认密码以继续：');
    } else {
      lines.push('请回复 "确认" 以继续，或回复 "取消" 以放弃此操作');
    }
    
    lines.push('');
    lines.push('═'.repeat(50));

    return lines.join('\n');
  }

  formatRejectionMessage(assessment: SafetyAssessment): string {
    const { decision, intent, valueAlignment } = assessment;
    
    const lines: string[] = [];
    
    lines.push('═'.repeat(50));
    lines.push('⛔ Open Safe Frame - 操作已阻止');
    lines.push('═'.repeat(50));
    lines.push('');
    lines.push(`【用户意图】${intent.understood}`);
    lines.push('');
    lines.push('【阻止原因】');
    lines.push(`  ${decision.reason}`);
    lines.push('');
    
    if (valueAlignment.judgment.recommendations.length > 0) {
      lines.push('【建议替代方案】');
      for (const rec of valueAlignment.judgment.recommendations) {
        lines.push(`  • ${rec}`);
      }
      lines.push('');
    }
    
    lines.push('═'.repeat(50));

    return lines.join('\n');
  }

  private getSeverityLabel(severity: 'medium' | 'high' | 'critical'): string {
    const labels = {
      medium: '🟡 中等风险',
      high: '🟠 高风险',
      critical: '🔴 严重风险',
    };
    return labels[severity];
  }
}
