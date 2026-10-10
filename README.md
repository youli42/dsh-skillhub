<div align="center">

# 🧩 dsh-skillhub

*为 [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness) 打造的本地技能与 MCP 服务统一开关管理插件*

已包含编译产物；普通使用无需 pnpm、本地构建或 DSHX。

[![GitHub Release](https://img.shields.io/badge/release-v1.0.7-blue?style=flat-square)](https://github.com/aa2246740/dsh-skillhub/releases)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-0.2.0--rc.2-4F46E5?style=flat-square)](https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.2.0-rc.2)
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

支持 DeepSeek Harness **0.2.0-rc.2**。GitHub 和 npm 使用同一个包名 `@aa2246740/dsh-skillhub`，安装时不要设置 npm 别名。

**版本对照**（装错版本会被 DSH 在启动时整体拒绝，表现为「装了但完全没有入口」）：

| DSH 版本 | 可装的插件版本 |
|---|---|
| 0.2.0-rc.x | `1.0.4` 及以上（推荐最新） |
| 0.1.7-rc.x | `1.0.2`（1.0.4+ 不兼容） |
| 0.1.5 | `1.0.1` |

### DSH Studio 桌面 App（推荐）

打开 **设置 → 插件 → 添加插件**，在“包名或地址”中输入：

```text
@aa2246740/dsh-skillhub@1.0.7
```

也可安装相同版本的 GitHub 包：

```text
github:aa2246740/dsh-skillhub#v1.0.7
```

任选一种安装即可。桌面插件管理器会操作 Desktop profile；普通使用不需要 clone、构建或安装 DSHX。安装完成后点击 **「立即启用」**，或在插件列表打开该插件的启用开关。显示“已安装”但未启用时，设置里不会出现入口。启用后检查 `skill&mcp` 页面；若管理器明确提示需要重新打开应用，按提示完成。

### 从 1.0.4 或更早版本迁移

1. 在桌面 **设置 → 插件** 中移除旧的 `dsh-skillhub` 或旧版 `@aa2246740/dsh-skillhub` 安装项。
2. 用上面的包名安装 1.0.6，并点击「立即启用」。不要继续使用 `dsh-skillhub@npm:...` 别名，也不要保留两份安装。
3. 检查设置中的 `skill&mcp` 页面和对话输入框上方的「技能」按钮。

技能和 MCP 开关仍保存在 `$DSH_HOME/skillhub/`，迁移不需要删除该目录，也不需要删除原始技能文件。

### Web CLI

```bash
dsh plugin --profile web add @aa2246740/dsh-skillhub@1.0.7
```

旧版 Web 用户先用 `dsh plugin --profile web remove dsh-skillhub` 移除旧别名项；若旧项使用带作用域的包名，则移除 `@aa2246740/dsh-skillhub` 后再安装。以安装器返回的应用结果为准处理生效步骤。

Web 命令只作用于 `web` profile，不能给桌面 App 安装插件。

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
- MCP 页签会列出项目声明的服务：显示每个来源的完整命令行、启动条件不满足的原因（命令不存在、参数路径不存在等），并标出当前是哪个工程、哪些服务已经记录过信任；点「信任并启动」并勾选确认后，才以本对话作用域启动，之后照常开关。**启动失败会如实显示**：那一行会出现「启动失败」标签和具体原因（例如 `spawn npx ENOENT`），不会被伪装成"已启动、0 工具"；点「启动」即可重试，成功后提示自动消失。
- **信任会被记住**：确认过的命令按「工程目录 + 那条声明的内容」记录，之后**进入这个工程的会话时会自动启动**，不用再点一次；在会话里点「停止」后，本次会话不会自动把它拉起来。改过声明（`command`/`args`/`env`/`url`/`headers`）会要求重新确认。
- 支持快捷搜索技能、一键复制 `/<skill-name>` 命令。
- 切换无闪烁，调整后模型下一次回复立即按新配置生效。

> 项目技能与声明文件都相对**当前工作目录**读取，不向上级目录查找。可在插件配置里用 `projectSkillRoots` / `projectMcpFiles` 调整或清空；`autoStartTrustedMcp: false` 会保留信任记录但不再自动启动。

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

桌面端在 **设置 → 插件** 中升级或卸载。首次从旧包名迁移时，按上面的迁移步骤操作。

Web 用户使用：

```bash
# 更新
dsh plugin --profile web add @aa2246740/dsh-skillhub@1.0.7

# 卸载
dsh plugin --profile web remove @aa2246740/dsh-skillhub
```

---

## ❓ 常见问题

<details>
<summary><b>Q: 安装后刷新页面没有出现插件功能？</b></summary>

A: 先按上面的**版本对照**确认插件版本与 DSH 版本匹配——不匹配时 DSH 会在启动时整行拒绝该插件，界面上什么都看不到，重启也不会恢复。再确认安装到了当前使用的 Desktop 或 Web profile（第三方启动器的「整合包」默认装进独立 profile，需要切到那份 profile 运行），并且已点击「立即启用」或打开插件开关（部分启动器在插件报错后会自动关闭开关，升级 DSH 后需手动重新打开），再查看插件管理器的加载结果。npm 1.0.4 的包名与前端注册名不一致，即使用旧说明中的别名安装，DSH 也可能跳过前端入口。请按迁移步骤换成 1.0.6，直接使用 `@aa2246740/dsh-skillhub@1.0.7`。若仍缺少入口，请提供 DSH 版本、安装地址及管理器错误文字；反复刷新不会修复包名错误。
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

## 开发与发布检查

源码构建使用 DSHX 的外部插件构建器，`DSHX_HARNESS` 指向安装了 DSHX 的官方 `dsh-v0.2.0-rc.2` checkout。构建仅读取目标平台信息，输出保存在本插件目录。

```bash
pnpm install --frozen-lockfile --ignore-workspace --config.auto-install-peers=false
pnpm test
pnpm pack
```

`prepack` 校验包名、bundle 模块名和编译后的前端注册名；不一致时拒绝打包。发布时直接使用这个包，不要再改写包名。隔离加载回归运行方式见 `tests/package-loader-runtime.test.mjs`。

## 📄 License

MIT © [aa2246740](https://github.com/aa2246740)
