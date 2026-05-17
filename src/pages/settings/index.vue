<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getAILimits, saveAIConfig } from '@/api/ai'
import {
  loadConfig, saveConfig, getEnabledModels, saveEnabledModels,
  getAllProviders, getProviderInfo, addCustomProvider, deleteCustomProvider,
  getCustomProviders, type CustomProvider, type AIConfig
} from '@/utils/ai-config'

const aiConfig = ref<AIConfig>(loadConfig())
const limits = ref(getAILimits())
const editMode = ref(false)
const tempEnabledModels = ref<string[]>([])
const showCustomForm = ref(false)
const customProviders = ref<CustomProvider[]>(getCustomProviders())

// 自定义提供商表单
const customForm = ref({
  name: '',
  baseUrl: '',
  model: '',
  apiKey: ''
})

// 所有提供商
const allProviders = computed(() => getAllProviders())

// 当前提供商信息
const currentProviderInfo = computed(() => getProviderInfo(aiConfig.value.provider))

// 当前模型列表
const currentModels = computed(() => {
  const info = currentProviderInfo.value
  if (!info) return []
  const enabled = getEnabledModels()
  return info.models.filter(m => enabled.includes(m.id))
})

// 所有预设提供商（用于Tab切换）
const presetTabs = [
  { key: 'qwen', name: '通义千问' },
  { key: 'minimax', name: 'MiniMax' },
  { key: 'siliconflow', name: '硅基流动' },
  { key: 'openai', name: 'OpenAI' },
  { key: 'deepseek', name: 'DeepSeek' },
  { key: 'zhipu', name: '智谱AI' }
]

// 切换提供商
function switchProvider(provider: string) {
  aiConfig.value.provider = provider
  const enabled = getEnabledModels()
  const info = getProviderInfo(provider)
  if (info && info.models.length > 0) {
    const firstEnabled = info.models.find(m => enabled.includes(m.id))
    aiConfig.value.model = firstEnabled ? firstEnabled.id : info.models[0].id
  }
}

// 切换模型
function switchModel(model: string) {
  aiConfig.value.model = model
}

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
  if (!tempEnabledModels.value.includes(aiConfig.value.model)) {
    const info = currentProviderInfo.value
    if (info && info.models.length > 0) {
      const firstEnabled = info.models.find(m => tempEnabledModels.value.includes(m.id))
      if (firstEnabled) aiConfig.value.model = firstEnabled.id
    }
  }
  uni.showToast({ title: '已保存', icon: 'success' })
}

// 保存AI配置
function saveAiProvider() {
  saveConfig(aiConfig.value)
  saveAIConfig(aiConfig.value)
  uni.showToast({ title: '保存成功', icon: 'success' })
}

// 显示添加自定义提供商
function showAddCustom() {
  customForm.value = { name: '', baseUrl: '', model: '', apiKey: '' }
  showCustomForm.value = true
}

// 添加自定义提供商
function doAddCustom() {
  if (!customForm.value.name || !customForm.value.baseUrl || !customForm.value.model) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }

  const id = `custom_${Date.now()}`
  addCustomProvider({
    id,
    name: customForm.value.name,
    baseUrl: customForm.value.baseUrl,
    model: customForm.value.model,
    apiKey: customForm.value.apiKey
  })

  customProviders.value = getCustomProviders()
  showCustomForm.value = false

  // 自动切换到新的自定义提供商
  aiConfig.value.provider = `custom_${id}`
  aiConfig.value.model = customForm.value.model
  if (customForm.value.apiKey) {
    aiConfig.value.apiKey = customForm.value.apiKey
  }
  saveAiProvider()
}

// 删除自定义提供商
function doDeleteCustom(id: string) {
  uni.showModal({
    title: '确认删除',
    content: '确定删除该自定义提供商吗？',
    success: (res) => {
      if (res.confirm) {
        deleteCustomProvider(id)
        customProviders.value = getCustomProviders()
        if (aiConfig.value.provider === `custom_${id}`) {
          aiConfig.value.provider = 'qwen'
          aiConfig.value.model = 'qwen-plus'
        }
        uni.showToast({ title: '已删除', icon: 'success' })
      }
    }
  })
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
  customProviders.value = getCustomProviders()
})
</script>

