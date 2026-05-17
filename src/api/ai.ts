/**
 * AI 服务封装
 * 支持切换通义千问 / 硅基流动 / OpenAI 等
 */
import { getAIConfig } from './ai-config'

// AI 调用限制配置
const AI_LIMITS = {
  free: {
    ocr_per_day: 5,
    search_per_day: 20,
    parse_per_day: 10
  },
  member: {
    ocr_per_day: 50,
    search_per_day: 200,
    parse_per_day: 100
  },
  vip: {
    ocr_per_day: -1, // 不限
    search_per_day: -1,
    parse_per_day: -1
  }
} as const

// 用户当日调用计数（本地存储，实际应走云端）
function getDailyCount(type: 'ocr' | 'search' | 'parse'): number {
  const key = `ai_count_${type}_${formatDate(new Date())}`
  const count = uni.getStorageSync(key)
  return count ? parseInt(count) : 0
}

function incrementDailyCount(type: 'ocr' | 'search' | 'parse') {
  const key = `ai_count_${type}_${formatDate(new Date())}`
  const count = getDailyCount(type)
  uni.setStorageSync(key, String(count + 1))
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// 获取用户等级
function getUserLevel(): 'free' | 'member' | 'vip' {
  const level = uni.getStorageSync('user_level') || 'free'
  return level as 'free' | 'member' | 'vip'
}

// 检查是否超过限制
function canUse(type: 'ocr' | 'search' | 'parse'): boolean {
  const level = getUserLevel()
  const limits = AI_LIMITS[level]
  const limit = limits[type]
  if (limit === -1) return true
  return getDailyCount(type) < limit
}

// 获取剩余次数
function getRemaining(type: 'ocr' | 'search' | 'parse'): number {
  const level = getUserLevel()
  const limits = AI_LIMITS[level]
  const limit = limits[type]
  if (limit === -1) return -1
  return Math.max(0, limit - getDailyCount(type))
}

// OCR 文字识别
export async function ocrImage(imagePath: string): Promise<{ text: string; confidence: number }> {
  if (!canUse('ocr')) {
    throw new Error(`今日OCR次数已用完，请明天再试或升级会员`)
  }

  const config = await getAIConfig()
  const token = uni.getStorageSync('ai_token') || ''

  try {
    // 调用 Unicloud OCR 或聚合 API
    // 这里用云函数模拟，实际替换为真实OCR
    const res = await uniCloud.callFunction({
      name: 'ai-ocr',
      data: { imagePath, config, token }
    })

    incrementDailyCount('ocr')

    if (res.success && res.result) {
      return {
        text: res.result.text || '',
        confidence: res.result.confidence || 0.8
      }
    }
    throw new Error('OCR识别失败')
  } catch (e: any) {
    throw new Error(e.message || 'OCR识别失败')
  }
}

// AI 解析 OCR 文本为族谱数据
export async function parseOcrText(rawText: string, familyContext?: string): Promise<{
  persons: Array<Record<string, any>>
  relations: Array<{ from: string; to: string; type: string; confidence: number }>
}> {
  if (!canUse('parse')) {
    throw new Error(`今日解析次数已用完，请明天再试或升级会员`)
  }

  const config = await getAIConfig()

  try {
    const res = await uniCloud.callFunction({
      name: 'ai-parse',
      data: {
        text: rawText,
        context: familyContext || '',
        model: config.model,
        apiKey: config.apiKey
      }
    })

    incrementDailyCount('parse')

    if (res.success && res.result) {
      return res.result
    }
    throw new Error('AI解析失败')
  } catch (e: any) {
    throw new Error(e.message || 'AI解析失败')
  }
}

// AI 搜索
export async function aiSearch(query: string, familyId: string): Promise<{
  results: Array<{ person: any; score: number; match_type: string }>
  answer: string
}> {
  if (!canUse('search')) {
    throw new Error(`今日搜索次数已用完，请明天再试或升级会员`)
  }

  const config = await getAIConfig()

  try {
    const res = await uniCloud.callFunction({
      name: 'ai-search',
      data: {
        query,
        familyId,
        model: config.model,
        apiKey: config.apiKey
      }
    })

    incrementDailyCount('search')

    if (res.success && res.result) {
      return res.result
    }
    throw new Error('搜索失败')
  } catch (e: any) {
    throw new Error(e.message || '搜索失败')
  }
}

// 获取AI配置
export async function getAIConfig(): Promise<{
  provider: 'qwen' | 'minimax' | 'siliconflow' | 'openai'
  model: string
  apiKey: string
}> {
  const defaultConfig = {
    provider: 'qwen' as const,
    model: 'qwen-plus',
    apiKey: ''
  }

  const saved = uni.getStorageSync('ai_config')
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      return defaultConfig
    }
  }
  return defaultConfig
}

// 保存AI配置
export function saveAIConfig(config: {
  provider: 'qwen' | 'minimax' | 'siliconflow' | 'openai'
  model: string
  apiKey: string
}) {
  uni.setStorageSync('ai_config', JSON.stringify(config))
}

// 获取限制信息
export function getAILimits() {
  const level = getUserLevel()
  const limits = AI_LIMITS[level]
  return {
    level,
    limits: {
      ocr: getRemaining('ocr'),
      search: getRemaining('search'),
      parse: getRemaining('parse')
    },
    raw: limits
  }
}