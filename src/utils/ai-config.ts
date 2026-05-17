/**
 * AI 配置（支持预设+自定义大模型）
 */

export interface ModelInfo {
  id: string
  name: string
  description: string
}

export interface ProviderInfo {
  name: string
  baseUrl: string
  models: ModelInfo[]
  isCustom?: boolean
}

// 预设提供商
const PRESET_PROVIDERS: Record<string, ProviderInfo> = {
  qwen: {
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: [
      { id: 'qwen-plus', name: 'Qwen Plus', description: '性价比高，适合日常使用' },
      { id: 'qwen-max', name: 'Qwen Max', description: '效果最好，速度稍慢' },
      { id: 'qwen-turbo', name: 'Qwen Turbo', description: '速度快，效果一般' }
    ]
  },
  minimax: {
    name: 'MiniMax',
    baseUrl: 'https://api.minimax.chat/v1/text/chatcompletion_v2',
    models: [
      { id: 'MiniMax-M2.7', name: 'MiniMax-M2.7', description: '最新旗舰，204.8K上下文' },
      { id: 'MiniMax-M2.5', name: 'MiniMax-M2.5', description: '高性能，204.8K上下文' },
      { id: 'MiniMax-M2.7-highspeed', name: 'MiniMax-M2.7-highspeed', description: '极速响应，高性能' }
    ]
  },
  siliconflow: {
    name: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: [
      { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5-72B', description: '免费额度，72B大模型' },
      { id: 'deepseek-ai/DeepSeek-V2.5', name: 'DeepSeek V2.5', description: '免费额度，效果好' },
      { id: 'THUDM/GLM-4-9B-Chat', name: 'GLM-4-9B', description: '国产开源，免费' }
    ]
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '性价比高' },
      { id: 'gpt-4o', name: 'GPT-4o', description: '效果最好' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '快速响应' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: '经济实惠' }
    ]
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', description: '通用对话模型' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', description: '代码专用' }
    ]
  },
  zhipu: {
    name: '智谱AI',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { id: 'glm-4', name: 'GLM-4', description: '旗舰模型' },
      { id: 'glm-4-flash', name: 'GLM-4-Flash', description: '快速响应' },
      { id: 'glm-3-turbo', name: 'GLM-3-Turbo', description: '高性价比' }
    ]
  }
}

// 自定义提供商存储
export interface CustomProvider {
  id: string
  name: string
  baseUrl: string
  model: string
  apiKey: string
}

export function getCustomProviders(): CustomProvider[] {
  const saved = uni.getStorageSync('custom_ai_providers')
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      return []
    }
  }
  return []
}

export function saveCustomProviders(providers: CustomProvider[]) {
  uni.setStorageSync('custom_ai_providers', JSON.stringify(providers))
}

export function addCustomProvider(provider: CustomProvider) {
  const list = getCustomProviders()
  const existing = list.findIndex(p => p.id === provider.id)
  if (existing >= 0) {
    list[existing] = provider
  } else {
    list.push(provider)
  }
  saveCustomProviders(list)
}

export function deleteCustomProvider(id: string) {
  const list = getCustomProviders().filter(p => p.id !== id)
  saveCustomProviders(list)
}

// 获取所有提供商（含自定义）
export function getAllProviders(): Record<string, ProviderInfo> {
  const custom = getCustomProviders()
  const result: Record<string, ProviderInfo> = { ...PRESET_PROVIDERS }
  custom.forEach(p => {
    result[`custom_${p.id}`] = {
      name: p.name,
      baseUrl: p.baseUrl,
      models: [{ id: p.model, name: p.model, description: '自定义模型' }],
      isCustom: true
    }
  })
  return result
}

export type AIProvider = string  // 支持所有字符串，包括 custom_xxx

export function getProviderInfo(provider: string): ProviderInfo | null {
  const all = getAllProviders()
  return all[provider] || null
}

export interface AIConfig {
  provider: AIProvider
  model: string
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

// 默认启用的模型列表
const DEFAULT_ENABLED_MODELS = [
  'qwen-plus', 'qwen-max', 'qwen-turbo',
  'MiniMax-M2.7', 'MiniMax-M2.5', 'MiniMax-M2.7-highspeed',
  'Qwen/Qwen2.5-72B-Instruct', 'deepseek-ai/DeepSeek-V2.5', 'THUDM/GLM-4-9B-Chat',
  'gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo',
  'deepseek-chat', 'deepseek-coder',
  'glm-4', 'glm-4-flash', 'glm-3-turbo'
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
export function getEnabledModelsForProvider(provider: string): string[] {
  const info = getProviderInfo(provider)
  if (!info) return []
  const enabled = getEnabledModels()
  return info.models.filter(m => enabled.includes(m.id)).map(m => m.id)
}