import { type LanguageModel, type JSONValue } from 'ai'
import { createDeepSeek, deepseek } from '@ai-sdk/deepseek'
import { createOpenAI } from '@ai-sdk/openai'
import { createAlibaba } from '@ai-sdk/alibaba'
import { createAnthropic } from '@ai-sdk/anthropic'

export type ProviderId = 'deepseek' | 'qwen' | 'openai' | 'anthropic'

export interface ModelConfig {
  /** Unique registry id, e.g. 'deepseek-v4-flash' */
  id: string
  /** Human-readable display name */
  label: string
  provider: ProviderId
  /** Model id passed to the AI SDK provider factory */
  modelId: string
  /** Env var that holds the provider API key (BROCODE_ prefix to avoid shell leakage) */
  apiKeyEnv: string
  /** Default base URL (fallback when baseUrlEnv is unset) */
  baseURL?: string
  /** Env var holding an override base URL */
  baseUrlEnv?: string
  /** Whether this model supports extended reasoning / thinking mode */
  supportsThinking?: boolean
  /** providerOptions block applied when thinking mode is enabled */
  thinkingOptions?: Record<string, Record<string, JSONValue>>
}

export interface ResolvedModel {
  config: ModelConfig
  model: LanguageModel
  thinkingProviderOptions: Record<string, Record<string, JSONValue>> | undefined
}

export const DEFAULT_MODEL_ID = 'deepseek-v4-flash'

const DEEPSEEK_THINKING: Record<string, Record<string, JSONValue>> = {
  deepseek: { thinking: { type: 'enabled' } },
}

const OPENAI_THINKING: Record<string, Record<string, JSONValue>> = {
  openai: { reasoningEffort: 'medium' },
}

const ANTHROPIC_THINKING: Record<string, Record<string, JSONValue>> = {
  anthropic: { thinking: { type: 'enabled', budgetTokens: 1024 } },
}

export const MODELS: ModelConfig[] = [
  // DeepSeek
  {
    id: 'deepseek-v4-flash',
    label: 'DeepSeek V4 Flash',
    provider: 'deepseek',
    modelId: 'deepseek-v4-flash',
    apiKeyEnv: 'BROCODE_DEEPSEEK_API_KEY',
    supportsThinking: true,
    baseUrlEnv: "BROCODE_DEEPSEEK_BASE_URL",
    thinkingOptions: DEEPSEEK_THINKING,
  },
  {
    id: 'deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    provider: 'deepseek',
    modelId: 'deepseek-v4-pro',
    apiKeyEnv: 'BROCODE_DEEPSEEK_API_KEY',
    baseUrlEnv: "BROCODE_DEEPSEEK_BASE_URL",
    supportsThinking: true,
    thinkingOptions: DEEPSEEK_THINKING,
  },

  // Alibaba Qwen (dedicated @ai-sdk/alibaba provider)
  {
    id: 'qwen3.5-flash',
    label: 'Qwen 3.5 Flash',
    provider: 'qwen',
    modelId: 'qwen3.5-flash',
    apiKeyEnv: 'BROCODE_ALIBABA_API_KEY',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    baseUrlEnv: 'BROCODE_QWEN_BASE_URL',
  },
  {
    id: 'qwen-plus',
    label: 'Qwen Plus',
    provider: 'qwen',
    modelId: 'qwen-plus',
    apiKeyEnv: 'BROCODE_ALIBABA_API_KEY',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    baseUrlEnv: 'BROCODE_QWEN_BASE_URL',
  },
  {
    id: 'qwen-coder-plus',
    label: 'Qwen Coder Plus',
    provider: 'qwen',
    modelId: 'qwen-coder-plus',
    apiKeyEnv: 'BROCODE_ALIBABA_API_KEY',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    baseUrlEnv: 'BROCODE_QWEN_BASE_URL',
    supportsThinking: true,
  },

  // OpenAI
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'openai',
    modelId: 'gpt-4o',
    apiKeyEnv: 'BROCODE_OPENAI_API_KEY',
  },
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o mini',
    provider: 'openai',
    modelId: 'gpt-4o-mini',
    apiKeyEnv: 'BROCODE_OPENAI_API_KEY',
  },
  {
    id: 'gpt-4.1',
    label: 'GPT-4.1',
    provider: 'openai',
    modelId: 'gpt-4.1',
    apiKeyEnv: 'BROCODE_OPENAI_API_KEY',
  },
  {
    id: 'o3',
    label: 'OpenAI o3',
    provider: 'openai',
    modelId: 'o3',
    apiKeyEnv: 'BROCODE_OPENAI_API_KEY',
    supportsThinking: true,
    thinkingOptions: OPENAI_THINKING,
  },
  {
    id: 'o4-mini',
    label: 'OpenAI o4-mini',
    provider: 'openai',
    modelId: 'o4-mini',
    apiKeyEnv: 'BROCODE_OPENAI_API_KEY',
    supportsThinking: true,
    thinkingOptions: OPENAI_THINKING,
  },

  // Anthropic Claude
  {
    id: 'claude-opus-4',
    label: 'Claude Opus 4',
    provider: 'anthropic',
    modelId: 'claude-opus-4',
    apiKeyEnv: 'BROCODE_ANTHROPIC_API_KEY',
    supportsThinking: true,
    thinkingOptions: ANTHROPIC_THINKING,
  },
  {
    id: 'claude-sonnet-4',
    label: 'Claude Sonnet 4',
    provider: 'anthropic',
    modelId: 'claude-sonnet-4',
    apiKeyEnv: 'BROCODE_ANTHROPIC_API_KEY',
    supportsThinking: true,
    thinkingOptions: ANTHROPIC_THINKING,
  },
  {
    id: 'claude-3-5-sonnet',
    label: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    modelId: 'claude-3-5-sonnet-latest',
    apiKeyEnv: 'BROCODE_ANTHROPIC_API_KEY',
  },
]

