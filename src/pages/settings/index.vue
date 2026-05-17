<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getAILimits, saveAIConfig } from '@/api/ai'
import { AI_PROVIDERS, AIConfig, loadConfig, saveConfig, getEnabledModels, saveEnabledModels } from '@/utils/ai-config'

const aiConfig = ref<AIConfig>(loadConfig())
const limits = ref(getAILimits())
const editMode = ref(false)
const tempEnabledModels = ref<string[]>([])

// 保存AI配置
function saveAiProvider() {
  saveConfig(aiConfig.value)
  saveAIConfig(aiConfig.value)
  uni.showToast({ title: '保存成功', icon: 'success' })
}

// 切换提供商
function switchProvider(provider: 'qwen' | 'minimax' | 'siliconflow' | 'openai') {
  aiConfig.value.provider = provider
  const enabled = getEnabledModels()
  const firstEnabled = AI_PROVIDERS[provider].models.find(m => enabled.includes(m.id))
  aiConfig.value.model = firstEnabled ? firstEnabled.id : AI_PROVIDERS[provider].models[0].id
}

// 切换模型
function switchModel(model: string) {
  aiConfig.value.model = model
}

// 获取当前模型列表（仅显示已启用的）
const currentModels = computed(() => {
  const allModels = AI_PROVIDERS[aiConfig.value.provider]?.models || []
  const enabled = getEnabledModels()
  return allModels.filter(m => enabled.includes(m.id))
})

// 进入编辑模式
function enterEditMode() {
  tempEnabledModels.value = [...getEnabledModels()]
  editMode.value = true
}

// 退出编辑模式
function cancelEdit() {
  editMode.value = false
}

// 切换模型启用状态
function toggleModel(modelId: string) {
  const idx = tempEnabledModels.value.indexOf(modelId)
  if (idx >= 0) {
    tempEnabledModels.value.splice(idx, 1)
  } else {
    tempEnabledModels.value.push(modelId)
  }
}

// 检查模型是否启用
function isModelEnabled(modelId: string) {
  return tempEnabledModels.value.includes(modelId)
}

// 保存启用模型
function saveEnabledModelList() {
  if (tempEnabledModels.value.length === 0) {
    uni.showToast({ title: '至少保留一个模型', icon: 'none' })
    return
  }
  saveEnabledModels(tempEnabledModels.value)
  editMode.value = false
  // 如果当前模型被取消启用了，切换到第一个
  if (!tempEnabledModels.value.includes(aiConfig.value.model)) {
    const firstEnabled = AI_PROVIDERS[aiConfig.value.provider].models.find(m => tempEnabledModels.value.includes(m.id))
    if (firstEnabled) {
      aiConfig.value.model = firstEnabled.id
    }
  }
  uni.showToast({ title: '已保存', icon: 'success' })
}

// 清除本地数据
function clearLocalData() {
  uni.showModal({
    title: '确认清除',
    content: '确定清除本地所有数据吗？此操作不可恢复。',
    success: (res) => {
      if (res.confirm) {
        uni.clearStorage()
        uni.showToast({ title: '已清除', icon: 'success' })
      }
    }
  })
}

onMounted(() => {
  limits.value = getAILimits()
})
</script>

