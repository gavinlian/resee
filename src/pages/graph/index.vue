<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { db, Person, Relation } from '@/utils/db'

const familyId = ref('')
const persons = ref<Person[]>([])
const relations = ref<Relation[]>([])
const loading = ref(false)
const selectedPersonId = ref('')
const scale = ref(1)

// 获取节点位置（简化版：力导向布局预计算）
const nodePositions = ref<Map<string, { x: number; y: number }>>(new Map())

// 边的样式
function getEdgeStyle(rel: Relation) {
  const fromPos = nodePositions.value.get(rel.from_person_id)
  const toPos = nodePositions.value.get(rel.to_person_id)
  if (!fromPos || !toPos) return {}

  const dash = rel.status === 'inferred' ? '8 4' : rel.status === 'disputed' ? '4 4' : '0'
  const opacity = rel.confidence

  return {
    left: fromPos.x + 'px',
    top: fromPos.y + 'px',
    width: Math.sqrt(Math.pow(toPos.x - fromPos.x, 2) + Math.pow(toPos.y - fromPos.y, 2)) + 'px',
    transform: `rotate(${Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x)}rad)`,
    borderStyle: dash,
    opacity
  }
}

// 节点样式
function getNodeStyle(person: Person) {
  const pos = nodePositions.value.get(person._id || '')
  if (!pos) return {}

  const isSelected = selectedPersonId.value === person._id

  return {
    left: pos.x - 40 + 'px',
    top: pos.y - 40 + 'px'
  }
}

// 获取节点颜色
function getNodeColor(person: Person) {
  const pos = nodePositions.value.get(person._id || '')
  if (!pos) return 'var(--primary)'

  // 根节点暖棕色，叶节点琥珀橙
  const isRoot = persons.value.filter(p => p.parent_id === person._id).length > 0
  if (isRoot) return 'var(--primary)'
  if (person.death_date) return 'var(--secondary)'
  return 'var(--accent)'
}

// 加载数据
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

// 简化的力导向布局
function computeLayout() {
  const positions = new Map<string, { x: number; y: number }>()
  const centerX = 200
  const centerY = 300

  // 按代数分层
  const generations = new Map<number, Person[]>()
  persons.value.forEach(p => {
    const gen = p.generation || 1
    if (!generations.has(gen)) generations.set(gen, [])
    generations.get(gen)!.push(p)
  })

  // 横向分布每层
  let maxCount = 0
  generations.forEach(g => { if (g.length > maxCount) maxCount = g.length })

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

// 选择节点
function onNodeClick(person: Person) {
  selectedPersonId.value = person._id || ''
  uni.navigateTo({ url: `/pages/person/index?id=${person._id}` })
}

// 缩放
function onZoom(delta: number) {
  scale.value = Math.max(0.3, Math.min(3, scale.value + delta))
}

// 高亮相关边
function getRelatedRelations(personId: string) {
  return relations.value.filter(r =>
    r.from_person_id === personId || r.to_person_id === personId
  )
}

onMounted(() => {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const options = (current as any).$page?.options || {}
  familyId.value = options.familyId || uni.getStorageSync('current_family_id') || ''
  loadData()
})
</script>

<template>
  <view class="graph-page">
    <!-- 顶部工具栏 -->
    <view class="graph-toolbar">
      <text class="toolbar-title">关系网图</text>
      <view class="toolbar-right">
        <text class="toolbar-btn" @click="onZoom(-0.1)">➖</text>
        <text class="scale-label">{{ Math.round(scale * 100) }}%</text>
        <text class="toolbar-btn" @click="onZoom(0.1)">➕</text>
      </view>
    </view>

    <!-- 图例 -->
    <view class="graph-legend">
      <view class="legend-item">
        <view class="legend-line solid"></view>
        <text>确认关系</text>
      </view>
      <view class="legend-item">
        <view class="legend-line dashed"></view>
        <text>推断关系</text>
      </view>
      <view class="legend-item">
        <view class="legend-dot" style="background: var(--primary)"></view>
        <text>祖先</text>
      </view>
      <view class="legend-item">
        <view class="legend-dot" style="background: var(--accent)"></view>
        <text>在世</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="persons.length === 0" class="empty">
      <text class="empty-icon">🔗</text>
      <text class="empty-text">暂无关系数据</text>
      <button class="btn-primary" @click="uni.navigateTo({ url: '/pages/ocr/index' })">扫描族谱</button>
    </view>

    <!-- 关系图 -->
    <view v-else class="graph-canvas" :style="{ transform: `scale(${scale})` }">
      <!-- 边 -->
      <view
        v-for="rel in relations"
        :key="rel._id"
        class="graph-edge"
        :class="rel.status"
        :style="getEdgeStyle(rel)"
        @click="uni.showModal({
          title: '关系详情',
          content: `类型: ${rel.relation_type}\n置信度: ${(rel.confidence * 100).toFixed(0)}%\n状态: ${rel.status}`
        })"
      ></view>

      <!-- 节点 -->
      <view
        v-for="person in persons"
        :key="person._id"
        class="graph-node"
        :class="{ selected: selectedPersonId === person._id, inferred: rel.status !== 'confirmed' }"
        :style="[getNodeStyle(person), { background: getNodeColor(person) }]"
        @click="onNodeClick(person)"
      >
        <text class="node-label">{{ person.name }}</text>
        <view v-if="person.status !== 'confirmed'" class="node-status">?</view>
      </view>
    </view>

    <!-- 底部操作 -->
    <view class="graph-bottom">
      <text class="bottom-hint">点击节点查看详情，点击边查看关系</text>
    </view>
  </view>
</template>

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
}

.toolbar-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-dark);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.toolbar-btn {
  padding: 8rpx 16rpx;
  font-size: 13px;
  color: var(--primary);
}

.scale-label {
  font-size: 12px;
  color: var(--text-muted);
  min-width: 60rpx;
  text-align: center;
}

.graph-legend {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 12rpx 24rpx;
  background: #fff;
  border-bottom: 2rpx solid var(--border);
  overflow-x: auto;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
}

.legend-line {
  width: 32rpx;
  height: 4rpx;
  border-radius: 2rpx;

  &.solid {
    background: var(--primary);
  }

  &.dashed {
    background: var(--secondary);
    border: 2rpx dashed var(--secondary);
    border-radius: 0;
  }
}

.legend-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
}

.loading, .empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.empty {
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

.graph-canvas {
  flex: 1;
  position: relative;
  overflow: auto;
  transform-origin: center center;
}

.graph-edge {
  position: absolute;
  height: 2rpx;
  transform-origin: left center;
  background: var(--primary);

  &.inferred {
    border: 2rpx dashed var(--secondary);
    background: transparent;
  }

  &.disputed {
    border: 2rpx dotted #F44336;
    background: transparent;
  }
}

.graph-node {
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4rpx 16rpx var(--shadow);
  transition: transform 0.2s;

  &:active {
    transform: scale(1.1);
  }

  &.selected {
    box-shadow: 0 0 0 6rpx var(--accent);
  }
}

.node-label {
  font-size: 12px;
  color: #fff;
  font-weight: 500;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 70rpx;
}

.node-status {
  position: absolute;
  top: -4rpx;
  right: -4rpx;
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.graph-bottom {
  padding: 16rpx 24rpx;
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