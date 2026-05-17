<template>
  <view class="tree-page">
    <!-- 顶部工具栏 -->
    <view class="tree-toolbar">
      <view class="toolbar-left">
        <view class="back-btn" @click="goBack">
          <text class="back-icon">‹</text>
        </view>
        <text class="toolbar-title">族谱树</text>
      </view>
      <view class="toolbar-right">
        <view class="toolbar-btn" @click="showModeMenu = true">
          <text class="btn-icon">☰</text>
          <text class="btn-text">{{ viewMode === 'su' ? '苏式' : viewMode === 'ou' ? '欧式' : '宝塔' }}</text>
        </view>
        <view class="toolbar-btn" @click="onZoom(-0.1)">
          <text class="btn-icon">−</text>
        </view>
        <text class="scale-label">{{ Math.round(scale * 100) }}%</text>
        <view class="toolbar-btn" @click="onZoom(0.1)">
          <text class="btn-icon">+</text>
        </view>
        <view class="toolbar-btn" @click="onExport">
          <text class="btn-icon">↗</text>
        </view>
      </view>
    </view>

    <!-- 模式选择菜单 -->
    <view v-if="showModeMenu" class="mode-menu">
      <view class="mode-menu-header">
        <text class="menu-title">视图模式</text>
        <text class="menu-close" @click="showModeMenu = false">✕</text>
      </view>
      <view class="mode-list">
        <view
          class="mode-item"
          :class="{ active: viewMode === 'su' }"
          @click="switchMode('su')"
        >
          <view class="mode-preview su-preview">
            <view class="preview-line"></view>
            <view class="preview-line"></view>
            <view class="preview-line"></view>
          </view>
          <view class="mode-info">
            <text class="mode-name">苏式</text>
            <text class="mode-desc">竖排世代，适合人少的家族</text>
          </view>
          <view v-if="viewMode === 'su'" class="mode-check">✓</view>
        </view>
        <view
          class="mode-item"
          :class="{ active: viewMode === 'ou' }"
          @click="switchMode('ou')"
        >
          <view class="mode-preview ou-preview">
            <view class="preview-row">
              <view class="preview-node"></view>
            </view>
            <view class="preview-row">
              <view class="preview-node"></view>
              <view class="preview-node"></view>
            </view>
          </view>
          <view class="mode-info">
            <text class="mode-name">欧式</text>
            <text class="mode-desc">横排房份，适合人多房多的家族</text>
          </view>
          <view v-if="viewMode === 'ou'" class="mode-check">✓</view>
        </view>
        <view
          class="mode-item"
          :class="{ active: viewMode === 'pagoda' }"
          @click="switchMode('pagoda')"
        >
          <view class="mode-preview pagoda-preview">
            <view class="preview-tier"></view>
            <view class="preview-tier"></view>
            <view class="preview-tier"></view>
          </view>
          <view class="mode-info">
            <text class="mode-name">宝塔式</text>
            <text class="mode-desc">金字塔形，简洁直观</text>
          </view>
          <view v-if="viewMode === 'pagoda'" class="mode-check">✓</view>
        </view>
      </view>
    </view>

    <!-- 树形画布 -->
    <view class="tree-canvas-wrap">
      <view class="tree-canvas" :style="{ transform: `scale(${scale})` }">
        <view v-if="loading" class="loading-state">
          <view class="loading-spinner"></view>
          <text class="loading-text">加载中...</text>
        </view>

        <view v-else-if="persons.length === 0" class="empty-state">
          <view class="empty-illustration">
            <text class="empty-icon">🌳</text>
          </view>
          <text class="empty-title">暂无族谱数据</text>
          <text class="empty-hint">扫描族谱或手动添加成员</text>
          <button class="btn-accent" @click="goTo('/pages/ocr/index')">
            <text>📷 扫描族谱</text>
          </button>
        </view>

        <!-- 简化的树形列表视图 -->
        <view v-else class="tree-list">
          <view
            v-for="person in persons"
            :key="person._id"
            class="tree-node"
            :class="{ selected: selectedPerson?._id === person._id, confirmed: person.status === 'confirmed' }"
            :style="{ marginLeft: (person.generation - (rootPerson?.generation || 1)) * 48 + 'rpx' }"
            @click="onPersonClick(person)"
          >
            <view class="node-connector" v-if="person.generation > (rootPerson?.generation || 1)">
              <text class="connector-line">├</text>
            </view>
            <view class="node-avatar">
              <text class="avatar-text">{{ person.name?.[0] || '?' }}</text>
            </view>
            <view class="node-content">
              <text class="node-name">{{ person.name }}</text>
              <text class="node-meta">
                <text v-if="person.generation_name">{{ person.generation_name }}</text>
                <text v-if="person.birth_date"> {{ person.birth_date }}</text>
                <text v-if="person.death_date"> - {{ person.death_date }}</text>
              </text>
            </view>
            <view class="node-status" :class="person.status">
              {{ person.status === 'confirmed' ? '' : '?' }}
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作 -->
    <view class="tree-bottom">
      <button class="btn-outline" @click="goTo('/pages/graph/index?familyId=' + familyId)">
        <text class="btn-icon-text">🔗</text>
        <text>关系图</text>
      </button>
      <button class="btn-primary" @click="goTo('/pages/ocr/index')">
        <text class="btn-icon-text">📷</text>
        <text>扫描</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { db, Person } from '@/utils/db'

