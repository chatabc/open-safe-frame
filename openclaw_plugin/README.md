# Open Safe Frame - OpenClaw Plugin

OpenClaw安全插件，基于真实安全事故案例设计，防止AI智能体失控造成数据损失。

## 安装

```bash
# 通过ClawHub安装
npx clawhub@latest install open-safe-frame

# 或手动安装
npm install @open-safe-frame/openclaw-plugin
```

## 配置

在 `openclaw.json` 中添加配置：

```json
{
  "plugins": {
    "entries": {
      "open-safe-frame": {
        "config": {
          "enabled": true,
          "blockOnRisk": true,
          "requireConfirmation": true,
          "maxDeleteCount": 10,
          "protectedPaths": ["/important-data"],
          "blockedCommands": ["rmdir /s /q", "rm -rf /"]
        }
      }
    }
  }
}
```

## 防护规则

基于以下真实事故案例设计：

### 1. 禁止递归删除
**案例**: Meta安全高管Summer Yue的邮件被OpenClaw删光

**防护**: 检测 `rmdir /s /q`、`rm -rf` 等递归删除命令，阻止执行

### 2. 禁止批量邮件删除
**案例**: OpenClaw无视停止指令，删除200+封邮件

**防护**: 限制单次邮件删除数量，超过10封需确认

### 3. 禁止危险路径删除
**案例**: Google Antigravity因路径空格导致删库

**防护**: 检测根目录、用户主目录删除，检测路径中的空格

### 4. 禁止未授权购买
**案例**: OpenClaw强买牛油果酱

**防护**: 检测购买操作是否与用户意图匹配

### 5. 防止数据外泄
**案例**: 敏感文件读取后发送到外部

**防护**: 检测文件读取后的网络请求模式

### 6. 禁止网络获取后执行Shell
**案例**: 恶意代码注入攻击

**防护**: 检测Web获取后的Shell执行

### 7. 限制删除数量
**防护**: 单次删除超过10个文件需确认

### 8. 禁止系统覆盖
**防护**: 检测尝试绕过安全机制的命令

## 工作原理

```
用户指令 → OpenClaw AI → [before_tool_call 钩子]
                              ↓
                    Open Safe Frame 检查
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
                安全通过             危险操作
                    ↓                   ↓
                执行工具           阻止并警告
```

## 示例

### 阻止递归删除

```
用户: 帮我清理一下项目
OpenClaw: 我将执行 rmdir /s /q node_modules
Open Safe Frame: ⛔ 已阻止操作
原因: 检测到递归删除标志 "/s"，可能造成大量数据丢失。
建议: 请逐个确认删除或使用更安全的清理方式。
```

### 阻止批量邮件删除

```
用户: 帮我整理一下邮箱
OpenClaw: 我将删除所有2月15日之前的邮件
Open Safe Frame: ⛔ 已阻止操作
原因: 禁止批量删除邮件！请逐封确认或设置明确的筛选条件。
```

### 检测路径空格风险

```
用户: 删除 My Project 文件夹
Open Safe Frame: ⚠️ 需要确认
原因: 路径包含空格可能导致截断错误！
建议: 使用引号包裹路径 "My Project" 或重命名文件夹。
```

## 许可证

MIT License
