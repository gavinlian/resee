<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { db, COLLECTIONS } from '@/utils/db'

const familyId = ref('')
const loading = ref(false)
const exported = ref(false)
const exportProgress = ref(0)

// 导出JSON
async function exportJson() {
  if (!familyId.value) return

  loading.value = true
  exportProgress.value = 10

  try {
    // 获取所有数据
    const [personsRes, familyRes] = await Promise.all([
      db.getPersonsByFamily(familyId.value),
      db.getFamily(familyId.value)
    ])

    exportProgress.value = 50

    const familyData = familyRes.success ? familyRes.result?.data?.[0] : {}
    const personsData = personsRes.success ? personsRes.result?.data || [] : []

    const exportObj = {
      family: familyData,
      persons: personsData,
      exported_at: new Date().toISOString(),
      version: '1.0'
    }

    exportProgress.value = 80

    // 下载JSON文件
    const jsonStr = JSON.stringify(exportObj, null, 2)
    const fileName = `${(familyData as any)?.name || '族谱'}_${Date.now()}.json`

    // #ifdef H5
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
    // #endif

    // #ifdef MP-WEIXIN
    uni.saveFile({
      tempFilePath: jsonStr,
      success: (res) => {
        uni.showToast({ title: '已保存到文件', icon: 'success' })
      }
    })
    // #endif

    exportProgress.value = 100
    exported.value = true
    uni.showToast({ title: '导出成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '导出失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// 导出PDF（占位）
function exportPdf() {
  uni.showToast({ title: 'PDF导出开发中', icon: 'none' })
  // 后续接入 pdfmake 或 jspdf
}

onMounted(() => {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const options = (current as any).$page?.options || {}
  familyId.value = options.familyId || uni.getStorageSync('current_family_id') || ''
})
</script>

<template>
  <view class="export-page">
    <view class="export-header">
      <text class="export-title">导出族谱</text>
      <text class="export-hint">将族谱数据导出为可保存的文件</text>
    </view>

    <!-- 导出选项 -->
    <view class="export-options">
      <!-- JSON导出 -->
      <view class="export-card" @click="exportJson">
        <view class="export-card-icon">📄</view>
        <view class="export-card-info">
          <text class="export-card-title">JSON 数据</text>
          <text class="export-card-desc">完整数据备份，可导入其他系统</text>
        </view>
        <text class="export-card-action">导出</text>
      </view>

      <!-- PDF树形图 -->
      <view class="export-card" @click="exportPdf">
        <view class="export-card-icon">📑</view>
        <view class="export-card-info">
          <text class="export-card-title">PDF 树形图</text>
          <text class="export-card-desc">适合打印的世系图（苏式/欧式）</text>
        </view>
        <text class="export-card-action">导出</text>
      </view>

      <!-- 族谱书PDF -->
      <view class="export-card" @click="uni.showToast({ title: '开发中', icon: 'none' })">
        <view class="export-card-icon">📚</view>
        <view class="export-card-info">
          <text class="export-card-title">族谱书 PDF</text>
          <text class="export-card-desc">完整族谱书排版（包含传记、墓碑图）</text>
        </view>
        <text class="export-card-action">导出</text>
      </view>
    </view>

    <!-- 进度 -->
    <view v-if="loading" class="export-progress">
      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: exportProgress + '%' }"></view>
      </view>
      <text class="progress-text">{{ exportProgress }}%</text>
    </view>

    <!-- 成功提示 -->
    <view v-if="exported" class="export-done">
      <text class="done-icon">✅</text>
      <text class="done-text">导出完成</text>
    </view>

    <!-- 说明 -->
    <view class="export-tips">
      <text class="tips-title">导出说明</text>
      <text class="tips-item">• JSON 可作为数据备份，支持导入导出</text>
      <text class="tips-item">• PDF 树形图适合打印和分享</text>
      <text class="tips-item">• 族谱书 PDF 包含完整内容和图片</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.export-page {
  min-height: 100vh;
  background: var(--bg-light);
  padding: 24rpx;
}

.export-header {
  margin-bottom: 32rpx;
}

.export-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-dark);
  display: block;
  margin-bottom: 8rpx;
}

.export-hint {
  font-size: 13px;
  color: var(--text-muted);
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.export-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  cursor: pointer;

  &:active {
    background: var(--gradient-end);
  }
}

.export-card-icon {
  font-size: 48rpx;
  margin-right: 20rpx;
}

.export-card-info {
  flex: 1;
}

.export-card-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-dark);
  display: block;
  margin-bottom: 6rpx;
}

.export-card-desc {
  font-size: 12px;
  color: var(--text-muted);
}

.export-card-action {
  font-size: 14px;
  color: var(--primary);
  padding: 8rpx 24rpx;
  background: var(--gradient-end);
  border-radius: 8rpx;
}

.export-progress {
  margin-bottom: 32rpx;
}

.progress-bar {
  height: 12rpx;
  background: var(--border);
  border-radius: 6rpx;
  overflow: hidden;
  margin-bottom: 8rpx;
}

.progress-fill {
  height: 100%;
  background: var(--primary);
  transition: width 0.3s;
}

.progress-text {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  display: block;
}

.export-done {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx;
  background: #E8F5E9;
  border-radius: 16rpx;
  margin-bottom: 32rpx;

  .done-icon {
    font-size: 64rpx;
    margin-bottom: 16rpx;
  }

  .done-text {
    font-size: 16px;
    color: #4CAF50;
  }
}

.export-tips {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;

  .tips-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-dark);
    display: block;
    margin-bottom: 16rpx;
  }

  .tips-item {
    font-size: 12px;
    color: var(--text-muted);
    display: block;
    margin-bottom: 8rpx;
  }
}
</style>