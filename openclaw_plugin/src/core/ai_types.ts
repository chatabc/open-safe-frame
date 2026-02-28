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
    type: 'files' | 'emails' | 'financial' | 'system' | 'other';
    description: string;
    estimatedVolume: 'small' | 'medium' | 'large' | 'unknown';
  }>;
  reasoning: string;
}

export interface ConsequenceAnalysisResult {
  consequences: Array<{
    type: 'data_loss' | 'financial_loss' | 'privacy_breach' | 'system_damage' | 'other';
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    reversibility: 'reversible' | 'partially_reversible' | 'irreversible';
    affectedData?: string;
  }>;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
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
