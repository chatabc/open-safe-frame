import type {
  OpenClawPluginApi,
  BeforeToolCallEvent,
  AfterToolCallEvent,
  ToolResultPersistEvent,
  BeforeAgentStartEvent,
  MessageReceivedEvent,
  PluginContext,
  HookResult,
  Logger,
} from './types';
import { PluginConfig, DEFAULT_CONFIG, ToolCallRecord } from './config';
import { evaluateAllRules, RuleContext } from './rules';

const PLUGIN_ID = 'open-safe-frame';
const PLUGIN_NAME = 'Open Safe Frame';
const PLUGIN_VERSION = '1.0.0';
const LOG_PREFIX = `[${PLUGIN_ID}]`;

function createLogger(baseLogger: Logger): Logger {
  return {
    info: (msg: string) => baseLogger.info(`${LOG_PREFIX} ${msg}`),
    warn: (msg: string) => baseLogger.warn(`${LOG_PREFIX} ${msg}`),
    error: (msg: string) => baseLogger.error(`${LOG_PREFIX} ${msg}`),
    debug: (msg: string) => baseLogger.debug?.(`${LOG_PREFIX} ${msg}`),
  };
}

interface SessionState {
  userIntent: string;
  toolHistory: ToolCallRecord[];
}

const sessionStates = new Map<string, SessionState>();

function getSessionState(sessionKey: string): SessionState {
  if (!sessionStates.has(sessionKey)) {
    sessionStates.set(sessionKey, {
      userIntent: '',
      toolHistory: [],
    });
  }
  return sessionStates.get(sessionKey)!;
}

export const openSafeFramePlugin = {
  id: PLUGIN_ID,
  name: PLUGIN_NAME,
  description: 'AI安全框架 - 防止数据删除、未授权操作等安全事故',

  register(api: OpenClawPluginApi) {
    const log = createLogger(api.logger);
    const config: PluginConfig = {
      ...DEFAULT_CONFIG,
      ...(api.pluginConfig as Partial<PluginConfig> || {}),
    };

    if (!config.enabled) {
      log.info('Plugin disabled via config');
      return;
    }

    log.info(`Open Safe Frame v${PLUGIN_VERSION} loaded`);
    log.info(`Protected against ${config.protectedPaths.length} protected paths`);

    api.on('before_agent_start', async (event: BeforeAgentStartEvent, ctx: PluginContext) => {
      const sessionKey = ctx.sessionKey || 'default';
      const state = getSessionState(sessionKey);
      
      if (event.prompt) {
        const text = typeof event.prompt === 'string' 
          ? event.prompt 
          : JSON.stringify(event.prompt);
        state.userIntent = text;
      }

      return {
        prependContext: [
          '<open-safe-frame>',
          'This session is protected by Open Safe Frame (github.com/chatabc/open-safe-frame).',
          '',
          'SAFETY RULES:',
          '1. Recursive delete operations are BLOCKED (prevents mass data loss)',
          '2. Bulk email deletion requires CONFIRMATION (prevents email wipe)',
          '3. Paths with spaces require CONFIRMATION (prevents path truncation)',
          '4. Unauthorized purchases are BLOCKED',
          '5. Data exfiltration patterns are DETECTED and BLOCKED',
          '6. Shell execution after web fetch requires CONFIRMATION',
          '',
          'If you see a block message, explain to the user why the operation was blocked',
          'and suggest a safer alternative.',
          '</open-safe-frame>',
        ].join('\n'),
      };
    });

    api.on('message_received', async (event: MessageReceivedEvent, ctx: PluginContext) => {
      if (event.from === 'user') {
        const sessionKey = ctx.sessionKey || 'default';
        const state = getSessionState(sessionKey);
        const text = typeof event.content === 'string'
          ? event.content
          : Array.isArray(event.content)
            ? event.content.map(c => typeof c === 'object' && 'text' in c ? c.text : '').join(' ')
            : String(event.content);
        state.userIntent = text;
      }
    });

    api.on('before_tool_call', async (event: BeforeToolCallEvent, ctx: PluginContext) => {
      const sessionKey = ctx.sessionKey || 'default';
      const state = getSessionState(sessionKey);
      
      log.debug?.(`Checking tool call: ${event.toolName}`);

      const ruleContext: RuleContext = {
        toolName: event.toolName,
        params: event.params,
        sessionKey,
        userIntent: state.userIntent,
        toolHistory: state.toolHistory,
      };

      const result = evaluateAllRules(ruleContext);

      if (!result.passed) {
        const blockReason = result.violations.join('\n');
        log.warn(`BLOCKED "${event.toolName}": ${blockReason}`);
        
        state.toolHistory.push({
          toolName: event.toolName,
          params: event.params,
          timestamp: new Date(),
          blocked: true,
        });

        return { block: true, blockReason };
      }

      if (result.requiresConfirmation && config.requireConfirmation) {
        log.warn(`REQUIRES CONFIRMATION "${event.toolName}"`);
        return {
          block: true,
          blockReason: `需要用户确认: ${result.violations.join('\n')}\n\n请确认是否继续执行此操作。`,
        };
      }

      return {};
    }, { priority: 100 });

    api.on('after_tool_call', async (event: AfterToolCallEvent, ctx: PluginContext) => {
      const sessionKey = ctx.sessionKey || 'default';
      const state = getSessionState(sessionKey);
      
      state.toolHistory.push({
        toolName: event.toolName,
        params: event.params,
        timestamp: new Date(),
        blocked: false,
      });

      log.debug?.(`Tool call completed: ${event.toolName} (${event.durationMs}ms)`);
    });

    api.on('session_end', async (event, ctx: PluginContext) => {
      const sessionKey = ctx.sessionKey || 'default';
      sessionStates.delete(sessionKey);
      log.debug?.(`Session ended: ${sessionKey}`);
    });

    log.info('Open Safe Frame plugin registered successfully');
  },
};

export default openSafeFramePlugin;
