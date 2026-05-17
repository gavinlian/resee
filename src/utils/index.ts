/**
 * 工具函数
 */

/**
 * 深拷贝
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * 防抖
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return function (this: any, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

/**
 * 节流
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let last = 0
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now()
    if (now - last > delay) {
      last = now
      fn.apply(this, args)
    }
  }
}

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

/**
 * 格式化日期
 */
export function formatDate(date: string | Date, format: string = 'YYYY-MM-DD'): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return format.replace('YYYY', String(year)).replace('MM', month).replace('DD', day)
}

/**
 * 农历转公历（简化版）
 */
export function lunarToSolar(lunarYear: number, lunarMonth: number, lunarDay: number): string {
  // 简化处理：假设农历每月29或30天
  const lunarMonthDays = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29]
  let offset = 0
  for (let i = 0; i < lunarMonth - 1; i++) {
    offset += lunarMonthDays[i % 12]
  }
  offset += lunarDay - 1
  const springFestival = new Date(lunarYear, 1, 1).getTime()
  return formatDate(new Date(springFestival + offset * 24 * 60 * 60 * 1000))
}

/**
 * 判断是否为空
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * 截断文本
 */
export function truncate(text: string, maxLength: number = 20): string {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

/**
 * 获取辈分名
 */
export function getGenerationName(generation: number): string {
  // 简化辈分映射
  const names = ['祖', '宗', '敬', '世', '永', '昌', '明', '德', '维', '新']
  return names[generation % names.length] || String(generation)
}

/**
 * 关系类型映射
 */
export const RELATION_TYPES = {
  father_son: '父子',
  father_daughter: '父女',
  mother_son: '母子',
  mother_daughter: '母女',
  spouse: '配偶',
  brother: '兄弟',
  sister: '姐妹',
  adoptive: '过继',
  foster: '收养'
} as const

export type RelationType = keyof typeof RELATION_TYPES

/**
 * 置信度标签
 */
export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.85) return 'confirmed'
  if (confidence >= 0.5) return 'inferred'
  return 'disputed'
}