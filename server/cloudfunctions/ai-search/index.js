'use strict';

const TONGI_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';
const MINIMAX_API_URL = 'https://api.minimax.chat/v1/text/chatcompletion_v2';

/**
 * 通用 AI 对话调用
 */
async function callAI(config) {
  const { provider, model, apiKey } = config;

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

  const { query, familyId, db } = config.payload;

  let apiUrl, headers, body;

  if (provider === 'minimax') {
    apiUrl = MINIMAX_API_URL;
    headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    body = { model, messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `族谱ID: ${familyId || '当前族谱'}\n用户问题: ${query}` }
    ]};
  } else if (provider === 'siliconflow') {
    apiUrl = SILICONFLOW_API_URL;
    headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    body = { model, messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `族谱ID: ${familyId || '当前族谱'}\n用户问题: ${query}` }
    ]};
  } else {
    apiUrl = TONGI_API_URL;
    headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    body = { model, messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `族谱ID: ${familyId || '当前族谱'}\n用户问题: ${query}` }
    ]};
  }

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
  const { query, familyId, model, apiKey, provider } = event;

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
      payload: { query, familyId }
    });

    return { success: true, result };
  } catch (e) {
    return { success: false, error: e.message || '搜索失败' };
  }
};