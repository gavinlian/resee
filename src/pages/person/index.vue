<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { db, Person, Relation, Media } from '@/utils/db'

const personId = ref('')
const person = ref<Person | null>(null)
const relations = ref<Relation[]>([])
const photos = ref<Media[]>([])
const loading = ref(false)
const activeTab = ref('info')

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

// 确认关系
async function confirmRelation(rel: Relation) {
  try {
    await db.confirmRelation(rel._id || '')
    loadPerson()
    uni.showToast({ title: '已确认', icon: 'success' })
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

// 获取关系类型标签
function getRelationLabel(rel: Relation): string {
  return rel.relation_type
}

// 跳转到关联成员
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

<template>
  <view class="person-page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <!-- 无数据 -->
    <view v-else-if="!person" class="empty">
      <text>未找到该成员</text>
    </view>

    <!-- 成员详情 -->
    <view v-else class="person-content">
      <!-- 头部信息 -->
      <view class="person-header">
        <view class="person-avatar">
          <text class="avatar-text">{{ person.name?.[0] || '?' }}</text>
        </view>
        <view class="person-main">
          <text class="person-name">{{ person.name }}</text>
          <text class="person-meta">
            {{ person.generation_name ? `第${person.generation}世 ${person.generation_name}` : `第${person.generation}世` }}
          </text>
          <text class="person-dates">
            {{ person.birth_date || '?' }}
            <text v-if="person.birth_date && person.death_date"> — </text>
            {{ person.death_date || '' }}
          </text>
        </view>
        <view class="person-status" :class="person.status">
          {{ person.status === 'confirmed' ? '已确认' : '待校正' }}
        </view>
      </view>

      <!-- 副信息：字/号 -->
      <view v-if="person.courtesy_name || person.art_name" class="person-alias">
        <text v-if="person.courtesy_name" class="alias-item">字：{{ person.courtesy_name }}</text>
        <text v-if="person.art_name" class="alias-item">号：{{ person.art_name }}</text>
      </view>

      <!-- Tab切换 -->
      <view class="person-tabs">
        <view
          class="tab-item"
          :class="{ active: activeTab === 'info' }"
          @click="activeTab = 'info'"
        >信息</view>
        <view
          class="tab-item"
          :class="{ active: activeTab === 'relations' }"
          @click="activeTab = 'relations'"
        >关系</view>
        <view
          class="tab-item"
          :class="{ active: activeTab === 'media' }"
          @click="activeTab = 'media'"
        >相册</view>
      </view>

      <!-- 信息Tab -->
      <view v-if="activeTab === 'info'" class="tab-content">
        <view class="info-group">
          <view class="info-label">性别</view>
          <view class="info-value">{{ person.gender === 'male' ? '男' : person.gender === 'female' ? '女' : '未知' }}</view>
        </view>

        <view v-if="person.location?.county" class="info-group">
          <view class="info-label">籍贯</view>
          <view class="info-value">{{ person.location.county }} {{ person.location.town }} {{ person.location.village }}</view>
        </view>

        <view v-if="person.marital_type" class="info-group">
          <view class="info-label">婚姻</view>
          <view class="info-value">{{ person.marital_type }}</view>
        </view>

        <view v-if="person.inheritance_line" class="info-group">
          <view class="info-label">房头</view>
          <view class="info-value">{{ person.inheritance_line }}</view>
        </view>

        <view v-if="person.biography?.career" class="info-group">
          <view class="info-label">职业</view>
          <view class="info-value">{{ person.biography.career }}</view>
        </view>

        <view v-if="person.residence?.birth_place?.county" class="info-group">
          <view class="info-label">出生地</view>
          <view class="info-value">
            {{ person.residence.birth_place.county }} {{ person.residence.birth_place.town }} {{ person.residence.birth_place.village }}
          </view>
        </view>

        <view v-if="person.tombstone?.has_tombstone" class="info-group">
          <view class="info-label">墓碑</view>
          <view class="info-value">
            {{ person.tombstone.inscription_text || '有墓碑' }}
            <text v-if="person.tombstone.location"> ({{ person.tombstone.location }})</text>
          </view>
        </view>

        <view v-if="person.ocr_raw_text" class="info-group">
          <view class="info-label">OCR原文</view>
          <view class="info-value ocr-text">{{ person.ocr_raw_text }}</view>
        </view>
      </view>

      <!-- 关系Tab -->
      <view v-if="activeTab === 'relations'" class="tab-content">
        <view
          v-for="rel in relations"
          :key="rel._id"
          class="relation-item"
          :class="rel.status"
          @click="goToPerson(rel.from_person_id === personId ? rel.to_person_id : rel.from_person_id)"
        >
          <view class="rel-info">
            <text class="rel-type">{{ rel.relation_type }}</text>
            <text class="rel-confidence">{{ (rel.confidence * 100).toFixed(0) }}%</text>
          </view>
          <view class="rel-status-badge" :class="rel.status">
            {{ rel.status === 'confirmed' ? '✓' : rel.status === 'inferred' ? '?' : '!' }}
          </view>
          <button
            v-if="rel.status !== 'confirmed'"
            class="btn-confirm"
            @click.stop="confirmRelation(rel)"
          >确认</button>
        </view>

        <view v-if="relations.length === 0" class="empty-relations">
          <text>暂无关系记录</text>
        </view>
      </view>

      <!-- 相册Tab -->
      <view v-if="activeTab === 'media'" class="tab-content">
        <view class="photos-grid">
          <view v-for="photo in photos" :key="photo._id" class="photo-item">
            <image :src="photo.url" mode="aspectFill" class="photo-image" />
            <text class="photo-desc">{{ photo.description }}</text>
          </view>
        </view>

        <view v-if="photos.length === 0" class="empty-photos">
          <text>暂无照片</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.person-page {
  min-height: 100vh;
  background: var(--bg-light);
}

.loading, .empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: var(--text-muted);
}

.person-content {
  padding: 24rpx;
}

.person-header {
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx var(--shadow);
}

.person-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;

  .avatar-text {
    font-size: 48rpx;
    color: #fff;
    font-weight: 600;
  }
}

