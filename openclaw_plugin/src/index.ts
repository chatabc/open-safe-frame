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
import { AIAnalyzer } from './core/ai_analyzer';
import { ConstraintManager, ConstraintExtractionResult, CONSTRAINT_EXTRACTION_PROMPT } from './core/constraint_manager';
import type { AISafetyPluginConfig, AIProviderConfig } from './core/ai_types';

const PLUGIN_ID = 'open-safe-frame';
const PLUGIN_NAME = 'Open Safe Frame';
const PLUGIN_VERSION = '2.4.0';
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
  constraintManager: ConstraintManager;
}

const sessionStates = new Map<string, SessionState>();
let coordinator: SafetyCoordinator;
let pluginConfig: PluginConfig;
let log: PluginLogger;
let aiAnalyzer: AIAnalyzer | null = null;

function getSessionState(sessionKey: string): SessionState {
  if (!sessionStates.has(sessionKey)) {
    sessionStates.set(sessionKey, {
      userMessage: '',
      sessionHistory: [],
      pendingConfirmation: null,
      constraintManager: new ConstraintManager(sessionKey),
    });
  }
  return sessionStates.get(sessionKey)!;
}

function extractAIConfigFromOpenClaw(api: OpenClawPluginApi): { provider: AIProviderConfig; mode: 'openclaw' } | null {
  const config = api.config;
  
  const defaultAgent = config.agents?.list?.find(a => a.default) || config.agents?.list?.[0];
  
  let modelStr: string | undefined;
  if (defaultAgent?.model) {
    modelStr = typeof defaultAgent.model === 'string' 
      ? defaultAgent.model 
      : defaultAgent.model.primary;
  }
  
  if (!modelStr && config.agents?.defaults?.model) {
    modelStr = typeof config.agents.defaults.model === 'string'
      ? config.agents.defaults.model
      : config.agents.defaults.model.primary;
  }

  if (!modelStr) {
    return null;
  }

  const [provider, model] = modelStr.includes('/') 
    ? modelStr.split('/') 
    : ['openai', modelStr];

  const providerConfig = config.models?.providers?.[provider];
  
  const providerMap: Record<string, AIProviderConfig['provider']> = {
    'openai': 'openai',
    'anthropic': 'anthropic',
    'claude': 'anthropic',
    'ollama': 'ollama',
    'local': 'ollama',
  };

  return {
    provider: {
      provider: providerMap[provider.toLowerCase()] || 'openai',
      model: model || 'gpt-4o-mini',
      baseUrl: providerConfig?.baseUrl,
      apiKey: providerConfig?.apiKey,
    },
    mode: 'openclaw',
  };
}

