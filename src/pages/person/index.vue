<template>
  <view class="person-page">
    <!-- 顶部导航 -->
    <view class="person-header-bar">
      <view class="header-left">
        <view class="back-btn" @click="goBack">
          <text class="back-icon">‹</text>
        </view>
        <text class="header-title">成员详情</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 无数据 -->
    <view v-else-if="!person" class="empty-state">
      <view class="empty-illustration">
        <text class="empty-icon">👤</text>
      </view>
      <text class="empty-text">未找到该成员</text>
    </view>

    <!-- 成员详情 -->
    <view v-else class="person-content">
      <!-- 头部信息卡片 -->
      <view class="person-hero">
        <view class="hero-avatar">
          <text class="avatar-text">{{ person.name?.[0] || '?' }}</text>
        </view>
        <view class="hero-info">
          <text class="hero-name">{{ person.name }}</text>
          <view class="hero-meta">
            <text v-if="person.generation_name" class="meta-badge generation">{{ person.generation_name }}</text>
            <text class="meta-badge">{{ person.gender === 'male' ? '男' : person.gender === 'female' ? '女' : '未知' }}</text>
            <view class="meta-badge status" :class="person.status">
              {{ person.status === 'confirmed' ? '已确认' : '待校正' }}
            </view>
          </view>
          <text class="hero-dates">
            {{ person.birth_date || '?' }}
            <text v-if="person.birth_date && person.death_date" class="date-sep"> — </text>
            {{ person.death_date || '' }}
          </text>
        </view>
      </view>

      <!-- 副信息：字/号 -->
      <view v-if="person.courtesy_name || person.art_name" class="person-alias">
        <view v-if="person.courtesy_name" class="alias-item">
          <text class="alias-label">字</text>
          <text class="alias-value">{{ person.courtesy_name }}</text>
        </view>
        <view v-if="person.art_name" class="alias-item">
          <text class="alias-label">号</text>
          <text class="alias-value">{{ person.art_name }}</text>
        </view>
      </view>

      <!-- Tab切换 -->
      <view class="person-tabs">
        <view
          class="tab-item"
          :class="{ active: activeTab === 'info' }"
          @click="activeTab = 'info'"
        >
          <text class="tab-icon">📋</text>
          <text class="tab-text">信息</text>
        </view>
        <view
          class="tab-item"
          :class="{ active: activeTab === 'relations' }"
          @click="activeTab = 'relations'"
        >
          <text class="tab-icon">🔗</text>
          <text class="tab-text">关系</text>
        </view>
        <view
          class="tab-item"
          :class="{ active: activeTab === 'media' }"
          @click="activeTab = 'media'"
        >
          <text class="tab-icon">📷</text>
          <text class="tab-text">相册</text>
        </view>
      </view>

      <!-- 信息Tab -->
      <view v-if="activeTab === 'info'" class="tab-content">
        <view class="info-card">
          <view class="info-row" v-if="person.location?.county">
            <text class="info-label">籍贯</text>
            <text class="info-value">{{ person.location.county }} {{ person.location.town }} {{ person.location.village }}</text>
          </view>
          <view class="info-row" v-if="person.marital_type">
            <text class="info-label">婚姻</text>
            <text class="info-value">{{ person.marital_type }}</text>
          </view>
          <view class="info-row" v-if="person.inheritance_line">
            <text class="info-label">房头</text>
            <text class="info-value">{{ person.inheritance_line }}</text>
          </view>
          <view class="info-row" v-if="person.biography?.career">
            <text class="info-label">职业</text>
            <text class="info-value">{{ person.biography.career }}</text>
          </view>
          <view class="info-row" v-if="person.residence?.birth_place?.county">
            <text class="info-label">出生地</text>
            <text class="info-value">
              {{ person.residence.birth_place.county }} {{ person.residence.birth_place.town }} {{ person.residence.birth_place.village }}
            </text>
          </view>
          <view class="info-row" v-if="person.tombstone?.has_tombstone">
            <text class="info-label">墓碑</text>
            <text class="info-value">
              {{ person.tombstone.inscription_text || '有墓碑' }}
              <text v-if="person.tombstone.location"> ({{ person.tombstone.location }})</text>
            </text>
          </view>
        </view>

        <view v-if="person.ocr_raw_text" class="ocr-card">
          <view class="ocr-header">
            <text class="ocr-title">OCR 原文</text>
          </view>
          <text class="ocr-text">{{ person.ocr_raw_text }}</text>
        </view>
      </view>

      <!-- 关系Tab -->
      <view v-if="activeTab === 'relations'" class="tab-content">
        <view
          v-for="rel in relations"
          :key="rel._id"
          class="relation-card"
          :class="rel.status"
          @click="goToPerson(rel.from_person_id === personId ? rel.to_person_id : rel.from_person_id)"
        >
          <view class="rel-avatar">
            <text>👤</text>
          </view>
          <view class="rel-info">
            <text class="rel-type">{{ rel.relation_type }}</text>
            <text class="rel-confidence">{{ (rel.confidence * 100).toFixed(0) }}% 置信</text>
          </view>
          <view class="rel-status-badge" :class="rel.status">
            {{ rel.status === 'confirmed' ? '✓' : rel.status === 'inferred' ? '?' : '!' }}
          </view>
          <button
            v-if="rel.status !== 'confirmed'"
            class="btn-confirm"
            @click.stop="confirmRelation(rel)"
          >
            确认
          </button>
        </view>

        <view v-if="relations.length === 0" class="empty-relations">
          <text class="empty-icon">🔗</text>
          <text class="empty-text">暂无关系记录</text>
        </view>
      </view>

      <!-- 相册Tab -->
      <view v-if="activeTab === 'media'" class="tab-content">
        <view v-if="photos.length > 0" class="photos-grid">
          <view v-for="photo in photos" :key="photo._id" class="photo-item">
            <image :src="photo.url" mode="aspectFill" class="photo-image" />
            <text v-if="photo.description" class="photo-desc">{{ photo.description }}</text>
          </view>
        </view>

        <view v-if="photos.length === 0" class="empty-photos">
          <text class="empty-icon">📷</text>
          <text class="empty-text">暂无照片</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { db, Person, Relation, Media } from '@/utils/db'

