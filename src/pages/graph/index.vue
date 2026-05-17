<template>
  <view class="graph-page">
    <!-- 顶部工具栏 -->
    <view class="graph-toolbar">
      <view class="toolbar-left">
        <view class="back-btn" @click="goBack">
          <text class="back-icon">‹</text>
        </view>
        <text class="toolbar-title">关系网图</text>
      </view>
      <view class="toolbar-right">
        <view class="toolbar-btn" @click="onZoom(-0.1)">
          <text class="btn-icon">−</text>
        </view>
        <text class="scale-label">{{ Math.round(scale * 100) }}%</text>
        <view class="toolbar-btn" @click="onZoom(0.1)">
          <text class="btn-icon">+</text>
        </view>
        <view class="toolbar-btn" @click="toggleLegend">
          <text class="btn-icon">ℹ</text>
        </view>
      </view>
    </view>

    <!-- 图例 -->
    <view v-if="showLegend" class="graph-legend">
      <view class="legend-group">
        <view class="legend-title">关系状态</view>
        <view class="legend-items">
          <view class="legend-item">
            <view class="legend-line solid"></view>
            <text>确认关系</text>
          </view>
          <view class="legend-item">
            <view class="legend-line dashed"></view>
            <text>推断关系</text>
          </view>
          <view class="legend-item">
            <view class="legend-line dotted"></view>
            <text>争议关系</text>
          </view>
        </view>
      </view>
      <view class="legend-group">
        <view class="legend-title">成员状态</view>
        <view class="legend-items">
          <view class="legend-item">
            <view class="legend-dot" style="background: var(--primary)"></view>
            <text>祖先</text>
          </view>
          <view class="legend-item">
            <view class="legend-dot" style="background: var(--accent)"></view>
            <text>在世</text>
          </view>
          <view class="legend-item">
            <view class="legend-dot" style="background: var(--secondary)"></view>
            <text>已故</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="persons.length === 0" class="empty-state">
      <view class="empty-illustration">
        <text class="empty-icon">🔗</text>
      </view>
      <text class="empty-title">暂无关系数据</text>
      <text class="empty-hint">扫描族谱或手动添加成员</text>
      <button class="btn-accent" @click="goTo('/pages/ocr/index')">
        <text>📷 扫描族谱</text>
      </button>
    </view>

    <!-- 关系图 -->
    <view v-else class="graph-canvas-wrap">
      <view class="graph-canvas" :style="{ transform: `scale(${scale})` }">
        <!-- 边 -->
        <view
          v-for="rel in relations"
          :key="rel._id"
          class="graph-edge"
          :class="rel.status"
          :style="getEdgeStyle(rel)"
          @click="showRelDetail(rel)"
        >
          <view class="edge-middle"></view>
        </view>

        <!-- 节点 -->
        <view
          v-for="person in persons"
          :key="person._id"
          class="graph-node"
          :class="{ selected: selectedPersonId === person._id, has_pending: person.status !== 'confirmed' }"
          :style="[getNodeStyle(person), { background: getNodeColor(person) }]"
          @click="onNodeClick(person)"
        >
          <text class="node-label">{{ person.name?.[0] || '?' }}</text>
          <text class="node-name">{{ person.name }}</text>
          <view v-if="person.status !== 'confirmed'" class="node-badge">?</view>
        </view>
      </view>
    </view>

    <!-- 底部操作 -->
    <view class="graph-bottom">
      <text class="bottom-hint">点击节点查看详情，点击边查看关系</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { db, Person, Relation } from '@/utils/db'

const familyId = ref('')
const persons = ref<Person[]>([])
const relations = ref<Relation[]>([])
const loading = ref(false)
const selectedPersonId = ref('')
const scale = ref(1)
const showLegend = ref(true)

const nodePositions = ref<Map<string, { x: number; y: number }>>(new Map())

function goTo(path: string) { uni.navigateTo({ url: path }) }
function goBack() { uni.navigateBack() }

function getEdgeStyle(rel: Relation) {
  const fromPos = nodePositions.value.get(rel.from_person_id)
  const toPos = nodePositions.value.get(rel.to_person_id)
  if (!fromPos || !toPos) return {}

  const width = Math.sqrt(Math.pow(toPos.x - fromPos.x, 2) + Math.pow(toPos.y - fromPos.y, 2))
  const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x) * 180 / Math.PI

  return {
    left: fromPos.x + 'px',
    top: fromPos.y + 'px',
    width: width + 'px',
    transform: `rotate(${angle}deg)`
  }
}

function getNodeStyle(person: Person) {
  const pos = nodePositions.value.get(person._id || '')
  if (!pos) return {}
  return {
    left: pos.x - 50 + 'px',
    top: pos.y - 50 + 'px'
  }
}

function getNodeColor(person: Person) {
  if (persons.value.filter(p => p.parent_id === person._id).length > 0) return 'var(--primary)'
  if (person.death_date) return 'var(--secondary)'
  return 'var(--accent)'
}

