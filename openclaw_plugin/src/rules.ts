import { SafetyRule, RuleContext, RuleResult } from './config';

const CRITICAL_DELETE_KEYWORDS = [
  'rmdir /s /q',
  'rm -rf',
  'del /f /s /q',
  'shutil.rmtree',
  'fs.rm',
  'rimraf',
  'delete all',
  '删除所有',
  '批量删除',
  '清空',
  'format',
  '格式化',
];

const DANGEROUS_PATH_PATTERNS = [
  /^\/$/i,
  /^\/home$/i,
  /^\/Users$/i,
  /^C:\\$/i,
  /^C:\\Users$/i,
  /^C:\\Users\\[^\\]+$/i,
  /^~$/i,
  /^\.$/,
  /^\.\.$/,
];

const FILE_READ_TOOLS = new Set([
  'read_file',
  'fs_read',
  'cat',
  'head',
  'tail',
  'less',
  'more',
]);

const FILE_DELETE_TOOLS = new Set([
  'delete_file',
  'fs_delete',
  'rm',
  'rmdir',
  'unlink',
  'remove',
]);

const EMAIL_TOOLS = new Set([
  'email_delete',
  'email_send',
  'gmail_delete',
  'outlook_delete',
]);

const SHELL_TOOLS = new Set([
  'shell_exec',
  'bash',
  'cmd',
  'powershell',
  'terminal',
]);

const WEB_TOOLS = new Set([
  'web_fetch',
  'http_request',
  'curl',
  'wget',
]);

