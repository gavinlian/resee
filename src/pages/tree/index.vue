<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { db, Person } from '@/utils/db'

const familyId = ref('')
const persons = ref<Person[]>([])
const loading = ref(false)
const viewMode = ref<'su' | 'ou' | 'pagoda'>('su')
const showModeMenu = ref(false)
const canvasRef = ref<any>(null)
const scale = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)

// 当前选中的成员
const selectedPerson = ref<Person | null>(null)

// 加载成员
async function loadPersons() {
  if (!familyId.value) return
  loading.value = true
  try {
    const res = await db.getPersonsByFamily(familyId.value)
    if (res.success && res.result && res.result.data) {
      persons.value = res.result.data
      // 绘制树
      setTimeout(drawTree, 100)
    }
  } catch (e) {
    console.error('加载成员失败', e)
  } finally {
    loading.value = false
  }
}

// 获取根节点（代数最小的）
const rootPerson = computed(() => {
  if (persons.value.length === 0) return null
  return persons.value.reduce((min, p) =>
    (p.generation < (min?.generation ?? Infinity)) ? p : min
  , null as Person | null)
})

// 获取某人的子女
function getChildren(person: Person): Person[] {
  return persons.value.filter(p => p.parent_id === person._id)
}

// 绘制族谱树
function drawTree() {
  // Canvas绘制简化为占位，后续用真实Canvas
  // 绘制族谱树（后续扩展 Canvas 绘制）
}

// 切换视图模式
function switchMode(mode: 'su' | 'ou' | 'pagoda') {
  viewMode.value = mode
  showModeMenu.value = false
  drawTree()
}

// 点击成员
function onPersonClick(person: Person) {
  selectedPerson.value = person
}

// 展开/收起（简化为直接进入详情）
function onPersonDoubleClick(person: Person) {
  uni.navigateTo({
    url: `/pages/person/index?id=${person._id}`
  })
}

// 缩放
function onZoom(delta: number) {
  scale.value = Math.max(0.3, Math.min(3, scale.value + delta))
  drawTree()
}

