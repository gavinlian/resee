/**
 * Unicloud 初始化占位
 * 实际使用时替换为真实的 unicloud 配置
 */
let _uniCloud: any = null

async function getCloud() {
  if (!_uniCloud) {
    // #ifdef MP-WEIXIN
    _uniCloud = uniCloud
    // #endif
    // #ifdef H5
    // H5 端使用云对象或 URL 服务
    _uniCloud = {
      callFunction: async (name: string, data: any) => {
        // 模拟调用
        console.log('[Cloud] callFunction:', name, data)
        return { success: true, result: {} }
      }
    }
    // #endif
  }
  return _uniCloud
}

export default {
  init() {
    return getCloud()
  }
}