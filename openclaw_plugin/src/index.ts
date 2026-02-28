import type {
  OpenClawPluginApi,
  PluginLogger,
  PluginHookBeforeAgentStartEvent,
  PluginHookBeforeAgentStartResult,
  PluginHookAgentContext,
  PluginHookBeforeToolCallEvent,
  PluginHookBeforeToolCallResult,
  PluginHookToolContext,
  PluginHookAfterToolCallEvent,
  PluginHookMessageReceivedEvent,
  PluginHookMessageContext,
  PluginHookSessionEndEvent,
  PluginHookSessionContext,
} from './types';
import { SafetyCoordinator, SafetyAssessment, SessionEvent, ToolContext, PluginConfig } from './core';

const PLUGIN_ID = 'open-safe-frame';
const PLUGIN_NAME = 'Open Safe Frame';
const PLUGIN_VERSION = '2.1.0';
const LOG_PREFIX = `[${PLUGIN_ID}]`;

function createLogger(baseLogger: PluginLogger): PluginLogger {
  return {
    info: (msg: string) => baseLogger.info(`${LOG_PREFIX} ${msg}`),
    warn: (msg: string) => baseLogger.warn(`${LOG_PREFIX} ${msg}`),
    error: (msg: string) => baseLogger.error(`${LOG_PREFIX} ${msg}`),
    debug: baseLogger.debug ? (msg: string) => baseLogger.debug!(`${LOG_PREFIX} ${msg}`) : undefined,
  };
}

interface SessionState {
  userMessage: string;
  sessionHistory: SessionEvent[];
  pendingConfirmation: SafetyAssessment | null;
}

const sessionStates = new Map<string, SessionState>();
let coordinator: SafetyCoordinator;
let pluginConfig: PluginConfig;
let log: PluginLogger;

function getSessionState(sessionKey: string): SessionState {
  if (!sessionStates.has(sessionKey)) {
    sessionStates.set(sessionKey, {
      userMessage: '',
      sessionHistory: [],
      pendingConfirmation: null,
    });
  }
  return sessionStates.get(sessionKey)!;
}