async function extractConstraints(
  userMessage: string,
  sessionHistory: SessionEvent[],
  analyzer: AIAnalyzer
): Promise<ConstraintExtractionResult> {
  try {
    const historyText = sessionHistory
      .slice(-5)
      .map(e => `${e.type}: ${e.content}`)
      .join('\n');

    const prompt = CONSTRAINT_EXTRACTION_PROMPT
      .replace('{{USER_MESSAGE}}', userMessage)
      .replace('{{SESSION_HISTORY}}', historyText || '无');

    const response = await analyzer['callAI'](prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { constraints: [], confidence: 0 };
    }
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    log.warn(`约束提取失败: ${error}`);
    return { constraints: [], confidence: 0 };
  }
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

    const aiSafetyConfig = pluginConfig as AISafetyPluginConfig;
    const mode = aiSafetyConfig.mode || 'openclaw';

    if (mode === 'openclaw') {
      const openClawAI = extractAIConfigFromOpenClaw(api);
      if (openClawAI) {
        aiAnalyzer = new AIAnalyzer(openClawAI.provider, aiSafetyConfig);
        aiAnalyzer.setOpenClawConfig(api.config);
        log.info(`AI分析模式: OpenClaw配置 (${openClawAI.provider.provider}/${openClawAI.provider.model})`);
      } else {
        log.warn('OpenClaw模式但未找到模型配置，将使用规则分析模式');
      }
    } else if (mode === 'custom' && aiSafetyConfig.customProvider) {
      aiAnalyzer = new AIAnalyzer(aiSafetyConfig.customProvider, aiSafetyConfig);
      log.info(`AI分析模式: 自定义配置 (${aiSafetyConfig.customProvider.provider}/${aiSafetyConfig.customProvider.model || 'default'})`);
    } else {
      log.info('规则分析模式 (未配置AI)');
    }
    
    log.info('新范式: 意图理解 → 后果预测 → 价值判断 → 协同决策');
    log.info('约束持久化: 用户约束将被提取并持续跟踪');

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

        if (aiAnalyzer && text.trim()) {
          const extraction = await extractConstraints(text, state.sessionHistory, aiAnalyzer);
          if (extraction.constraints.length > 0) {
            const added = state.constraintManager.addConstraintsFromExtraction(extraction, text);
            log.info(`提取到 ${added.length} 个约束 (置信度: ${(extraction.confidence * 100).toFixed(0)}%)`);
            added.forEach(c => log.debug?.(`  - [${c.priority}] ${c.content}`));
          }
        }
      }

      const constraintPrompt = state.constraintManager.formatConstraintsForPrompt();

      return {
        prependContext: [
          '<open-safe-frame>',
          '本会话受 Open Safe Frame 保护 (github.com/chatabc/open-safe-frame)',
          '',
          '核心理念: 权限开放，约束内置',
          '',
          constraintPrompt,
          '',
          '工作原理:',
          '1. AI拥有完全的操作权限',
          '2. 用户约束会被持久化跟踪',
          '3. 每个操作都会检查是否违反约束',
          '4. 高风险操作需要用户确认',
          '5. 如非必要，不打扰用户',
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

      if (aiAnalyzer && text.trim() && !text.match(/^(确认|取消|confirm|cancel|yes|no)$/i)) {
        const extraction = await extractConstraints(text, state.sessionHistory, aiAnalyzer);
        if (extraction.constraints.length > 0) {
          const added = state.constraintManager.addConstraintsFromExtraction(extraction, text);
          log.info(`提取到 ${added.length} 个新约束`);
          added.forEach(c => log.debug?.(`  - [${c.priority}] ${c.content}`));
        }
      }

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

      const violationCheck = state.constraintManager.checkViolation({
        type: event.toolName,
        description: `${event.toolName}(${JSON.stringify(event.params).slice(0, 100)})`,
        params: event.params,
      });

      if (violationCheck.violated) {
        const violatedList = violationCheck.violatedConstraints
          .map(c => `• ${c.content}`)
          .join('\n');
        
        log.warn(`操作违反约束: ${event.toolName}`);
        
        return {
          block: true,
          blockReason: [
            '═'.repeat(50),
            '⚠️ Open Safe Frame - 约束冲突',
            '═'.repeat(50),
            '',
            '【即将执行的操作】',
            `  工具: ${event.toolName}`,
            `  参数: ${JSON.stringify(event.params, null, 2).slice(0, 200)}`,
            '',
            '【违反的约束】',
            violatedList,
            '',
            '【处理方式】',
            '此操作与您之前设置的约束冲突。',
            '如需执行，请先明确表示"允许执行此操作"，或修改约束。',
            '',
            '═'.repeat(50),
          ].join('\n'),
        };
      }

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
        log.debug?.(`活跃约束: ${state.constraintManager.getActiveConstraintCount()}`);

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
            state.constraintManager.deactivateOperationConstraints();
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
      const state = sessionStates.get(sessionKey);
      if (state) {
        log.info(`会话结束，共跟踪 ${state.constraintManager.getConstraintCount()} 个约束`);
      }
      sessionStates.delete(sessionKey);
      log.debug?.(`会话结束: ${sessionKey}`);
    });

    log.info('Open Safe Frame 插件注册成功');
  },
};

export default openSafeFramePlugin;
export { SafetyCoordinator, SafetyAssessment, ConstraintManager } from './core';
