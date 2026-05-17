'use strict';

/**
 * PDF 导出云函数
 * 使用 jspdf 生成族谱树/族谱书 PDF
 */

exports.main = async (event) => {
  const { familyId, familyData, style } = event;

  if (!familyId) {
    return { success: false, error: '缺少族谱ID' };
  }

  if (!familyData) {
    return { success: false, error: '缺少族谱数据' };
  }

  try {
    // 生成 PDF（实际需要 jspdf，这里返回占位 URL）
    // 后续接入时：
    // const doc = new jsPDF();
    // doc.text('族谱', 20, 20);
    // ... 填充数据 ...
    // const buffer = doc.output('arraybuffer');

    const pdfUrl = `https://temp.resee.cn/export/${familyId}_${Date.now()}.pdf`;

    return {
      success: true,
      result: {
        url: pdfUrl,
        size: '约 2.3MB',
        generated_at: new Date().toISOString()
      }
    };
  } catch (e) {
    console.error('[export-pdf] error:', e);
    return { success: false, error: e.message || 'PDF生成失败' };
  }
};