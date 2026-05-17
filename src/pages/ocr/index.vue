<script setup lang="ts">
import { ref } from 'vue'
import { ocrImage } from '@/api/ai'

const imagePath = ref('')
const rawText = ref('')
const loading = ref(false)
const errorMsg = ref('')
const step = ref<'upload' | 'preview' | 'text'>('upload')

// 选择图片
function chooseImage() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      imagePath.value = res.tempFilePaths[0]
      step.value = 'preview'
    }
  })
}

// 重新选择
function reset() {
  imagePath.value = ''
  rawText.value = ''
  errorMsg.value = ''
  step.value = 'upload'
}

// 执行OCR
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

// 复制文字
function copyText() {
  if (!rawText.value) return
  uni.setClipboardData({
    data: rawText.value,
    success: () => uni.showToast({ title: '已复制', icon: 'success' })
  })
}

// 继续：去校正
function goToReview() {
  const familyId = uni.getStorageSync('current_family_id') || ''
  if (!familyId) {
    uni.showToast({ title: '请先创建族谱', icon: 'none' })
    return
  }

  // 保存OCR结果
  uni.setStorageSync('ocr_raw_text', rawText.value)
  uni.setStorageSync('ocr_image_path', imagePath.value)

  uni.navigateTo({
    url: `/pages/ocr-review/index?familyId=${familyId}`
  })
}
</script>

<template>
  <view class="ocr-page">
    <!-- 上传区域 -->
    <view v-if="step === 'upload'" class="upload-area">
      <view class="upload-box" @click="chooseImage">
        <text class="upload-icon">📷</text>
        <text class="upload-text">点击拍照/选择族谱照片</text>
        <text class="upload-hint">支持 JPG/PNG/PDF，最长边≥2000px</text>
      </view>
    </view>

    <!-- 预览区域 -->
    <view v-if="step === 'preview'" class="preview-area">
      <image class="preview-image" :src="imagePath" mode="aspectFit" />

      <view class="preview-actions">
        <button class="btn-outline" @click="reset">重新选择</button>
        <button class="btn-primary" :disabled="loading" @click="doOcr">
          {{ loading ? '识别中...' : '开始识别' }}
        </button>
      </view>

      <view v-if="errorMsg" class="error-tip">
        <text>{{ errorMsg }}</text>
      </view>
    </view>

    <!-- 文字结果区域 -->
    <view v-if="step === 'text'" class="text-area">
      <view class="text-header">
        <text class="text-title">识别结果</text>
        <text class="text-copy" @click="copyText">📋 复制</text>
      </view>

      <textarea
        v-model="rawText"
        class="text-content"
        placeholder="识别结果将显示在这里，可以手动编辑修正"
      />

      <view class="text-actions">
        <button class="btn-outline" @click="reset">重新识别</button>
        <button class="btn-primary" @click="goToReview">AI解析 →</button>
      </view>

      <view class="ai-tips">
        <text class="tips-title">💡 提示</text>
        <text class="tips-item">• 可复制文字到其他应用编辑</text>
        <text class="tips-item">• 文字可直接粘贴到校正页</text>
        <text class="tips-item">• 古文/手写体识别效果可能较差</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-overlay">
      <view class="loading-box">
        <text class="loading-icon">🔄</text>
        <text class="loading-text">正在识别中...</text>
        <text class="loading-progress">AI 提取文字中</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ocr-page {
  min-height: 100vh;
  background: var(--bg-light);
  padding: 24rpx;
}

.upload-area {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.upload-box {
  width: 600rpx;
  height: 400rpx;
  border: 4rpx dashed var(--border);
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fff;
  cursor: pointer;

  &:active {
    border-color: var(--primary);
    background: var(--gradient-end);
  }
}

.upload-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
}

.upload-text {
  font-size: 16px;
  color: var(--text-dark);
  margin-bottom: 8rpx;
}

.upload-hint {
  font-size: 12px;
  color: var(--text-muted);
}

.preview-area {
  .preview-image {
    width: 100%;
    max-height: 60vh;
    border-radius: 16rpx;
    background: #000;
  }
}

.preview-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 24rpx;

  .btn-primary, .btn-outline {
    flex: 1;
    padding: 28rpx;
  }
}

.error-tip {
  margin-top: 16rpx;
  padding: 24rpx;
  background: #FFEBEE;
  border-radius: 12rpx;
  color: #F44336;
  font-size: 13px;
}

.text-area {
  .text-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16rpx;
  }

  .text-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-dark);
  }

  .text-copy {
    font-size: 13px;
    color: var(--primary);
    padding: 8rpx 16rpx;
  }
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
  margin-bottom: 24rpx;
}

.text-actions {
  display: flex;
  gap: 24rpx;

  .btn-primary, .btn-outline {
    flex: 1;
    padding: 28rpx;
  }
}

.ai-tips {
  margin-top: 32rpx;
  padding: 24rpx;
  background: var(--gradient-end);
  border-radius: 12rpx;

  .tips-title {
    font-size: 13px;
    color: var(--primary);
    font-weight: 500;
    display: block;
    margin-bottom: 12rpx;
  }

  .tips-item {
    font-size: 12px;
    color: var(--text-muted);
    display: block;
    margin-bottom: 6rpx;
  }
}

.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.loading-box {
  background: #fff;
  border-radius: 24rpx;
  padding: 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-icon {
  font-size: 64rpx;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 16rpx;
  font-size: 15px;
  color: var(--text-dark);
}

.loading-progress {
  margin-top: 8rpx;
  font-size: 12px;
  color: var(--text-muted);
}
</style>