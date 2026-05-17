<template>
  <view class="settings-page">
    <!-- 顶部导航 -->
    <view class="settings-header">
      <view class="header-left">
        <view class="back-btn" @click="goBack">
          <text class="back-icon">‹</text>
        </view>
        <text class="header-title">设置</text>
      </view>
    </view>

    <!-- 用户信息卡片 -->
    <view class="user-card" @click="onUserCardClick">
      <view class="user-avatar">
        <text class="avatar-text">{{ isLoggedIn ? '👤' : '👤' }}</text>
      </view>
      <view class="user-info">
        <text class="user-name">{{ isLoggedIn ? userName : '游客用户' }}</text>
        <text class="user-hint">{{ isLoggedIn ? '已登录' : '登录后可同步数据' }}</text>
      </view>
      <view class="user-arrow">›</view>
    </view>

    <!-- 设置分组 -->
    <view class="settings-group">
      <text class="group-title">AI 设置</text>

      <!-- AI 提供商 -->
      <view class="setting-section">
        <view class="setting-item">
          <view class="setting-label">
            <text class="label-text">AI 提供商</text>
            <text class="label-desc">选择要使用的 AI 模型服务商</text>
          </view>
        </view>
        <view class="provider-tabs">
          <view
            v-for="tab in presetTabs"
            :key="tab.key"
            class="provider-tab"
            :class="{ active: aiConfig.provider === tab.key }"
            @click="switchProvider(tab.key)"
          >
            <text class="tab-icon">{{ tab.icon }}</text>
            <text class="tab-name">{{ tab.name }}</text>
          </view>
        </view>
      </view>

      <!-- 自定义提供商 -->
      <view class="setting-section">
        <view class="setting-header-row">
          <text class="setting-title">自定义 AI</text>
          <view class="add-btn" @click="showAddCustom">
            <text>+ 添加</text>
          </view>
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

      <!-- 模型选择 -->
      <view class="setting-section">
        <view class="setting-header-row">
          <view class="setting-label">
            <text class="label-text">模型</text>
            <text class="label-desc">选择具体使用的 AI 模型</text>
          </view>
          <view v-if="!editMode" class="edit-btn" @click="enterEditMode">
            <text>编辑</text>
          </view>
        </view>
        <view class="model-list">
          <template v-if="!editMode">
            <view
              v-for="model in currentModels"
              :key="model.id"
              class="model-item"
              :class="{ active: aiConfig.model === model.id }"
              @click="switchModel(model.id)"
            >
              <view class="model-info">
                <text class="model-name">{{ model.name }}</text>
                <text class="model-desc">{{ model.description }}</text>
              </view>
              <view v-if="aiConfig.model === model.id" class="model-check">✓</view>
            </view>
          </template>
          <template v-else>
            <view
              v-for="model in (currentProviderInfo?.models || [])"
              :key="model.id"
              class="model-item"
              :class="{ enabled: isModelEnabled(model.id) }"
              @click="toggleModel(model.id)"
            >
              <view class="model-info">
                <text class="model-name">{{ model.name }}</text>
                <text class="model-desc">{{ model.description }}</text>
              </view>
              <text class="check-icon">{{ isModelEnabled(model.id) ? '✓' : '' }}</text>
            </view>
          </template>
        </view>
        <view v-if="editMode" class="edit-actions">
          <button class="btn-outline-sm" @click="cancelEdit">取消</button>
          <button class="btn-primary-sm" @click="saveEnabledModelList">保存</button>
        </view>
      </view>

      <!-- API Key -->
      <view class="setting-section">
        <view class="setting-label">
          <text class="label-text">API Key</text>
          <text class="label-desc">输入您的 API 密钥（可选）</text>
        </view>
        <view class="api-key-box" style="display: flex; align-items: center;">
          <input
            v-model="aiConfig.apiKey"
            class="api-input"
            style="flex:1;min-width:0;padding:24rpx;border:2rpx solid var(--border);border-radius:12rpx;font-size:14px;background:var(--bg-light);color:var(--text-dark);box-sizing:border-box;outline:none;"
            type="text"
            confirm-type="done"
            placeholder="sk-..."
          />
        </view>
      </view>

      <button class="btn-save" @click="saveAiProvider">
        <text>保存 AI 设置</text>
      </button>
    </view>

    <!-- 额度信息 -->
    <view class="settings-group">
      <text class="group-title">今日额度</text>
      <view class="quota-cards">
        <view class="quota-item">
          <text class="quota-icon">📷</text>
          <view class="quota-info">
            <text class="quota-label">OCR 识别</text>
            <text class="quota-value">{{ limits.limits.ocr >= 0 ? limits.limits.ocr : '∞' }} 次</text>
          </view>
        </view>
        <view class="quota-item">
          <text class="quota-icon">🧠</text>
          <view class="quota-info">
            <text class="quota-label">AI 解析</text>
            <text class="quota-value">{{ limits.limits.parse >= 0 ? limits.limits.parse : '∞' }} 次</text>
          </view>
        </view>
        <view class="quota-item">
          <text class="quota-icon">🔍</text>
          <view class="quota-info">
            <text class="quota-label">AI 搜索</text>
            <text class="quota-value">{{ limits.limits.search >= 0 ? limits.limits.search : '∞' }} 次</text>
          </view>
        </view>
      </view>
      <text class="quota-hint">免费用户每日限额，会员无限使用</text>
    </view>

    <!-- 数据管理 -->
    <view class="settings-group">
      <text class="group-title">数据管理</text>
      <button class="btn-danger" @click="clearLocalData">
        <text class="btn-icon">🗑️</text>
        <text>清除本地数据</text>
      </button>
    </view>

    <!-- 关于 -->
    <view class="settings-group">
      <text class="group-title">关于</text>
      <view class="about-card">
        <view class="about-logo">
          <text class="logo-text">族见</text>
        </view>
        <view class="about-info">
          <text class="about-name">族见族谱工具</text>
          <text class="about-version">版本 1.0.0</text>
          <text class="about-slogan">见家族，见自己</text>
        </view>
      </view>
    </view>

    <!-- 底部间距 -->
    <view class="bottom-spacer"></view>

    <!-- 添加自定义提供商弹窗 -->
    <view v-if="showCustomForm" class="modal-overlay" @click="showCustomForm = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">添加自定义 AI</text>
          <text class="modal-close" @click="showCustomForm = false">✕</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">名称</text>
            <input v-model="customForm.name" style="flex:1;min-width:0;padding:24rpx;border:2rpx solid var(--border);border-radius:12rpx;font-size:15px;background:var(--bg-light);color:var(--text-dark);box-sizing:border-box;outline:none;" placeholder="如：我的模型" />
          </view>
          <view class="form-item">
            <text class="form-label">API 地址</text>
            <input v-model="customForm.baseUrl" style="flex:1;min-width:0;padding:24rpx;border:2rpx solid var(--border);border-radius:12rpx;font-size:15px;background:var(--bg-light);color:var(--text-dark);box-sizing:border-box;outline:none;" placeholder="https://api.example.com/v1" />
          </view>
          <view class="form-item">
            <text class="form-label">模型名称</text>
            <input v-model="customForm.model" style="flex:1;min-width:0;padding:24rpx;border:2rpx solid var(--border);border-radius:12rpx;font-size:15px;background:var(--bg-light);color:var(--text-dark);box-sizing:border-box;outline:none;" placeholder="如：gpt-4o" />
          </view>
          <view class="form-item">
            <text class="form-label">API Key（可选）</text>
            <input v-model="customForm.apiKey" style="flex:1;min-width:0;padding:24rpx;border:2rpx solid var(--border);border-radius:12rpx;font-size:15px;background:var(--bg-light);color:var(--text-dark);box-sizing:border-box;outline:none;" placeholder="sk-..." />
          </view>
        </view>
        <view class="modal-footer">
          <button class="btn-outline" @click="showCustomForm = false">取消</button>
          <button class="btn-primary" @click="doAddCustom">添加</button>
        </view>
      </view>
    </view>
  </view>
