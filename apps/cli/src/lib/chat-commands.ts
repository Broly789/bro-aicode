export type ChatCommand = Readonly<{
  name: string
  description: string
}>

const commandDefs: ChatCommand[] = [
  { name: '/fix', description: 'Fix the issue in the current code' },
  { name: '/explain', description: 'Explain how the current implementation works' },
  { name: '/review', description: 'Review the current changes for bugs and regressions' },
  { name: '/test', description: 'Write tests for the current code' },
  { name: '/build', description: 'Build the project' },
  { name: '/typecheck', description: 'Run type checking' },
  { name: '/refactor', description: 'Refactor the current code' },
  { name: '/debug', description: 'Debug the current issue' },
  { name: '/deploy', description: 'Deploy the application' },
  { name: '/audit', description: 'Audit the codebase for issues' },
  { name: '/help', description: 'Show available commands' },
  { name: '/lint', description: 'Run linter on the codebase' },
  { name: '/format', description: 'Format the code' },
  { name: '/clean', description: 'Clean build artifacts' },
  { name: '/deps', description: 'Check dependency health' },
  { name: '/security', description: 'Run security audit' },
  { name: '/perf', description: 'Analyze performance' },
  { name: '/docs', description: 'Generate documentation' },
  { name: '/migrate', description: 'Run database migrations' },
  { name: '/seed', description: 'Seed the database' },
  { name: '/reset', description: 'Reset the application state' },
  { name: '/status', description: 'Check application status' },
  { name: '/logs', description: 'View application logs' },
  { name: '/monitor', description: 'Monitor application metrics' },
  { name: '/backup', description: 'Backup the database' },
  { name: '/restore', description: 'Restore from backup' },
  { name: '/update', description: 'Update dependencies' },
  { name: '/upgrade', description: 'Upgrade to latest version' },
  { name: '/rollback', description: 'Rollback to previous version' },
  { name: '/cache', description: 'Clear application cache' },
  { name: '/flush', description: 'Flush all caches' },
  { name: '/sync', description: 'Sync data with remote' },
  { name: '/pull', description: 'Pull latest changes' },
  { name: '/push', description: 'Push changes to remote' },
  { name: '/merge', description: 'Merge branches' },
  { name: '/rebase', description: 'Rebase current branch' },
  { name: '/cherry-pick', description: 'Cherry-pick a commit' },
  { name: '/stash', description: 'Stash current changes' },
  { name: '/pop', description: 'Pop stashed changes' },
  { name: '/diff', description: 'Show current diff' },
  { name: '/log', description: 'Show commit history' },
  { name: '/blame', description: 'Show line-by-line blame' },
  { name: '/hotspot', description: 'Find code hotspots' },
  { name: '/coverage', description: 'Check test coverage' },
  { name: '/benchmark', description: 'Run benchmarks' },
  { name: '/profile', description: 'Profile application performance' },
  { name: '/analyze', description: 'Analyze code complexity' },
  { name: '/suggest', description: 'Get improvement suggestions' },
  { name: '/optimize', description: 'Optimize the code' },
  { name: '/simplify', description: 'Simplify the code' },
  { name: '/modernize', description: 'Modernize the codebase' },
  { name: '/sessions', description: 'Open sessions dialog' },
  { name: '/thinking', description: 'Toggle reasoning mode (chain-of-thought)' },
]

export type ChatCommandName =
  | '/fix' | '/explain' | '/review' | '/test' | '/build' | '/typecheck'
  | '/refactor' | '/debug' | '/deploy' | '/audit' | '/help' | '/lint'
  | '/format' | '/clean' | '/deps' | '/security' | '/perf' | '/docs'
  | '/init' | '/migrate' | '/seed' | '/reset' | '/status' | '/logs'
  | '/monitor' | '/backup' | '/restore' | '/update' | '/upgrade' | '/rollback'
  | '/cache' | '/flush' | '/sync' | '/pull' | '/push' | '/merge' | '/rebase'
  | '/cherry-pick' | '/stash' | '/pop' | '/diff' | '/log' | '/blame'
  | '/hotspot' | '/coverage' | '/benchmark' | '/profile' | '/analyze'
  | '/suggest' | '/optimize' | '/simplify' | '/modernize' | '/sessions' | '/thinking'

export const CHAT_COMMANDS = commandDefs