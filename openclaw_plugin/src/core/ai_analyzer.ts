import type { 
  AIAnalysisRequest, 
  IntentAnalysisResult, 
  ConsequenceAnalysisResult, 
  SafetyDecision,
  AIProviderConfig 
} from './ai_types';

const INTENT_ANALYSIS_PROMPT = `你是一个AI安全分析专家。请分析以下用户请求和即将执行的操作。

## 用户消息
{{USER_MESSAGE}}

## 即将执行的工具
工具名称: {{TOOL_NAME}}
工具参数: {{TOOL_PARAMS}}

## 对话历史
{{SESSION_HISTORY}}

## 分析要求
请判断：
1. 用户的真实意图是什么？
2. AI是否正确理解了用户意图？
3. 这个操作涉及哪些数据？
4. 用户是否有明确的约束条件？

请以JSON格式返回分析结果：
{
  "understood": "AI理解的用户意图（一句话描述）",
  "confidence": 0.0-1.0的置信度,
  "keyActions": ["关键操作1", "关键操作2"],
  "constraints": ["用户提到的约束条件"],
  "dataInvolved": [
    {"type": "files|emails|financial|system|other", "description": "描述", "estimatedVolume": "small|medium|large|unknown"}
  ],
  "reasoning": "分析推理过程"
}

只返回JSON，不要其他内容。`;

const CONSEQUENCE_ANALYSIS_PROMPT = `你是一个AI安全分析专家。请分析以下操作可能产生的后果。

## 用户意图
{{USER_INTENT}}

## 即将执行的操作
工具名称: {{TOOL_NAME}}
工具参数: {{TOOL_PARAMS}}

## 涉及的数据
{{DATA_INVOLVED}}

## 分析要求
请评估这个操作可能产生的后果，特别关注：
1. 数据丢失风险
2. 财务风险
3. 隐私风险
4. 系统风险
5. 操作是否可逆

请以JSON格式返回分析结果：
{
  "consequences": [
    {
      "type": "data_loss|financial_loss|privacy_breach|system_damage|other",
      "description": "后果描述",
      "severity": "low|medium|high|critical",
      "reversibility": "reversible|partially_reversible|irreversible",
      "affectedData": "受影响的数据"
    }
  ],
  "overallRisk": "low|medium|high|critical",
  "reasoning": "风险评估推理"
}

只返回JSON，不要其他内容。`;

const SAFETY_DECISION_PROMPT = `你是一个AI安全决策专家。请根据以下信息做出安全决策。

## 用户意图
{{USER_INTENT}}

## 操作分析
{{CONSEQUENCE_ANALYSIS}}

## 历史案例参考
- Meta员工Summer Yue：AI误解"整理邮件"为"删除所有邮件"，导致邮件全部丢失
- Google工程师：AI执行了危险的磁盘清理命令，导致数据丢失
- OpenClaw用户：AI未经确认购买了100个牛油果

## 决策原则
1. 如非必要，不打扰用户
2. 高风险操作必须确认
3. 不可逆操作必须确认
4. 意图不明确时需要确认
5. 涉及财务必须确认

## 决策选项
- proceed: 低风险，可以直接执行
- confirm: 需要用户确认，提供清晰的确认信息
- reject: 明显有害，应该阻止

请以JSON格式返回决策：
{
  "action": "proceed|confirm|reject",
  "reason": "决策原因",
  "riskLevel": "low|medium|high|critical",
  "confirmationMessage": "如果需要确认，这里是给用户看的确认信息（包含：AI理解的意图、要执行的操作、可能的后果、严重程度）"
}

只返回JSON，不要其他内容。`;