<template>
  <view class="settings-page">
    <view class="settings-section">
      <text class="section-title">AI 设置</text>

      <!-- 预设提供商 -->
      <view class="setting-item">
        <text class="setting-label">AI 提供商</text>
        <view class="provider-tabs">
          <view
            v-for="tab in presetTabs"
            :key="tab.key"
            class="provider-tab"
            :class="{ active: aiConfig.provider === tab.key }"
            @click="switchProvider(tab.key)"
          >
            {{ tab.name }}
          </view>
        </view>
      </view>

      <!-- 自定义提供商 -->
      <view class="setting-item">
        <view class="setting-label-row">
          <text class="setting-label">自定义</text>
          <text class="add-btn" @click="showAddCustom">+ 添加</text>
        </view>
        <view v-if="customProviders.length > 0" class="custom-list">
          <view
            v-for="cp in customProviders"
            :key="cp.id"
            class="custom-item"
            :class="{ active: aiConfig.provider === 'custom_' + cp.id }"
            @click="switchProvider('custom_' + cp.id)"
          >
            <view class="custom-info">
              <text class="custom-name">{{ cp.name }}</text>
              <text class="custom-model">{{ cp.model }}</text>
            </view>
            <text class="delete-btn" @click.stop="doDeleteCustom(cp.id)">✕</text>
          </view>
        </view>
        <view v-else class="empty-custom">
          <text>暂无自定义提供商</text>
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
              v-for="model in (currentProviderInfo?.models || [])"
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

    <!-- 添加自定义提供商弹窗 -->
    <view v-if="showCustomForm" class="modal-overlay" @click="showCustomForm = false">
      <view class="modal-content" @click.stop>
        <text class="modal-title">添加自定义 AI</text>

        <view class="form-item">
          <text class="form-label">名称</text>
          <input v-model="customForm.name" class="form-input" placeholder="如：我的模型" />
        </view>

        <view class="form-item">
          <text class="form-label">API 地址</text>
          <input v-model="customForm.baseUrl" class="form-input" placeholder="https://api.example.com/v1" />
        </view>

        <view class="form-item">
          <text class="form-label">模型名称</text>
          <input v-model="customForm.model" class="form-input" placeholder="如：gpt-4o" />
        </view>

        <view class="form-item">
          <text class="form-label">API Key（可选）</text>
          <input v-model="customForm.apiKey" class="form-input" placeholder="sk-..." />
        </view>

        <view class="modal-actions">
          <button class="btn-outline" @click="showCustomForm = false">取消</button>
          <button class="btn-primary" @click="doAddCustom">添加</button>
        </view>
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

.edit-btn, .add-btn {
  font-size: 13px;
  color: var(--primary);
}

.provider-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.provider-tab {
  padding: 12rpx 20rpx;
  background: var(--bg-light);
  border-radius: 8rpx;
  font-size: 13px;
  color: var(--text-muted);

  &.active {
    background: var(--primary);
    color: #fff;
  }
}

.custom-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.custom-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 20rpx;
  background: var(--bg-light);
  border-radius: 8rpx;

  &.active {
    background: var(--gradient-end);
    border: 2rpx solid var(--primary);
  }
}

.custom-info {
  display: flex;
  flex-direction: column;
}

.custom-name {
  font-size: 14px;
  color: var(--text-dark);
  font-weight: 500;
}

.custom-model {
  font-size: 12px;
  color: var(--text-muted);
}

.delete-btn {
  font-size: 24rpx;
  color: #999;
  padding: 8rpx;
}

.empty-custom {
  padding: 16rpx;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
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

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-content {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
  width: 600rpx;
  margin: 40rpx;
}

.modal-title {
  font-size: 18px;
  font-weight: 500;
  color: var(--text-dark);
  display: block;
  margin-bottom: 32rpx;
  text-align: center;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  font-size: 13px;
  color: var(--text-muted);
  display: block;
  margin-bottom: 8rpx;
}

.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  border: 2rpx solid var(--border);
  border-radius: 12rpx;
  font-size: 28rpx;
  background: var(--bg-light);
  color: var(--text-dark);
  box-sizing: border-box;
}

.modal-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 32rpx;

  .btn-primary, .btn-outline {
    margin-top: 0;
    flex: 1;
  }
}
</style>