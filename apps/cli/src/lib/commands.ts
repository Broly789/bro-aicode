import type { NavigateFunction } from 'react-router';
import type { CliRenderer } from '@opentui/core';
import type { ChatCommand, ChatCommandName } from './chat-commands';
import type { ToastFunction } from '../components/toast';
import { client } from './client';
import { CHAT_COMMANDS } from './chat-commands';

// ====================== 基础通用类型 ======================
type CommandAction = (
  navigate: NavigateFunction,
  renderer: CliRenderer,
) => Promise<string | undefined> | string | undefined;

interface CommandItem {
  readonly description: string;
  readonly action: CommandAction;
}

// 系统内置指令：只可手动输入执行，不会出现在下拉弹窗列表
type SystemCommandName = '/new' | '/exit' | '/agents' | '/connect' | '/editor' | '/mcps' | '/models' | '/move' | '/sessions';
const systemCommandMap: Readonly<Record<SystemCommandName, CommandItem>> = {
  '/new': {
    description: 'Start a new session',
    action: async (navigate) => {
      const { getCurrentModel } = await import('../lib/models')
      const serverUrl = process.env.SERVER_URL ?? 'http://localhost:3000'
      const res = await fetch(`${serverUrl}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: getCurrentModel() }),
      })
      const { id } = (await res.json()) as { id: string };
      navigate(`/session/${id}`);
      return undefined;
    },
  },
  '/exit': {
    description: 'Exit the app',
    action: (_navigate, renderer) => {
      renderer.destroy();
      return undefined;
    },
  },
  '/agents': {
    description: 'Switch agent',
    action: (navigate) => {
      navigate('/settings');
      return undefined;
    },
  },
  '/connect': {
    description: 'Connect provider',
    action: (navigate) => {
      navigate('/settings');
      return undefined;
    },
  },
  '/editor': {
    description: 'Open editor',
    action: () => undefined,
  },
  '/mcps': {
    description: 'Toggle MCPs',
    action: () => undefined,
  },
  '/models': {
    description: 'Switch model',
    action: () => undefined,
  },
  '/move': {
    description: 'Move the session to another project directory',
    action: () => undefined,
  },
  '/sessions': {
    description: 'Open sessions dialog',
    action: () => undefined,
  },
};

// 弹窗展示命令：从chat-commands自动生成，仅用于下拉建议
const popupCommandMap = CHAT_COMMANDS.reduce<Record<ChatCommandName, CommandItem>>((map, cmd) => {
  map[cmd.name] = {
    description: cmd.description,
    action: () => undefined,
  };
  return map;
}, {} as Record<ChatCommandName, CommandItem>);

// 全局总命令表：合并系统内置 + 弹窗命令，类型自动合并
type AllCommandName = SystemCommandName | ChatCommandName;
export const ALL_COMMANDS: Readonly<Record<AllCommandName, CommandItem>> = {
  ...systemCommandMap,
  ...popupCommandMap,
} as const;

// 专门暴露给 Popover 组件渲染、过滤搜索，**只含弹窗列表，不含系统隐藏指令**
export const POPOVER_COMMAND_LIST: readonly ChatCommand[] = CHAT_COMMANDS;

// 命令执行返回类型
export type CommandResult = string | boolean;

export type CommandActions = {
  openDialog?: (title?: string) => void
  /** Sonner-style toast API — call `actions.toast?.('done')` from a command handler. */
  toast?: ToastFunction
};

/**
 * 统一命令入口处理
 * @param value 输入框原始文本
 * @param navigate 路由跳转
 * @param renderer OpenTUI 渲染实例
 * @param actions 额外动作（如打开弹窗）
 * @returns false非命令 / string回填文本 / true执行完毕
 */
export async function handleCommand(
  value: string,
  navigate: NavigateFunction,
  renderer: CliRenderer,
  actions?: CommandActions,
): Promise<CommandResult> {
  if (!value.startsWith('/')) return false;

  const inputCmd = value.trim() as AllCommandName;
  if (!(inputCmd in ALL_COMMANDS)) return false;

  const targetCommand = ALL_COMMANDS[inputCmd];

  if (inputCmd === '/sessions') {
    actions?.openDialog?.('Sessions')
    return true
  }

  if (inputCmd === '/models') {
    actions?.openDialog?.('Models')
    return true
  }

  // Toast demo commands — exercise every variant of the toast API
  if (inputCmd in TOAST_COMMANDS) {
    TOAST_COMMANDS[inputCmd as keyof typeof TOAST_COMMANDS](actions?.toast)
    return true
  }

  const executeRes = await targetCommand.action(navigate, renderer);
  return executeRes ?? true;
}

// ── Toast demo commands ────────────────────────────────────────────
// Each maps a slash command to a call on the Sonner-style `toast` API.
type ToastAction = (toast?: ToastFunction) => void

const TOAST_COMMANDS: Record<string, ToastAction> = {
  '/toast': (toast) => toast?.('This is a default toast', { title: 'Notification' }),
  '/success': (toast) => toast?.success('Operation succeeded', { title: 'Success', description: 'Variant: success' }),
  '/error': (toast) => toast?.error('Something went wrong', { title: 'Error', description: 'Variant: error' }),
  '/info': (toast) => toast?.info('Here is some information', { title: 'Info', description: 'Variant: info' }),
  '/warning': (toast) => toast?.warning('Proceed with caution', { title: 'Warning', description: 'Variant: warning' }),
  '/loading': (toast) => {
    const id = toast?.loading('Loading…', { title: 'Please wait' })
    if (id) setTimeout(() => toast?.dismiss(id), 2500)
  },
  '/promise': (toast) =>
    toast?.promise(
      new Promise<string>((resolve) => setTimeout(() => resolve('ok'), 1500)),
      {
        loading: 'Saving changes…',
        success: (data) => `Saved! (${data})`,
        error: 'Failed to save',
      },
    ),
}
