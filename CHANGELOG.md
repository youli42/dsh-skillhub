# Changelog

## Unreleased

### 新增

- **项目技能**：按当前工作目录读取 `.agents/skills`、`.opencode/skills`、`.claude/skills`（一层深，与官方 `dsh-skill-filesystem` 的发现规则一致），在输入框面板的「本项目 / 本对话」层开关；设置页不显示。候选 rank 90/91/92（Agent 作用域再 −2），低于官方项目根的 100/200，因此关闭一个项目技能时官方 provider 无法把它重新填回目录；Off 仍以「抢到名字 + invocation=false」表达，绝不删除文件。`.opencode` / `.claude` 只由本插件供给模型，面板标注「仅 SkillHub」。可在配置里用 `projectSkillRoots` 调整或清空。
- **项目声明的 MCP**：解析 `.mcp.json`（`mcpServers`）与 `.opencode/opencode.json`（`mcp`，`local` / `remote`），在 MCP 页签列出未运行的服务、每个来源的完整命令行，以及无法启动的具体原因（命令不在 PATH、参数路径不存在、名字不合法、`enabled: false` 等）。启动必须经面板「信任并启动」确认，批准记录按目录写入 `$DSH_HOME/skillhub/mcp-trust/<folderHash>.json` 并绑定声明内容的哈希——改过 `command`/`args`/`env`/`url`/`headers` 后需要重新确认。启动以**本对话作用域**挂载 `@deepseek-ai/dsh-mcp-client`（与 ACP 桥接同一做法），`cwd` 为会话目录，随 agent 释放；同一个名字在两个文件里都声明时合并为一行、分别显示各自命令行。SkillHub 自己挂载的服务被视为可完整隐藏，不受「scope-local 工具」限制。
- **信任后自动启动**：已经确认过的声明（同一目录 + 同一份声明内容）在**进入该工程的会话时由 SkillHub 自动启动**，不再需要每次手点。自动启动在后台发起：`agent/created` 是 serial 事件且会阻塞会话创建，所以它不阻塞、不抛错，失败只在日志里记一行、并在该行下面显示原因。`agent/created` 时若工作目录尚未就绪，会在该会话第一次进入运行状态或面板读取时补一次。用户在会话里点「停止」后，本次会话不会再自动拉起；改过声明则需要重新确认。可用配置 `autoStartTrustedMcp: false` 保留信任但不自动启动。
- 新增 ADR `docs/adr/0009-project-roots-and-declared-mcp.md`（部分取代 ADR 0001），并在 `CONTEXT.md` 补充 Project root / Project home / MCP declaration / Trust 词条。
- 新增测试：`tests/project-skills.test.mjs`（项目根、一层深、rank、赢家规则）、`tests/project-mcp.test.mjs`（声明解析、路径/命令诊断、信任哈希）、`tests/project-mcp-runtime.test.mjs`（declared 行合并、启动装配与作用域、managed 可隐藏）、`tests/registry-integration.test.mjs`（真实 `@deepseek-ai/dsh-skill` 注册表 + `createScope` 复现 Web 拓扑，验证 rank 88/90 压过官方 100/200/400/500 且 Off 不被回填）、`tests/plugin-entry.test.mjs`（走真实 `Config`/`apply`，验证路由、项目 home 载荷、declared MCP、以及 toggle 写盘后经 invalidate 让注册表把技能判为不可调用）、`tests/client-bundle.test.mjs`（按 Web 模块加载器加载 `lib/client.js`，对照宿主 primitives 的真实导出表，验证两个 slot 注册、i18n 字典、外壳渲染，以及新行用到的 class 确实存在于生成的样式表）、`tests/client-panel.test.mjs`（jsdom + 真实 effect 渲染输入框面板：项目根标签与「仅 SkillHub」标记、declared MCP 行与命令行/问题、无法启动的标记，以及「信任并启动」从勾选到发出 `/mcp/start` 请求体的完整交互）、`tests/mcp-mount.test.mjs`（用真实 `@deepseek-ai/dsh-mcp-client` 连接一个真实的 stdio MCP 子进程，验证经 `start()` 后工具真的注册为 `mcp__probe__ping`、`running/managed` 状态、可隐藏，以及 `stop()` 会注销工具并回收子进程；另外验证宿主自己会拒绝非法 `serverName`；以及"已批准的声明在 attach 时自动启动、未批准的不启动"）。

### 界面