</template>

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

const isLoggedIn = computed(() => {
  const uid = uni.getStorageSync('user_id')
  return uid && uid !== 'guest' && !uid.startsWith('guest_')
})

const userName = computed(() => {
  return uni.getStorageSync('user_name') || '微信用户'
})

function onUserCardClick() {
  if (isLoggedIn.value) {
    uni.showActionSheet({
      itemList: ['查看账号', '退出登录'],
      success: (res) => {
        if (res.tapIndex === 0) {
          uni.showToast({ title: '账号信息', icon: 'none' })
        } else {
          doLogout()
        }
      }
    })
  } else {
    uni.navigateTo({ url: '/pages/login/index' })
  }
}

function doLogout() {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        uni.removeStorageSync('user_id')
        uni.removeStorageSync('token')
        uni.removeStorageSync('user_name')
        uni.showToast({ title: '已退出', icon: 'success' })
      }
    }
  })
}

const customForm = ref({
  name: '',
  baseUrl: '',
  model: '',
  apiKey: ''
})

const allProviders = computed(() => getAllProviders())
const currentProviderInfo = computed(() => getProviderInfo(aiConfig.value.provider))

const currentModels = computed(() => {
  const info = currentProviderInfo.value
  if (!info) return []
  const enabled = getEnabledModels()
  return info.models.filter(m => enabled.includes(m.id))
})

