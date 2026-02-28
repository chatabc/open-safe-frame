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