- 项目声明但**尚未启动**的 MCP 服务，右侧开关显示为**关且不可点**：此前它按全局默认显示成「开」，可进程根本没起来，等于告诉用户这个服务是开的。启动之后开关恢复显示真实的可见性取值；「全部开启 / 全部关闭」也只作用于当前真实存在的服务，不会把状态写进一个还没跑起来的服务里。
- MCP 页签顶部标出**声明来源目录的目录名**（完整路径在悬停提示里），并且已经记录过信任的服务行会显示「信任已记录」标签。信任是**按目录记录、并且绑定到某一条声明内容**的：同名的服务在另一个工程里就是另一个目录、另一条命令行，需要各自确认；之前面板不显示这两件事，所以换工程时会误以为「信任没记住」。
- 输入框弹出面板在「只有一个 home 有技能」时不再收起 home 头部，前提是那一个是项目根：`.opencode` / `.claude` 的技能只由本插件供给模型，这个标签是用户唯一的提示。（只涉及 popover；设置页与纯用户目录的场景行为不变。）

### 修复

- **MCP 启动失败不再伪装成"已启动、0 工具"**：之前 `failOnStartupError: false`，服务连不上时插件照样激活，于是那行会显示成已启动却一个工具都没有，原因只在 Host 日志里。现在 SkillHub 自己挂载的服务一律 `failOnStartupError: true`——激活本身就等首连与工具发现，失败即拒绝，行上出现「启动失败」标签和具体原因（含 `cause` 链，如 `spawn npx ENOENT`），并且不会留下任何 fiber。顺带修掉一个更隐蔽的问题：被拒绝的激活仍会在 Cordis 注册表里留下一个 fiber（连同 config），旧代码据此把它算成"在跑"；现在 `liveMcpServers` 只认 `ACTIVE`（state=2）的 fiber。信任记录在失败后保留（信任是对命令的表态，不是对当下能否启动的表态），点「启动」即可重试，成功后失败提示自动消失。
- **CRLF 的 SKILL.md 会丢掉最后一个 frontmatter 字段**：截取 frontmatter 时切片停在闭合分隔符的 `\n` 上，于是保留了一个 `\r`，而字段行的 `(.*)$` 无法跨过 `\r`——Windows 上写的技能（最后一个字段常常正是 `description`）会被判成 `invalid-frontmatter`，整条技能不显示。现在按 `\r\n` / `\r` / `\n` 三种换行切行，字段值用可跨 `\r` 的模式并 `trim()`。这个 bug 同时影响用户目录里的技能，不只是项目技能；真机检查时 `D:\SSDWP\UE\Test_DreamShader\.agents\skills` 的 11 个技能全部命中过它。

### 兼容

- 新增 peer `@deepseek-ai/dsh-mcp-client`（范围同其它官方包 `>=0.2.0-rc.1 <0.2.1`），用于按项目声明挂载 MCP 服务。
- 新增开发依赖 `jsdom`（仅测试用，DOM 级客户端渲染测试；不影响发布产物与运行时）。

### 其它

- 技能开关保存后，通过公开的 Loader/Fiber 生命周期重新挂载官方技能补全客户端，清除其会话目录缓存；不刷新整个页面，不重启 Host，也不修改官方代码。
- 增加“刷新 / 补全”手动入口；通过 BroadcastChannel 通知其他窗口。刷新失败时区分已保存的开关与尚未更新的补全。
- 使用 RC2 的真实 Cordis、Loader、输入触发器和官方技能客户端构建产物，验证旧缓存复现、同会话启停、多会话隔离、重复通知合并及 SkillHub 自身热加载的监听清理。

## 1.0.4

### 兼容

- 开发依赖钉在官方 `@deepseek-ai/dsh-*@0.2.0-rc.1`（tag `dsh-v0.2.0-rc.1`，SHA `4878cdabd87d4041bdaff61d04c966883b9fd07a`）。`@deepseek-ai/dsh-*` peer 范围改为 `>=0.2.0-rc.1 <0.2.1`，与 DSHX 0.9.2 对 `@deepseek-ai/dsh` 的范围相同。该范围接受 `0.2.0-rc.1` 与稳定版 `0.2.0`，拒绝 `0.2.0` alpha，也拒绝 `0.1.7-rc.2`。
- 客户端内联白名单与平台模块表与该 tag 的 `packages/client/tsdown.client.ts` `INLINE_SAFE`、`packages/client/web/src/platform.ts` 一致；表达式相对 `dsh-v0.1.7-rc.2` 没有变化。
- Cordis 仍是 `4.0.4`，Schemastery 仍是 `3.18.4`。