.person-main {
  flex: 1;
}

.person-name {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-dark);
  display: block;
  margin-bottom: 8rpx;
}

.person-meta {
  font-size: 13px;
  color: var(--primary);
  display: block;
  margin-bottom: 4rpx;
}

.person-dates {
  font-size: 12px;
  color: var(--text-muted);
}

.person-status {
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  font-size: 12px;

  &.confirmed {
    background: #E8F5E9;
    color: #4CAF50;
  }

  &.pending_review, &.inferred, &.disputed {
    background: var(--gradient-end);
    color: var(--accent);
  }
}

.person-alias {
  display: flex;
  gap: 24rpx;
  padding: 16rpx 24rpx;
  background: var(--gradient-end);
  border-radius: 12rpx;
  margin-bottom: 24rpx;

  .alias-item {
    font-size: 13px;
    color: var(--primary);
  }
}

.person-tabs {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  padding: 8rpx;
  margin-bottom: 24rpx;
}

.tab-item {
  flex: 1;
  padding: 16rpx;
  text-align: center;
  font-size: 14px;
  color: var(--text-muted);
  border-radius: 12rpx;
  cursor: pointer;

  &.active {
    background: var(--primary);
    color: #fff;
  }
}

.tab-content {
  min-height: 400rpx;
}

.info-group {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  .info-label {
    font-size: 13px;
    color: var(--text-muted);
    min-width: 100rpx;
  }

  .info-value {
    font-size: 14px;
    color: var(--text-dark);
    text-align: right;
    flex: 1;
  }

  .ocr-text {
    font-size: 12px;
    color: var(--text-muted);
    background: var(--gradient-end);
    padding: 12rpx;
    border-radius: 8rpx;
    margin-top: 8rpx;
  }
}

.relation-item {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  border-left: 4rpx solid var(--primary);

  &.inferred {
    border-left-color: var(--secondary);
  }

  &.disputed {
    border-left-color: #F44336;
  }

  .rel-info {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  .rel-type {
    font-size: 15px;
    font-weight: 500;
    color: var(--text-dark);
  }

  .rel-confidence {
    font-size: 12px;
    color: var(--text-muted);
  }

  .rel-status-badge {
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20rpx;

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
    padding: 8rpx 24rpx;
    font-size: 12px;
    background: var(--primary);
    color: #fff;
    border-radius: 8rpx;
    border: none;
  }
}

.empty-relations, .empty-photos {
  text-align: center;
  padding: 80rpx;
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

  .photo-image {
    width: 100%;
    height: 100%;
    border-radius: 8rpx;
  }

  .photo-desc {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8rpx;
    background: rgba(0,0,0,0.4);
    color: #fff;
    font-size: 10px;
    border-radius: 0 0 8rpx 8rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>