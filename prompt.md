# 项目AI提示词

## 初始化

```bash
Scaffold a monorepo using Bun workspaces. Use Bun as runtime and as a package manager. Create a "server" folder which will hold a lightweight Hono server. Create a "cli" folder which will hold a lightweight opentui welcome screen.

Use Hono, Bun and OpenTUI skills. not need to tests.
```
```bash
新功能：Each mode has access to, or exclusion from, certain tools located under @packages/ai/src/tools/ required for its purpose.
For now, implement only the BUILD and PLAN modes. Treat the PLAN mode as read-only, also referred to as a "SAFE" mode.
The active mode’s status should be displayed within @apps/cli/src/components/TextArea.tsx, directly underneath the textarea element.
Mode switching shall be triggered via the Tab hotkey (implemented as an OpenTUI skill).
Design the system to accommodate additional modes in the future. Therefore, the toggle logic inside @apps/cli/ must iterate through the full list of available modes, rather than only the two modes we currently implement.  use ai-sdk skill,use opentui skill.
```
