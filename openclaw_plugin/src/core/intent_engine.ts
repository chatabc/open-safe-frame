import type { UserIntent, SessionEvent } from './types';
import type { AIAnalyzer, AIAnalysisRequest, IntentAnalysisResult } from './ai_analyzer';

export class IntentEngine {
  private aiAnalyzer: AIAnalyzer | null = null;

  constructor(aiAnalyzer?: AIAnalyzer) {
    this.aiAnalyzer = aiAnalyzer || null;
  }

  setAIAnalyzer(analyzer: AIAnalyzer): void {
    this.aiAnalyzer = analyzer;
  }

  async understand(
    userMessage: string,
    toolContext: { toolName: string; params: Record<string, unknown> },
    sessionHistory: SessionEvent[]
  ): Promise<UserIntent> {
    if (this.aiAnalyzer) {
      return this.understandWithAI(userMessage, toolContext, sessionHistory);
    }
    return this.understandWithRules(userMessage, toolContext, sessionHistory);
  }

  private async understandWithAI(
    userMessage: string,
    toolContext: { toolName: string; params: Record<string, unknown> },
    sessionHistory: SessionEvent[]
  ): Promise<UserIntent> {
    try {
      const request: AIAnalysisRequest = {
        userMessage,
        toolName: toolContext.toolName,
        toolParams: toolContext.params,
        sessionHistory: sessionHistory.map(e => ({
          type: e.type,
          content: e.content,
          toolName: e.toolName,
        })),
      };

      const aiResult = await this.aiAnalyzer!.analyzeIntent(request);

      return {
        raw: userMessage,
        understood: aiResult.understood,
        confidence: aiResult.confidence,
        keyActions: aiResult.keyActions,
        constraints: aiResult.constraints,
        dataInvolved: aiResult.dataInvolved,
      };
    } catch (error) {
      console.error('[IntentEngine] AI analysis failed, falling back to rules:', error);
      return this.understandWithRules(userMessage, toolContext, sessionHistory);
    }
  }

  private understandWithRules(
    message: string,
    toolContext: { toolName: string; params: Record<string, unknown> },
    history: SessionEvent[]
  ): UserIntent {
    const raw = message;
    const understood = this.extractCoreIntent(message, history);
    const confidence = this.calculateConfidence(message, understood);
    const keyActions = this.extractKeyActions(toolContext);
    const constraints = this.extractConstraints(message, history);
    const dataInvolved = this.analyzeDataInvolved(toolContext, message);

    return {
      raw,
      understood,
      confidence,
      keyActions,
      constraints,
      dataInvolved,
    };
  }

  private extractCoreIntent(message: string, history: SessionEvent[]): string {
    const lowerMessage = message.toLowerCase();
    
    const intentPatterns = [
      { pattern: /整理|清理|organize|clean/i, intent: 'organize' },
      { pattern: /删除|移除|delete|remove/i, intent: 'delete' },
      { pattern: /发送|发送|send|email/i, intent: 'send' },
      { pattern: /购买|买|buy|purchase/i, intent: 'purchase' },
      { pattern: /修改|更改|modify|change/i, intent: 'modify' },
      { pattern: /查看|检查|check|view/i, intent: 'view' },
      { pattern: /备份|保存|backup|save/i, intent: 'backup' },
    ];

    for (const { pattern, intent } of intentPatterns) {
      if (pattern.test(message)) {
        const scopeMatch = message.match(/(所有|全部|批量|all|bulk|every)/i);
        const scope = scopeMatch ? 'bulk' : 'single';
        
        return scope === 'bulk' 
          ? `批量${this.getIntentLabel(intent)}操作`
          : `单个${this.getIntentLabel(intent)}操作`;
      }
    }

    const recentUserMessages = history
      .filter(e => e.type === 'user_message')
      .slice(-3)
      .map(e => e.content);
    
    if (recentUserMessages.length > 0) {
      return `基于对话上下文的操作: ${recentUserMessages.join(' -> ')}`;
    }

    return '执行用户请求的操作';
  }

  private getIntentLabel(intent: string): string {
    const labels: Record<string, string> = {
      organize: '整理',
      delete: '删除',
      send: '发送',
      purchase: '购买',
      modify: '修改',
      view: '查看',
      backup: '备份',
    };
    return labels[intent] || intent;
  }

