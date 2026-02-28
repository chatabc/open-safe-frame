export type PluginLogger = {
  debug?: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

export type PluginConfigUiHint = {
  label?: string;
  help?: string;
  tags?: string[];
  advanced?: boolean;
  sensitive?: boolean;
  placeholder?: string;
};

export type PluginConfigValidation =
  | { ok: true; value?: unknown }
  | { ok: false; errors: string[] };

export type OpenClawPluginConfigSchema = {
  safeParse?: (value: unknown) => {
    success: boolean;
    data?: unknown;
    error?: {
      issues?: Array<{ path: Array<string | number>; message: string }>;
    };
  };
  parse?: (value: unknown) => unknown;
  validate?: (value: unknown) => PluginConfigValidation;
  uiHints?: Record<string, PluginConfigUiHint>;
  jsonSchema?: Record<string, unknown>;
};

export type PluginHookName =
  | 'before_model_resolve'
  | 'before_prompt_build'
  | 'before_agent_start'
  | 'llm_input'
  | 'llm_output'
  | 'agent_end'
  | 'before_compaction'
  | 'after_compaction'
  | 'before_reset'
  | 'message_received'
  | 'message_sending'
  | 'message_sent'
  | 'before_tool_call'
  | 'after_tool_call'
  | 'tool_result_persist'
  | 'before_message_write'
  | 'session_start'
  | 'session_end'
  | 'subagent_spawning'
  | 'subagent_delivery_target'
  | 'subagent_spawned'
  | 'subagent_ended'
  | 'gateway_start'
  | 'gateway_stop';

export type PluginHookAgentContext = {
  agentId?: string;
  sessionKey?: string;
  sessionId?: string;
  workspaceDir?: string;
  messageProvider?: string;
};

export type PluginHookBeforeModelResolveEvent = {
  prompt: string;
};

export type PluginHookBeforeModelResolveResult = {
  modelOverride?: string;
  providerOverride?: string;
};

export type PluginHookBeforePromptBuildEvent = {
  prompt: string;
  messages: unknown[];
};

export type PluginHookBeforePromptBuildResult = {
  systemPrompt?: string;
  prependContext?: string;
};

export type PluginHookBeforeAgentStartEvent = {
  prompt: string;
  messages?: unknown[];
};

export type PluginHookBeforeAgentStartResult = PluginHookBeforePromptBuildResult &
  PluginHookBeforeModelResolveResult;

export type PluginHookLlmInputEvent = {
  runId: string;
  sessionId: string;
  provider: string;
  model: string;
  systemPrompt?: string;
  prompt: string;
  historyMessages: unknown[];
  imagesCount: number;
};

export type PluginHookLlmOutputEvent = {
  runId: string;
  sessionId: string;
  provider: string;
  model: string;
  assistantTexts: string[];
  lastAssistant?: unknown;
  usage?: {
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheWrite?: number;
    total?: number;
  };
};

export type PluginHookAgentEndEvent = {
  messages: unknown[];
  success: boolean;
  error?: string;
  durationMs?: number;
};

export type PluginHookBeforeCompactionEvent = {
  messageCount: number;
  compactingCount?: number;
  tokenCount?: number;
  messages?: unknown[];
  sessionFile?: string;
};

export type PluginHookBeforeResetEvent = {
  sessionFile?: string;
  messages?: unknown[];
  reason?: string;
};

export type PluginHookAfterCompactionEvent = {
  messageCount: number;
  tokenCount?: number;
  compactedCount: number;
  sessionFile?: string;
};

export type PluginHookMessageContext = {
  channelId: string;
  accountId?: string;
  conversationId?: string;
};

export type PluginHookMessageReceivedEvent = {
  from: string;
  content: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
};

export type PluginHookMessageSendingEvent = {
  to: string;
  content: string;
  metadata?: Record<string, unknown>;
};

export type PluginHookMessageSendingResult = {
  content?: string;
  cancel?: boolean;
};

export type PluginHookMessageSentEvent = {
  to: string;
  content: string;
  success: boolean;
  error?: string;
};

export type PluginHookToolContext = {
  agentId?: string;
  sessionKey?: string;
  toolName: string;
};

export type PluginHookBeforeToolCallEvent = {
  toolName: string;
  params: Record<string, unknown>;
};

export type PluginHookBeforeToolCallResult = {
  params?: Record<string, unknown>;
  block?: boolean;
  blockReason?: string;
};

export type PluginHookAfterToolCallEvent = {
  toolName: string;
  params: Record<string, unknown>;
  result?: unknown;
  error?: string;
  durationMs?: number;
};

export type PluginHookSessionContext = {
  agentId?: string;
  sessionId: string;
};

export type PluginHookSessionStartEvent = {
  sessionId: string;
  resumedFrom?: string;
};

export type PluginHookSessionEndEvent = {
  sessionId: string;
  messageCount: number;
  durationMs?: number;
};

export type PluginHookHandlerMap = {
  before_model_resolve: (
    event: PluginHookBeforeModelResolveEvent,
    ctx: PluginHookAgentContext,
  ) => Promise<PluginHookBeforeModelResolveResult | void> | PluginHookBeforeModelResolveResult | void;
  before_prompt_build: (
    event: PluginHookBeforePromptBuildEvent,
    ctx: PluginHookAgentContext,
  ) => Promise<PluginHookBeforePromptBuildResult | void> | PluginHookBeforePromptBuildResult | void;
  before_agent_start: (
    event: PluginHookBeforeAgentStartEvent,
    ctx: PluginHookAgentContext,
  ) => Promise<PluginHookBeforeAgentStartResult | void> | PluginHookBeforeAgentStartResult | void;
  llm_input: (
    event: PluginHookLlmInputEvent,
    ctx: PluginHookAgentContext,
  ) => Promise<void> | void;
  llm_output: (
    event: PluginHookLlmOutputEvent,
    ctx: PluginHookAgentContext,
  ) => Promise<void> | void;
  agent_end: (
    event: PluginHookAgentEndEvent,
    ctx: PluginHookAgentContext,
  ) => Promise<void> | void;
  before_compaction: (
    event: PluginHookBeforeCompactionEvent,
    ctx: PluginHookAgentContext,
  ) => Promise<void> | void;
  after_compaction: (
    event: PluginHookAfterCompactionEvent,
    ctx: PluginHookAgentContext,
  ) => Promise<void> | void;
  before_reset: (
    event: PluginHookBeforeResetEvent,
    ctx: PluginHookAgentContext,
  ) => Promise<void> | void;
  message_received: (
    event: PluginHookMessageReceivedEvent,
    ctx: PluginHookMessageContext,
  ) => Promise<void> | void;
  message_sending: (
    event: PluginHookMessageSendingEvent,
    ctx: PluginHookMessageContext,
  ) => Promise<PluginHookMessageSendingResult | void> | PluginHookMessageSendingResult | void;
  message_sent: (
    event: PluginHookMessageSentEvent,
    ctx: PluginHookMessageContext,
  ) => Promise<void> | void;
  before_tool_call: (
    event: PluginHookBeforeToolCallEvent,
    ctx: PluginHookToolContext,
  ) => Promise<PluginHookBeforeToolCallResult | void> | PluginHookBeforeToolCallResult | void;
  after_tool_call: (
    event: PluginHookAfterToolCallEvent,
    ctx: PluginHookToolContext,
  ) => Promise<void> | void;
  session_start: (
    event: PluginHookSessionStartEvent,
    ctx: PluginHookSessionContext,
  ) => Promise<void> | void;
  session_end: (
    event: PluginHookSessionEndEvent,
    ctx: PluginHookSessionContext,
  ) => Promise<void> | void;
};

export type OpenClawPluginApi = {
  id: string;
  name: string;
  version?: string;
  description?: string;
  source: string;
  config: Record<string, unknown>;
  pluginConfig?: Record<string, unknown>;
  logger: PluginLogger;
  on: <K extends keyof PluginHookHandlerMap>(
    hookName: K,
    handler: PluginHookHandlerMap[K],
    opts?: { priority?: number },
  ) => void;
  registerTool: (tool: unknown, opts?: unknown) => void;
  registerHook: (events: string | string[], handler: unknown, opts?: unknown) => void;
  resolvePath: (input: string) => string;
};

export type OpenClawPluginDefinition = {
  id?: string;
  name?: string;
  description?: string;
  version?: string;
  configSchema?: OpenClawPluginConfigSchema;
  register?: (api: OpenClawPluginApi) => void | Promise<void>;
  activate?: (api: OpenClawPluginApi) => void | Promise<void>;
};

export type OpenClawPluginModule =
  | OpenClawPluginDefinition
  | ((api: OpenClawPluginApi) => void | Promise<void>);
