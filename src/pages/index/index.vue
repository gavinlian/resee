<template>
  <view class="index-page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-content">
        <view class="header-left">
          <image class="brand-logo" src="/static/logo.svg" mode="aspectFit" />
          <view class="brand-text">
            <text class="brand">族见</text>
            <text class="slogan">见家族，见自己</text>
          </view>
        </view>
        <view class="header-right">
          <view class="user-btn" @click="goTo('/pages/settings/index')">
            <text class="user-icon">👤</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 功能入口卡片 -->
    <view class="quick-actions">
      <view class="action-card primary" @click="goTo('/pages/ocr/index')">
        <view class="action-icon-wrap">
          <text class="action-icon">📷</text>
        </view>
        <view class="action-text">
          <text class="action-title">扫描族谱</text>
          <text class="action-desc">拍照/上传识别</text>
        </view>
        <view class="action-arrow">→</view>
      </view>
      <view class="action-card secondary" @click="promptCreateFamily">
        <view class="action-icon-wrap">
          <text class="action-icon">✏️</text>
        </view>
        <view class="action-text">
          <text class="action-title">创建族谱</text>
          <text class="action-desc">手动录入成员</text>
        </view>
        <view class="action-arrow">→</view>
      </view>
    </view>

    <!-- 族谱列表 -->
    <view class="family-section">
      <view class="section-header">
        <text class="section-title">我的族谱</text>
        <text class="section-count" v-if="families.length > 0">{{ families.length }} 个</text>
      </view>

      <view v-if="loading" class="loading">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else-if="families.length === 0" class="empty">
        <view class="empty-illustration">
          <image class="empty-icon-svg" src="/static/logo.svg" mode="aspectFit" />
        </view>
        <text class="empty-title">还没有族谱</text>
        <text class="empty-hint">创建第一个族谱，开启数字家族之旅</text>
        <button class="btn-accent" @click="promptCreateFamily">
          <text>+ 创建族谱</text>
        </button>
      </view>

      <view v-else class="family-list">
        <view
          v-for="family in families"
          :key="family._id"
          class="family-card"
          @click="enterFamily(family)"
        >
          <view class="family-card-cover">
            <image class="cover-icon" src="/static/logo.svg" mode="aspectFit" />
          </view>
          <view class="family-card-main">
            <text class="family-name">{{ family.name }}</text>
            <text class="family-meta" v-if="family.description">{{ family.description }}</text>
            <text class="family-meta" v-else>点击查看详情</text>
          </view>
          <view class="family-card-arrow">›</view>
        </view>
      </view>
    </view>

    <!-- 底部安全区 -->
    <view class="safe-area-bottom"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { db, Family } from '@/utils/db'

const families = ref<Family[]>([])
const loading = ref(false)

function goTo(path: string) { uni.navigateTo({ url: path }) }

async function loadFamilies() {
  loading.value = true
  try {
    const uid = uni.getStorageSync('user_id') || 'guest'
    const res = await db.getFamiliesByOwner(uid)
    if (res.success && res.result && res.result.data) {
      families.value = res.result.data
    }
  } catch (e) {
    console.error('加载族谱失败', e)
  } finally {
    loading.value = false
  }
}