// 导出
function onExport() {
  uni.navigateTo({ url: `/pages/export/index?familyId=${familyId.value}` })
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

<template>
  <view class="tree-page">
    <!-- 顶部工具栏 -->
    <view class="tree-toolbar">
      <view class="toolbar-left">
        <text class="toolbar-btn" @click="showModeMenu = true">
          {{ viewMode === 'su' ? '苏式' : viewMode === 'ou' ? '欧式' : '宝塔式' }}
          ▼
        </text>
      </view>
      <view class="toolbar-center">
        <text class="person-count">{{ persons.length }} 人</text>
      </view>
      <view class="toolbar-right">
        <text class="toolbar-btn" @click="onZoom(-0.1)">➖</text>
        <text class="scale-label">{{ Math.round(scale * 100) }}%</text>
        <text class="toolbar-btn" @click="onZoom(0.1)">➕</text>
        <text class="toolbar-btn" @click="onExport">📤</text>
      </view>
    </view>

    <!-- 模式选择菜单 -->
    <view v-if="showModeMenu" class="mode-menu">
      <view class="mode-item" :class="{ active: viewMode === 'su' }" @click="switchMode('su')">
        <text class="mode-name">苏式</text>
        <text class="mode-desc">竖排，适合人少的家族</text>
      </view>
      <view class="mode-item" :class="{ active: viewMode === 'ou' }" @click="switchMode('ou')">
        <text class="mode-name">欧式</text>
        <text class="mode-desc">横排，适合人多房多的家族</text>
      </view>
      <view class="mode-item" :class="{ active: viewMode === 'pagoda' }" @click="switchMode('pagoda')">
        <text class="mode-name">宝塔式</text>
        <text class="mode-desc">金字塔形，简洁直观</text>
      </view>
    </view>

    <!-- 树形画布 -->
    <view class="tree-canvas" :style="{ transform: `scale(${scale}) translate(${offsetX}px, ${offsetY}px)` }">
      <view v-if="loading" class="loading">加载中...</view>

      <view v-else-if="persons.length === 0" class="empty-tree">
        <text class="empty-icon">🌳</text>
        <text class="empty-text">暂无族谱数据</text>
        <button class="btn-primary" @click="uni.navigateTo({ url: '/pages/ocr/index' })">扫描族谱</button>
      </view>

      <!-- 简化的树形列表视图 -->
      <view v-else class="tree-list">
        <view
          v-for="person in persons"
          :key="person._id"
          class="tree-node"
          :class="{ selected: selectedPerson?._id === person._id }"
          :style="{ marginLeft: (person.generation - (rootPerson?.generation || 1)) * 40 + 'rpx' }"
          @click="onPersonClick(person)"
          @click.stop="onPersonDoubleClick(person)"
        >
          <view class="node-connector" v-if="person.generation > (rootPerson?.generation || 1)">
            <text>└─</text>
          </view>
          <view class="node-content">
            <text class="node-name">{{ person.name }}</text>
            <text class="node-meta">
              {{ person.generation_name || '' }}
              <text v-if="person.birth_date"> {{ person.birth_date }}</text>
              <text v-if="person.death_date"> - {{ person.death_date }}</text>
            </text>
          </view>
          <view class="node-badge" :class="person.status">
            {{ person.status === 'confirmed' ? '' : '?' }}
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作 -->
    <view class="tree-bottom">
      <button class="btn-outline" @click="uni.navigateTo({ url: '/pages/graph/index?familyId=' + familyId })">
        🔗 关系图
      </button>
      <button class="btn-primary" @click="uni.navigateTo({ url: '/pages/ocr/index' })">
        📷 扫描
      </button>
    </view>
  </view>
</template>

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

.toolbar-left, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.toolbar-btn {
  padding: 8rpx 16rpx;
  font-size: 13px;
  color: var(--primary);
  cursor: pointer;
}

.toolbar-center {
  .person-count {
    font-size: 13px;
    color: var(--text-muted);
  }
}

.scale-label {
  font-size: 12px;
  color: var(--text-muted);
  min-width: 60rpx;
  text-align: center;
}

.mode-menu {
  background: #fff;
  padding: 16rpx 24rpx;
  border-bottom: 2rpx solid var(--border);
}

.mode-item {
  padding: 16rpx;
  border-radius: 12rpx;
  margin-bottom: 8rpx;

  &.active {
    background: var(--gradient-end);
  }

  .mode-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-dark);
    display: block;
    margin-bottom: 4rpx;
  }

  .mode-desc {
    font-size: 12px;
    color: var(--text-muted);
  }
}

.tree-canvas {
  flex: 1;
  overflow: auto;
  padding: 24rpx;
  transition: transform 0.2s;
}

.loading, .empty-tree {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx;
  color: var(--text-muted);
}

.empty-tree {
  .empty-icon {
    font-size: 80rpx;
    margin-bottom: 16rpx;
  }

  .empty-text {
    margin-bottom: 32rpx;
  }

  .btn-primary {
    padding: 24rpx 48rpx;
  }
}

.tree-list {
  display: flex;
  flex-direction: column;
}

.tree-node {
  display: flex;
  align-items: center;
  padding: 16rpx;
  margin-bottom: 8rpx;
  background: #fff;
  border-radius: 12rpx;
  cursor: pointer;
  border-left: 4rpx solid var(--primary);

  &.selected {
    background: var(--gradient-end);
    border-left-color: var(--accent);
  }
}

.node-connector {
  color: var(--text-muted);
  margin-right: 8rpx;
  font-size: 12px;
}

.node-content {
  flex: 1;
}

.node-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-dark);
  display: block;
  margin-bottom: 4rpx;
}

.node-meta {
  font-size: 12px;
  color: var(--text-muted);
}

.node-badge {
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
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 2rpx solid var(--border);
  display: flex;
  gap: 24rpx;

  .btn-primary, .btn-outline {
    flex: 1;
    padding: 28rpx;
  }
}
</style>