const personId = ref('')
const person = ref<Person | null>(null)
const relations = ref<Relation[]>([])
const photos = ref<Media[]>([])
const loading = ref(false)
const activeTab = ref('info')

function goBack() { uni.navigateBack() }

async function loadPerson() {
  if (!personId.value) return
  loading.value = true

  try {
    const [personRes, relationsRes, photosRes] = await Promise.all([
      db.getPerson(personId.value),
      db.getRelationsByPerson(personId.value),
      db.getMediaByPerson(personId.value)
    ])

    if (personRes.success && personRes.result?.data) {
      person.value = personRes.result.data[0]
    }

    if (relationsRes.success && relationsRes.result?.data) {
      relations.value = relationsRes.result.data
    }

    if (photosRes.success && photosRes.result?.data) {
      photos.value = photosRes.result.data.filter(m => m.type === 'photo')
    }
  } catch (e) {
    console.error('加载失败', e)
  } finally {
    loading.value = false
  }
}

async function confirmRelation(rel: Relation) {
  try {
    await db.confirmRelation(rel._id || '')
    loadPerson()
    uni.showToast({ title: '已确认', icon: 'success' })
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

function goToPerson(id: string) {
  uni.navigateTo({ url: `/pages/person/index?id=${id}` })
}

onMounted(() => {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const options = (current as any).$page?.options || {}
  personId.value = options.id || ''
  loadPerson()
})
</script>

<style scoped lang="scss">
.person-page {
  min-height: 100vh;
  background: var(--bg-light);
  padding-bottom: env(safe-area-inset-bottom);
}

.person-header-bar {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  background: #fff;
  border-bottom: 2rpx solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
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

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
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

.empty-illustration {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: var(--gradient-end);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}

.empty-icon {
  font-size: 80rpx;
}

.empty-text {
  font-size: 17px;
  color: var(--text-muted);
}

.person-content {
  padding: 24rpx;
}

.person-hero {
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: linear-gradient(135deg, var(--primary) 0%, #6B5237 100%);
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
}

.hero-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: 48rpx;
  color: #fff;
  font-weight: 600;
}

.hero-info {
  flex: 1;
}

.hero-name {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  display: block;
  margin-bottom: 12rpx;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 12rpx;
}

.meta-badge {
  font-size: 11px;
  padding: 6rpx 14rpx;
  border-radius: 20rpx;
  background: rgba(255,255,255,0.2);
  color: #fff;

  &.generation {
    background: var(--secondary);
  }

  &.status {
    &.confirmed {
      background: #4CAF50;
    }

    &.pending_review, &.inferred, &.disputed {
      background: var(--accent);
    }
  }
}

.hero-dates {
  font-size: 13px;
  color: rgba(255,255,255,0.8);
  display: block;
}

.date-sep {
  margin: 0 8rpx;
}

.person-alias {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  background: var(--gradient-end);
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}

.alias-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.alias-label {
  font-size: 12px;
  color: var(--text-muted);
}

.alias-value {
  font-size: 14px;
  color: var(--primary);
  font-weight: 500;
}

.person-tabs {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  padding: 8rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx var(--shadow);
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 20rpx;
  border-radius: 12rpx;
  cursor: pointer;
  transition: all 0.2s;

  &.active {
    background: var(--primary);

    .tab-icon, .tab-text {
      color: #fff;
    }
  }
}

.tab-icon {
  font-size: 24rpx;
}

.tab-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted);
}

.tab-content {
  min-height: 400rpx;
}

.info-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 8rpx 0;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx var(--shadow);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid var(--border);

  &:last-child {
    border-bottom: none;
  }
}