async function promptCreateFamily() {
  try {
    const res: any = await new Promise((resolve) => {
      uni.showModal({
        title: '创建族谱',
        editable: true,
        placeholderText: '请输入族谱名称',
        success: (r) => resolve(r),
      })
    })
    const name = res.content?.trim() || res.text?.trim() || ''
    if (!name) {
      uni.showToast({ title: '名称不能为空', icon: 'none' })
      return
    }
    const uid = uni.getStorageSync('user_id') || 'guest'
    const result = await db.addFamily({
      name,
      root_person_id: null,
      description: '',
      cover_image: null,
      owner_uid: uid,
      is_public: false,
      source: 'manual',
      origin: {
        ancestor_name: null, origin_location: null, immigrated_year: null,
        immigrated_reason: null, surname_origin: null, hall_name: null,
        ancestral_verse: null, editions: [],
      },
      location: { county: '', town: '', district: '', village: '' },
    })
    if (result.success) {
      uni.showToast({ title: '创建成功', icon: 'success' })
      loadFamilies()
    } else {
      uni.showToast({ title: '创建失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '创建失败', icon: 'none' })
  }
}

function enterFamily(family: Family) {
  uni.setStorageSync('current_family_id', family._id || '')
  uni.navigateTo({ url: `/pages/tree/index?familyId=${family._id}` })
}

onMounted(() => {
  loadFamilies()
})
</script>

<style scoped lang="scss">
.index-page {
  min-height: 100vh;
  background: var(--bg-light);
}

.header {
  background: linear-gradient(135deg, var(--primary) 0%, #6B5237 100%);
  padding: env(safe-area-inset-top) 0 0 0;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 40rpx;
  padding-top: calc(32rpx + env(safe-area-inset-top));
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.brand-logo {
  width: 64rpx;
  height: 64rpx;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand {
  font-family: 'Noto Serif SC', serif;
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2rpx;
}

.slogan {
  font-size: 12px;
  color: rgba(255,255,255,0.8);
  margin-top: 4rpx;
}

.header-right {
  .user-btn {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .user-icon {
    font-size: 36rpx;
  }
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding: 32rpx 40rpx;
}

.action-card {
  display: flex;
  align-items: center;
  padding: 32rpx;
  border-radius: 24rpx;
  cursor: pointer;
  transition: all 0.2s;

  &:active {
    transform: scale(0.98);
    opacity: 0.9;
  }

  &.primary {
    background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
    box-shadow: 0 8rpx 32rpx rgba(139, 111, 71, 0.3);
    color: #fff;
  }

  &.secondary {
    background: #fff;
    box-shadow: 0 4rpx 16rpx var(--shadow);
  }
}

.action-icon-wrap {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  background: rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;

  .secondary & {
    background: var(--gradient-end);
  }
}

.action-icon {
  font-size: 40rpx;
}

.action-text {
  flex: 1;
}

.action-title {
  font-size: 18px;
  font-weight: 600;
  display: block;
  margin-bottom: 6rpx;

  .secondary & {
    color: var(--text-dark);
  }
}

.action-desc {
  font-size: 13px;
  opacity: 0.8;
  display: block;

  .secondary & {
    color: var(--text-muted);
  }
}

.action-arrow {
  font-size: 28rpx;
  opacity: 0.6;

  .secondary & {
    color: var(--text-muted);
  }
}

.family-section {
  padding: 32rpx 40rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-dark);
}

.section-count {
  font-size: 12px;
  color: var(--text-muted);
  padding: 8rpx 20rpx;
  background: var(--gradient-end);
  border-radius: 20rpx;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
  gap: 16rpx;
}

.loading-spinner {
  width: 56rpx;
  height: 56rpx;
  border: 4rpx solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: var(--text-muted);
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 40rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx var(--shadow);
}

.empty-illustration {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 24rpx;
}

.empty-icon-svg {
  width: 100%;
  height: 100%;
}

.empty-title {
  font-size: 18px;
  font-weight: 500;
  color: var(--text-dark);
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 32rpx;
  text-align: center;
}

.btn-accent {
  background: linear-gradient(135deg, var(--accent) 0%, var(--primary) 100%);
  color: #fff;
  border-radius: 40rpx;
  padding: 24rpx 64rpx;
  font-size: 15px;
  font-weight: 500;
  border: none;
  box-shadow: 0 4rpx 16rpx rgba(212, 140, 74, 0.4);

  &:active {
    opacity: 0.9;
    transform: scale(0.98);
  }
}

.family-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.family-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  cursor: pointer;
  box-shadow: 0 2rpx 12rpx var(--shadow);
  transition: all 0.2s;

  &:active {
    transform: scale(0.99);
    box-shadow: 0 1rpx 6rpx var(--shadow);
  }
}

.family-card-cover {
  width: 96rpx;
  height: 96rpx;
  border-radius: 20rpx;
  background: var(--gradient-end);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  overflow: hidden;
}

.cover-icon {
  width: 64rpx;
  height: 64rpx;
}

.family-card-main {
  flex: 1;
  min-width: 0;
}

.family-name {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-dark);
  display: block;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.family-meta {
  font-size: 13px;
  color: var(--text-muted);
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.family-card-arrow {
  font-size: 32rpx;
  color: var(--text-muted);
  margin-left: 16rpx;
}

.safe-area-bottom {
  height: calc(160rpx + env(safe-area-inset-bottom));
}
</style>