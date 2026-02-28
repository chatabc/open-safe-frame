export interface OpenClawPluginApi {
  logger: Logger;
  pluginConfig: Record<string, unknown>;
  on(event: string, handler: EventHandler, options?: { priority?: number }): void;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug?(message: string): void;
}

export type EventHandler = (event: unknown, context: PluginContext) => Promise<HookResult | void> | HookResult | void;

export interface PluginContext {
  sessionKey?: string;
  agentId?: string;
  toolName?: string;
}

export interface HookResult {
  block?: boolean;
  blockReason?: string;
  prependContext?: string;
  message?: unknown;
}

export interface BeforeToolCallEvent {
  toolName: string;
  params: Record<string, unknown>;
}

export interface AfterToolCallEvent {
  toolName: string;
  params: Record<string, unknown>;
  result?: unknown;
  durationMs?: number;
  error?: Error;
}

export interface ToolResultPersistEvent {
  toolName?: string;
  message?: {
    content?: Array<{ type: string; text?: string }>;
    role?: string;
    toolName?: string;
  };
}

export interface BeforeAgentStartEvent {
  prompt?: string | unknown;
}

export interface MessageReceivedEvent {
  from: string;
  content: string | unknown;
}

export interface SessionEndEvent {
  sessionId?: string;
}
