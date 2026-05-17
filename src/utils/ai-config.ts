/**
 * AI 配置（用户可切换模型）
 */

// 内置模型列表
export const AI_PROVIDERS = {
  qwen: {
    name: '通义千问',
    models: [
      { id: 'qwen-plus', name: 'Qwen Plus', description: '性价比高，适合日常使用' },
      { id: 'qwen-max', name: 'Qwen Max', description: '效果最好，速度稍慢' },
      { id: 'qwen-turbo', name: 'Qwen Turbo', description: '速度快，效果一般' }
    ],
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  },
  minimax: {
    name: 'MiniMax',
    models: [
      { id: 'MiniMax-M2.7', name: 'MiniMax-M2.7', description: '最新旗舰，204.8K上下文' },
      { id: 'MiniMax-M2.5', name: 'MiniMax-M2.5', description: '高性能，204.8K上下文' },
      { id: 'MiniMax-M2.7-highspeed', name: 'MiniMax-M2.7-highspeed', description: '极速响应，高性能' },
    ],
    baseUrl: 'https://api.minimax.chat/v1/text/chatcompletion_v2'
  },
  siliconflow: {
    name: '硅基流动',
    models: [
      { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5-72B', description: '免费额度，72B大模型' },
      { id: 'deepseek-ai/DeepSeek-V2.5', name: 'DeepSeek V2.5', description: '免费额度，效果好' },
      { id: 'THUDM/GLM-4-9B-Chat', name: 'GLM-4-9B', description: '国产开源，免费' }
    ],
    baseUrl: 'https://api.siliconflow.cn/v1'
  },
  openai: {
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '性价比高' },
      { id: 'gpt-4o', name: 'GPT-4o', description: '效果最好' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5', description: '免费额度' }
    ],
    baseUrl: 'https://api.openai.com/v1'
  }
} as const

export type AIProvider = keyof typeof AI_PROVIDERS
export type AIModel = string

export interface AIConfig {
  provider: AIProvider
  model: AIModel
  apiKey: string
}

// 获取默认配置
export function getDefaultConfig(): AIConfig {
  return {
    provider: 'qwen',
    model: 'qwen-plus',
    apiKey: ''
  }
}

// 保存配置
export function saveConfig(config: AIConfig) {
  uni.setStorageSync('ai_config', JSON.stringify(config))
}

// 加载配置
export function loadConfig(): AIConfig {
  const saved = uni.getStorageSync('ai_config')
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      return getDefaultConfig()
    }
  }
  return getDefaultConfig()
}

// 获取当前模型信息
export function getCurrentModelInfo(config: AIConfig) {
  const provider = AI_PROVIDERS[config.provider]
  if (!provider) return null
  const model = provider.models.find(m => m.id === config.model)
  return model ? { provider: config.provider, ...model } : null
}

// 默认启用的模型列表（首次安装时全部启用）
const DEFAULT_ENABLED_MODELS = [
  'qwen-plus', 'qwen-max', 'qwen-turbo',
  'MiniMax-M2.7', 'MiniMax-M2.5', 'MiniMax-M2.7-highspeed',
  'Qwen/Qwen2.5-72B-Instruct', 'deepseek-ai/DeepSeek-V2.5', 'THUDM/GLM-4-9B-Chat',
  'gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'
]

// 获取用户启用的模型列表
export function getEnabledModels(): string[] {
  const saved = uni.getStorageSync('enabled_models')
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      return DEFAULT_ENABLED_MODELS
    }
  }
  return DEFAULT_ENABLED_MODELS
}

// 保存用户启用的模型列表
export function saveEnabledModels(models: string[]) {
  uni.setStorageSync('enabled_models', JSON.stringify(models))
}

// 获取当前提供商下用户已启用的模型
export function getEnabledModelsForProvider(provider: AIProvider): AIModel[] {
  const enabled = getEnabledModels()
  const providerModels = AI_PROVIDERS[provider]?.models || []
  return providerModels.filter(m => enabled.includes(m.id)).map(m => m.id)
}