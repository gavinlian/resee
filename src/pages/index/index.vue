<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { db, COLLECTIONS, Family } from '@/utils/db'

const families = ref<Family[]>([])
const loading = ref(false)
const showCreateModal = ref(false)
const newFamilyName = ref('')

// 加载族谱列表
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

// 创建族谱
async function createFamily() {
  if (!newFamilyName.value.trim()) {
    uni.showToast({ title: '请输入族谱名称', icon: 'none' })
    return
  }

  try {
    const uid = uni.getStorageSync('user_id') || 'guest'
    const res = await db.addFamily({
      name: newFamilyName.value.trim(),
      root_person_id: null,
      description: '',
      cover_image: null,
      owner_uid: uid,
      is_public: false,
      source: 'manual',
      origin: {
        ancestor_name: null,
        origin_location: null,
        immigrated_year: null,
        immigrated_reason: null,
        surname_origin: null,
        hall_name: null,
        ancestral_verse: null,
        editions: []
      },
      location: { county: '', town: '', district: '', village: '' }
    })

    if (res.success) {
      uni.showToast({ title: '创建成功', icon: 'success' })
      showCreateModal.value = false
      newFamilyName.value = ''
      loadFamilies()
    }
  } catch (e) {
    uni.showToast({ title: '创建失败', icon: 'none' })
  }
}

// 进入族谱
function enterFamily(family: Family) {
  uni.setStorageSync('current_family_id', family._id || '')
  uni.navigateTo({ url: `/pages/tree/index?familyId=${family._id}` })
}

// 删除族谱
async function deleteFamily(family: Family) {
  uni.showModal({
    title: '确认删除',
    content: `确定删除族谱"${family.name}"吗？此操作不可恢复。`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await db.deleteFamily(family._id || '')
          loadFamilies()
          uni.showToast({ title: '已删除', icon: 'success' })
        } catch {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

onMounted(() => {
  loadFamilies()
})
</script>

<template>
  <view class="index-page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-left">
        <text class="brand">族见</text>
        <text class="slogan">见家族，见自己</text>
      </view>
      <view class="header-right">
        <text class="user-avatar" @click="uni.navigateTo({ url: '/pages/settings/index' })">👤</text>
      </view>
    </view>

    <!-- 族谱列表 -->
    <view class="family-list">
      <view v-if="loading" class="loading">
        <text>加载中...</text>
      </view>

      <view v-else-if="families.length === 0" class="empty">
        <text class="empty-icon">📜</text>
        <text class="empty-text">还没有族谱</text>
        <text class="empty-hint">创建第一个族谱，开启数字家族之旅</text>
      </view>

      <view
        v-for="family in families"
        :key="family._id"
        class="family-card"
        @click="enterFamily(family)"
      >
        <view class="family-card-main">
          <text class="family-name">{{ family.name }}</text>
          <text class="family-desc">{{ family.description || '暂无描述' }}</text>
        </view>
        <view class="family-card-actions">
          <text class="action-btn" @click.stop="deleteFamily(family)">🗑️</text>
        </view>
      </view>
    </view>

    <!-- 底部操作区 -->
    <view class="bottom-actions">
      <button class="btn-primary" @click="showCreateModal = true">
        <text>+ 创建族谱</text>
      </button>

      <button class="btn-outline" @click="uni.navigateTo({ url: '/pages/ocr/index' })">
        <text>📷 扫描族谱</text>
      </button>
    </view>

    <!-- 创建族谱弹窗 -->
    <view v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
      <view class="modal-content" @click.stop>
        <text class="modal-title">创建新族谱</text>
        <input
          v-model="newFamilyName"
          class="input"
          style="width:100%;padding:20rpx 24rpx;border:2rpx solid #E0D5C8;border-radius:12rpx;font-size:28rpx;background:#fff;color:#333;box-sizing:border-box;"
          placeholder="请输入族谱名称"
          focus
        />
        <view class="modal-actions">
          <button class="btn-outline" @click="showCreateModal = false">取消</button>
          <button class="btn-primary" @click="createFamily">创建</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.index-page {
  min-height: 100vh;
  background: var(--bg-light);
  padding-bottom: 160rpx;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 40rpx;
  background: var(--primary);
  color: #fff;
}

.header-left {
  display: flex;
  flex-direction: column;
}

.brand {
  font-family: 'Cormorant Garamond', serif;
  font-size: 24px;
  font-weight: 600;
}

.slogan {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 4rpx;
}

.header-right {
  .user-avatar {
    font-size: 40rpx;
    cursor: pointer;
  }
}

.family-list {
  padding: 24rpx;
}

.loading {
  padding: 80rpx 0;
  text-align: center;
  color: var(--text-muted);
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 40rpx;

  .empty-icon {
    font-size: 80rpx;
    margin-bottom: 24rpx;
    opacity: 0.4;
  }

  .empty-text {
    font-size: 16px;
    color: var(--text-dark);
    margin-bottom: 12rpx;
  }

  .empty-hint {
    font-size: 13px;
    color: var(--text-muted);
  }
}

.family-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4rpx 16rpx var(--shadow);
}

.family-card-main {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.family-name {
  font-size: 17px;
  font-weight: 500;
  color: var(--text-dark);
  margin-bottom: 8rpx;
}

.family-desc {
  font-size: 13px;
  color: var(--text-muted);
}

.family-card-actions {
  .action-btn {
    font-size: 32rpx;
    padding: 16rpx;
    opacity: 0.6;
  }
}

.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: var(--bg-light);
  display: flex;
  gap: 24rpx;
  border-top: 2rpx solid var(--border);

  .btn-primary, .btn-outline {
    flex: 1;
    padding: 28rpx;
    font-size: 15px;
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

.modal-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 32rpx;

  .btn-primary, .btn-outline {
    flex: 1;
  }
}
</style>