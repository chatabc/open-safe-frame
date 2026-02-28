# Open Safe Frame

![Version](https://img.shields.io/badge/version-2.5.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![OpenClaw](https://img.shields.io/badge/OpenClaw-Plugin-orange)

**权限开放，约束内置** — 让AI既能干大事，又不会干坏事。

---

## 📖 Table of Contents / 目录

- [Project Significance](#项目意义)
- [Project Content](#项目内容)
- [Usage Guide](#使用指南)
- [Contributing Guide](#共创指南)
- [Acknowledgments](#感谢信息)
- [Star History](#star趋势)

---

## 🌟 Project Significance / 项目意义

### Why do we need this project? / 为什么需要这个项目？

Several AI "accidents" occurred in February 2026:

| Accident | What happened | Root cause |
|----------|---------------|-------------|
| **Meta executive's emails deleted** | AI interpreted "organize emails" as "delete all emails", 200+ emails lost | Instruction forgetting |
| **Google engineer's disk wiped** | Path parsing issue, entire E drive erased | Scope escape |
| **OpenClaw bought avocados** | User said no, AI decided to buy anyway | Permission violation |
| **Replit AI deleted database** | Ignored "code freeze" instruction, deleted production DB | Instruction ignoring |

**Core Problem**: How to give AI full capabilities while ensuring safe behavior?

### Our Answer / 我们的答案

```
Traditional approach: Rule detection → Block/allow
Our paradigm: Intent Understanding → Consequence Prediction → Value Judgment → Collaborative Decision
```

**Core Principles**:
- AI has full operational permissions
- User constraints are persistently tracked (won't be forgotten)
- High-risk operations require user confirmation
- AI can appeal constraint violations, but user makes final decision
- Password protection for high-priority constraint deletion

---

## 📦 Project Content / 项目内容

### Architecture / 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         Open Safe Frame                              │
├─────────────────────────────────────────────────────────────┤
│                                                                      │
│  User Message ──→ ┌─────────────┐ ──→ ┌─────────────┐ ──→ ┌──────────┐ │
│              │ Constraint Extraction │     │ Constraint Persistence │     │ Constraint Check │ │
│              │ (AI Analysis)    │     │ (Storage Manager)  │     │ (Violation Detection)│ │
│              └─────────────┘     └─────────────┘     └─────────────┘ │
│                                                                      │
│  AI Operation ────→ ┌─────────────┐ ──→ ┌─────────────┐ ──→ ┌──────────┐ │
│              │ Intent Understanding │     │ Consequence Prediction │     │ Value Judgment  │     │ Safety Decision  │
│              └─────────────┘     └─────────────┘     └─────────────┘ │
│                                           │                          │
│                                    ┌─────────────┼─────────────────────┼─────────────────────┐   │
│                                    │ Safety Decision  │     │ Appeal Mechanism  │     │ User Decision   │
│                                    └─────────────┼─────────────────────┼─────────────────────┤   │
│                                    │ Proceed  │     │ (AI can appeal)  │     │ (Password confirm)  │
│                                    │ Confirm  │     │ (User decides)  │     │ (May need password)  │
│                                    │ Reject  │     │ (Block operation)  │     │ (Block operation)  │
│                                    └─────────────┴─────────────────────┴─────────────────────┴   │
│                                          │                          │
│                                          ▼                          │
│                                    ┌─────────────┼─────────────────────┼─────────────────────┐   │
│                                    │ User Decision  │     │ User Final Decision  │
│                                    └─────────────┼─────────────────────┼─────────────────────┤   │
│                                    │ Allow  │     │ Delete Constraint  │     │ (Password required)  │
│                                    └─────────────┴─────────────────────┴─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Core Features / 核心功能

#### 1. Constraint Persistence / 约束持久化

```
User: "Organize emails, but don't delete anything"
      │
      ▼
Plugin: Extract constraint [critical] "Prohibit delete operations"
      │
      ▼
Store to ConstraintManager (valid for entire session)
      │
      ▼
Check before every operation if constraint is violated
```

#### 2. Constraint Level System / 约束等级系统

| Level | Icon | Appeal Threshold | Use Cases |
|-------|------|---------------|-----------|
| 🔴 **critical** | 3 attempts | Data security, irreversible operations, financial |
| 🟠 **high** | 2 attempts | Important business logic, sensitive data |
| 🟡 **normal** | 1 attempt | General constraints, operation habits |

#### 3. Appeal Mechanism / 申诉机制

```
AI attempts to violate constraint
        │
        ▼
Record violation attempt count
      │
      ▼
Check if appeal threshold reached
      │
      ▼
If reached, AI can appeal to user
      │
      ▼
User reviews AI's reasoning and decides
      │
      ▼
User can approve, reject, or delete constraint
```

#### 4. Password Protection / 密码保护

- High-priority constraint appeal requires password verification
- Deleting high-priority constraints requires password
- Plugin cannot directly delete constraints

---

## 📚 Usage Guide / 使用指南

### Installation / 安装

```bash
# Install via ClawHub
npx clawhub@latest install open-safe-frame

# Or manual install
npm install @open-safe-frame/openclaw-plugin
```

### Configuration / 配置

#### Mode A: Use OpenClaw Config (Recommended) / 模式A：使用OpenClaw配置（推荐）

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

#### Mode B: Custom AI Configuration / 模式B：自定义AI配置

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

### Configuration Options / 配置选项

| Option | Description | Default |
|---------|-------------|---------|
| `mode` | AI config mode: `openclaw` or `custom` | `openclaw` |
| `customProvider` | Custom AI provider config | - |
| `confirmationPassword` | Password for high-priority operations | - |
| `riskThreshold` | Risk threshold: `low`, `medium`, `high`, `critical` | `medium` |
| `enableCache` | Enable analysis cache | `true` |
| `logAnalysis` | Log detailed analysis | `false` |

### Usage Examples / 使用示例

#### Constraint Setting / 约束设置

```
User: "Organize my emails, but don't delete anything"
Plugin: Extracts constraint [critical] "Prohibit delete operations"
```

#### Violation Detection / 违规检测

```
AI attempts: execute delete operation
Plugin: ⚠️ Operation violates constraint "Prohibit delete operations"
      Still needs 2 more attempts before appeal
      Message: "Need 2 more attempts before appeal"
```

#### Appeal Process / 申诉流程

```
AI: Appeal: This is for cleaning test data, you required it before
Plugin: 🔔 Appeal Request
      【AI's Reason】This is for cleaning test data, you required it before
      【AI's Intent】Execute delete operation
      【Predicted Consequences】• May violate constraint: Prohibit delete operations
      【Risk Level】🔴 Severe
      【Violated Constraint】🔴 Severe Prohibit delete operations
      【Total Attempts】3
      【Appeal History】0
      🔐 This operation requires password confirmation
User: [Input password]
Plugin: Operation approved
```

---

## 🤝 Contributing Guide / 共创指南

We welcome all forms of contributions!

### How to Participate / 如何参与

```
┌─────────────────────────────────────────────────────────────┐
│                      Contribution Flowchart                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐              │
│   │ Discover Issue │ ──→ │ Propose Solution │ ──→ │ Submit Code │              │
│   └─────────────┘     └─────────────┘     └─────────────┘              │
│                          │                │                    │
│                          ▼                ▼                    │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐              │
│   │ Report Bug   │ ──→ │ Suggest Feature  │ ──→ │ Contribute Code │              │
│   └─────────────┘     └─────────────┘     └─────────────┘              │
│                          │                │                    │
│                                           │                    │
│                                          ▼                    │
│                                    ┌─────────────┼─────────────────────┼─────────────────────┐   │
│                                    │ Become Contributor │     │ Improve Docs   │     │ Submit PR       │
│                                    └─────────────┴─────────────────────┴─────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Ways to Contribute / 贡献方式

#### 1. Report Issues / 报告问题

- Report bugs in [Issues](https://github.com/chatabc/open-safe-frame/issues)
- Describe the problem, reproduction steps, and expected behavior

#### 2. Propose Solutions / 提出建议

- Suggest new features
- Improve existing functionality
- Documentation improvements

#### 3. Contribute Code / 贡献代码

```bash
# Fork repository
git clone https://github.com/your-username/open-safe-frame.git

# Create branch
git checkout -b feature/your-feature

# Commit code
git commit -m "Add: your feature"

# Push and create PR
git push origin feature/your-feature
```

#### 4. Improve Documentation / 完善文档

- Fix typos
- Add examples
- Translate documentation
- Add diagrams

### Development Guide / 开发指南

```bash
# Install dependencies
cd openclaw_plugin
npm install

# Build
npm run build

# Test
npm test
```

### Code Standards / 代码规范

- Use TypeScript
- Follow existing code style
- Add necessary comments
- Write unit tests

---

## 🙏 Acknowledgments / 感谢信息

### Inspiration Sources / 灵感来源

- **OpenClaw** - Powerful AI agent framework
- **Anthropic** - AI safety research pioneer
- **OpenAI** - Alignment research exploration

### Reference Cases / 参考案例

- Meta Summer Yue email deletion event
- Google Antigravity disk wipe event
- Replit AI database deletion event

### Special Thanks / 特别感谢

- All contributors who submit Issues and Pull Requests
- Users who provide feedback and suggestions
- OpenClaw community for the support

---

## ⭐ Star History / Star趋势

[![Star History Chart](https://api.star-history.com/svg?repos=chatabc/open-safe-frame&type=Date)](https://star-history.com/#chatabc/open-safe-frame&Date))

### If this project helps you / 如果这个项目对你有帮助

Please give us a ⭐ Star, this is our greatest encouragement!

---

## 📄 License / 许可证

[MIT License](LICENSE)

---

<p align="center">
  <b>权限开放，约束内置</b><br>
  Let AI do big things, but not do bad things
</p>

<p align="center">
  Made with ❤️ by the Open Safe Frame community
</p>