export const openSafeFramePlugin = {
  id: PLUGIN_ID,
  name: PLUGIN_NAME,
  description: 'AI安全框架 - 权限开放，约束内置',
  version: PLUGIN_VERSION,

  register(api: OpenClawPluginApi) {
    log = createLogger(api.logger);
    pluginConfig = (api.pluginConfig as PluginConfig) || {};
    coordinator = new SafetyCoordinator(pluginConfig);

    if (pluginConfig.enabled === false) {
      log.info('Plugin disabled via config');
      return;
    }

    log.info(`Open Safe Frame v${PLUGIN_VERSION} loaded`);
    
    if (pluginConfig.aiProvider) {
      log.info(`AI分析模式: ${pluginConfig.aiProvider.provider}${pluginConfig.aiProvider.model ? ` / ${pluginConfig.aiProvider.model}` : ''}`);
    } else {
      log.info('规则分析模式 (未配置AI Provider)');
    }
    
    log.info('新范式: 意图理解 → 后果预测 → 价值判断 → 协同决策');

    api.on('before_agent_start', async (
      event: PluginHookBeforeAgentStartEvent,
      ctx: PluginHookAgentContext
    ): Promise<PluginHookBeforeAgentStartResult | void> => {
      const sessionKey = ctx.sessionKey || 'default';
      const state = getSessionState(sessionKey);
      
      if (event.prompt) {
        const text = typeof event.prompt === 'string' 
          ? event.prompt 
          : JSON.stringify(event.prompt);
        state.userMessage = text;
        state.sessionHistory.push({
          type: 'user_message',
          content: text,
          timestamp: new Date(),
        });
      }

      return {
        prependContext: [
          '<open-safe-frame>',
          '本会话受 Open Safe Frame 保护 (github.com/chatabc/open-safe-frame)',
          '',
          '核心理念: 权限开放，约束内置',
          '',
          '工作原理:',
          '1. AI拥有完全的操作权限',
          '2. 每个操作都会进行意图理解、后果预测、价值判断',
          '3. 高风险操作需要用户确认（会详细说明意图、操作、后果、严重程度）',
          '4. 如非必要，不打扰用户',
          '',
          '如果收到确认请求，请仔细阅读后决定是否继续。',
          '</open-safe-frame>',
        ].join('\n'),
      };
    });

    api.on('message_received', async (
      event: PluginHookMessageReceivedEvent,
      ctx: PluginHookMessageContext
    ) => {
      const sessionKey = ctx.conversationId || 'default';
      const state = getSessionState(sessionKey);
      
      const text = typeof event.content === 'string'
        ? event.content
        : Array.isArray(event.content)
          ? event.content.map(c => typeof c === 'object' && 'text' in c ? c.text : '').join(' ')
          : String(event.content);
      
      state.userMessage = text;
      state.sessionHistory.push({
        type: 'user_message',
        content: text,
        timestamp: new Date(),
      });

      if (state.pendingConfirmation) {
        const lowerText = text.toLowerCase().trim();
        if (lowerText === '确认' || lowerText === 'confirm' || lowerText === 'yes') {
          log.info('用户确认了操作');
          state.pendingConfirmation = null;
        } else if (lowerText === '取消' || lowerText === 'cancel' || lowerText === 'no') {
          log.info('用户取消了操作');
          state.pendingConfirmation = null;
        }
      }
    });

    api.on('before_tool_call', async (
      event: PluginHookBeforeToolCallEvent,
      ctx: PluginHookToolContext
    ): Promise<PluginHookBeforeToolCallResult | void> => {
      const sessionKey = ctx.sessionKey || 'default';
      const state = getSessionState(sessionKey);
      
      log.debug?.(`评估工具调用: ${event.toolName}`);

      const toolContext: ToolContext = {
        toolName: event.toolName,
        params: event.params,
        sessionHistory: state.sessionHistory,
      };

      try {
        const assessment = await coordinator.assess(state.userMessage, toolContext);
        
        log.info(`安全评估完成: ${assessment.decision.action} (${assessment.processingTime}ms)`);
        log.debug?.(`意图: ${assessment.intent.understood}`);
        log.debug?.(`置信度: ${(assessment.intent.confidence * 100).toFixed(0)}%`);
        log.debug?.(`风险评分: ${assessment.valueAlignment.riskScore.toFixed(2)}`);
        log.debug?.(`用户利益评分: ${assessment.valueAlignment.userInterestScore.toFixed(2)}`);

        switch (assessment.decision.action) {
          case 'reject':
            log.warn(`操作已阻止: ${event.toolName}`);
            const rejectionMessage = coordinator.formatRejectionMessage(assessment);
            return { block: true, blockReason: rejectionMessage };

          case 'confirm':
            log.warn(`需要用户确认: ${event.toolName}`);
            state.pendingConfirmation = assessment;
            const confirmationMessage = coordinator.formatConfirmationMessage(assessment);
            return { block: true, blockReason: confirmationMessage };

          case 'proceed':
            log.info(`操作已批准: ${event.toolName}`);
            return {};
        }
      } catch (error) {
        log.error(`安全评估出错: ${error}`);
        return {};
      }
    }, { priority: 100 });

    api.on('after_tool_call', async (
      event: PluginHookAfterToolCallEvent,
      ctx: PluginHookToolContext
    ) => {
      const sessionKey = ctx.sessionKey || 'default';
      const state = getSessionState(sessionKey);
      
      state.sessionHistory.push({
        type: 'tool_call',
        content: event.toolName,
        timestamp: new Date(),
        toolName: event.toolName,
        params: event.params,
      });

      if (event.result) {
        state.sessionHistory.push({
          type: 'tool_result',
          content: typeof event.result === 'string' ? event.result : JSON.stringify(event.result),
          timestamp: new Date(),
          toolName: event.toolName,
        });
      }

      log.debug?.(`工具调用完成: ${event.toolName} (${event.durationMs}ms)`);
    });

    api.on('session_end', async (
      event: PluginHookSessionEndEvent,
      ctx: PluginHookSessionContext
    ) => {
      const sessionKey = ctx.sessionId || 'default';
      sessionStates.delete(sessionKey);
      log.debug?.(`会话结束: ${sessionKey}`);
    });

    log.info('Open Safe Frame 插件注册成功');
  },
};

export default openSafeFramePlugin;
export { SafetyCoordinator, SafetyAssessment } from './core';
