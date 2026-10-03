<div align="center">

# 🧩 dsh-skillhub

*为 [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness) 打造的本地技能与 MCP 服务统一开关管理插件*

已包含编译产物；普通使用无需 pnpm、本地构建或 DSHX。

[![GitHub Release](https://img.shields.io/badge/release-v1.0.4-blue?style=flat-square)](https://github.com/aa2246740/dsh-skillhub/releases)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-0.2.0--rc.1-4F46E5?style=flat-square)](https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.2.0-rc.2)
[![License](https://img.shields.io/badge/license-MIT-yellow?style=flat-square)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/aa2246740/dsh-skillhub?style=flat-square)](https://github.com/aa2246740/dsh-skillhub/stargazers)

[特性亮点](#-特性) • [一键安装](#-安装) • [使用指南](#-使用说明) • [传导机制](#-开关传导规则) • [常见问题](#-常见问题)

</div>

---

## 📖 简介

**dsh-skillhub** 是专为 DeepSeek Harness 设计的本地技能与 MCP 统一开关管理面板。

它能自动扫描并列出磁盘上已有的所有 Skills（`~/.agents/skills` 与 `$DSH_HOME/skills`），以及**当前工作目录**里各 Agent 约定的项目技能（`.agents/skills`、`.opencode/skills`、`.claude/skills`），再加上运行中的 MCP 工具服务与**项目里声明的 MCP**（`.mcp.json`、`.opencode/opencode.json`），提供 **全局 (Global) / 本项目 (Project) / 本对话 (Chat)** 三层独立开关控制与智能向下传导能力。

无需手动修改配置，安装后自动挂载，纯可见性控制，绝不修改或删除任何原始磁盘文件。项目里声明的 MCP 服务**不会自动启动**：面板展示完整命令行，只有你确认信任后才以本对话的作用域启动。

---

## ✨ 特性

- ⚡ **一键即用**：严格遵循 DSH 官方 Bundle 规范，一行命令自动挂载，无需繁琐接线。
- 🗂️ **本地技能即插即用**：自动读取 Agent 目录、DSH 目录与当前项目的 `.agents` / `.opencode` / `.claude` 技能，原生安全，不增删改磁盘文件。
- 🎯 **三层作用范围**：全局设置机器默认值、项目管理工程级偏好、单对话按需微调，互不干扰。
- 🔄 **智能向下传导**：全局操作同步覆盖所有层，项目操作同步所属对话，对话临时覆盖，新会话自动继承。
- 📁 **项目技能**：按当前工作目录识别项目内的技能目录（一层深，和 DSH 官方 provider 的发现规则一致）；`.opencode` / `.claude` 只由本插件供给给模型，面板会标注。
- 🔌 **MCP 服务联动支持**：独立的 MCP 页签，按服务动态隐藏/暴露工具，进程常驻；项目声明的服务会先列出命令行和问题，经你确认后才启动。
- 🎨 **原生细节融合**：切换作用范围时保留列表；开关保存后自动重新加载 `/` 技能补全，桌面端也无需刷新窗口。
- 🚀 **开箱即用**：`main` 分支已内置编译产物，用户端免装编译环境、免配置 `allowBuilds`。

---

## 📦 安装

### DSH Studio 桌面 App（推荐）

打开 **设置 → 插件 → 添加插件**，在“包名或地址”中输入：

```text
github:aa2246740/dsh-skillhub#v1.0.4
```

桌面端插件管理器负责 Desktop profile 和内置包管理器。本发布已包含编译产物；普通使用不需要 clone、构建或安装 DSHX。若应用提示刷新或重新打开，请按提示完成。

### Web CLI

```bash
dsh plugin --profile web add github:aa2246740/dsh-skillhub#v1.0.4
```

这条官方 CLI 命令只写入 `web` profile，不能修改 Desktop App 的 profile。对于已经运行的 Web Host，请重新打开该 Host 一次，再刷新网页；不要用这条命令给桌面 App 安装。

---

## 📖 使用说明

### 1. 全局管理（设置页）
打开 DSH **设置** → 找到 **`skill&mcp`** 页面：
- 浏览本机所有已安装的技能与 MCP 服务。
- 支持单个开关、文件夹/分组批量开关，以及右上角「全部开启 / 全部关闭」。
- 全局调整将作为所有项目与会话的默认生效值。
- 设置页只显示两个用户目录的技能；项目技能属于具体项目，在输入框面板里管理。

### 2. 项目与会话即时调控（输入框上方）
在对话输入框上方点击 **「技能」** 胶囊按钮：
- 弹出轻量快捷面板，自由切换 **「本对话」** 与 **「本项目」**。
- 技能页签会多出当前工作目录的项目技能分组：`.agents`（DSH 也会读）、`.opencode` / `.claude`（标注「仅 SkillHub」）。
- MCP 页签会列出项目声明的服务：显示每个来源的完整命令行、启动条件不满足的原因（命令不存在、参数路径不存在等）；点「信任并启动」并勾选确认后，才以本对话作用域启动，之后照常开关。
- 支持快捷搜索技能、一键复制 `/<skill-name>` 命令。
- 切换无闪烁，调整后模型下一次回复立即按新配置生效。

> 项目技能与声明文件都相对**当前工作目录**读取，不向上级目录查找。可在插件配置里用 `projectSkillRoots` / `projectMcpFiles` 调整或清空。

---

## ⚙️ 开关传导规则

| 操作层级 | 影响范围 | 说明 |
|---|---|---|
| **全局 (Global)** | 全局 + 所有项目 + 所有对话 | 统一设定基准，覆盖旧选项（重复设同值也同步） |
| **本项目 (Project)** | 当前项目 + 该项目下所有对话 | 仅作用于本项目，不影响其他项目及其会话 |
| **本对话 (Chat)** | 仅当前对话 | 临时调整，不影响其他会话 |
| **新建继承** | 自动向下继承 | 新建项目继承全局状态；新开会话继承所属项目状态 |

---

## 🔄 升级与卸载

### 更新至最新版本

```bash
dsh plugin --profile web add github:aa2246740/dsh-skillhub#v1.0.4
```

### 卸载插件

```bash
dsh plugin --profile web remove dsh-skillhub
```

---

## ❓ 常见问题

<details>
<summary><b>Q: 安装后刷新页面没有出现插件功能？</b></summary>

A: DSH 插件在服务启动时编排 Context 树。请在运行 DSH 的终端按 `Ctrl + C` 停止，然后重新运行 `dsh web` 启动即可。
</details>

<details>
<summary><b>Q: 为什么开启了某个 Skill，输入框输入 <code>/</code> 没有立刻补全？</b></summary>

A: SkillHub 保存开关后，会通过官方 Cordis 生命周期重新挂载技能补全插件，清掉其旧目录缓存。重新打开 `/` 即可看到新列表，不需要 Cmd+R、F5 或重启桌面端。也可点击技能面板右上角“更多操作 → 刷新 / 补全”手动重试。模型下一次请求使用新设置；已经读入历史的技能正文不会被删除。
</details>

<details>
<summary><b>Q: 关闭某个 Skill 后，为什么当前会话模型似乎还记得？</b></summary>

A: 关闭技能会立刻阻止后续向模型提供该技能的定义，但如果此前该技能的内容已经被读取进当前对话的上下文历史中，该轮会话中已读内容不会被篡改。新开一个会话即可彻底清空。
</details>

---

## 📄 License

MIT © [aa2246740](https://github.com/aa2246740)
