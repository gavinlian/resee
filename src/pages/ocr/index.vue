<template>
  <view class="ocr-page">
    <!-- 顶部导航 -->
    <view class="ocr-header">
      <view class="header-left">
        <view class="back-btn" @click="goBack">
          <text class="back-icon">‹</text>
        </view>
        <text class="header-title">扫描族谱</text>
      </view>
    </view>

    <!-- H5 原生文件选择（供 uni.chooseImage 降级） -->
    <!-- #ifdef H5 -->
    <input
      id="h5-file-input"
      type="file"
      accept="image/*"
      style="display:none;"
      @change="onH5FileChange"
    />
    <!-- #endif -->

    <!-- 上传区域 -->
    <view class="upload-section">
      <view class="upload-box" @click="triggerFileInput">
        <view class="upload-illustration">
          <text class="upload-icon">📷</text>
        </view>
        <text class="upload-title">点击拍照/选择族谱照片</text>
        <text class="upload-hint">支持 JPG/PNG/PDF，最长边≥2000px效果更佳</text>
        <view class="upload-tips">
          <view class="tip-item">
            <text class="tip-icon">✓</text>
            <text class="tip-text">光照均匀，字迹清晰</text>
          </view>
          <view class="tip-item">
            <text class="tip-icon">✓</text>
            <text class="tip-text">族谱内容完整无遮挡</text>
          </view>
        </view>
      </view>
      <view class="btn-select" @click="triggerFileInput">
        <text>📁 选择图片</text>
      </view>
    </view>

    <!-- 预览区域 -->
    <view v-if="step === 'preview'" class="preview-section">
      <image class="preview-image" :src="imagePath" mode="aspectFit" />
      <view class="preview-actions">
        <view class="btn-outline" @click="reset">
          <text>重新选择</text>
        </view>
        <view class="btn-primary" :class="{ disabled: loading }" @click="doOcr">
          <text>{{ loading ? '识别中...' : '开始识别' }}</text>
        </view>
      </view>

      <view v-if="errorMsg" class="error-tip">
        <text class="error-icon">⚠️</text>
        <text class="error-text">{{ errorMsg }}</text>
      </view>
    </view>

    <!-- 文字结果区域 -->
    <view v-if="step === 'text'" class="text-section">
      <view class="text-header">
        <text class="text-title">识别结果</text>
        <view class="text-actions">
          <view class="action-btn" @click="copyText">
            <text>📋 复制</text>
          </view>
        </view>
      </view>

      <textarea
        v-model="rawText"
        class="text-content"
        style="flex:1;min-width:0;padding:24rpx;border:2rpx solid var(--border);border-radius:16rpx;font-size:14px;background:#fff;color:var(--text-dark);box-sizing:border-box;outline:none;"
        placeholder="识别结果将显示在这里，可以手动编辑修正"
      />

      <view class="text-actions-row">
        <view class="btn-outline" @click="reset">
          <text>重新识别</text>
        </view>
        <view class="btn-primary" @click="goToReview">
          <text>AI解析 →</text>
        </view>
      </view>

      <view class="ai-tips">
        <view class="tips-header">
          <text class="tips-icon">💡</text>
          <text class="tips-title">识别技巧</text>
        </view>
        <text class="tips-item">• 可复制文字到其他应用编辑后再粘贴</text>
        <text class="tips-item">• 古文/手写体识别效果可能较差，请仔细校对</text>
        <text class="tips-item">• 尽量选择清晰的图片提高识别准确率</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-overlay">
      <view class="loading-box">
        <view class="loading-spinner"></view>
        <text class="loading-title">正在识别中...</text>
        <text class="loading-progress">AI 提取文字中，请稍候</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ocrImage } from '@/api/ai'

const imagePath = ref('')
const rawText = ref('')
const loading = ref(false)
const errorMsg = ref('')
const step = ref<'upload' | 'preview' | 'text'>('upload')

function goBack() { uni.navigateBack() }

function reset() {
  imagePath.value = ''
  rawText.value = ''
  errorMsg.value = ''
  step.value = 'upload'
}

async function doOcr() {
  if (!imagePath.value) return

  loading.value = true
  errorMsg.value = ''

  try {
    const result = await ocrImage(imagePath.value)
    rawText.value = result.text
    step.value = 'text'
  } catch (e: any) {
    errorMsg.value = e.message || 'OCR识别失败'
  } finally {
    loading.value = false
  }
}

function copyText() {
  if (!rawText.value) return
  uni.setClipboardData({
    data: rawText.value,
    success: () => uni.showToast({ title: '已复制', icon: 'success' })
  })
}

