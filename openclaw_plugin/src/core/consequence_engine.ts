import type { Consequence, UserIntent, ToolContext, SessionEvent } from './types';
import type { AIAnalyzer, AIAnalysisRequest, ConsequenceAnalysisResult } from './ai_analyzer';

export interface ConsequencePrediction {
  consequences: Consequence[];
  overallSeverity: 'low' | 'medium' | 'high' | 'critical';
  reversibility: 'reversible' | 'partially_reversible' | 'irreversible';
  confidence: number;
  reasoning: string;
}

export class ConsequenceEngine {
  private aiAnalyzer: AIAnalyzer | null = null;

  constructor(aiAnalyzer?: AIAnalyzer) {
    this.aiAnalyzer = aiAnalyzer || null;
  }

  setAIAnalyzer(analyzer: AIAnalyzer): void {
    this.aiAnalyzer = analyzer;
  }

  async predict(
    intent: UserIntent,
    toolContext: ToolContext
  ): Promise<ConsequencePrediction> {
    if (this.aiAnalyzer) {
      return this.predictWithAI(intent, toolContext);
    }
    return this.predictWithRules(intent, toolContext);
  }

  private async predictWithAI(
    intent: UserIntent,
    toolContext: ToolContext
  ): Promise<ConsequencePrediction> {
    try {
      const request: AIAnalysisRequest = {
        userMessage: intent.raw,
        toolName: toolContext.toolName,
        toolParams: toolContext.params,
        sessionHistory: toolContext.sessionHistory.map(e => ({
          type: e.type,
          content: e.content,
          toolName: e.toolName,
        })),
      };

      const aiResult = await this.aiAnalyzer!.analyzeConsequence(request, {
        understood: intent.understood,
        confidence: intent.confidence,
        keyActions: intent.keyActions,
        constraints: intent.constraints,
        dataInvolved: intent.dataInvolved,
      });

      const consequences: Consequence[] = aiResult.consequences.map(c => ({
        type: c.type,
        description: c.description,
        severity: c.severity,
        reversibility: c.reversibility,
        affectedData: c.affectedData,
      }));

      return {
        consequences,
        overallSeverity: aiResult.overallRisk,
        reversibility: this.assessReversibility(consequences),
        confidence: 0.9,
        reasoning: aiResult.reasoning,
      };
    } catch (error) {
      console.error('[ConsequenceEngine] AI analysis failed, falling back to rules:', error);
      return this.predictWithRules(intent, toolContext);
    }
  }

  private predictWithRules(
    intent: UserIntent,
    toolContext: ToolContext
  ): Promise<ConsequencePrediction> {
    const consequences = this.analyzeConsequences(intent, toolContext);
    const overallSeverity = this.calculateOverallSeverity(consequences);
    const reversibility = this.assessReversibility(consequences);
    const confidence = this.calculatePredictionConfidence(intent, consequences);
    const reasoning = this.generateReasoning(intent, consequences);

    return Promise.resolve({
      consequences,
      overallSeverity,
      reversibility,
      confidence,
      reasoning,
    });
  }

  private analyzeConsequences(
    intent: UserIntent,
    toolContext: ToolContext
  ): Consequence[] {
    const consequences: Consequence[] = [];
    const { toolName, params } = toolContext;

    consequences.push(...this.analyzeDataLossRisk(intent, toolContext));
    consequences.push(...this.analyzeFinancialRisk(intent, toolContext));
    consequences.push(...this.analyzePrivacyRisk(intent, toolContext));
    consequences.push(...this.analyzeSystemRisk(intent, toolContext));

    return consequences;
  }

