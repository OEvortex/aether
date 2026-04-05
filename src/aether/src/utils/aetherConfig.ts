import type { SdkMode } from '../../../../src/types/sharedTypes.ts'

export interface ModelConfig {
  id: string
  name: string
  provider: string
  maxInputTokens: number
  maxOutputTokens: number
  pricing?: {
    input: number
    output: number
  }
  capabilities?: {
    toolCalling?: boolean
    imageInput?: boolean
    vision?: boolean
  }
}

export interface ProviderConfig {
  id: string
  displayName: string
  description: string
  baseUrl: string
  sdkMode?: SdkMode
  supportsApiKey?: boolean
  apiKeyTemplate?: string
  customHeader?: Record<string, string>
  defaultModel?: string
  models?: ModelConfig[]
}

export const DEFAULT_PROVIDERS: Record<string, ProviderConfig> = {
  mistral: {
    id: 'mistral',
    displayName: 'Mistral',
    description: 'Mistral AI - French AI company',
    baseUrl: 'https://api.mistral.ai/v1',
    sdkMode: 'openai',
    supportsApiKey: true,
    apiKeyTemplate: 'pKk...',
    defaultModel: 'mistral-large-latest',
  },
  openai: {
    id: 'openai',
    displayName: 'OpenAI',
    description: 'OpenAI API',
    baseUrl: 'https://api.openai.com/v1',
    sdkMode: 'openai',
    supportsApiKey: true,
    apiKeyTemplate: 'sk-...',
    defaultModel: 'gpt-4o',
  },
  huggingface: {
    id: 'huggingface',
    displayName: 'Hugging Face',
    description: 'Hugging Face Inference API',
    baseUrl: 'https://router.huggingface.co/v1',
    sdkMode: 'openai',
    supportsApiKey: true,
    apiKeyTemplate: 'hf_...',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct',
  },
  groq: {
    id: 'groq',
    displayName: 'Groq',
    description: 'Groq - Fast AI inference',
    baseUrl: 'https://api.groq.com/openai/v1',
    sdkMode: 'openai',
    supportsApiKey: true,
    apiKeyTemplate: 'gsk_...',
    defaultModel: 'llama-3.3-70b-versatile',
  },
  ollama: {
    id: 'ollama',
    displayName: 'Ollama',
    description: 'Local Ollama server',
    baseUrl: 'http://127.0.0.1:11434/v1',
    sdkMode: 'openai',
    supportsApiKey: false,
    defaultModel: 'llama3.1:8b',
  },
  llamacpp: {
    id: 'llamacpp',
    displayName: 'LLM.cpp',
    description: 'Local llama.cpp server',
    baseUrl: 'http://127.0.0.1:8080/v1',
    sdkMode: 'openai',
    supportsApiKey: false,
    defaultModel: 'llama-3.1-8b',
  },
  cerebras: {
    id: 'cerebras',
    displayName: 'Cerebras',
    description: 'Cerebras - Fast neural networks',
    baseUrl: 'https://api.cerebras.ai/v1',
    sdkMode: 'openai',
    supportsApiKey: true,
    apiKeyTemplate: 'cbr_...',
    defaultModel: 'llama-3.3-70b',
  },
  qwencode: {
    id: 'qwencode',
    displayName: 'Qwen CLI',
    description: 'Alibaba Qwen via DashScope',
    baseUrl: 'auto',
    sdkMode: 'openai',
    supportsApiKey: true,
    apiKeyTemplate: 'sk-...',
    defaultModel: 'qwen-turbo',
  },
  openrouter: {
    id: 'openrouter',
    displayName: 'OpenRouter',
    description: 'Aggregated AI routing',
    baseUrl: 'https://openrouter.ai/api/v1',
    sdkMode: 'openai',
    supportsApiKey: true,
    apiKeyTemplate: 'sk-or-...',
    defaultModel: 'anthropic/claude-3.5-sonnet',
  },
  geminicli: {
    id: 'geminicli',
    displayName: 'Gemini CLI',
    description: 'Google Gemini via CLI',
    baseUrl: 'auto',
    sdkMode: 'gemini',
    supportsApiKey: true,
    apiKeyTemplate: 'AIza...',
    defaultModel: 'gemini-2.0-flash',
  },
  opencode: {
    id: 'opencode',
    displayName: 'OpenCode',
    description: 'OpenCode AI',
    baseUrl: 'https://opencode.ai/zen/v1',
    sdkMode: 'openai',
    supportsApiKey: true,
    apiKeyTemplate: 'sk-...',
    defaultModel: 'deepseek/deepseek-chat',
  },
  kilocode: {
    id: 'kilocode',
    displayName: 'Kilo Code',
    description: 'Kilo Code API',
    baseUrl: 'https://api.kilo.ai/api/openrouter',
    sdkMode: 'openai',
    supportsApiKey: true,
    apiKeyTemplate: 'sk-...',
    defaultModel: 'qwen/qwen2.5-coder-7b-instruct',
  },
  antigravity: {
    id: 'antigravity',
    displayName: 'Antigravity',
    description: 'Antigravity AI',
    baseUrl: 'auto',
    sdkMode: 'anthropic',
    supportsApiKey: true,
    apiKeyTemplate: 'sk-ant-...',
    defaultModel: 'antigravity/deep-hermes-3',
  },
  chutes: {
    id: 'chutes',
    displayName: 'Chutes AI',
    description: 'Chutes AI Inference',
    baseUrl: 'https://llm.chutes.ai/v1',
    sdkMode: 'openai',
    supportsApiKey: true,
    apiKeyTemplate: 'ck-...',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct',
  },
}

