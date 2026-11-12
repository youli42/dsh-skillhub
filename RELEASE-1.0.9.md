# dsh-skillhub 1.0.9（youli-main 分支）

## DeepSeek Harness 兼容

构建基线与 CI 一致：DSH `dsh-v0.2.1-rc.5`。`engines.dsh` 与全部 `@deepseek-ai/dsh-*` 依赖范围均为 `>=0.2.1-rc.1 <0.2.2`，接受 `0.2.1-rc.x` 与 `0.2.1`；0.2.0 及更早版本会被 DSH 拒绝加载。

## 发布状态

- 版本号 `1.0.9`，尚未发布到 npm；npm 最新为上游 `1.0.8`，不含本分支的项目技能与项目声明 MCP。
- 编译产物（`lib/`）随 `youli-main` 分支提交，可用官方插件安装器直接安装：
  - 桌面「设置 → 插件 → 添加插件」：`github:youli42/dsh-skillhub#youli-main`
  - Web CLI：`dsh plugin --profile web add github:youli42/dsh-skillhub#youli-main`

## 本分支新增

- 项目技能：读取 `.agents/skills`、`.opencode/skills`、`.claude/skills`（相对会话工作目录，一层深）。
- 项目声明的 MCP：读取 `.mcp.json` 与 `.opencode/opencode.json`，经信任确认后以本对话作用域启动。
- 信任记录与进入工程自动启动、停止、重新加载、按服务重试。

详见 `README.md` 与 `CHANGELOG.md`。