export const SAFETY_RULES: SafetyRule[] = [
  {
    id: 'no_recursive_delete',
    name: '禁止递归删除',
    description: '防止类似Meta安全高管邮件被删光的事故',
    severity: 'critical',
    check: (ctx: RuleContext): RuleResult => {
      const params = ctx.params;
      const toolName = ctx.toolName.toLowerCase();
      
      if (!FILE_DELETE_TOOLS.has(toolName) && !SHELL_TOOLS.has(toolName)) {
        return { passed: true };
      }
      
      const command = String(params.command || params.path || params.file || '');
      const recursiveFlags = ['/s', '/q', '-rf', '-r', '-f', '--recursive'];
      
      for (const flag of recursiveFlags) {
        if (command.toLowerCase().includes(flag.toLowerCase())) {
          return {
            passed: false,
            reason: `检测到递归删除标志 "${flag}"，可能造成大量数据丢失。请逐个确认删除。`,
            requiresConfirmation: true,
          };
        }
      }
      
      return { passed: true };
    },
  },

  {
    id: 'no_bulk_email_delete',
    name: '禁止批量邮件删除',
    description: '防止OpenClaw邮件删除事故重演',
    severity: 'critical',
    check: (ctx: RuleContext): RuleResult => {
      const toolName = ctx.toolName.toLowerCase();
      
      if (!EMAIL_TOOLS.has(toolName) && !toolName.includes('email') && !toolName.includes('mail')) {
        return { passed: true };
      }
      
      const action = String(ctx.params.action || ctx.params.operation || '');
      const count = Number(ctx.params.count || ctx.params.limit || 1);
      
      if (action.toLowerCase().includes('delete') || action.toLowerCase().includes('删除')) {
        if (count > 10 || action.includes('all') || action.includes('所有')) {
          return {
            passed: false,
            reason: '禁止批量删除邮件！请逐封确认或设置明确的筛选条件。',
            requiresConfirmation: true,
          };
        }
      }
      
      return { passed: true };
    },
  },

  {
    id: 'no_dangerous_path_delete',
    name: '禁止危险路径删除',
    description: '防止Google Antigravity删库事故 - 空格导致路径截断',
    severity: 'critical',
    check: (ctx: RuleContext): RuleResult => {
      const toolName = ctx.toolName.toLowerCase();
      
      if (!FILE_DELETE_TOOLS.has(toolName) && !SHELL_TOOLS.has(toolName)) {
        return { passed: true };
      }
      
      const path = String(ctx.params.path || ctx.params.file || ctx.params.dir || ctx.params.command || '');
      
      for (const pattern of DANGEROUS_PATH_PATTERNS) {
        if (pattern.test(path.trim())) {
          return {
            passed: false,
            reason: `禁止删除系统根目录或用户主目录！路径 "${path}" 被识别为危险路径。`,
          };
        }
      }
      
      if (path.includes(' ')) {
        return {
          passed: false,
          reason: `路径包含空格可能导致截断错误！请使用引号包裹路径或重命名文件夹。路径: "${path}"`,
          requiresConfirmation: true,
        };
      }
      
      return { passed: true };
    },
  },

  {
    id: 'no_unauthorized_purchase',
    name: '禁止未授权购买',
    description: '防止OpenClaw强买牛油果酱事故',
    severity: 'high',
    check: (ctx: RuleContext): RuleResult => {
      const toolName = ctx.toolName.toLowerCase();
      const params = ctx.params;
      
      const purchaseTools = ['purchase', 'buy', 'order', 'checkout', 'payment'];
      const isPurchaseTool = purchaseTools.some(t => toolName.includes(t));
      
      if (!isPurchaseTool) {
        return { passed: true };
      }
      
      const userIntent = ctx.userIntent.toLowerCase();
      const item = String(params.item || params.product || '');
      
      if (!userIntent.includes('buy') && !userIntent.includes('购买') && !userIntent.includes('买')) {
        return {
          passed: false,
          reason: `用户未请求购买操作！检测到AI尝试购买: "${item}"`,
        };
      }
      
      return { passed: true };
    },
  },

  {
    id: 'no_data_exfiltration',
    name: '防止数据外泄',
    description: '检测敏感文件读取后发送到外部的行为模式',
    severity: 'critical',
    check: (ctx: RuleContext): RuleResult => {
      const toolName = ctx.toolName.toLowerCase();
      
      if (!WEB_TOOLS.has(toolName) && !toolName.includes('http') && !toolName.includes('send')) {
        return { passed: true };
      }
      
      const history = ctx.toolHistory;
      const recentReads = history.filter(
        (h) => FILE_READ_TOOLS.has(h.toolName.toLowerCase()) && 
        Date.now() - h.timestamp.getTime() < 60000
      );
      
      if (recentReads.length > 0) {
        const sensitivePatterns = ['password', 'secret', 'key', 'token', 'credential', '密码', '密钥'];
        const readPaths = recentReads.map(h => String(h.params.path || h.params.file || '')).join(' ');
        
        for (const pattern of sensitivePatterns) {
          if (readPaths.toLowerCase().includes(pattern)) {
            return {
              passed: false,
              reason: `检测到敏感文件读取后的网络请求！可能存在数据外泄风险。`,
            };
          }
        }
      }
      
      return { passed: true };
    },
  },

  {
    id: 'no_shell_after_web_fetch',
    name: '禁止网络获取后执行Shell',
    description: '防止恶意代码注入攻击',
    severity: 'high',
    check: (ctx: RuleContext): RuleResult => {
      const toolName = ctx.toolName.toLowerCase();
      
      if (!SHELL_TOOLS.has(toolName)) {
        return { passed: true };
      }
      
      const history = ctx.toolHistory;
      const recentWebFetch = history.find(
        (h) => WEB_TOOLS.has(h.toolName.toLowerCase()) && 
        Date.now() - h.timestamp.getTime() < 120000
      );
      
      if (recentWebFetch) {
        return {
          passed: false,
          reason: '检测到网络获取后的Shell执行！可能存在恶意代码注入风险。',
          requiresConfirmation: true,
        };
      }
      
      return { passed: true };
    },
  },

  {
    id: 'limit_delete_count',
    name: '限制删除数量',
    description: '防止一次性删除大量文件',
    severity: 'high',
    check: (ctx: RuleContext): RuleResult => {
      const toolName = ctx.toolName.toLowerCase();
      
      if (!FILE_DELETE_TOOLS.has(toolName) && !SHELL_TOOLS.has(toolName)) {
        return { passed: true };
      }
      
      const count = Number(ctx.params.count || 1);
      
      if (count > 10) {
        return {
          passed: false,
          reason: `单次删除数量过大 (${count}个文件)！请分批操作并确认。`,
          requiresConfirmation: true,
        };
      }
      
      return { passed: true };
    },
  },

  {
    id: 'no_system_override',
    name: '禁止系统覆盖',
    description: '防止AI尝试修改安全设置或绕过约束',
    severity: 'critical',
    check: (ctx: RuleContext): RuleResult => {
      const params = ctx.params;
      const command = String(params.command || params.script || '').toLowerCase();
      
      const overridePatterns = [
        'disable safety',
        'bypass constraint',
        'ignore rules',
        '禁用安全',
        '绕过约束',
        '忽略规则',
        'chmod 777',
        'chown root',
        'sudo rm',
      ];
      
      for (const pattern of overridePatterns) {
        if (command.includes(pattern)) {
          return {
            passed: false,
            reason: `检测到尝试绕过安全机制！命令包含: "${pattern}"`,
          };
        }
      }
      
      return { passed: true };
    },
  },
];

export function evaluateAllRules(context: RuleContext): {
  passed: boolean;
  violations: string[];
  requiresConfirmation: boolean;
} {
  const violations: string[] = [];
  let requiresConfirmation = false;
  
  for (const rule of SAFETY_RULES) {
    const result = rule.check(context);
    
    if (!result.passed) {
      violations.push(`[${rule.severity.toUpperCase()}] ${rule.name}: ${result.reason}`);
      
      if (rule.severity === 'critical' && !result.requiresConfirmation) {
        return {
          passed: false,
          violations,
          requiresConfirmation: false,
        };
      }
    }
    
    if (result.requiresConfirmation) {
      requiresConfirmation = true;
    }
  }
  
  return {
    passed: violations.length === 0,
    violations,
    requiresConfirmation,
  };
}
