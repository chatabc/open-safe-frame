export interface Constraint {
  id: string;
  content: string;
  source: 'user_explicit' | 'user_implicit' | 'system';
  priority: 'critical' | 'high' | 'normal';
  createdAt: Date;
  sourceMessage: string;
  scope: 'session' | 'operation';
  isActive: boolean;
  violationAttempts: number;
  lastAttemptAt?: Date;
  appealHistory: AppealRecord[];
}

export interface AppealRecord {
  timestamp: Date;
  reason: string;
  toolName: string;
  params: Record<string, unknown>;
  userDecision?: 'approved' | 'rejected';
}

export interface ConstraintExtractionResult {
  constraints: Array<{
    content: string;
    priority: 'critical' | 'high' | 'normal';
    scope: 'session' | 'operation';
  }>;
  confidence: number;
}

export interface ViolationResult {
  violated: boolean;
  violatedConstraints: Constraint[];
  canAppeal: boolean;
  appealThreshold: number;
  remainingAttempts: number;
}

export interface AppealRequest {
  constraintId: string;
  reason: string;
  toolName: string;
  toolParams: Record<string, unknown>;
  intent: string;
  consequences: string[];
  riskLevel: string;
}

export const CONSTRAINT_EXTRACTION_PROMPT = `你是一个约束条件提取专家。请从用户消息中提取所有约束条件。

## 用户消息
{{USER_MESSAGE}}

## 对话历史
{{SESSION_HISTORY}}

## 提取要求
识别以下类型的约束：
1. **禁止性约束**：用户明确说"不要"、"别"、"禁止"等
   - 例："不要删除任何东西" → 约束：禁止删除操作
   - 例："别动我的代码" → 约束：禁止修改代码文件

2. **限制性约束**：用户设置了范围或条件
   - 例："只处理今天的邮件" → 约束：仅限今天的邮件
   - 例："不超过100元" → 约束：金额上限100元

3. **条件性约束**：用户设置了触发条件
   - 例："先问我再执行" → 约束：执行前需要确认
   - 例："确认后再操作" → 约束：需要用户确认

4. **优先级判断**：
   - **critical**：涉及数据安全、不可逆操作、财务相关、核心业务
   - **high**：涉及重要业务逻辑、用户偏好、敏感数据
   - **normal**：一般性约束、操作习惯

5. **作用域判断**：
   - **session**：整个会话期间有效（如"不要删除任何东西"）
   - **operation**：仅对当前操作有效（如"这次先确认"）

请以JSON格式返回：
{
  "constraints": [
    {
      "content": "约束内容（简洁描述）",
      "priority": "critical|high|normal",
      "scope": "session|operation"
    }
  ],
  "confidence": 0.0-1.0
}

如果没有发现约束，返回空数组。
只返回JSON，不要其他内容。`;

export const APPEAL_THRESHOLD: Record<'critical' | 'high' | 'normal', number> = {
  critical: 3,
  high: 2,
  normal: 1,
};

export class ConstraintManager {
  private constraints: Map<string, Constraint> = new Map();
  private sessionId: string;
  private passwordHash: string | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  setPasswordHash(hash: string): void {
    this.passwordHash = hash;
  }

  verifyPassword(hash: string): boolean {
    return this.passwordHash === hash;
  }

  hasPassword(): boolean {
    return this.passwordHash !== null;
  }

