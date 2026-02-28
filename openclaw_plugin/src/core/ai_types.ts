export interface AIAnalysisRequest {
  userMessage: string;
  toolName: string;
  toolParams: Record<string, unknown>;
  sessionHistory: Array<{
    type: 'user_message' | 'tool_call' | 'tool_result';
    content: string;
    toolName?: string;
  }>;
}

export interface IntentAnalysisResult {
  understood: string;
  confidence: number;
  keyActions: string[];
  constraints: string[];
  dataInvolved: Array<{
    type: 'files' | 'emails' | 'financial' | 'system' | 'credentials' | 'other';
    description: string;
    estimatedVolume: 'small' | 'medium' | 'large' | 'unknown';
  }>;
  potentialMisunderstandings?: string[];
  reasoning: string;
}

export interface ConsequenceAnalysisResult {
  consequences: Array<{
    type: 'data_loss' | 'scope_escape' | 'permission_violation' | 'financial_loss' | 'privacy_breach' | 'system_damage' | 'other';
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    reversibility: 'reversible' | 'partially_reversible' | 'irreversible';
    affectedData?: string;
    likelihood?: 'low' | 'medium' | 'high';
  }>;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors?: string[];
  reasoning: string;
}

export interface SafetyDecision {
  action: 'proceed' | 'confirm' | 'reject';
  reason: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confirmationMessage?: string;
}

export interface AIProviderConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'openclaw';
  model?: string;
  apiKey?: string;
  baseUrl?: string;
}

export type AIConfigMode = 'openclaw' | 'custom';

export interface OpenClawModelInfo {
  provider: string;
  model: string;
  baseUrl?: string;
  apiKey?: string;
}

export interface AISafetyPluginConfig {
  enabled?: boolean;
  mode?: AIConfigMode;
  customProvider?: AIProviderConfig;
  riskThreshold?: 'low' | 'medium' | 'high' | 'critical';
  enableCache?: boolean;
  logAnalysis?: boolean;
}

export const DEFAULT_AI_SAFETY_CONFIG: Required<AISafetyPluginConfig> = {
  enabled: true,
  mode: 'openclaw',
  customProvider: undefined as unknown as AIProviderConfig,
  riskThreshold: 'medium',
  enableCache: true,
  logAnalysis: false,
};

export const RISK_PATTERNS = {
  INSTRUCTION_FORGETTING: {
    name: '指令遗忘/忽略',
    description: 'AI在长对话或复杂任务中"忘记"或无视用户的安全约束',
    triggers: ['长对话', '复杂任务', '上下文压缩', '多步骤操作'],
  },
  SCOPE_ESCAPE: {
    name: '作用域逃逸',
    description: '操作的实际影响范围超出预期',
    triggers: ['路径解析问题', '通配符使用', '批量操作', '递归操作'],
  },
  INTENT_MISUNDERSTANDING: {
    name: '意图误解',
    description: 'AI将用户的良性请求误解为危险操作，或反之',
    triggers: ['歧义指令', '上下文缺失', '多义词', '省略表达'],
  },
  PERMISSION_VIOLATION: {
    name: '权限越界',
    description: 'AI执行了用户未明确授权的操作',
    triggers: ['未授权操作', '用户拒绝后继续', '绕过确认'],
  },
  IRREVERSIBLE_OPERATION: {
    name: '不可逆操作',
    description: '执行了无法撤销的操作，导致永久性损失',
    triggers: ['删除操作', '覆盖操作', '格式化', '清空数据'],
  },
};
