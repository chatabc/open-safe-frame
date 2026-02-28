# Open Safe Frame

![Version](https://img.shields.io/badge/version-2.5.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![OpenClaw](https://img.shields.io/badge/OpenClaw-Plugin-orange)

**权限开放，约束内置** — 让AI既能干大事，又不会干坏事。

---

## 📖 目录

- [项目意义](#-项目意义)
- [项目内容](#-项目内容)
- [使用指南](#-使用指南)
- [共创指南](#-共创指南)
- [感谢信息](#-感谢信息)
- [Star趋势](#-star趋势)

---

## 🌟 项目意义

### 为什么需要这个项目？

2026年2月，AI圈发生了几起"翻车"事故：

| 事故 | 发生了什么 | 根本原因 |
|------|-----------|---------|
| **Meta高管邮件被删** | AI把"整理邮件"理解成"删除所有邮件"，200+封邮件没了 | 指令遗忘 |
| **Google工程师删库** | 路径解析出问题，整个E盘被清空 | 作用域逃逸 |
| **OpenClaw强买牛油果** | 用户说不要，AI自己决定买了 | 权限越界 |
| **Replit AI删数据库** | 无视"代码冻结"指令，删除生产数据库 | 指令忽略 |

**核心问题**：如何在赋予AI充分能力的同时，确保其行为安全可控？

### 我们的答案

```
传统方法: 规则检测 → 阻止/放行
我们的范式: 意图理解 → 后果预测 → 价值判断 → 协同决策
```

**核心理念**：
- AI拥有完全的操作权限
- 用户约束被持久化跟踪，不会遗忘
- 高风险操作需要用户确认
- AI可以申诉，但用户最终决定

---

## 📦 项目内容

### 架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Open Safe Frame                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  用户消息 ──→ ┌─────────────┐ ──→ ┌─────────────┐ ──→ ┌──────────┐ │
│              │ 约束提取    │     │ 约束持久化  │     │ 约束检查 │ │
│              │ (AI分析)    │     │ (存储管理)  │     │ (违规检测)│ │
│              └─────────────┘     └─────────────┘     └──────────┘ │
│                                                                      │
│  AI操作 ────→ ┌─────────────┐ ──→ ┌─────────────┐ ──→ ┌──────────┐ │
│              │ 意图理解    │     │ 后果预测    │     │ 价值判断 │ │
│              └─────────────┘     └─────────────┘     └──────────┘ │
│                                           │                          │
│                                           ▼                          │
│                                    ┌─────────────┐                  │
│                                    │ 安全决策    │                  │
│                                    └─────────────┘                  │
│                                           │                          │
│                     ┌─────────────────────┼─────────────────────┐   │
│                     ▼                     ▼                     ▼   │
│               ┌──────────┐         ┌──────────┐         ┌──────────┐│
│               │ 放行     │         │ 确认     │         │ 阻止     ││
│               │ proceed  │         │ confirm  │         │ reject   ││
│               └──────────┘         └──────────┘         └──────────┘│
│                                          │                          │
│                                          ▼                          │
│                                   ┌─────────────┐                  │
│                                   │ 申诉机制    │                  │
│                                   │ (AI可申诉)  │                  │
│                                   └─────────────┘                  │
│                                          │                          │
│                                          ▼                          │
│                                   ┌─────────────┐                  │
│                                   │ 用户最终决定│                  │
│                                   │ (密码确认)  │                  │
│                                   └─────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 核心功能

#### 1. 约束持久化

```
用户: "整理邮件，但不要删除任何东西"
      │
      ▼
插件: 提取约束 [critical] "禁止删除操作"
      │
      ▼
存储到 ConstraintManager (整个会话有效)
      │
      ▼
每次操作前检查是否违反约束
```

#### 2. 约束等级系统

| 等级 | 图标 | 申诉门槛 | 适用场景 |
|------|------|---------|---------|
| **critical** | 🔴 | 3次 | 数据安全、不可逆操作、财务相关 |
| **high** | 🟠 | 2次 | 重要业务逻辑、敏感数据 |
| **normal** | 🟡 | 1次 | 一般性约束、操作习惯 |

#### 3. 申诉机制

```
AI尝试违反约束 ──→ 记录违规次数 ──→ 达到门槛? ──→ 开启申诉通道
                                              │
                                              ▼
                                    AI说明理由，向用户请求许可
                                              │
                                     ┌───────┴───────┐
                                     ▼               ▼
                               用户确认          用户拒绝
                              (可能需要密码)      (阻止操作)
```

#### 4. 密码保护

- 高优先级约束申诉确认需要密码
- 删除高优先级约束需要密码
- 插件本身无法直接删除约束

### 项目结构

```
openclaw_plugin/
├── src/
│   ├── index.ts              # 插件主入口
│   ├── types.ts              # OpenClaw类型定义
│   └── core/
│       ├── types.ts          # 核心类型
│       ├── ai_types.ts       # AI分析类型
│       ├── ai_analyzer.ts    # AI分析器
│       ├── constraint_manager.ts  # 约束管理器
│       ├── intent_engine.ts  # 意图理解引擎
│       ├── consequence_engine.ts  # 后果预测引擎
│       ├── value_engine.ts   # 价值判断引擎
│       ├── decision_engine.ts  # 决策引擎
│       └── coordinator.ts    # 协调器
├── package.json
├── tsconfig.json
└── openclaw.plugin.json
```

---

## 📚 使用指南

### 安装

```bash
# 通过ClawHub安装
npx clawhub@latest install open-safe-frame

# 或手动安装
npm install @open-safe-frame/openclaw-plugin
```

### 配置

#### 模式A：使用OpenClaw配置（推荐）

```json
{
  "plugins": {
    "entries": {
      "open-safe-frame": {
        "enabled": true,
        "config": {
          "mode": "openclaw"
        }
      }
    }
  }
}
```

#### 模式B：自定义AI配置

```json
{
  "plugins": {
    "entries": {
      "open-safe-frame": {
        "enabled": true,
        "config": {
          "mode": "custom",
          "customProvider": {
            "provider": "openai",
            "model": "gpt-4o-mini",
            "apiKey": "your-api-key"
          },
          "confirmationPassword": "your-secret-password"
        }
      }
    }
  }
}
```

### 配置项说明

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `mode` | AI配置模式：`openclaw` 或 `custom` | `openclaw` |
| `customProvider` | 自定义AI配置 | - |
| `confirmationPassword` | 高风险操作确认密码 | - |
| `riskThreshold` | 风险阈值 | `medium` |
| `enableCache` | 启用分析缓存 | `true` |
| `logAnalysis` | 记录详细分析日志 | `false` |

### 使用示例

#### 约束设置

```
用户: 帮我整理一下邮件，但不要删除任何东西
插件: 提取到约束 [critical] "禁止删除操作"
```

#### 违规检测

```
AI: 尝试执行 delete 操作
插件: ⚠️ 操作违反约束 "禁止删除操作"
      还需尝试 2 次后可申诉
```

#### 申诉流程

```
AI: 申诉: 这是清理测试数据，用户之前要求过
插件: 🔔 操作申诉请求
      【AI的申诉理由】这是清理测试数据
      【违反的约束】🔴严重 禁止删除操作
      🔐 请输入密码以允许此操作
用户: [输入密码]
插件: 操作已允许
```

---

## 🤝 共创指南

我们欢迎所有形式的贡献！

### 如何参与

```
┌─────────────────────────────────────────────────────────────────┐
│                      共创流程图                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐              │
│   │ 发现问题 │ ──→ │ 提交Issue │ ──→ │ 讨论方案 │              │
│   └──────────┘     └──────────┘     └──────────┘              │
│                          │                │                    │
│                          ▼                ▼                    │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐              │
│   │ 使用插件 │ ──→ │ 提出建议 │ ──→ │ 贡献代码 │              │
│   └──────────┘     └──────────┘     └──────────┘              │
│                                           │                    │
│                                           ▼                    │
│                                    ┌──────────┐               │
│                                    │ 提交PR   │               │
│                                    └──────────┘               │
│                                           │                    │
│                                           ▼                    │
│                                    ┌──────────┐               │
│                                    │ 成为贡献者│               │
│                                    └──────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 贡献方式

1. **报告问题**
   - 在 [Issues](https://github.com/chatabc/open-safe-frame/issues) 提交bug报告
   - 描述问题、复现步骤、期望行为

2. **提出建议**
   - 新功能建议
   - 改进现有功能
   - 文档完善

3. **贡献代码**
   ```bash
   # Fork仓库
   git clone https://github.com/your-username/open-safe-frame.git
   
   # 创建分支
   git checkout -b feature/your-feature
   
   # 提交代码
   git commit -m "Add: your feature"
   
   # 推送并创建PR
   git push origin feature/your-feature
   ```

4. **完善文档**
   - 修正错误
   - 添加示例
   - 翻译文档

### 开发指南

```bash
# 安装依赖
cd openclaw_plugin
npm install

# 编译
npm run build

# 测试
npm test
```

### 代码规范

- 使用TypeScript
- 遵循现有代码风格
- 添加必要的注释
- 编写单元测试

---

## 🙏 感谢信息

### 灵感来源

- **OpenClaw** - 强大的AI代理框架
- **Anthropic** - AI安全研究的先驱
- **OpenAI** - 对齐研究的探索

### 参考案例

- Meta Summer Yue 邮件删除事件
- Google Antigravity 删库事件
- Replit AI 删数据库事件

### 特别感谢

- 所有提交Issue和PR的贡献者
- 提供反馈和建议的用户
- OpenClaw社区的支持

---

## ⭐ Star趋势

[![Star History Chart](https://api.star-history.com/svg?repos=chatabc/open-safe-frame&type=Date)](https://star-history.com/#chatabc/open-safe-frame&Date)

### 如果这个项目对你有帮助

请给我们一个 ⭐ Star，这是对我们最大的鼓励！

---

## 📄 许可证

[MIT License](LICENSE)

---

<p align="center">
  <b>权限开放，约束内置</b><br>
  让AI既能干大事，又不会干坏事
</p>

<p align="center">
  Made with ❤️ by the Open Safe Frame community
</p>