  private analyzeDataLossRisk(intent: UserIntent, toolContext: ToolContext): Consequence[] {
    const consequences: Consequence[] = [];
    const { toolName, params } = toolContext;
    const isDeleteOperation = /delete|remove|删除|移除/i.test(toolName);
    const isBatchOperation = intent.dataInvolved.some(d => d.estimatedVolume === 'large');

    if (isDeleteOperation) {
      const hasRecursive = /\/s|\/q|-r|-rf|--recursive/i.test(String(params.command || ''));
      const hasBatchKeyword = /(所有|全部|批量|all|bulk)/i.test(intent.raw);
      
      let severity: Consequence['severity'] = 'medium';
      let reversibility: Consequence['reversibility'] = 'partially_reversible';
      let description = '删除操作可能导致数据丢失';

      if (hasRecursive || hasBatchKeyword) {
        severity = 'critical';
        reversibility = 'irreversible';
        description = '批量/递归删除操作可能导致大量数据永久丢失';
      } else if (isBatchOperation) {
        severity = 'high';
        reversibility = 'irreversible';
        description = '批量删除操作可能导致数据丢失';
      }

      if (intent.dataInvolved.some(d => d.type === 'emails')) {
        description += '，包括可能重要的邮件通信记录';
        severity = severity === 'medium' ? 'high' : severity;
      }

      consequences.push({
        type: 'data_loss',
        description,
        severity,
        reversibility,
        affectedData: this.describeAffectedData(intent, params),
      });
    }

    if (/(format|格式化|清空|wipe)/i.test(String(params.command || intent.raw))) {
      consequences.push({
        type: 'data_loss',
        description: '格式化/清空操作将导致目标位置所有数据永久丢失',
        severity: 'critical',
        reversibility: 'irreversible',
        affectedData: String(params.path || params.target || '目标位置'),
      });
    }

    return consequences;
  }

  private analyzeFinancialRisk(intent: UserIntent, toolContext: ToolContext): Consequence[] {
    const consequences: Consequence[] = [];
    const { toolName, params } = toolContext;
    const isFinancialOperation = /purchase|buy|payment|transfer|购买|支付|转账/i.test(toolName);

    if (isFinancialOperation) {
      const amount = this.extractFinancialAmount(params, intent.raw);
      const isAuthorized = this.isFinancialAuthorized(intent);

      if (!isAuthorized) {
        consequences.push({
          type: 'financial_loss',
          description: `未经授权的财务操作: ${amount || '金额未知'}`,
          severity: 'critical',
          reversibility: 'partially_reversible',
          estimatedImpact: amount,
        });
      } else if (amount) {
        consequences.push({
          type: 'financial_loss',
          description: `财务操作: ${amount}`,
          severity: 'medium',
          reversibility: 'partially_reversible',
          estimatedImpact: amount,
        });
      }
    }

    return consequences;
  }

  private analyzePrivacyRisk(intent: UserIntent, toolContext: ToolContext): Consequence[] {
    const consequences: Consequence[] = [];
    const { toolName, params, sessionHistory } = toolContext;

    const isNetworkOperation = /send|upload|post|http|fetch|发送|上传/i.test(toolName);
    
    if (isNetworkOperation) {
      const recentFileReads = sessionHistory
        .filter(e => e.type === 'tool_call' && /read|file|cat/i.test(e.toolName || ''))
        .slice(-3);

      const sensitivePatterns = [
        /password|密码|secret|密钥|token|key|credential|凭证/i,
        /personal|个人|private|私有|confidential|机密/i,
        /id_card|身份证|ssn|social/i,
      ];

      for (const read of recentFileReads) {
        const content = String(read.params?.path || read.params?.file || '');
        for (const pattern of sensitivePatterns) {
          if (pattern.test(content)) {
            consequences.push({
              type: 'privacy_breach',
              description: `检测到敏感数据可能被发送: ${content}`,
              severity: 'critical',
              reversibility: 'irreversible',
              affectedData: content,
            });
          }
        }
      }
    }

    return consequences;
  }