const presetTabs = [
  { key: 'qwen', name: '通义千问', icon: '🧠' },
  { key: 'minimax', name: 'MiniMax', icon: '🤖' },
  { key: 'siliconflow', name: '硅基流动', icon: '🌊' },
  { key: 'openai', name: 'OpenAI', icon: '🌐' },
  { key: 'deepseek', name: 'DeepSeek', icon: '🔮' },
  { key: 'zhipu', name: '智谱AI', icon: '✨' }
]

function goBack() { uni.navigateBack() }

function switchProvider(provider: string) {
  aiConfig.value.provider = provider
  const enabled = getEnabledModels()
  const info = getProviderInfo(provider)
  if (info && info.models.length > 0) {
    const firstEnabled = info.models.find(m => enabled.includes(m.id))
    aiConfig.value.model = firstEnabled ? firstEnabled.id : info.models[0].id
  }
}

function switchModel(model: string) {
  aiConfig.value.model = model
}

function enterEditMode() {
  tempEnabledModels.value = [...getEnabledModels()]
  editMode.value = true
}

function cancelEdit() {
  editMode.value = false
}

function toggleModel(modelId: string) {
  const idx = tempEnabledModels.value.indexOf(modelId)
  if (idx >= 0) {
    tempEnabledModels.value.splice(idx, 1)
  } else {
    tempEnabledModels.value.push(modelId)
  }
}

function isModelEnabled(modelId: string) {
  return tempEnabledModels.value.includes(modelId)
}

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

function saveAiProvider() {
  saveConfig(aiConfig.value)
  saveAIConfig(aiConfig.value)
  uni.showToast({ title: '保存成功', icon: 'success' })
}

function showAddCustom() {
  customForm.value = { name: '', baseUrl: '', model: '', apiKey: '' }
  showCustomForm.value = true
}

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

  aiConfig.value.provider = `custom_${id}`
  aiConfig.value.model = customForm.value.model
  if (customForm.value.apiKey) {
    aiConfig.value.apiKey = customForm.value.apiKey
  }
  saveAiProvider()
}

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

<style scoped lang="scss">
.settings-page {
  min-height: 100vh;
  background: var(--bg-light);
  padding-bottom: env(safe-area-inset-bottom);
}

.settings-header {
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

.user-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 32rpx;
  background: linear-gradient(135deg, var(--primary) 0%, #6B5237 100%);
  color: #fff;
}

.user-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: 44rpx;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 18px;
  font-weight: 600;
  display: block;
  margin-bottom: 6rpx;
}

.user-hint {
  font-size: 12px;
  opacity: 0.8;
  display: block;
}

.user-arrow {
  font-size: 32rpx;
  opacity: 0.7;
}

.settings-group {
  padding: 32rpx 24rpx 0;
}

.group-title {
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 500;
  display: block;
  margin-bottom: 16rpx;
  padding-left: 8rpx;
}

.setting-section {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.setting-item {
  margin-bottom: 16rpx;
}

.setting-label {
  margin-bottom: 12rpx;
}

.label-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-dark);
  display: block;
  margin-bottom: 4rpx;
}

.label-desc {
  font-size: 12px;
  color: var(--text-muted);
  display: block;
}

.setting-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.setting-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-dark);
}

.edit-btn, .add-btn {
  font-size: 13px;
  color: var(--primary);
  padding: 8rpx 16rpx;
}

.provider-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.provider-tab {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 20rpx;
  background: var(--bg-light);
  border-radius: 12rpx;
  transition: all 0.2s;

  &.active {
    background: var(--primary);
    color: #fff;

    .tab-name {
      color: #fff;
    }
  }
}

.tab-icon {
  font-size: 24rpx;
}

.tab-name {
  font-size: 13px;
  color: var(--text-dark);
}

.custom-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.custom-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx;
  background: var(--bg-light);
  border-radius: 12rpx;
  transition: all 0.2s;

  &.active {
    background: var(--gradient-end);
    border: 2rpx solid var(--primary);
  }
}

