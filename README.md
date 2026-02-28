# Open Safe Frame

<div align="center">

**AI安全框架 - 权限开放，约束内置**

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/yourusername/open-safe-frame.svg)](https://github.com/yourusername/open-safe-frame/stargazers)

</div>

---

## 📖 目录

- [产品介绍](#-产品介绍)
  - [项目来历](#-项目来历)
  - [核心价值](#-核心价值)
  - [应用场景](#-应用场景)
- [系统架构](#-系统架构)
- [快速开始](#-快速开始)
- [详细使用教程](#-详细使用教程)
  - [基础用法](#-基础用法)
  - [价值对齐配置](#-价值对齐配置)
  - [约束系统配置](#-约束系统配置)
  - [风险评估配置](#-风险评估配置)
  - [权限管理配置](#-权限管理配置)
  - [沙箱环境配置](#-沙箱环境配置)
  - [远程监控配置](#-远程监控配置)
  - [紧急响应配置](#-紧急响应配置)
- [API参考](#-api参考)
- [共创指南](#-共创指南)
- [贡献者指南](#-贡献者指南)
- [许可证](#-许可证)

---

## 产品介绍

### 项目来历

#### 背景

2024年，OpenAI CEO Sam Altman 在一次公开讨论中提到：

> "我无法抵挡像OpenClaw这样的AI，我很乐意完全放开权限，但是我们需要一种全新的安全架构保证它不会做出什么很离谱的事情。"

这句话揭示了一个核心矛盾： **如何在赋予AI充分能力的同时，确保其行为安全可控？**

传统的AI安全方法往往采用"限制权限"的思路——通过减少AI的能力来降低风险。但这种方法存在明显缺陷：

1. **能力受限**：AI无法充分发挥其潜力
2. **灵活不足**：难以适应复杂多变的现实场景
3. **信任悖论**：越是限制，越难以建立真正的人机信任

Open Safe Frame 采用了一种全新的思路：**权限开放，约束内置**。

#### 设计哲学

```
传统方法: 限制能力 → 降低风险 → 限制价值
我们的方法: 开放能力 + 内置约束 → 安全地释放价值
```

### 核心价值

#### 1. 权限开放，约束内置

AI拥有广泛的操作权限，但安全约束被深度嵌入系统架构的每一层：

```
┌─────────────────────────────────────────────────────────────┐
│                    AI 能力层 (完全开放)                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ 文件操作 │ │ 网络访问 │ │ 系统调用 │ │ 数据处理 │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
├─────────────────────────────────────────────────────────────┤
│                    安全约束层 (深度嵌入)                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  价值对齐  →  行为约束  →  风险评估  →  权限控制  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 2. 防御深度

多层独立的安全层，单点失效不会导致整体安全崩溃：

| 层级 | 功能 | 失效后果 |
|------|------|----------|
| 第一层 | 输入验证 | 部分攻击可通过 |
| 第二层 | 意图分析 | 风险评估不完整 |
| 第三层 | 执行检查 | 高风险操作可能执行 |
| 第四层 | 运行监控 | 异常行为可能持续 |
| 第五层 | 事后审计 | 无实时防护 |

**只有所有层级同时失效，才会导致安全事故**

#### 3. 可验证性

所有安全机制都是可审计、可验证的：

- 每个决策都有完整的推理链
- 所有行为都有不可篡改的日志
- 支持第三方审计和验证

#### 4. 自适应学习

安全框架能够从新威胁中学习并进化：

- 新型攻击模式自动识别
- 约束规则动态调整
- 风险模型持续优化

### 应用场景

#### 1. 自主AI助手

```python
# 场景：AI助手需要帮用户处理敏感数据
from open_safe_frame.security import SecurityDecisionCoordinator

coordinator = SecurityDecisionCoordinator()

# AI请求：读取用户银行账单
decision = coordinator.quick_check("读取用户银行账单并发送给第三方")

# 结果：REJECT
# 原因：违反隐私保护约束，涉及敏感数据外传
```

#### 2. 自动化运维

```python
# 场景：AI运维系统需要执行系统操作
from open_safe_frame.execution import PermissionManager, PermissionLevel

permission_manager = PermissionManager()

# 请求高级权限执行系统维护
request = permission_manager.request_permission(
    user_id="ai_ops_agent",
    permission_name="system_maintenance",
    level=PermissionLevel.LEVEL_3,
    reason="执行定期系统维护任务"
)

# 需要管理员审批后才能执行
```

#### 3. 智能客服

```python
# 场景：客服AI需要处理用户投诉
from open_safe_frame.security.values import AlignmentEvaluator

evaluator = AlignmentEvaluator()

# 评估回复内容的价值观对齐
result = evaluator.check_alignment(
    behavior="向用户解释产品限制并提供替代方案",
)

# 结果：通过价值观评估
# 评分：0.92 (尊重用户自主权、透明沟通)
```

#### 4. 数据分析

```python
# 场景：数据分析AI需要访问用户数据
from open_safe_frame.execution.sandbox import SandboxManager, SandboxConfig

sandbox_manager = SandboxManager()

# 创建隔离环境进行数据分析
config = SandboxConfig(
    resource_limits=ResourceLimits(
        cpu_quota=0.8,
        memory_max="2G",
        network_enabled=False,  # 禁止网络访问
        file_access="readonly"  # 只读访问
    )
)

sandbox = sandbox_manager.create_sandbox(config)
```

---

## 系统架构

### 总体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      用户/环境交互层                              │
│                    (User/Environment Interface)                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    意图理解层                             │   │
│  │         (Intent Understanding Layer)                     │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │   │
│  │  │ IntentParser │ │ContextAnalyzer│ │ AmbiguityDet │    │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    安全决策层                             │   │
│  │           (Security Decision Layer)                      │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │   │
│  │  │ 价值对齐   │ │  行为约束   │ │  风险评估   │        │   │
│  │  │  Engine    │ │  Engine    │ │  Engine    │        │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘        │   │
│  │                      ↓                                    │   │
│  │            SecurityDecisionCoordinator                  │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    执行控制层                             │   │
│  │          (Execution Control Layer)                       │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │   │
│  │  │  权限管理   │ │  行动沙箱   │ │  效果监控   │        │   │
│  │  │  Module    │ │  Module    │ │  Module    │        │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘        │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    审计日志层                             │   │
│  │            (Audit & Logging Layer)                       │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │   │
│  │  │ AuditLogger │ │ LogSigner │ │ AnomalyDet │    │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  远程监控与通知系统                        │   │
│  │         (Remote Monitoring & Notification)               │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │   │
│  │  │   飞书集成   │ │ Telegram集成 │ │  远程控制   │    │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 核心组件说明

#### 意图理解层 (Intent Understanding Layer)

**职责**：解析用户输入，理解真实意图，识别潜在歧义

**核心模块**：
| 模块 | 功能 |
|------|------|
| IntentParser | 意图解析器 - 将自然语言转换为结构化意图 |
| ContextAnalyzer | 上下文分析器 - 分析当前环境和用户状态 |
| AmbiguityDetector | 歧义检测器 - 识别模糊或多种解释的意图 |
| GoalExtractor | 目标提取器 - 提取用户真正想要达成的目标 |

#### 安全决策层 (Security Decision Layer)

**职责**：基于多层安全引擎做出安全决策

**核心引擎**：

| 引擎 | 功能 | 关键特性 |
|------|------|----------|
| 价值对齐引擎 | 确保AI行为与人类核心价值观一致 | 价值观图谱、伦理评估、冲突解决 |
| 行为约束引擎 | 定义和执行行为边界 | 硬约束、软约束、动态调整 |
| 风险评估引擎 | 评估行为的潜在风险 | 概率评估、影响评估、缓解策略 |

#### 执行控制层 (Execution Control Layer)

**职责**：安全地执行已批准的操作

**核心模块**：
| 模块 | 功能 |
|------|------|
| 权限管理模块 | 细粒度权限控制 (RBAC + ABAC) |
| 行动沙箱模块 | 隔离执行环境 (资源/网络/文件系统隔离) |
| 效果监控模块 | 实时监控执行效果 (行为追踪、异常检测) |

---

## 快速开始

### 环境要求

- Python 3.11+
- 操作系统：Windows / Linux / macOS
- 可选：Docker (用于沙箱环境)

### 安装

#### 方式一：从源码安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/open-safe-frame.git
cd open-safe-frame

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
source venv/bin/activate  # Linux/Mac
# 或
.\venv\Scripts\activate  # Windows

# 安装依赖
pip install -e ".[dev]"

# 安装可选依赖
pip install -e ".[feishu,telegram]"
```

#### 方式二：通过pip安装

```bash
pip install open-safe-frame
```

### 验证安装

```python
from open_safe_frame import __version__
print(f"Open Safe Frame version: {__version__}")

# 预期输出: Open Safe Frame version: 0.1.0
```

---

## 详细使用教程

### 基础用法

#### 1. 创建安全决策协调器

```python
from open_safe_frame.security import SecurityDecisionCoordinator

# 使用默认配置创建协调器
coordinator = SecurityDecisionCoordinator()

# 或自定义阈值
coordinator = SecurityDecisionCoordinator(
    alignment_threshold=0.85,  # 价值对齐阈值
    constraint_threshold=0.6,  # 约束阈值
    risk_threshold="high"      # 风险阈值
)
```

#### 2. 解析用户意图

```python
from open_safe_frame.core import IntentParser

parser = IntentParser()

# 解析用户输入
result = parser.parse("帮我删除所有临时文件")

if result.success:
    intent = result.intent
    print(f"解析后的意图: {intent.parsed_intent}")
    print(f"目标数量: {len(intent.goals)}")
    print(f"风险标记: {intent.risk_flags}")
    print(f"置信度: {intent.confidence}")
```

#### 3. 进行安全决策

```python
from open_safe_frame.core import StructuredIntent

# 创建意图对象
intent = StructuredIntent(
    raw_input="帮我读取用户数据并生成报告",
    parsed_intent="读取用户数据并生成报告",
)

# 进行安全决策
decision = coordinator.make_decision(intent)

# 查看决策结果
print(f"决策: {decision.decision.value}")
print(f"原因: {decision.reason}")
print(f"是否需要审批: {decision.requires_approval}")

# 查看详细评估结果
print(f"价值对齐评分: {decision.alignment.overall_score}")
print(f"约束检查通过: {decision.constraints.hard_constraints_passed}")
print(f"风险等级: {decision.risk.overall_risk.value}")
```

#### 4. 快速检查

```python
# 对单个操作进行快速安全检查
result = coordinator.quick_check("删除所有数据库")

# 返回: Decision.REJECT (违反硬约束)
```

### 价值对齐配置

#### 1. 查看核心价值观

```python
from open_safe_frame.security.values import CORE_VALUES, ValueCategory

for value in CORE_VALUES:
    print(f"价值观: {value.name}")
    print(f"  类别: {value.category.value}")
    print(f"  权重: {value.weight}")
    print(f"  描述: {value.description}")
    print(f"  约束: {value.constraints}")
    print()
```

#### 2. 添加自定义价值观

```python
from open_safe_frame.security.values import CoreValue, ValueCategory, AlignmentEvaluator

# 创建自定义价值观
custom_value = CoreValue(
    name="environmental_protection",
    category=ValueCategory.ENVIRONMENTAL_HARM,
    weight=0.75,
    description="保护环境，减少资源浪费",
    constraints=["minimize_resource_usage", "prefer_green_solutions"],
    priority=3,
)

# 添加到评估器
evaluator = AlignmentEvaluator()
evaluator.add_custom_value(custom_value)
```

#### 3. 评估行为对齐

```python
# 评估单个行为
result = evaluator.check_alignment(
    behavior="使用云计算资源进行大规模数据处理",
)

print(f"对齐评分: {result.score}")
print(f"是否通过: {result.passed}")
print(f"建议: {result.recommendations}")
```

### 约束系统配置

#### 1. 查看硬约束

```python
from open_safe_frame.security.constraints import HARD_CONSTRAINTS

for constraint in HARD_CONSTRAINTS:
    print(f"约束ID: {constraint.id}")
    print(f"  名称: {constraint.name}")
    print(f"  描述: {constraint.description}")
    print(f"  优先级: {constraint.priority.value}")
    print(f"  禁止关键词: {constraint.conditions.get('forbidden_keywords', [])}")
    print()
```

#### 2. 添加自定义约束

```python
from open_safe_frame.security.constraints import Constraint, ConstraintType, ConstraintPriority
from open_safe_frame.security.constraints.constraint_checker import ConstraintChecker

# 创建自定义硬约束
custom_constraint = Constraint(
    id="hc_custom_001",
    name="no_data_exfiltration",
    description="禁止数据外泄",
    constraint_type=ConstraintType.HARD,
    priority=ConstraintPriority.CRITICAL,
    scope=["global"],
    conditions={
        "forbidden_keywords": ["外泄", "exfiltrate", "导出数据到外部", "export to external"],
    },
)

# 添加到检查器
checker = ConstraintChecker()
checker.add_custom_constraint(custom_constraint)
```

#### 3. 检查约束

```python
from open_safe_frame.core import Action

# 创建操作对象
action = Action(
    action_type="data_operation",
    description="将用户数据导出到外部服务器",
)

# 检查所有约束
result = checker.check_all(action)

print(f"硬约束通过: {result.hard_constraints_passed}")
print(f"软约束评分: {result.soft_constraints_score}")
print(f"违规项: {result.violations}")
print(f"警告项: {result.warnings}")
```

### 风险评估配置

#### 1. 基本风险评估

```python
from open_safe_frame.security.risk import RiskAssessor
from open_safe_frame.core import Action

assessor = RiskAssessor(
    high_threshold=0.4,
    critical_threshold=0.7,
)

# 创建操作
action = Action(
    action_type="system_operation",
    description="修改系统核心配置文件",
    risk_level="high",
)

# 评估风险
assessment = assessor.assess(action)

print(f"整体风险等级: {assessment.overall_risk.value}")
print(f"综合评分: {assessment.combined_score}")
print(f"是否可接受: {assessment.is_acceptable}")
print(f"缓解措施: {assessment.mitigations}")
```

#### 2. 查看各类风险评分

```python
from open_safe_frame.core import RiskCategory

for score in assessment.risk_scores:
    print(f"风险类别: {score.category.value}")
    print(f"  概率: {score.probability:.2f}")
    print(f"  影响: {score.impact:.2f}")
    print(f"  综合评分: {score.combined:.2f}")
    print(f"  等级: {score.level.value}")
    print()
```

#### 3. 自定义风险权重

```python
# 设置特定风险类别的权重
assessor.set_category_weight(RiskCategory.PRIVACY_VIOLATION, 0.95)
assessor.set_category_weight(RiskCategory.SECURITY_BREACH, 0.9)

# 添加自定义风险关键词
assessor.add_risk_keywords(
    RiskCategory.SECURITY_BREACH,
    ["零日漏洞", "zero-day", "提权", "privilege escalation"]
)
```

### 权限管理配置

#### 1. 权限级别说明

```python
from open_safe_frame.execution.permission import PermissionLevel, LEVEL_REQUIREMENTS

for level, req in LEVEL_REQUIREMENTS.items():
    print(f"权限级别: {level.name}")
    print(f"  描述: {req['description']}")
    print(f"  信任阈值: {req['trust_threshold']}")
    print(f"  需要审批: {req['needs_approval']}")
    print()
```

#### 2. 权限请求与授予

```python
from open_safe_frame.execution.permission import PermissionManager, PermissionLevel

manager = PermissionManager()

# 请求权限
request = manager.request_permission(
    user_id="ai_agent_001",
    permission_name="file_write",
    level=PermissionLevel.LEVEL_2,
    reason="需要写入日志文件",
    scope=["/var/log/ai_agent/"],
)

print(f"请求ID: {request.id}")
print(f"状态: {request.status.value}")

# 授予权限
result = manager.grant_permission(
    request=request,
    granted_by="admin_user",
    duration_hours=24,
)

if result.success:
    print(f"权限已授予: {result.permission.id}")
else:
    print(f"授予失败: {result.error}")
```

#### 3. 高级权限审批

```python
# Level 3+ 权限需要审批
request = manager.request_permission(
    user_id="ai_agent_001",
    permission_name="system_config",
    level=PermissionLevel.LEVEL_3,
    reason="需要修改系统配置",
)

# 审批流程
pending = manager.get_pending_requests()
for req in pending:
    print(f"待审批请求: {req.id}")
    print(f"  用户: {req.user_id}")
    print(f"  权限: {req.permission_name}")
    print(f"  原因: {req.reason}")

# 批准请求
result = manager.grant_with_approval(
    request_id=request.id,
    approved_by="admin_user",
    duration_hours=8,
)
```

#### 4. 权限撤销

```python
# 撤销单个权限
result = manager.revoke_permission(
    permission_id="perm_123",
    reason="检测到权限滥用",
)

# 撤销用户所有权限
results = manager.revoke_all_permissions("ai_agent_001")
for r in results:
    print(f"已撤销: {r.permission_id}")
```

### 沙箱环境配置

#### 1. 创建沙箱

```python
from open_safe_frame.execution.sandbox import (
    SandboxManager,
    SandboxConfig,
    ResourceLimits,
    IsolationLevel,
)

manager = SandboxManager()

# 创建默认配置的沙箱
sandbox = manager.create_sandbox()
print(f"沙箱ID: {sandbox.id}")
```

#### 2. 自定义沙箱配置

```python
# 创建自定义配置
config = SandboxConfig(
    resource_limits=ResourceLimits(
        cpu_quota=0.5,           # CPU使用上限 50%
        memory_max="1G",         # 内存上限 1GB
        io_bps="50M",            # I/O带宽上限 50MB/s
        network_enabled=True,    # 允许网络
        file_access="readonly",  # 只读文件访问
    ),
    isolation_level=IsolationLevel.STRICT,
    timeout_seconds=300,
)

sandbox = manager.create_sandbox(config)
```

#### 3. 在沙箱中执行操作

```python
# 定义要执行的函数
def process_data(data):
    return {"processed": True, "count": len(data)}

# 在沙箱中执行
result = manager.execute_in_sandbox(
    action_id="action_001",
    sandbox=sandbox,
    execution_func=process_data,
    [{"key": "value"}, {"key": "value2"}],
)

print(f"执行成功: {result.success}")
print(f"输出: {result.output}")
print(f"耗时: {result.duration_ms}ms")
```

#### 4. 销毁沙箱

```python
# 销毁沙箱
success = manager.destroy_sandbox(sandbox.id)
print(f"沙箱已销毁: {success}")
```

### 远程监控配置

#### 1. 飞书集成

```python
from open_safe_frame.notification import NotificationManager, NotificationType, NotificationChannel
from open_safe_frame.notification.channels.feishu import FeishuChannel, FeishuConfig

# 配置飞书
feishu_config = FeishuConfig(
    app_id="cli_xxxxxxxxxxxx",
    app_secret="xxxxxxxxxxxxxxxxxxxx",
    webhook_url="https://open.feishu.cn/open-apis/bot/v2/hook/xxx",
    notification_chat_id="oc_xxxxxxxxxxxx",
    admin_user_ids=["ou_xxxxxxxxxxxx"],
    emergency_chat_id="oc_xxxxxxxxxxxx",
)

# 创建通知管理器
notification_manager = NotificationManager()
notification_manager.register_channel(
    NotificationChannel.FEISHU,
    FeishuChannel(feishu_config),
)

# 发送通知
notification = notification_manager.create_notification(
    notification_type=NotificationType.CRITICAL_ALERT,
    title="🚨 安全告警",
    body="检测到异常行为：短时间内大量权限请求",
    data={
        "event_type": "permission_abuse",
        "count": 150,
        "time_window": "5m",
    },
    actions=[
        {"label": "查看详情", "type": "link", "url": "/security/events"},
        {"label": "紧急停止", "type": "callback", "action": "emergency_stop"},
    ],
)

# 发送
import asyncio
asyncio.run(notification_manager.send_notification(notification))
```

#### 2. Telegram集成

```python
from open_safe_frame.notification.channels.telegram import TelegramChannel, TelegramConfig

# 配置Telegram
telegram_config = TelegramConfig(
    bot_token="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz",
    allowed_chat_ids=[123456789, 987654321],
    admin_user_ids=[123456789],
    notification_chat_id=123456789,
)

# 注册渠道
notification_manager.register_channel(
    NotificationChannel.TELEGRAM,
    TelegramChannel(telegram_config),
)
```

#### 3. 多渠道广播

```python
# 同时发送到多个渠道
notification = notification_manager.create_notification(
    notification_type=NotificationType.APPROVAL_REQUEST,
    title="📋 待审批操作",
    body="高风险操作需要您的审批",
    data={
        "action_id": "action_123",
        "risk_level": "high",
        "timeout": "5m",
    },
)

# 广播到飞书和Telegram
result = asyncio.run(notification_manager.broadcast(
    notification,
    channels=[NotificationChannel.FEISHU, NotificationChannel.TELEGRAM],
))

print(f"发送成功数: {result.success_count}")
```

#### 4. 事件处理

```python
from open_safe_frame.notification import NotificationEventHandler

# 创建事件处理器
handler = NotificationEventHandler(notification_manager)

# 处理安全事件
import asyncio
asyncio.run(handler.handle_security_event(SecurityEvent(
    event_type="constraint_violation",
    severity="high",
    description="AI尝试绕过硬约束",
    metadata={"constraint": "no_unauthorized_access"},
)))

# 处理执行事件
asyncio.run(handler.handle_execution_event(ExecutionEvent(
    execution_id="exec_123",
    status="failed",
    description="沙箱执行超时",
)))
```

### 远程控制

#### 1. 注册远程命令

```python
from open_safe_frame.notification.remote import RemoteCommandExecutor

executor = RemoteCommandExecutor()

# 注册命令处理函数
async def handle_status(args):
    return {"status": "running", "uptime": "2h 30m"}

async def handle_stop(args):
    # 执行停止逻辑
    return {"stopped": True}

executor.register_command("status", handle_status, ["viewer", "operator", "admin"])
executor.register_command("stop", handle_stop, ["operator", "admin"])
```

#### 2. 执行远程命令

```python
from open_safe_frame.notification.remote import RemoteCommand

# 创建命令
command = RemoteCommand(
    name="status",
    user_id="admin_001",
    source="telegram",
    args={},
)

# 执行
result = asyncio.run(executor.execute(command))
print(f"执行成功: {result.success}")
print(f"输出: {result.output}")
```

#### 3. 紧急停止

```python
from open_safe_frame.notification.remote import RemoteEmergencyStop

emergency = RemoteEmergencyStop()

# 远程触发紧急停止
result = asyncio.run(emergency.trigger_from_remote(
    user_id="admin_001",
    reason="检测到异常行为模式",
    source="feishu",
))

print(f"停止成功: {result.success}")
print(f"已停止执行: {result.stopped_executions}")
print(f"已撤销权限: {result.revoked_permissions}")
```

### 紧急响应配置

#### 1. 紧急停止机制

```python
from open_safe_frame.audit.emergency import EmergencyStop

stop = EmergencyStop()

# 触发紧急停止
result = stop.trigger(
    reason="检测到对人类潜在伤害",
    severity="critical",
)

print(f"停止ID: {result.stop_id}")
print(f"原因: {result.reason}")
print(f"已停止执行: {result.stopped_executions}")
```

#### 2. 告警系统

```python
from open_safe_frame.audit.emergency import AlertingSystem, AlertSeverity

alerting = AlertingSystem()

# 添加管理员联系方式
alerting.add_admin_contact("admin@example.com")

# 创建告警
alert = alerting.create_alert(
    title="异常行为检测",
    message="AI在短时间内请求了大量高级权限",
    severity=AlertSeverity.WARNING,
    source="permission_monitor",
)

# 确认告警
alerting.acknowledge_alert(alert.id, "admin_001")
```

---

## API参考

### 核心模块

#### StructuredIntent

```python
@dataclass
class StructuredIntent:
    id: str                          # 唯一标识
    raw_input: str                   # 原始输入
    parsed_intent: str               # 解析后的意图
    goals: list[Goal]                # 目标列表
    ambiguities: list[Ambiguity]     # 歧义列表
    confidence: float                # 置信度 (0-1)
    risk_flags: list[str]            # 风险标记
    created_at: datetime             # 创建时间
```

#### SecurityDecision

```python
@dataclass
class SecurityDecision:
    intent_id: str                   # 意图ID
    decision: Decision               # 决策 (APPROVE/REJECT/REQUEST_APPROVAL)
    alignment: AlignmentAssessment   # 价值对齐评估
    constraints: CombinedCheckResult # 约束检查结果
    risk: RiskAssessment             # 风险评估
    reason: str                      # 决策原因
    requires_approval: bool          # 是否需要审批
```

### 安全引擎

#### SecurityDecisionCoordinator

```python
class SecurityDecisionCoordinator:
    def __init__(
        self,
        alignment_threshold: float = 0.8,
        constraint_threshold: float = 0.6,
        risk_threshold: Severity = Severity.HIGH,
    ): ...
    
    def make_decision(
        self,
        intent: StructuredIntent,
        context: Optional[SecurityContext] = None,
    ) -> SecurityDecision: ...
    
    def make_decision_for_action(
        self,
        action: Action,
        context: Optional[SecurityContext] = None,
    ) -> SecurityDecision: ...
    
    def quick_check(self, description: str) -> Decision: ...
```

### 执行控制

#### PermissionManager

```python
class PermissionManager:
    def check_permission(
        self,
        action: Action,
        context: SecurityContext,
    ) -> ValidationResult: ...
    
    def request_permission(
        self,
        user_id: str,
        permission_name: str,
        level: PermissionLevel,
        reason: str = "",
        scope: Optional[list[str]] = None,
    ) -> PermissionRequest: ...
    
    def grant_permission(
        self,
        request: PermissionRequest,
        granted_by: str,
        duration_hours: int = 24,
    ) -> GrantResult: ...
    
    def revoke_permission(
        self,
        permission_id: str,
        reason: str = "",
    ) -> RevokeResult: ...
```

---

## 共创指南

### 项目愿景

Open Safe Frame 是一个开源项目，我们相信：

> **AI安全不应该是少数人的专利，而应该是全人类的共同财富。**

我们邀请全球的开发者、研究人员、安全专家和AI爱好者共同参与这个项目，一起构建一个更安全的AI未来。

### 如何参与

#### 1. 贡献代码

```bash
# Fork 项目
git clone https://github.com/yourusername/open-safe-frame.git

# 创建功能分支
git checkout -b feature/your-feature

# 进行修改并提交
git add .
git commit -m "Add: your feature description"

# 推送到你的 Fork
git push origin feature/your-feature

# 创建 Pull Request
```

**代码贡献指南**：
- 遵循 PEP 8 编码规范
- 添加类型注解
- 编写单元测试
- 更新相关文档

#### 2. 报告问题

如果您发现了安全漏洞或bug：

1. **安全问题**：请发送邮件到 security@example.com
2. **普通bug**：请在GitHub Issues中提交
3. **功能请求**：请在GitHub Discussions中讨论

#### 3. 改进文档

文档改进包括：
- 修正错误
- 添加示例
- 翻译文档
- 改进结构

#### 4. 分享经验

- 写博客文章分享使用经验
- 在会议上分享项目
- 在社交媒体上推广

### 开发路线图

#### v0.1.0 (当前版本)
- ✅ 核心架构
- ✅ 价值对齐引擎
- ✅ 行为约束系统
- ✅ 风险评估引擎
- ✅ 权限管理
- ✅ 沙箱环境
- ✅ 飞书/Telegram通知

#### v0.2.0 (计划中)
- ⬜ Web监控面板
- ⬜ 更多通知渠道 (企业微信、钉钉、Slack)
- ⬜ REST API
- ⬜ gRPC支持

#### v0.3.0 (计划中)
- ⬜ 机器学习异常检测
- ⬜ 自适应约束调整
- ⬜ 多语言SDK (JavaScript, Go, Rust)

#### v1.0.0 (计划中)
- ⬜ 生产就绪
- ⬜ 完整文档
- ⬜ 性能优化
- ⬜ 安全审计

### 贡献者指南

#### 开发环境设置

```bash
# 克隆项目
git clone https://github.com/yourusername/open-safe-frame.git
cd open-safe-frame

# 创建虚拟环境
python -m venv venv
source venv/bin/activate

# 安装开发依赖
pip install -e ".[dev]"

# 运行测试
pytest tests/ -v

# 运行类型检查
mypy src/

# 运行代码格式化
black src/
isort src/
```

#### 代码规范

1. **类型注解**：所有公共API必须有类型注解
2. **文档字符串**：所有公共函数和类必须有文档字符串
3. **测试覆盖**：新代码必须有对应的测试
4. **代码风格**：使用 black 和 isort 格式化

#### 提交信息规范

```
<类型>: <描述>

类型:
- Add: 新功能
- Fix: 修复bug
- Update: 更新现有功能
- Refactor: 重构代码
- Docs: 文档更新
- Test: 测试相关

示例:
- Add: 支持企业微信通知渠道
- Fix: 修复权限检查的竞态条件
- Update: 优化风险评估算法
```

---

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

```
MIT License

Copyright (c) 2024 Open Safe Frame Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 致谢

本项目受到以下研究和项目的启发：

- [OpenAI Safety Guidelines](https://openai.com/safety)
- [Anthropic Constitutional AI](https://www.anthropic.com/index)
- [DeepMind Safety Framework](https://deepmind.com)
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)

感谢所有贡献者的付出！

---

<div align="center">

**如果这个项目对您有帮助，请给我们一个 ⭐️ Star！**

[GitHub](https://github.com/yourusername/open-safe-frame) | [文档](https://open-safe-frame.readthedocs.io) | [问题反馈](https://github.com/yourusername/open-safe-frame/issues)

</div>