const familyId = ref('')
const persons = ref<Person[]>([])
const loading = ref(false)
const viewMode = ref<'su' | 'ou' | 'pagoda'>('su')
const showModeMenu = ref(false)
const scale = ref(1)

function goTo(path: string) { uni.navigateTo({ url: path }) }
function goBack() { uni.navigateBack() }

const selectedPerson = ref<Person | null>(null)

async function loadPersons() {
  if (!familyId.value) return
  loading.value = true
  try {
    const res = await db.getPersonsByFamily(familyId.value)
    if (res.success && res.result && res.result.data) {
      persons.value = res.result.data
    }
  } catch (e) {
    console.error('加载成员失败', e)
  } finally {
    loading.value = false
  }
}

const rootPerson = computed(() => {
  if (persons.value.length === 0) return null
  return persons.value.reduce((min, p) =>
    (p.generation < (min?.generation ?? Infinity)) ? p : min
  , null as Person | null)
})

function getChildren(person: Person): Person[] {
  return persons.value.filter(p => p.parent_id === person._id)
}

function drawTree() {}

function switchMode(mode: 'su' | 'ou' | 'pagoda') {
  viewMode.value = mode
  showModeMenu.value = false
  drawTree()
}

function onPersonClick(person: Person) {
  selectedPerson.value = person
  setTimeout(() => {
    uni.navigateTo({ url: `/pages/person/index?id=${person._id}` })
  }, 200)
}

function onZoom(delta: number) {
  scale.value = Math.max(0.3, Math.min(3, scale.value + delta))
  drawTree()
}

function onExport() {
  goTo(`/pages/export/index?familyId=${familyId.value}`)
}

onMounted(() => {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const options = (current as any).$page?.options || {}
  familyId.value = options.familyId || uni.getStorageSync('current_family_id') || ''

  if (!familyId.value) {
    uni.showToast({ title: '请先选择族谱', icon: 'none' })
  } else {
    loadPersons()
  }
})
</script>

<style scoped lang="scss">
.tree-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-light);
}

.tree-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  background: #fff;
  border-bottom: 2rpx solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.toolbar-left {
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

.toolbar-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-dark);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 12rpx 16rpx;
  border-radius: 12rpx;
  background: var(--bg-light);
}

.btn-icon {
  font-size: 24rpx;
  color: var(--primary);
}

.btn-text {
  font-size: 12px;
  color: var(--text-dark);
}

.scale-label {
  font-size: 12px;
  color: var(--text-muted);
  min-width: 56rpx;
  text-align: center;
}

.mode-menu {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 480rpx;
  background: #fff;
  z-index: 100;
  box-shadow: -4rpx 0 24rpx rgba(0,0,0,0.1);
  animation: slideIn 0.25s ease-out;
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.mode-menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 32rpx 24rpx;
  border-bottom: 2rpx solid var(--border);
}

