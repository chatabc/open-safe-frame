export interface SafetyRule {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  check: (context: RuleContext) => RuleResult;
}

export interface RuleContext {
  toolName: string;
  params: Record<string, unknown>;
  sessionKey: string;
  userIntent: string;
  toolHistory: ToolCallRecord[];
}

export interface RuleResult {
  passed: boolean;
  reason?: string;
  requiresConfirmation?: boolean;
}

export interface ToolCallRecord {
  toolName: string;
  params: Record<string, unknown>;
  timestamp: Date;
  blocked?: boolean;
}

export interface PluginConfig {
  enabled: boolean;
  blockOnRisk: boolean;
  requireConfirmation: boolean;
  maxDeleteCount: number;
  protectedPaths: string[];
  blockedCommands: string[];
  notificationWebhook?: string;
}

export const DEFAULT_CONFIG: PluginConfig = {
  enabled: true,
  blockOnRisk: true,
  requireConfirmation: true,
  maxDeleteCount: 10,
  protectedPaths: [],
  blockedCommands: [],
};
