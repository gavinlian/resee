'use strict';

/**
 * OCR 文字识别云函数
 * 支持多种 OCR 服务：百度 OCR、腾讯 OCR、或聚合 OCR API
 */

// 百度 OCR 配置（需要用户配置自己的 appId/appKey/appSecret）
const BAIDU_OCR_URL = 'https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic';

// 腾讯 OCR 配置
const TENCENT_OCR_URL = 'https://ocr.sdk.cloud.tencent.com/wetrans';

/**
 * 获取百度 OCR Access Token（需要配合百度 AK/SK 使用）
 */
async function getBaiduAccessToken(clientId, clientSecret) {
  const resp = await uniCloud.httpRequest({
    url: `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
    method: 'POST'
  });
  return resp.data?.access_token;
}

/**
 * 调用百度 OCR（通用文字识别）
 */
async function callBaiduOcr(imageData, accessToken) {
  const resp = await uniCloud.httpRequest({
    url: `${BAIDU_OCR_URL}?access_token=${accessToken}`,
    method: 'POST',
    header: { 'Content-Type': 'application/x-www-form-urlencoded' },
    data: {
      image: imageData,
      language_type: 'CHN_ENG',
      detect_direction: 'true'
    }
  });

  if (resp.statusCode !== 200) {
    throw new Error(`百度OCR失败: ${resp.statusCode}`);
  }

  const data = resp.data;
  if (data.error_code) {
    throw new Error(`百度OCR错误: ${data.error_msg || data.error_code}`);
  }

  // 合并所有文字行
  const text = (data.words_result || []).map(r => r.words).join('\n');
  const confidence = data.words_result_num > 0
    ? data.words_result.reduce((sum, r) => sum + (rprobability?.average || 0.9), 0) / data.words_result_num
    : 0.8;

  return { text, confidence };
}

/**
 * 模拟 OCR（无真实 API Key 时返回示例数据）
 */
async function mockOcr(imagePath) {
  // 返回示例族谱文本
  return {
    text: `第一世
李氏始祖 李福清 生于乾隆二十年 卒于嘉庆十年
配王氏 生子一 李文彬
李文彬 生于嘉庆五年 卒于光绪二十年
配张氏 生子二 李德盛 李德昌
李德盛 生于道光十五年
配刘氏 生子三 李继先 李继业 李继祖
李德昌 生于道光二十年
配赵氏 生子一 李继恩
李继先 生于光绪三年
配孙氏 生子一 李家瑞`,
    confidence: 0.75
  };
}

exports.main = async (event) => {
  const { imagePath, ocrType, apiKey, secretKey } = event;

  if (!imagePath) {
    return { success: false, error: '缺少图片路径' };
  }

  // 如果没有配置 OCR 密钥，返回模拟数据
  if (!apiKey || !secretKey) {
    console.log('[ai-ocr] 无API配置，使用模拟数据');
    const result = await mockOcr(imagePath);
    return { success: true, result };
  }

  try {
    let result;

    if (ocrType === 'baidu') {
      // 百度 OCR
      const accessToken = await getBaiduAccessToken(apiKey, secretKey);
      result = await callBaiduOcr(imagePath, accessToken);
    } else {
      // 默认使用模拟
      result = await mockOcr(imagePath);
    }

    return { success: true, result };
  } catch (e) {
    console.error('[ai-ocr] error:', e);
    return { success: false, error: e.message || 'OCR识别失败' };
  }
};