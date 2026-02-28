export interface Constraint {
  id: string;
  content: string;
  source: 'user_explicit' | 'user_implicit' | 'system';
  priority: 'critical' | 'high' | 'normal';
  createdAt: Date;
  sourceMessage: string;
  scope: 'session' | 'operation';
  isActive: boolean;
}

export interface ConstraintExtractionResult {
  constraints: Array<{
    content: string;
    priority: 'critical' | 'high' | 'normal';
    scope: 'session' | 'operation';
  }>;
  confidence: number;
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
   - **critical**：涉及数据安全、不可逆操作、财务相关
   - **high**：涉及重要业务逻辑、用户偏好
   - **normal**：一般性约束

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

export class ConstraintManager {
  private constraints: Map<string, Constraint> = new Map();
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  addConstraint(constraint: Omit<Constraint, 'id' | 'createdAt' | 'isActive'>): Constraint {
    const id = `${this.sessionId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newConstraint: Constraint = {
      ...constraint,
      id,
      createdAt: new Date(),
      isActive: true,
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

  deactivateConstraint(id: string): boolean {
    const constraint = this.constraints.get(id);
    if (constraint) {
      constraint.isActive = false;
      return true;
    }
    return false;
  }

  deactivateOperationConstraints(): void {
    for (const constraint of this.constraints.values()) {
      if (constraint.scope === 'operation') {
        constraint.isActive = false;
      }
    }
  }

  checkViolation(action: {
    type: string;
    description: string;
    params?: Record<string, unknown>;
  }): { violated: boolean; violatedConstraints: Constraint[] } {
    const activeConstraints = this.getActiveConstraints();
    const violatedConstraints: Constraint[] = [];

    for (const constraint of activeConstraints) {
      if (this.isConstraintViolated(constraint, action)) {
        violatedConstraints.push(constraint);
      }
    }

    return {
      violated: violatedConstraints.length > 0,
      violatedConstraints,
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

    if (content.includes('修改') || content.includes('modify')) {
      if (actionType.includes('write') || actionType.includes('edit') ||
          actionDesc.includes('修改') || actionDesc.includes('写入')) {
        return true;
      }
    }

    if (content.includes('确认') || content.includes('confirm')) {
      return true;
    }

    if (content.includes('不') || content.includes('不要') || content.includes('别')) {
      const forbidden = content.replace(/不|不要|别/g, '').trim();
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
      lines.push(`${priorityIcon[c.priority]} ${scopeNote} ${c.content}`);
    }
    
    lines.push('');
    lines.push('⚠️ 违反上述约束的操作将被阻止或需要额外确认');
    
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
