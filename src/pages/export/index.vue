<template>
  <view class="export-page">
    <!-- 顶部导航 -->
    <view class="export-header">
      <view class="header-left">
        <view class="back-btn" @click="goBack">
          <text class="back-icon">‹</text>
        </view>
        <text class="header-title">导出族谱</text>
      </view>
    </view>

    <!-- 导出说明 -->
    <view class="export-intro">
      <text class="intro-title">选择导出格式</text>
      <text class="intro-desc">将族谱数据导出为可保存的文件，方便备份和分享</text>
    </view>

    <!-- 导出选项 -->
    <view class="export-options">
      <!-- JSON导出 -->
      <view class="export-card" @click="exportJson">
        <view class="card-icon">
          <text class="icon-text">📄</text>
        </view>
        <view class="card-content">
          <text class="card-title">JSON 数据</text>
          <text class="card-desc">完整数据备份，可导入其他系统</text>
          <view class="card-tags">
            <text class="tag">结构化</text>
            <text class="tag">可编辑</text>
          </view>
        </view>
        <view class="card-action">
          <text>导出</text>
        </view>
      </view>

      <!-- PDF树形图 -->
      <view class="export-card" @click="exportPdf">
        <view class="card-icon">
          <text class="icon-text">📊</text>
        </view>
        <view class="card-content">
          <text class="card-title">PDF 树形图</text>
          <text class="card-desc">适合打印的世系图（苏式/欧式）</text>
          <view class="card-tags">
            <text class="tag">高清</text>
            <text class="tag">打印</text>
          </view>
        </view>
        <view class="card-action">
          <text>导出</text>
        </view>
      </view>

      <!-- 族谱书PDF -->
      <view class="export-card" @click="showDevToast">
        <view class="card-icon">
          <text class="icon-text">📚</text>
        </view>
        <view class="card-content">
          <text class="card-title">族谱书 PDF</text>
          <text class="card-desc">完整族谱书排版（包含传记、墓碑图）</text>
          <view class="card-tags">
            <text class="tag">完整</text>
            <text class="tag coming">敬请期待</text>
          </view>
        </view>
        <view class="card-action disabled">
          <text>即将推出</text>
        </view>
      </view>
    </view>

    <!-- 进度 -->
    <view v-if="loading" class="export-progress">
      <view class="progress-header">
        <text class="progress-title">导出中...</text>
        <text class="progress-percent">{{ exportProgress }}%</text>
      </view>
      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: exportProgress + '%' }"></view>
      </view>
    </view>

    <!-- 成功提示 -->
    <view v-if="exported" class="export-done">
      <view class="done-icon-wrap">
        <text class="done-icon">✅</text>
      </view>
      <text class="done-text">导出完成</text>
      <text class="done-hint">文件已保存到下载目录</text>
    </view>

    <!-- 导出说明 -->
    <view class="export-tips">
      <view class="tips-header">
        <text class="tips-icon">💡</text>
        <text class="tips-title">导出说明</text>
      </view>
      <view class="tips-list">
        <view class="tip-item">
          <text class="tip-num">1</text>
          <text class="tip-text">JSON 可作为数据备份，支持导入导出</text>
        </view>
        <view class="tip-item">
          <text class="tip-num">2</text>
          <text class="tip-text">PDF 树形图适合打印和分享</text>
        </view>
        <view class="tip-item">
          <text class="tip-num">3</text>
          <text class="tip-text">族谱书 PDF 包含完整内容和图片</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { db, COLLECTIONS } from '@/utils/db'

const familyId = ref('')
const loading = ref(false)
const exported = ref(false)
const exportProgress = ref(0)

function goBack() { uni.navigateBack() }
function showDevToast() { uni.showToast({ title: '开发中', icon: 'none' }) }

async function exportJson() {
  if (!familyId.value) return

  loading.value = true
  exportProgress.value = 10

  try {
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

function exportPdf() {
  uni.showToast({ title: 'PDF导出开发中', icon: 'none' })
}

onMounted(() => {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const options = (current as any).$page?.options || {}
  familyId.value = options.familyId || uni.getStorageSync('current_family_id') || ''
})
</script>

<style scoped lang="scss">
.export-page {
  min-height: 100vh;
  background: var(--bg-light);
  padding-bottom: env(safe-area-inset-bottom);
}

.export-header {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  background: #fff;
  border-bottom: 2rpx solid var(--border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.back-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: var(--bg-light);
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 36rpx;
  color: var(--text-dark);
  font-weight: 300;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-dark);
}

.export-intro {
  padding: 32rpx 24rpx 24rpx;
}

.intro-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-dark);
  display: block;
  margin-bottom: 8rpx;
}

.intro-desc {
  font-size: 13px;
  color: var(--text-muted);
  display: block;
}

.export-options {
  padding: 0 24rpx;
}

.export-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 16rpx;
  cursor: pointer;
  box-shadow: 0 2rpx 12rpx var(--shadow);
  transition: all 0.2s;

  &:active {
    transform: scale(0.99);
    box-shadow: 0 1rpx 6rpx var(--shadow);
  }
}

.card-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 20rpx;
  background: var(--gradient-end);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-text {
  font-size: 44rpx;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-dark);
  display: block;
  margin-bottom: 6rpx;
}

.card-desc {
  font-size: 12px;
  color: var(--text-muted);
  display: block;
  margin-bottom: 12rpx;
}

.card-tags {
  display: flex;
  gap: 8rpx;
}

.tag {
  font-size: 11px;
  padding: 4rpx 12rpx;
  background: var(--bg-light);
  border-radius: 8rpx;
  color: var(--text-muted);

  &.coming {
    background: var(--gradient-end);
    color: var(--primary);
  }
}

.card-action {
  padding: 12rpx 24rpx;
  background: var(--primary);
  color: #fff;
  border-radius: 12rpx;
  font-size: 13px;
  font-weight: 500;
  flex-shrink: 0;

  &.disabled {
    background: var(--border);
    color: var(--text-muted);
  }
}

.export-progress {
  margin: 32rpx 24rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.progress-title {
  font-size: 14px;
  color: var(--text-dark);
}

.progress-percent {
  font-size: 14px;
  color: var(--primary);
  font-weight: 600;
}

.progress-bar {
  height: 10rpx;
  background: var(--border);
  border-radius: 5rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%);
  transition: width 0.3s;
}

.export-done {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx;
  background: #E8F5E9;
  border-radius: 20rpx;
  margin: 0 24rpx 32rpx;
}

.done-icon-wrap {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}

.done-icon {
  font-size: 48rpx;
}

.done-text {
  font-size: 17px;
  font-weight: 600;
  color: #4CAF50;
  margin-bottom: 8rpx;
}

.done-hint {
  font-size: 13px;
  color: var(--text-muted);
}

.export-tips {
  margin: 0 24rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 20rpx;
}

.tips-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 20rpx;
}

.tips-icon {
  font-size: 28rpx;
}

.tips-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-dark);
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.tip-num {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  font-size: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tip-text {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
  flex: 1;
}
</style>