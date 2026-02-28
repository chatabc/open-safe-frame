export interface UserIntent {
  raw: string;
  understood: string;
  confidence: number;
  keyActions: string[];
  constraints: string[];
  dataInvolved: {
    type: 'files' | 'emails' | 'financial' | 'system' | 'other';
    description: string;
    estimatedVolume: 'small' | 'medium' | 'large' | 'unknown';
  }[];
}

export interface Consequence {
  type: 'data_loss' | 'financial_loss' | 'privacy_breach' | 'system_damage' | 'reversible' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reversibility: 'reversible' | 'partially_reversible' | 'irreversible';
  affectedData?: string;
  estimatedImpact?: string;
}

export interface ValueJudgment {
  aligned: boolean;
  score: number;
  concerns: string[];
  recommendations: string[];
}

export interface RiskLevel {
  level: 'low' | 'medium' | 'high' | 'critical';
  requiresConfirmation: boolean;
  confirmationType?: 'simple' | 'password' | 'biometric';
}

export interface ConfirmationRequest {
  understoodIntent: string;
  plannedAction: string;
  possibleConsequences: Consequence[];
  severity: 'medium' | 'high' | 'critical';
  confirmationType: 'simple' | 'password';
  timeout?: number;
}

export interface Decision {
  action: 'proceed' | 'confirm' | 'reject';
  reason: string;
  confirmationRequest?: ConfirmationRequest;
}

export interface ToolContext {
  toolName: string;
  params: Record<string, unknown>;
  sessionHistory: SessionEvent[];
  userProfile?: UserProfile;
}

export interface SessionEvent {
  type: 'user_message' | 'tool_call' | 'tool_result';
  content: string;
  timestamp: Date;
  toolName?: string;
  params?: Record<string, unknown>;
}

export interface UserProfile {
  riskTolerance?: 'low' | 'medium' | 'high';
  protectedPaths?: string[];
  protectedDataTypes?: string[];
  previousConfirmations?: string[];
}