export function getModelConfig(id?: string | null): ModelConfig {
  const target = id && id.length > 0 ? id : DEFAULT_MODEL_ID
  const found = MODELS.find((m) => m.id === target)
  if (!found) {
    return MODELS.find((m) => m.id === DEFAULT_MODEL_ID)!
  }
  return found
}

export function getAvailableModels(): readonly ModelConfig[] {
  return MODELS
}

/**
 * Resolve the base URL for a provider.
 * - If baseUrlEnv is set and present in env, use that.
 * - For anthropic/openai, default to official endpoints to prevent inheriting
 *   shell-level ANTHROPIC_BASE_URL / OPENAI_BASE_URL (which may point to a relay).
 * - For deepseek/qwen, use config.baseURL (undefined = SDK default; no shell leakage).
 */
function resolveBaseURL(config: ModelConfig): string | undefined {
  if (config.baseUrlEnv) {
    const envUrl = process.env[config.baseUrlEnv]
    if (envUrl) return envUrl
  }
  switch (config.provider) {
    case 'anthropic':
      return 'https://api.anthropic.com'
    case 'openai':
      return 'https://api.openai.com/v1'
    default:
      return config.baseURL
  }
}

// ── Cache: avoids re-reading env + re-instantiating providers on every request ──
const modelCache = new Map<string, ResolvedModel>()

export function resolveModel(id?: string | null): ResolvedModel {
  const config = getModelConfig(id)
  const cached = modelCache.get(config.id)

  if (cached)  return cached

  const apiKey = process.env[config.apiKeyEnv]
  const baseURL = resolveBaseURL(config)


  let model: LanguageModel
  switch (config.provider) {
    case 'deepseek':
      // model = deepseek(config.modelId)
      model = createDeepSeek({
        apiKey,
        baseURL,
      })(config.modelId)
      break
    case 'openai':
      model = createOpenAI({ apiKey })(config.modelId)
      break
    case 'qwen':
      model = createAlibaba({ apiKey, baseURL })(config.modelId)
      break
    case 'anthropic':
      model = createAnthropic({ apiKey, baseURL })(config.modelId)
      break
  }

  const resolved: ResolvedModel = {
    config,
    model,
    thinkingProviderOptions: config.supportsThinking ? config.thinkingOptions : undefined,
  }
  modelCache.set(config.id, resolved)
  return resolved
}