  addConstraint(constraint: Omit<Constraint, 'id' | 'createdAt' | 'isActive' | 'violationAttempts' | 'appealHistory'>): Constraint {
    const id = `${this.sessionId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newConstraint: Constraint = {
      ...constraint,
      id,
      createdAt: new Date(),
      isActive: true,
      violationAttempts: 0,
      appealHistory: [],
    };
    this.constraints.set(id, newConstraint);
    return newConstraint;
  }

  addConstraintsFromExtraction(
    extraction: ConstraintExtractionResult,
    sourceMessage: string
  ): Constraint[] {
    const added: Constraint[] = [];
    for (const c of extraction.constraints) {
      const constraint = this.addConstraint({
        content: c.content,
        source: 'user_explicit',
        priority: c.priority,
        sourceMessage,
        scope: c.scope,
      });
      added.push(constraint);
    }
    return added;
  }

  getActiveConstraints(): Constraint[] {
    return Array.from(this.constraints.values())
      .filter(c => c.isActive)
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, normal: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }

  getCriticalConstraints(): Constraint[] {
    return this.getActiveConstraints().filter(c => c.priority === 'critical');
  }

  getHighPriorityConstraints(): Constraint[] {
    return this.getActiveConstraints().filter(c => c.priority === 'high');
  }

  deactivateConstraint(id: string, passwordHash?: string): { success: boolean; reason?: string } {
    const constraint = this.constraints.get(id);
    if (!constraint) {
      return { success: false, reason: '约束不存在' };
    }

    if (constraint.priority === 'critical' || constraint.priority === 'high') {
      if (!passwordHash || !this.verifyPassword(passwordHash)) {
        return { success: false, reason: '删除高优先级约束需要密码验证' };
      }
    }

    constraint.isActive = false;
    return { success: true };
  }

  deactivateOperationConstraints(): void {
    for (const constraint of this.constraints.values()) {
      if (constraint.scope === 'operation') {
        constraint.isActive = false;
      }
    }
  }

  recordViolationAttempt(constraintId: string): Constraint | null {
    const constraint = this.constraints.get(constraintId);
    if (constraint) {
      constraint.violationAttempts++;
      constraint.lastAttemptAt = new Date();
    }
    return constraint;
  }

  recordAppeal(constraintId: string, appeal: Omit<AppealRecord, 'timestamp'>): void {
    const constraint = this.constraints.get(constraintId);
    if (constraint) {
      constraint.appealHistory.push({
        ...appeal,
        timestamp: new Date(),
      });
    }
  }

  checkViolation(action: {
    type: string;
    description: string;
    params?: Record<string, unknown>;
  }): ViolationResult {
    const activeConstraints = this.getActiveConstraints();
    const violatedConstraints: Constraint[] = [];

    for (const constraint of activeConstraints) {
      if (this.isConstraintViolated(constraint, action)) {
        violatedConstraints.push(constraint);
      }
    }

    if (violatedConstraints.length === 0) {
      return {
        violated: false,
        violatedConstraints: [],
        canAppeal: false,
        appealThreshold: 0,
        remainingAttempts: 0,
      };
    }

    const highestPriority = violatedConstraints.reduce((highest, c) => {
      const order = { critical: 0, high: 1, normal: 2 };
      return order[c.priority] < order[highest.priority] ? c : highest;
    });

    const threshold = APPEAL_THRESHOLD[highestPriority.priority];
    const currentAttempts = highestPriority.violationAttempts;
    const canAppeal = currentAttempts >= threshold - 1;

    return {
      violated: true,
      violatedConstraints,
      canAppeal,
      appealThreshold: threshold,
      remainingAttempts: Math.max(0, threshold - 1 - currentAttempts),
    };
  }

  private isConstraintViolated(
    constraint: Constraint,
    action: { type: string; description: string; params?: Record<string, unknown> }
  ): boolean {
    const content = constraint.content.toLowerCase();
    const actionDesc = action.description.toLowerCase();
    const actionType = action.type.toLowerCase();

    if (content.includes('删除') || content.includes('delete')) {
      if (actionType.includes('delete') || actionType.includes('remove') ||
          actionDesc.includes('删除') || actionDesc.includes('remove')) {
        return true;
      }
    }

    if (content.includes('修改') || content.includes('modify') || content.includes('写入')) {
      if (actionType.includes('write') || actionType.includes('edit') ||
          actionDesc.includes('修改') || actionDesc.includes('写入')) {
        return true;
      }
    }

    if (content.includes('执行') || content.includes('exec')) {
      if (actionType.includes('exec') || actionType.includes('run') ||
          actionDesc.includes('执行')) {
        return true;
      }
    }

    if (content.includes('确认') || content.includes('confirm')) {
      return true;
    }

    if (content.includes('不') || content.includes('不要') || content.includes('别') || content.includes('禁止')) {
      const forbidden = content.replace(/不|不要|别|禁止/g, '').trim();
      if (forbidden && (actionDesc.includes(forbidden) || actionType.includes(forbidden))) {
        return true;
      }
    }

    return false;
  }

  formatConstraintsForPrompt(): string {
    const active = this.getActiveConstraints();
    if (active.length === 0) {
      return '无活跃约束';
    }

    const lines: string[] = ['## 当前会话约束（必须遵守）', ''];
    
    for (const c of active) {
      const priorityIcon = { critical: '🔴', high: '🟠', normal: '🟡' };
      const scopeNote = c.scope === 'session' ? '[会话级]' : '[操作级]';
      const attemptsNote = c.violationAttempts > 0 ? ` (已尝试${c.violationAttempts}次)` : '';
      lines.push(`${priorityIcon[c.priority]} ${scopeNote} ${c.content}${attemptsNote}`);
    }
    
    lines.push('');
    lines.push('⚠️ 违反约束的操作将被阻止');
    lines.push('💡 如果您认为操作必要，可以申诉并说明理由');
    
    return lines.join('\n');
  }

  formatViolationMessage(
    violation: ViolationResult,
    action: { type: string; description: string; params?: Record<string, unknown> }
  ): string {
    const lines: string[] = [];
    
    lines.push('═'.repeat(50));
    lines.push('⚠️ Open Safe Frame - 约束冲突');
    lines.push('═'.repeat(50));
    lines.push('');
    lines.push('【即将执行的操作】');
    lines.push(`  工具: ${action.type}`);
    lines.push(`  描述: ${action.description}`);
    lines.push('');
    lines.push('【违反的约束】');
    
    for (const c of violation.violatedConstraints) {
      const priorityLabel = { critical: '🔴严重', high: '🟠高', normal: '🟡普通' };
      lines.push(`  ${priorityLabel[c.priority]} ${c.content}`);
      lines.push(`      已尝试: ${c.violationAttempts}次 / 申诉门槛: ${violation.appealThreshold}次`);
    }
    
    lines.push('');
    
    if (violation.canAppeal) {
      lines.push('【申诉通道已开启】');
      lines.push('您已多次尝试此操作，可以申诉。');
      lines.push('请说明您的理由，插件将向用户请求许可。');
      lines.push('');
      lines.push('格式: 申诉: <您的理由>');
      lines.push('例: 申诉: 此删除操作是为了清理测试数据，用户明确要求过');
    } else {
      lines.push('【处理方式】');
      lines.push(`此操作与约束冲突。还需尝试 ${violation.remainingAttempts} 次后可申诉。`);
      lines.push('如确需执行，请继续尝试或联系用户修改约束。');
    }
    
    lines.push('');
    lines.push('═'.repeat(50));
    
    return lines.join('\n');
  }

  formatAppealConfirmationMessage(
    appeal: AppealRequest,
    constraint: Constraint
  ): string {
    const lines: string[] = [];
    
    lines.push('═'.repeat(50));
    lines.push('🔔 Open Safe Frame - 操作申诉请求');
    lines.push('═'.repeat(50));
    lines.push('');
    lines.push('【AI的申诉理由】');
    lines.push(`  ${appeal.reason}`);
    lines.push('');
    lines.push('【AI理解的意图】');
    lines.push(`  ${appeal.intent}`);
    lines.push('');
    lines.push('【即将执行的操作】');
    lines.push(`  工具: ${appeal.toolName}`);
    lines.push(`  参数: ${JSON.stringify(appeal.toolParams, null, 2).slice(0, 300)}`);
    lines.push('');
    lines.push('【预测后果】');
    for (const c of appeal.consequences) {
      lines.push(`  • ${c}`);
    }
    lines.push('');
    lines.push('【风险等级】');
    lines.push(`  ${appeal.riskLevel}`);
    lines.push('');
    lines.push('【违反的约束】');
    const priorityLabel = { critical: '🔴严重', high: '🟠高', normal: '🟡普通' };
    lines.push(`  ${priorityLabel[constraint.priority]} ${constraint.content}`);
    lines.push(`  累计尝试: ${constraint.violationAttempts}次`);
    lines.push(`  历史申诉: ${constraint.appealHistory.length}次`);
    lines.push('');
    
    if (constraint.priority === 'critical' || constraint.priority === 'high') {
      lines.push('🔐 此操作需要输入密码确认');
      lines.push('');
      lines.push('请输入密码以允许此操作，或回复"拒绝"以阻止');
    } else {
      lines.push('请回复 "允许" 以执行此操作，或回复 "拒绝" 以阻止');
      lines.push('');
      lines.push('如需删除此约束，请回复 "删除约束:密码"');
    }
    
    lines.push('');
    lines.push('═'.repeat(50));
    
    return lines.join('\n');
  }

  getConstraintCount(): number {
    return this.constraints.size;
  }

  getActiveConstraintCount(): number {
    return this.getActiveConstraints().length;
  }

  clear(): void {
    this.constraints.clear();
  }

  export(): Constraint[] {
    return Array.from(this.constraints.values());
  }

  import(constraints: Constraint[]): void {
    this.constraints.clear();
    for (const c of constraints) {
      this.constraints.set(c.id, c);
    }
  }
}