  private analyzeSystemRisk(intent: UserIntent, toolContext: ToolContext): Consequence[] {
    const consequences: Consequence[] = [];
    const { toolName, params } = toolContext;

    if (/shell|bash|cmd|terminal|exec/i.test(toolName)) {
      const command = String(params.command || '');
      
      const dangerousPatterns = [
        { pattern: /rm\s+-rf|del\s+\/[sf]|rmdir\s+\/[sq]/i, risk: '批量删除命令' },
        { pattern: /format|mkfs|diskpart/i, risk: '磁盘格式化' },
        { pattern: /chmod\s+777|chown\s+root/i, risk: '权限修改' },
        { pattern: />\s*\/|>>\s*\//i, risk: '根目录写入' },
        { pattern: /curl.*\|.*sh|wget.*\|.*sh/i, risk: '远程脚本执行' },
        { pattern: /sudo|runas/i, risk: '提权操作' },
      ];

      for (const { pattern, risk } of dangerousPatterns) {
        if (pattern.test(command)) {
          consequences.push({
            type: 'system_damage',
            description: `检测到危险系统操作: ${risk}`,
            severity: 'critical',
            reversibility: 'irreversible',
          });
        }
      }

      if (command.includes(' ') && /rmdir|del|rm/i.test(command)) {
        consequences.push({
          type: 'system_damage',
          description: '命令包含空格可能导致路径解析错误，引发意外删除',
          severity: 'high',
          reversibility: 'irreversible',
        });
      }
    }

    return consequences;
  }

  private calculateOverallSeverity(consequences: Consequence[]): 'low' | 'medium' | 'high' | 'critical' {
    if (consequences.length === 0) return 'low';
    
    const severityOrder = ['low', 'medium', 'high', 'critical'];
    const maxSeverity = consequences.reduce((max, c) => {
      return severityOrder.indexOf(c.severity) > severityOrder.indexOf(max) 
        ? c.severity 
        : max;
    }, 'low' as Consequence['severity']);
    
    return maxSeverity;
  }

  private assessReversibility(consequences: Consequence[]): 'reversible' | 'partially_reversible' | 'irreversible' {
    if (consequences.length === 0) return 'reversible';
    
    if (consequences.some(c => c.reversibility === 'irreversible')) {
      return 'irreversible';
    }
    if (consequences.some(c => c.reversibility === 'partially_reversible')) {
      return 'partially_reversible';
    }
    return 'reversible';
  }

  private calculatePredictionConfidence(intent: UserIntent, consequences: Consequence[]): number {
    let confidence = 0.7;

    if (intent.confidence > 0.8) confidence += 0.1;
    if (intent.constraints.length > 0) confidence += 0.05;
    if (consequences.length === 0) confidence -= 0.1;

    return Math.max(0.5, Math.min(0.95, confidence));
  }

  private generateReasoning(intent: UserIntent, consequences: Consequence[]): string {
    if (consequences.length === 0) {
      return `操作"${intent.understood}"未检测到明显风险`;
    }

    const highSeverity = consequences.filter(c => c.severity === 'high' || c.severity === 'critical');
    
    if (highSeverity.length > 0) {
      return `操作"${intent.understood}"存在${highSeverity.length}个高风险后果: ${highSeverity.map(c => c.description).join('; ')}`;
    }

    return `操作"${intent.understood}"存在${consequences.length}个潜在风险，建议用户确认`;
  }

  private describeAffectedData(intent: UserIntent, params: Record<string, unknown>): string {
    const dataTypes = intent.dataInvolved.map(d => d.description);
    const path = params.path || params.file || params.target;
    
    if (path) {
      dataTypes.push(`路径: ${path}`);
    }
    
    return dataTypes.join(', ') || '未知数据';
  }

  private extractFinancialAmount(params: Record<string, unknown>, message: string): string | null {
    const amountPatterns = [
      /\$?(\d+(?:\.\d{2})?)\s*(?:美元|dollars?)/i,
      /(\d+(?:\.\d{2})?)\s*(?:元|块|rmb|cny)/i,
      /(?:price|amount|total)[:\s]*\$?(\d+(?:\.\d{2})?)/i,
    ];

    for (const pattern of amountPatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1] + '元';
      }
    }

    if (params.amount) return String(params.amount);
    if (params.price) return String(params.price);
    
    return null;
  }

  private isFinancialAuthorized(intent: UserIntent): boolean {
    const lowerIntent = intent.raw.toLowerCase();
    const hasPurchaseIntent = /买|购买|pay|purchase|buy|支付|下单/i.test(lowerIntent);
    const hasExplicitRequest = /帮我|请|想要|need|want|please/i.test(lowerIntent);
    
    return hasPurchaseIntent && hasExplicitRequest;
  }
}