## 1.0.3

### 兼容

- 开发依赖钉在官方 `@deepseek-ai/dsh-*@0.1.7-rc.2`（tag `dsh-v0.1.7-rc.2`，SHA `477b4f420553e8a52c2fbccc464d7561b239c443`）。peer 范围仍是 `>=0.1.7-rc.1 <0.1.8`：接受 `0.1.7-rc.2`，拒绝 `0.1.7` alpha。
- 客户端内联白名单与该 tag 的 `packages/client/tsdown.client.ts` `INLINE_SAFE` 对齐，补上 `@deepseek-ai/dsh-api-workspace-controller/default-workspace`。平台模块表没有变化。
- Skill 注册、设置页 `settings.section`、composer `conversation.input.left` 的 `sessionId` / `useSessions`，以及现用图标名在 rc.2 上保持可用。rc.2 的 Button 改为 forwardRef、Menu/Tooltip 增加可选 shortcut，现有调用不需要改参数。

## 1.0.2

### 兼容

- 官方 DeepSeek Harness 依赖范围改为 `>=0.1.7-rc.1 <0.1.8`（tag `dsh-v0.1.7-rc.1`）。npm 默认 semver 不会让 `^0.1.5-rc.3` 接受 `0.1.7-rc.1`。同一范围拒绝 `0.1.7-alpha`。
- 设置页不再调用已删除的 `settings.installSection`。`enabled` 是 profile 里的 volatile 字段，设置里改完立刻落盘，下次 Host 加载时生效。
- 客户端图标改用 rc.1 的字重命名（`IconSkillOutlineRegular` 等），尺寸仍由 `size` 指定。
- `settings.section` 与 composer 的 `sessionId` / `useSessions` 改由 `@deepseek-ai/dsh-client-ui-settings` 和 `@deepseek-ai/dsh-client-ui-session` 声明，并加入 `dsh.client.inject`。
- 开发依赖里的 Cordis 钉在 `4.0.4`，Schemastery 钉在 `3.18.4`，与 rc.1 宿主一致。

## 1.0.1

### 兼容

- 官方 DeepSeek Harness 依赖范围改为 `^0.1.5-rc.2`。npm 会接受 `0.1.5-rc.3`，不会接受 `^0.1.2-rc.1` 下的 `0.1.5-rc.3`。
- 开发依赖钉在 `@deepseek-ai/dsh-*@0.1.5-rc.3`（tag `dsh-v0.1.5-rc.3`）。不面向 `0.1.7-alpha`。

## 1.0.0

首个正式版。

### 功能

- 列出磁盘上已有的 Skills：`~/.agents/skills`（Agent 目录）与 `$DSH_HOME/skills`（DSH 目录）。
- 三层作用范围开关：全局 / 本项目 / 本对话；设置页管全局，composer 面板管项目与对话。
- 开关传导语义：
  - 全局操作同步该技能到所有项目和对话，覆盖旧值（重复设同值也同步）。
  - 项目操作只同步本项目内的对话，不影响其他项目。
  - 对话操作只改自己；之后相关的上层操作会再次传导。
  - 新建项目、对话继承上层当前状态。
- 不安装、不复制、不删除 skill 文件；关闭只是不进目录，文件保留。
- 插件自己注册的技能（含 Resume 斜杠命令）不受 SkillHub 管理。
- MCP 页签：按服务控制模型可见的 MCP 工具，与技能共用同一套传导规则。
- 界面只显示当前开关：无覆盖徽标、无恢复继承控件。
- 切换作用范围时保持列表渲染，无骨架屏闪烁。
- 开关提示 toast：开启时提示 `/` 自动补全需刷新页面；关闭时说明本会话已载入内容不受影响，新开对话彻底生效。
- 中英文文案；页面与弹层两种界面。

### 存储

- `$DSH_HOME/skillhub/`：`global.json`、`projects/<hash>.json`、`sessions/<id>.json`，MCP 另存 `mcp-*.json`；`propagation-clock.json` 分配持久递增操作顺序。
- 可见性文档兼容 version 2，增加可选 `defaultRevision`、`gateRevisions`；旧配置保持原值，下一次上层操作自然传导。

### 许可

MIT