<template>
  <view class="settings-page">
    <view class="settings-section">
      <text class="section-title">AI 设置</text>

      <!-- 提供商 -->
      <view class="setting-item">
        <text class="setting-label">AI 提供商</text>
        <view class="provider-list">
          <view
            v-for="(info, key) in AI_PROVIDERS"
            :key="key"
            class="provider-btn"
            :class="{ active: aiConfig.provider === key }"
            @click="switchProvider(key as any)"
          >
            {{ info.name }}
          </view>
        </view>
      </view>

      <!-- 模型 -->
      <view class="setting-item">
        <view class="setting-label-row">
          <text class="setting-label">模型</text>
          <text v-if="!editMode" class="edit-btn" @click="enterEditMode">编辑</text>
        </view>
        <view class="model-list">
          <template v-if="!editMode">
            <view
              v-for="model in currentModels"
              :key="model.id"
              class="model-btn"
              :class="{ active: aiConfig.model === model.id }"
              @click="switchModel(model.id)"
            >
              <text class="model-name">{{ model.name }}</text>
              <text class="model-desc">{{ model.description }}</text>
            </view>
          </template>
          <template v-else>
            <view
              v-for="model in AI_PROVIDERS[aiConfig.provider].models"
              :key="model.id"
              class="model-btn"
              :class="{ enabled: isModelEnabled(model.id) }"
              @click="toggleModel(model.id)"
            >
              <text class="model-name">{{ model.name }}</text>
              <text class="model-desc">{{ model.description }}</text>
              <text class="check-icon">{{ isModelEnabled(model.id) ? '✓' : '' }}</text>
            </view>
          </template>
        </view>
        <view v-if="editMode" class="edit-actions">
          <button class="btn-outline" @click="cancelEdit">取消</button>
          <button class="btn-primary" @click="saveEnabledModelList">保存</button>
        </view>
      </view>

      <!-- API Key -->
      <view class="setting-item">
        <text class="setting-label">API Key</text>
        <view class="api-key-box">
          <input
            v-model="aiConfig.apiKey"
            style="width: 100%; height: 80rpx; padding: 0 24rpx; border: 2rpx solid #E0D5C8; border-radius: 12rpx; font-size: 28rpx; background: #fff; color: #333;"
            type="text"
            confirm-type="done"
            placeholder="请输入 API Key"
          />
        </view>
      </view>

      <button class="btn-primary" @click="saveAiProvider">保存 AI 设置</button>
    </view>

    <view class="settings-section">
      <text class="section-title">今日 AI 额度</text>

      <view class="quota-list">
        <view class="quota-item">
          <text class="quota-label">OCR 识别</text>
          <text class="quota-value">{{ limits.limits.ocr >= 0 ? limits.limits.ocr : '无限' }} 次</text>
        </view>
        <view class="quota-item">
          <text class="quota-label">AI 解析</text>
          <text class="quota-value">{{ limits.limits.parse >= 0 ? limits.limits.parse : '无限' }} 次</text>
        </view>
        <view class="quota-item">
          <text class="quota-label">AI 搜索</text>
          <text class="quota-value">{{ limits.limits.search >= 0 ? limits.limits.search : '无限' }} 次</text>
        </view>
      </view>

      <text class="quota-hint">免费用户每日限额，会员无限使用</text>
    </view>

    <view class="settings-section">
      <text class="section-title">数据管理</text>

      <button class="btn-outline danger" @click="clearLocalData">清除本地数据</button>
    </view>

    <view class="settings-section">
      <text class="section-title">关于</text>
      <view class="about-info">
        <text class="about-name">族见族谱工具</text>
        <text class="about-version">版本 1.0.0</text>
        <text class="about-slogan">见家族，见自己。</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.settings-page {
  min-height: 100vh;
  background: var(--bg-light);
  padding: 24rpx;
}

.settings-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-dark);
  display: block;
  margin-bottom: 24rpx;
}

.setting-item {
  margin-bottom: 24rpx;
}

.setting-label {
  font-size: 13px;
  color: var(--text-muted);
  display: block;
  margin-bottom: 12rpx;
}

.setting-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.edit-btn {
  font-size: 13px;
  color: var(--primary);
}

.provider-list {
  display: flex;
  gap: 12rpx;
}

.provider-btn {
  flex: 1;
  padding: 16rpx;
  text-align: center;
  background: var(--bg-light);
  border-radius: 12rpx;
  font-size: 13px;
  color: var(--text-muted);

  &.active {
    background: var(--primary);
    color: #fff;
  }
}

.model-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.model-btn {
  padding: 16rpx;
  background: var(--bg-light);
  border-radius: 12rpx;
  position: relative;

  &.active {
    background: var(--gradient-end);
    border: 2rpx solid var(--primary);
  }

  &.enabled {
    background: #E8F5E9;
    border: 2rpx solid #4CAF50;
  }

  .model-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-dark);
    display: block;
    margin-bottom: 4rpx;
  }

  .model-desc {
    font-size: 11px;
    color: var(--text-muted);
  }

  .check-icon {
    position: absolute;
    right: 16rpx;
    top: 50%;
    transform: translateY(-50%);
    font-size: 14px;
    color: #4CAF50;
  }
}

.edit-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}


.quota-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.quota-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx;
  background: var(--bg-light);
  border-radius: 12rpx;
}

.quota-label {
  font-size: 13px;
  color: var(--text-dark);
}

.quota-value {
  font-size: 14px;
  color: var(--primary);
  font-weight: 500;
}

.quota-hint {
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
  display: block;
}

.btn-outline {
  flex: 1;
  padding: 24rpx;
  border: 2rpx solid var(--border);
  border-radius: 12rpx;
  background: #fff;
  color: var(--text-dark);
  font-size: 14px;

  &.danger {
    color: #F44336;
    border-color: #FFCDD2;
  }
}

.btn-primary {
  width: 100%;
  padding: 24rpx;
  background: var(--primary);
  border-radius: 12rpx;
  color: #fff;
  font-size: 14px;
  margin-top: 16rpx;
}

.about-info {
  text-align: center;
  padding: 24rpx 0;

  .about-name {
    font-size: 16px;
    font-weight: 500;
    color: var(--primary);
    display: block;
    margin-bottom: 8rpx;
  }

  .about-version {
    font-size: 12px;
    color: var(--text-muted);
    display: block;
    margin-bottom: 12rpx;
  }

  .about-slogan {
    font-size: 13px;
    color: var(--secondary);
    display: block;
  }
}
</style>