.menu-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-dark);
}

.menu-close {
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

.mode-list {
  padding: 24rpx;
}

.mode-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  background: var(--bg-light);
  cursor: pointer;
  transition: all 0.2s;

  &.active {
    background: var(--gradient-end);
    border: 2rpx solid var(--primary);
  }

  &:active {
    opacity: 0.8;
  }
}

.mode-preview {
  width: 80rpx;
  height: 80rpx;
  border-radius: 12rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.su-preview {
  flex-direction: column;
  gap: 8rpx;
}

.preview-line {
  width: 48rpx;
  height: 8rpx;
  background: var(--primary);
  border-radius: 4rpx;
}

.ou-preview {
  flex-direction: column;
  gap: 8rpx;
}

.preview-row {
  display: flex;
  gap: 8rpx;
}

.preview-node {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: var(--accent);
}

.pagoda-preview {
  flex-direction: column;
  gap: 4rpx;
}

.preview-tier {
  width: 56rpx;
  height: 12rpx;
  background: var(--secondary);
  border-radius: 6rpx;

  &:nth-child(1) { width: 32rpx; }
  &:nth-child(2) { width: 48rpx; }
  &:nth-child(3) { width: 64rpx; }
}

.mode-info {
  flex: 1;
}

.mode-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-dark);
  display: block;
  margin-bottom: 4rpx;
}

.mode-desc {
  font-size: 12px;
  color: var(--text-muted);
  display: block;
}

.mode-check {
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

.tree-canvas-wrap {
  flex: 1;
  overflow: auto;
  padding: 24rpx;
}

.tree-canvas {
  min-height: 100%;
  transition: transform 0.2s;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;
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

.empty-title {
  font-size: 17px;
  font-weight: 500;
  color: var(--text-dark);
  margin-bottom: 8rpx;
}

.empty-hint {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 32rpx;
}

.btn-accent {
  background: linear-gradient(135deg, var(--accent) 0%, var(--primary) 100%);
  color: #fff;
  border-radius: 40rpx;
  padding: 24rpx 48rpx;
  font-size: 14px;
  font-weight: 500;
  border: none;
  box-shadow: 0 4rpx 16rpx rgba(212, 140, 74, 0.4);

  &:active {
    opacity: 0.9;
  }
}

.tree-list {
  display: flex;
  flex-direction: column;
  padding-bottom: 160rpx;
}

.tree-node {
  display: flex;
  align-items: center;
  padding: 16rpx 20rpx;
  margin-bottom: 12rpx;
  background: #fff;
  border-radius: 16rpx;
  cursor: pointer;
  box-shadow: 0 2rpx 8rpx var(--shadow);
  transition: all 0.2s;

  &:active {
    transform: scale(0.99);
  }

  &.selected {
    background: var(--gradient-end);
    border: 2rpx solid var(--primary);
  }

  &.confirmed {
    border-left: 6rpx solid var(--primary);
  }
}

.node-connector {
  width: 40rpx;
  margin-right: 8rpx;
}

.connector-line {
  font-size: 20rpx;
  color: var(--text-muted);
}

.node-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}

.avatar-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
}

.node-content {
  flex: 1;
  min-width: 0;
}

.node-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-dark);
  display: block;
  margin-bottom: 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-meta {
  font-size: 12px;
  color: var(--text-muted);
  display: block;
}

.node-status {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;

  &.confirmed {
    background: transparent;
  }

  &.pending_review, &.inferred, &.disputed {
    background: var(--accent);
    color: #fff;
  }
}

.tree-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 40rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 2rpx solid var(--border);
  display: flex;
  gap: 24rpx;
  z-index: 10;
}

.btn-primary, .btn-outline {
  flex: 1;
  padding: 28rpx;
  border-radius: 16rpx;
  font-size: 15px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  border: none;

  &:active { opacity: 0.9; }
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  color: #fff;
  box-shadow: 0 4rpx 16rpx rgba(139, 111, 71, 0.3);
}

.btn-outline {
  background: #fff;
  border: 2rpx solid var(--border);
  color: var(--text-dark);
}

.btn-icon-text {
  font-size: 28rpx;
}
</style>