async function loadData() {
  if (!familyId.value) return
  loading.value = true

  try {
    const [personsRes, relationsRes] = await Promise.all([
      db.getPersonsByFamily(familyId.value),
      db.getRelationsByFamily(familyId.value)
    ])

    if (personsRes.success && personsRes.result?.data) {
      persons.value = personsRes.result.data
      computeLayout()
    }

    if (relationsRes.success && relationsRes.result?.data) {
      relations.value = relationsRes.result.data
    }
  } catch (e) {
    console.error('加载数据失败', e)
  } finally {
    loading.value = false
  }
}

function computeLayout() {
  const positions = new Map<string, { x: number; y: number }>()
  const centerX = 200
  const centerY = 300

  const generations = new Map<number, Person[]>()
  persons.value.forEach(p => {
    const gen = p.generation || 1
    if (!generations.has(gen)) generations.set(gen, [])
    generations.get(gen)!.push(p)
  })

  const centerYStep = 120
  const startY = centerY - ((generations.size - 1) * centerYStep) / 2

  generations.forEach((genPersons, gen) => {
    const y = startY + (gen - 1) * centerYStep
    const spacing = 600 / Math.max(genPersons.length, 1)
    const startX = centerX - ((genPersons.length - 1) * spacing) / 2

    genPersons.forEach((p, i) => {
      positions.set(p._id || '', {
        x: startX + i * spacing,
        y
      })
    })
  })

  nodePositions.value = positions
}

function onNodeClick(person: Person) {
  selectedPersonId.value = person._id || ''
  uni.navigateTo({ url: `/pages/person/index?id=${person._id}` })
}

function onZoom(delta: number) {
  scale.value = Math.max(0.3, Math.min(3, scale.value + delta))
}

function toggleLegend() {
  showLegend.value = !showLegend.value
}

function showRelDetail(rel: Relation) {
  uni.showModal({
    title: '关系详情',
    content: `类型: ${rel.relation_type}\n置信度: ${(rel.confidence * 100).toFixed(0)}%\n状态: ${rel.status}`
  })
}

onMounted(() => {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const options = (current as any).$page?.options || {}
  familyId.value = options.familyId || uni.getStorageSync('current_family_id') || ''
  loadData()
})
</script>

<style scoped lang="scss">
.graph-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-light);
}

.graph-toolbar {
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
  width: 56rpx;
  height: 56rpx;
  border-radius: 12rpx;
  background: var(--bg-light);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon {
  font-size: 28rpx;
  color: var(--primary);
}

.scale-label {
  font-size: 12px;
  color: var(--text-muted);
  min-width: 56rpx;
  text-align: center;
}

.graph-legend {
  background: #fff;
  border-bottom: 2rpx solid var(--border);
  padding: 20rpx 24rpx;
}

.legend-group {
  margin-bottom: 16rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.legend-title {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 12rpx;
  font-weight: 500;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 12px;
  color: var(--text-dark);
}

.legend-line {
  width: 40rpx;
  height: 4rpx;
  border-radius: 2rpx;

  &.solid {
    background: var(--primary);
  }

  &.dashed {
    background: transparent;
    border-top: 4rpx dashed var(--secondary);
  }

  &.dotted {
    background: transparent;
    border-top: 4rpx dotted #F44336;
  }
}

.legend-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
}

.loading-state, .empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx;
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

  &:active { opacity: 0.9; }
}

.graph-canvas-wrap {
  flex: 1;
  position: relative;
  overflow: auto;
}

.graph-canvas {
  position: relative;
  width: 600px;
  height: 800px;
  transform-origin: center top;
}

.graph-edge {
  position: absolute;
  height: 3rpx;
  transform-origin: left center;
  pointer-events: auto;

  &.confirmed {
    background: var(--primary);
    opacity: 0.7;
  }

  &.inferred {
    background: transparent;
    border-top: 3rpx dashed var(--secondary);
    opacity: 0.6;
  }

  &.disputed {
    background: transparent;
    border-top: 3rpx dotted #F44336;
    opacity: 0.5;
  }
}

.edge-middle {
  position: absolute;
  top: -6rpx;
  left: 50%;
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: var(--primary);
  transform: translateX(-50%);
}

.graph-node {
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.15);
  transition: all 0.2s;

  &:active {
    transform: scale(1.08);
  }

  &.selected {
    box-shadow: 0 0 0 6rpx var(--accent), 0 8rpx 24rpx rgba(0,0,0,0.2);
  }

  &.has_pending {
    border: 3rpx solid rgba(255,255,255,0.5);
  }
}

.node-label {
  font-size: 32rpx;
  color: #fff;
  font-weight: 700;
}

.node-name {
  font-size: 11px;
  color: rgba(255,255,255,0.9);
  margin-top: 4rpx;
  max-width: 80rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-badge {
  position: absolute;
  top: -4rpx;
  right: -4rpx;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  border: 3rpx solid #fff;
}

.graph-bottom {
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 2rpx solid var(--border);
}

.bottom-hint {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  display: block;
}
</style>