.info-label {
  font-size: 14px;
  color: var(--text-muted);
  min-width: 100rpx;
}

.info-value {
  font-size: 14px;
  color: var(--text-dark);
  text-align: right;
  flex: 1;
}

.ocr-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 12rpx var(--shadow);
}

.ocr-header {
  margin-bottom: 16rpx;
}

.ocr-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted);
}

.ocr-text {
  font-size: 13px;
  color: var(--text-dark);
  line-height: 1.8;
  background: var(--gradient-end);
  padding: 20rpx;
  border-radius: 12rpx;
  display: block;
}

.relation-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 2rpx 12rpx var(--shadow);
  border-left: 6rpx solid var(--primary);
  cursor: pointer;

  &.inferred {
    border-left-color: var(--secondary);
  }

  &.disputed {
    border-left-color: #F44336;
  }

  &:active {
    transform: scale(0.99);
  }
}

.rel-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: var(--gradient-end);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
}

.rel-info {
  flex: 1;
}

.rel-type {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-dark);
  display: block;
  margin-bottom: 4rpx;
}

.rel-confidence {
  font-size: 12px;
  color: var(--text-muted);
  display: block;
}

.rel-status-badge {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  margin-right: 12rpx;

  &.confirmed {
    background: var(--primary);
    color: #fff;
  }

  &.inferred, &.disputed {
    background: var(--accent);
    color: #fff;
  }
}

.btn-confirm {
  padding: 12rpx 24rpx;
  font-size: 12px;
  background: var(--primary);
  color: #fff;
  border-radius: 10rpx;
  border: none;

  &:active { opacity: 0.9; }
}

.empty-relations, .empty-photos {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx;
  gap: 12rpx;
}

.empty-icon {
  font-size: 64rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  color: var(--text-muted);
}

.photos-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8rpx;
}

.photo-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 12rpx;
  overflow: hidden;
  background: var(--bg-light);
}

.photo-image {
  width: 100%;
  height: 100%;
}

.photo-desc {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8rpx;
  background: rgba(0,0,0,0.5);
  color: #fff;
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>