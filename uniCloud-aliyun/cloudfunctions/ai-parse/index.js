'use strict';

/**
 * 通用 AI 对话调用
 */
async function callAI(config) {
  const { provider, model, apiKey, baseUrl } = config;

  const systemPrompt = `你是族谱专家，擅长从古文/家谱文本中提取家族成员信息。
请分析以下OCR文本，提取人物信息和关系。

输出JSON格式（严格JSON，无其他内容）：
{
  "persons": [
    {
      "name": "姓名",
      "gender": "male" | "female" | "unknown",
      "birth_year": "年份或null",
      "death_year": "年份或null",
      "generation": 代数(数字),
      "courtesy_name": "字(可选)",
      "art_name": "号(可选)",
      "birthplace": "出生地(可选)",
      "bio": "简介(可选)",
      "confidence": 0到1之间的小数
    }
  ],
  "relations": [
    {
      "from": "姓名A",
      "to": "姓名B",
      "type": "父子"|"母子"|"配偶"|"兄弟"|"翁婿"|"其他",
      "confidence": 0到1之间的小数
    }
  ]
}`;

  const { text, context } = config.payload;

  const apiUrl = (baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1') + '/chat/completions';

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  const body = {
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `背景信息：${context || '无'}\n\nOCR文本：\n${text}` }
    ]
  };

  try {
    const resp = await uniCloud.httpRequest({
      url: apiUrl,
      method: 'POST',
      header: headers,
      data: body,
      dataType: 'json'
    });

    if (resp.statusCode !== 200) {
      throw new Error(`API返回错误: ${resp.statusCode}`);
    }

    const content = resp.data?.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('AI返回格式异常');
  } catch (e) {
    console.error('callAI error:', e);
    throw e;
  }
}

exports.main = async (event) => {
  const { text, context, model, apiKey, provider, baseUrl } = event;

  if (!text) {
    return { success: false, error: '缺少文本内容' };
  }
  if (!apiKey) {
    return { success: false, error: '缺少API Key' };
  }

  try {
    const result = await callAI({
      provider: provider || 'qwen',
      model: model || 'qwen-plus',
      apiKey,
      baseUrl: baseUrl || '',
      payload: { text, context }
    });

    return { success: true, result };
  } catch (e) {
    return { success: false, error: e.message || 'AI解析失败' };
  }
};