.custom-info {
  flex: 1;
}

.custom-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-dark);
  display: block;
  margin-bottom: 4rpx;
}

.custom-model {
  font-size: 12px;
  color: var(--text-muted);
  display: block;
}

.delete-btn {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: var(--text-muted);
}

.empty-custom {
  text-align: center;
  padding: 24rpx;
  font-size: 13px;
  color: var(--text-muted);
}

.model-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.model-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx;
  background: var(--bg-light);
  border-radius: 12rpx;
  transition: all 0.2s;

  &.active {
    background: var(--gradient-end);
    border: 2rpx solid var(--primary);
  }

  &.enabled {
    background: #E8F5E9;
    border: 2rpx solid #4CAF50;
  }
}

.model-info {
  flex: 1;
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
  display: block;
}

.model-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
}

.check-icon {
  width: 40rpx;
  font-size: 20rpx;
  color: #4CAF50;
  text-align: center;
}

.edit-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}

.btn-outline-sm, .btn-primary-sm {
  flex: 1;
  padding: 20rpx;
  border-radius: 12rpx;
  font-size: 14px;
  text-align: center;
  border: none;

  &:active { opacity: 0.9; }
}

.btn-outline-sm {
  background: var(--bg-light);
  color: var(--text-dark);
}

.btn-primary-sm {
  background: var(--primary);
  color: #fff;
}

.api-key-box {
  margin-top: 8rpx;
}

.api-input {
  width: 100%;
  padding: 24rpx;
  border: 2rpx solid var(--border);
  border-radius: 12rpx;
  font-size: 14px;
  background: var(--bg-light);
  color: var(--text-dark);
  box-sizing: border-box;

  &:focus {
    border-color: var(--primary);
  }
}

.btn-save {
  width: 100%;
  padding: 28rpx;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  color: #fff;
  border-radius: 16rpx;
  font-size: 16px;
  font-weight: 500;
  border: none;
  box-shadow: 0 4rpx 16rpx rgba(139, 111, 71, 0.3);
  margin-top: 16rpx;

  &:active { opacity: 0.9; }
}

.quota-cards {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.quota-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
}

.quota-icon {
  font-size: 36rpx;
}

.quota-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quota-label {
  font-size: 14px;
  color: var(--text-dark);
}

.quota-value {
  font-size: 16px;
  color: var(--primary);
  font-weight: 600;
}

.quota-hint {
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
  display: block;
  margin-top: 12rpx;
}

.btn-danger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 28rpx;
  background: #fff;
  border: 2rpx solid #FFCDD2;
  border-radius: 16rpx;
  font-size: 15px;
  color: #F44336;

  &:active { background: #FFEBEE; }
}

.btn-icon {
  font-size: 28rpx;
}

.about-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
  background: #fff;
  border-radius: 20rpx;
}

.about-logo {
  width: 96rpx;
  height: 96rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  font-family: 'Noto Serif SC', serif;
}

.about-info {
  flex: 1;
}

.about-name {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-dark);
  display: block;
  margin-bottom: 6rpx;
}

.about-version {
  font-size: 12px;
  color: var(--text-muted);
  display: block;
  margin-bottom: 8rpx;
}

.about-slogan {
  font-size: 13px;
  color: var(--secondary);
  display: block;
}

.bottom-spacer {
  height: 100rpx;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 999;
  padding: 0 env(safe-area-inset-bottom);
}

.modal-content {
  width: 100%;
  max-width: 720rpx;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 40rpx 40rpx 0;
  margin-bottom: 32rpx;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-dark);
}

.modal-close {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: var(--bg-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: var(--text-muted);
}

.modal-body {
  padding: 0 40rpx;
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
  padding: 24rpx;
  border: 2rpx solid var(--border);
  border-radius: 12rpx;
  font-size: 15px;
  background: var(--bg-light);
  color: var(--text-dark);
  box-sizing: border-box;

  &:focus {
    border-color: var(--primary);
  }
}

.modal-footer {
  display: flex;
  gap: 20rpx;
  padding: 32rpx 40rpx;
}

.btn-primary, .btn-outline {
  flex: 1;
  padding: 28rpx;
  border-radius: 16rpx;
  font-size: 16px;
  font-weight: 500;
  border: none;

  &:active { opacity: 0.9; }
}

.btn-primary {
  background: var(--primary);
  color: #fff;
}

.btn-outline {
  background: transparent;
  border: 2rpx solid var(--border);
  color: var(--text-muted);
}
</style>