function goToReview() {
  const familyId = uni.getStorageSync('current_family_id') || ''
  if (!familyId) {
    uni.showToast({ title: '请先创建族谱', icon: 'none' })
    return
  }

  uni.setStorageSync('ocr_raw_text', rawText.value)
  uni.setStorageSync('ocr_image_path', imagePath.value)

  uni.navigateTo({
    url: `/pages/ocr-review/index?familyId=${familyId}`
  })
}

// H5 直接触发原生 file input，绕过 uni.chooseImage 的上下文限制
function triggerFileInput() {
  // #ifdef H5
  const input = document.getElementById('h5-file-input') as HTMLInputElement
  if (input) {
    input.value = ''
    input.click()
  }
  // #endif
  // #ifndef H5
  uni.chooseImage({
    count: 1,
    sizeType: ['original'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      imagePath.value = res.tempFilePaths[0]
      step.value = 'preview'
    }
  })
  // #endif
}

// H5 文件选择回调
function onH5FileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const base64 = ev.target?.result as string
    imagePath.value = base64
    step.value = 'preview'
  }
  reader.readAsDataURL(file)
}
</script>

<style scoped lang="scss">
.ocr-page {
  min-height: 100vh;
  background: var(--bg-light);
  padding-bottom: env(safe-area-inset-bottom);
}

.ocr-header {
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

.upload-section {
  padding: 40rpx 32rpx;
}

.upload-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 40rpx;
  background: #fff;
  border-radius: 24rpx;
  border: 4rpx dashed var(--border);
  cursor: pointer;
  transition: all 0.2s;

  &:active {
    border-color: var(--primary);
    background: var(--gradient-end);
  }
}

.upload-illustration {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: var(--gradient-end);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}

.upload-icon {
  font-size: 80rpx;
}

.upload-title {
  font-size: 17px;
  font-weight: 500;
  color: var(--text-dark);
  margin-bottom: 12rpx;
}

.upload-hint {
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
  margin-bottom: 32rpx;
}

.upload-tips {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  width: 100%;
  max-width: 400rpx;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: var(--bg-light);
  border-radius: 12rpx;
}

.tip-icon {
  font-size: 24rpx;
  color: var(--primary);
}

.tip-text {
  font-size: 13px;
  color: var(--text-dark);
}

.btn-select {
  width: 100%;
  padding: 28rpx;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  color: #fff;
  border-radius: 16rpx;
  font-size: 16px;
  font-weight: 500;
  border: none;
  box-shadow: 0 4rpx 16rpx rgba(139, 111, 71, 0.3);
  margin-top: 24rpx;

  &:active { opacity: 0.9; }
}

.preview-section {
  padding: 24rpx;
}

.preview-image {
  width: 100%;
  max-height: 50vh;
  border-radius: 20rpx;
  background: #000;
}

.preview-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 24rpx;
}

.btn-primary, .btn-outline {
  flex: 1;
  padding: 28rpx;
  border-radius: 16rpx;
  font-size: 15px;
  font-weight: 500;
  text-align: center;
  border: none;

  &:active { opacity: 0.9; }
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  color: #fff;
  box-shadow: 0 4rpx 16rpx rgba(139, 111, 71, 0.3);

  &.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
}

.btn-outline {
  background: #fff;
  border: 2rpx solid var(--border);
  color: var(--text-dark);
}

.error-tip {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  background: #FFEBEE;
  border-radius: 12rpx;
  margin-top: 16rpx;
}

.error-icon {
  font-size: 28rpx;
}

.error-text {
  font-size: 13px;
  color: #F44336;
  flex: 1;
}

.text-section {
  padding: 24rpx;
}

.text-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.text-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-dark);
}

.text-actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  padding: 8rpx 20rpx;
  background: var(--bg-light);
  border-radius: 8rpx;
  font-size: 13px;
  color: var(--primary);
}

.text-content {
  width: 100%;
  min-height: 400rpx;
  padding: 24rpx;
  background: #fff;
  border: 2rpx solid var(--border);
  border-radius: 16rpx;
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-dark);
  box-sizing: border-box;
}

.text-actions-row {
  display: flex;
  gap: 20rpx;
  margin-top: 24rpx;
}

.ai-tips {
  margin-top: 32rpx;
  padding: 24rpx;
  background: var(--gradient-end);
  border-radius: 16rpx;
}

.tips-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.tips-icon {
  font-size: 28rpx;
}

.tips-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--primary);
}

.tips-item {
  font-size: 12px;
  color: var(--text-muted);
  display: block;
  margin-bottom: 8rpx;
  line-height: 1.6;
}

.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.loading-box {
  background: #fff;
  border-radius: 24rpx;
  padding: 48rpx 64rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 400rpx;
}

.loading-spinner {
  width: 64rpx;
  height: 64rpx;
  border: 4rpx solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 24rpx;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-dark);
  margin-bottom: 8rpx;
}

.loading-progress {
  font-size: 13px;
  color: var(--text-muted);
}
</style>