export const DEFAULT_MODELS: ModelConfig[] = [
  // OpenAI models
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', maxInputTokens: 128000, maxOutputTokens: 16384, pricing: { input: 2.5, output: 10 } },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', maxInputTokens: 128000, maxOutputTokens: 16384, pricing: { input: 0.075, output: 0.3 } },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', maxInputTokens: 128000, maxOutputTokens: 4096, pricing: { input: 10, output: 30 } },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', maxInputTokens: 16385, maxOutputTokens: 4096, pricing: { input: 0.5, output: 1.5 } },

  // Anthropic models
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic', maxInputTokens: 200000, maxOutputTokens: 8192, capabilities: { toolCalling: true, vision: true } },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic', maxInputTokens: 200000, maxOutputTokens: 4096, capabilities: { toolCalling: true, vision: true } },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic', maxInputTokens: 200000, maxOutputTokens: 4096, capabilities: { toolCalling: true, vision: true } },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'anthropic', maxInputTokens: 200000, maxOutputTokens: 4096, capabilities: { toolCalling: true, vision: true } },

  // Mistral models
  { id: 'mistral-large-latest', name: 'Mistral Large', provider: 'mistral', maxInputTokens: 131072, maxOutputTokens: 4096, capabilities: { toolCalling: true } },
  { id: 'mistral-small-latest', name: 'Mistral Small', provider: 'mistral', maxInputTokens: 131072, maxOutputTokens: 4096 },

  // Groq models
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'groq', maxInputTokens: 32768, maxOutputTokens: 4096 },
  { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', provider: 'groq', maxInputTokens: 32768, maxOutputTokens: 4096 },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'groq', maxInputTokens: 32768, maxOutputTokens: 4096 },

  // Hugging Face models
  { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B', provider: 'huggingface', maxInputTokens: 8192, maxOutputTokens: 4096 },
  { id: 'meta-llama/Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B', provider: 'huggingface', maxInputTokens: 8192, maxOutputTokens: 4096 },
  { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', name: 'Qwen 2.5 Coder 32B', provider: 'huggingface', maxInputTokens: 32768, maxOutputTokens: 8192 },

  // OpenRouter models
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'openrouter', maxInputTokens: 200000, maxOutputTokens: 8192 },
  { id: 'google/gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', provider: 'openrouter', maxInputTokens: 1000000, maxOutputTokens: 8192 },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', provider: 'openrouter', maxInputTokens: 64000, maxOutputTokens: 8192 },

  // Cerebras models
  { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', provider: 'cerebras', maxInputTokens: 8192, maxOutputTokens: 4096 },

  // Qwen models
  { id: 'qwen-turbo', name: 'Qwen Turbo', provider: 'qwencode', maxInputTokens: 100000, maxOutputTokens: 4096 },
  { id: 'qwen-plus', name: 'Qwen Plus', provider: 'qwencode', maxInputTokens: 100000, maxOutputTokens: 4096 },
  { id: 'qwen-max', name: 'Qwen Max', provider: 'qwencode', maxInputTokens: 32000, maxOutputTokens: 4096 },

  // Gemini models
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'geminicli', maxInputTokens: 1000000, maxOutputTokens: 8192 },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'geminicli', maxInputTokens: 200000, maxOutputTokens: 8192 },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'geminicli', maxInputTokens: 1000000, maxOutputTokens: 8192 },

  // OpenCode models
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', provider: 'opencode', maxInputTokens: 64000, maxOutputTokens: 4096 },

  // Chutes AI models
  { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B', provider: 'chutes', maxInputTokens: 8192, maxOutputTokens: 4096 },

  // Antigravity models (auto-switches to XML tool format)
  { id: 'antigravity/deep-hermes-3', name: 'Deep Hermes 3', provider: 'antigravity', maxInputTokens: 128000, maxOutputTokens: 4096 },
]

export function getProviderById(id: string): ProviderConfig | undefined {
  return DEFAULT_PROVIDERS[id]
}

export function getAllProviders(): ProviderConfig[] {
  return Object.values(DEFAULT_PROVIDERS)
}

export function getModelById(id: string): ModelConfig | undefined {
  return DEFAULT_MODELS.find(m => m.id === id)
}

export function getModelsByProvider(providerId: string): ModelConfig[] {
  return DEFAULT_MODELS.filter(m => m.provider === providerId)
}

export function getAllModels(): ModelConfig[] {
  return DEFAULT_MODELS
}

export function getProviderForModel(modelId: string): ProviderConfig | undefined {
  const model = getModelById(modelId)
  if (!model) return undefined
  return getProviderById(model.provider)
}

export function getDefaultModelForProvider(providerId: string): ModelConfig | undefined {
  const provider = getProviderById(providerId)
  if (!provider) return undefined

  if (provider.defaultModel) {
    return getModelById(provider.defaultModel)
  }

  const models = getModelsByProvider(providerId)
  return models[0]
}