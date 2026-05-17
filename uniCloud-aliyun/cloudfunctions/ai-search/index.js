'use strict';

/**
 * AI 搜索云函数 - 支持所有大模型 API
 */
async function callAI(config) {
  const { provider, model, apiKey, baseUrl } = config;

  const systemPrompt = `你是族谱专家，根据用户的自然语言问题，在族谱数据库中搜索相关成员信息。
用户问题可能涉及：
- 查找某人的上下代关系（父亲、儿子、孙子等）
- 查找某人的配偶信息
- 查找特定世代的所有成员
- 查找迁徙记录、来源信息

请根据问题生成对应的搜索条件和解释，输出JSON格式：
{
  "search_conditions": {
    "name": "可能匹配的姓名(可选)",
    "generation_min": 最小代数(可选),
    "generation_max": 最大代数(可选),
    "gender": "male"|"female"(可选),
    "birthplace": "出生地(可选)"
  },
  "answer": "用自然语言给出搜索结果的描述",
  "result_count": 匹配数量
}`;

  const { query, familyId } = config.payload;

  const apiUrl = (baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1') + '/chat/completions';

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  const body = {
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `族谱ID: ${familyId || '当前族谱'}\n用户问题: ${query}` }
    ]
  };

  try {
    const resp = await uniCloud.httpRequest({
      url: apiUrl, method: 'POST', header: headers, data: body, dataType: 'json'
    });

    if (resp.statusCode !== 200) {
      throw new Error(`API返回错误: ${resp.statusCode}`);
    }

    const content = resp.data?.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { answer: content, result_count: 0, search_conditions: {} };
  } catch (e) {
    console.error('callAI error:', e);
    throw e;
  }
}

exports.main = async (event) => {
  const { query, familyId, model, apiKey, provider, baseUrl } = event;

  if (!query) {
    return { success: false, error: '缺少搜索问题' };
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
      payload: { query, familyId }
    });

    return { success: true, result };
  } catch (e) {
    return { success: false, error: e.message || '搜索失败' };
  }
};