  private calculateConfidence(message: string, understood: string): number {
    if (message.length < 10) return 0.5;
    
    const explicitKeywords = ['请', '帮我', '需要', '想要', 'please', 'help', 'need', 'want'];
    const hasExplicit = explicitKeywords.some(k => message.toLowerCase().includes(k));
    
    const hasScope = /(所有|全部|批量|单个|特定|all|bulk|specific)/i.test(message);
    
    const hasConstraint = /(不要|别|仅|只|don't|only|just)/i.test(message);
    
    let confidence = 0.6;
    if (hasExplicit) confidence += 0.1;
    if (hasScope) confidence += 0.15;
    if (hasConstraint) confidence += 0.15;
    
    return Math.min(confidence, 0.95);
  }

  private extractKeyActions(toolContext: { toolName: string; params: Record<string, unknown> }>): string[] {
    const actions: string[] = [];
    const { toolName, params } = toolContext;

    const toolActionMap: Record<string, string> = {
      'delete_file': '删除文件',
      'delete_email': '删除邮件',
      'shell_exec': '执行系统命令',
      'send_email': '发送邮件',
      'purchase': '购买商品',
      'modify_file': '修改文件',
      'read_file': '读取文件',
    };

    const action = toolActionMap[toolName.toLowerCase()] || `使用工具: ${toolName}`;
    actions.push(action);

    if (params.path) actions.push(`目标路径: ${params.path}`);
    if (params.count) actions.push(`数量: ${params.count}`);
    if (params.command) actions.push(`命令: ${params.command}`);

    return actions;
  }

  private extractConstraints(message: string, history: SessionEvent[]): string[] {
    const constraints: string[] = [];
    
    const constraintPatterns = [
      { pattern: /不要|别|don't|do not/i, extract: (m: string) => `禁止: ${m.split(/不要|别|don't|do not/i)[1]?.slice(0, 20)}` },
      { pattern: /只|仅|only|just/i, extract: (m: string) => `限制: 仅${m.split(/只|仅|only|just/i)[1]?.slice(0, 20)}` },
      { pattern: /先.*再|before.*after/i, extract: () => '顺序约束: 需要按特定顺序执行' },
      { pattern: /确认|批准|confirm|approve/i, extract: () => '需要确认: 操作前需要用户确认' },
    ];

    for (const { pattern, extract } of constraintPatterns) {
      if (pattern.test(message)) {
        try {
          constraints.push(extract(message));
        } catch {
          constraints.push('存在约束条件');
        }
      }
    }

    for (const event of history.slice(-5)) {
      if (event.type === 'user_message' && /(不要|别|don't)/i.test(event.content)) {
        constraints.push(`历史约束: ${event.content.slice(0, 50)}`);
      }
    }

    return constraints;
  }

  private analyzeDataInvolved(
    toolContext: { toolName: string; params: Record<string, unknown> },
    message: string
  ): UserIntent['dataInvolved'] {
    const dataInvolved: UserIntent['dataInvolved'] = [];
    const { toolName, params } = toolContext;

    if (/email|mail|邮件/i.test(toolName)) {
      const count = this.estimateEmailCount(params, message);
      dataInvolved.push({
        type: 'emails',
        description: '邮件数据',
        estimatedVolume: count,
      });
    }

    if (/file|fs|文件/i.test(toolName)) {
      const volume = this.estimateFileVolume(params, message);
      dataInvolved.push({
        type: 'files',
        description: '文件数据',
        estimatedVolume: volume,
      });
    }

    if (/purchase|buy|payment|购买|支付/i.test(toolName)) {
      dataInvolved.push({
        type: 'financial',
        description: '财务操作',
        estimatedVolume: 'unknown',
      });
    }

    if (/shell|bash|cmd|terminal/i.test(toolName)) {
      dataInvolved.push({
        type: 'system',
        description: '系统操作',
        estimatedVolume: 'unknown',
      });
    }

    return dataInvolved;
  }

  private estimateEmailCount(params: Record<string, unknown>, message: string): 'small' | 'medium' | 'large' | 'unknown' {
    if (params.count) {
      const count = Number(params.count);
      if (count <= 5) return 'small';
      if (count <= 20) return 'medium';
      return 'large';
    }

    if (/(所有|全部|all)/i.test(message)) return 'large';
    if (/(批量|bulk)/i.test(message)) return 'medium';
    
    return 'small';
  }

  private estimateFileVolume(params: Record<string, unknown>, message: string): 'small' | 'medium' | 'large' | 'unknown' {
    if (params.recursive || /-r|--recursive|\/s/i.test(String(params.command || ''))) {
      return 'large';
    }

    if (/(所有|全部|all)/i.test(message)) return 'large';
    if (/(批量|bulk)/i.test(message)) return 'medium';
    
    return 'small';
  }
}