export class AIAnalyzer {
  private config: AIProviderConfig;
  private cache: Map<string, { result: unknown; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  async analyzeIntent(request: AIAnalysisRequest): Promise<IntentAnalysisResult> {
    const cacheKey = `intent:${JSON.stringify(request)}`;
    const cached = this.getFromCache<IntentAnalysisResult>(cacheKey);
    if (cached) return cached;

    const prompt = this.buildPrompt(INTENT_ANALYSIS_PROMPT, {
      USER_MESSAGE: request.userMessage,
      TOOL_NAME: request.toolName,
      TOOL_PARAMS: JSON.stringify(request.toolParams, null, 2),
      SESSION_HISTORY: this.formatSessionHistory(request.sessionHistory),
    });

    const response = await this.callAI(prompt);
    const result = this.parseJSON<IntentAnalysisResult>(response);
    
    this.setCache(cacheKey, result);
    return result;
  }

  async analyzeConsequence(
    request: AIAnalysisRequest,
    intent: IntentAnalysisResult
  ): Promise<ConsequenceAnalysisResult> {
    const cacheKey = `consequence:${JSON.stringify({ request, intent })}`;
    const cached = this.getFromCache<ConsequenceAnalysisResult>(cacheKey);
    if (cached) return cached;

    const prompt = this.buildPrompt(CONSEQUENCE_ANALYSIS_PROMPT, {
      USER_INTENT: intent.understood,
      TOOL_NAME: request.toolName,
      TOOL_PARAMS: JSON.stringify(request.toolParams, null, 2),
      DATA_INVOLVED: intent.dataInvolved.map(d => `${d.description} (${d.estimatedVolume})`).join('\n'),
    });

    const response = await this.callAI(prompt);
    const result = this.parseJSON<ConsequenceAnalysisResult>(response);
    
    this.setCache(cacheKey, result);
    return result;
  }

  async makeDecision(
    request: AIAnalysisRequest,
    intent: IntentAnalysisResult,
    consequence: ConsequenceAnalysisResult
  ): Promise<SafetyDecision> {
    const prompt = this.buildPrompt(SAFETY_DECISION_PROMPT, {
      USER_INTENT: intent.understood,
      CONSEQUENCE_ANALYSIS: JSON.stringify(consequence, null, 2),
    });

    const response = await this.callAI(prompt);
    return this.parseJSON<SafetyDecision>(response);
  }

  private buildPrompt(template: string, variables: Record<string, string>): string {
    let prompt = template;
    for (const [key, value] of Object.entries(variables)) {
      prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return prompt;
  }

  private formatSessionHistory(history: AIAnalysisRequest['sessionHistory']): string {
    if (!history || history.length === 0) return '无历史记录';
    
    return history.slice(-10).map((event, i) => {
      const prefix = event.type === 'user_message' ? '👤 用户' : 
                     event.type === 'tool_call' ? '🔧 工具调用' : '📋 工具结果';
      return `${i + 1}. ${prefix}: ${event.content.slice(0, 200)}${event.content.length > 200 ? '...' : ''}`;
    }).join('\n');
  }

  private async callAI(prompt: string): Promise<string> {
    switch (this.config.provider) {
      case 'openai':
        return this.callOpenAI(prompt);
      case 'anthropic':
        return this.callAnthropic(prompt);
      case 'ollama':
        return this.callOllama(prompt);
      case 'openclaw':
        return this.callOpenClaw(prompt);
      default:
        throw new Error(`Unknown AI provider: ${this.config.provider}`);
    }
  }

  private async callOpenAI(prompt: string): Promise<string> {
    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';
    const model = this.config.model || 'gpt-4o-mini';
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private async callAnthropic(prompt: string): Promise<string> {
    const baseUrl = this.config.baseUrl || 'https://api.anthropic.com';
    const model = this.config.model || 'claude-3-haiku-20240307';
    
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  private async callOllama(prompt: string): Promise<string> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434';
    const model = this.config.model || 'llama3.2';
    
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  }

  private async callOpenClaw(prompt: string): Promise<string> {
    const baseUrl = this.config.baseUrl || 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenClaw API error: ${response.status}`);
    }

    const data = await response.json();
    return data.response || data.message || data.content;
  }

  private parseJSON<T>(text: string): T {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }
    return JSON.parse(jsonMatch[0]);
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result as T;
    }
    return null;
  }

  private setCache(key: string, result: unknown): void {
    this.cache.set(key, { result, timestamp: Date.now() });
  }
}
