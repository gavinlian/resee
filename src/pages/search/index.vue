<script setup lang="ts">
import { ref, computed } from 'vue'
import { aiSearch } from '@/api/ai'
import { db, Person } from '@/utils/db'
import { getAILimits } from '@/api/ai'

const query = ref('')
const results = ref<Array<{ person: Person; score: number; match_type: string }>>([])
const aiAnswer = ref('')
const loading = ref(false)
const aiMode = ref<'keyword' | 'ai'>('keyword')
const limits = ref(getAILimits())

// 关键词搜索
function keywordSearch() {
  if (!query.value.trim()) return

  const familyId = uni.getStorageSync('current_family_id') || ''
  db.searchPersons(familyId, query.value.trim()).then((res: any) => {
    if (res.success && res.result?.data) {
      results.value = res.result.data.map((p: Person) => ({
        person: p,
        score: 1,
        match_type: 'name'
      }))
    }
  })
}

// AI搜索
async function doAiSearch() {
  if (!query.value.trim()) return

  loading.value = true
  try {
    const familyId = uni.getStorageSync('current_family_id') || ''
    const res = await aiSearch(query.value, familyId)
    results.value = res.results || []
    aiAnswer.value = res.answer || ''
  } catch (e: any) {
    uni.showToast({ title: e.message || '搜索失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// 搜索
function onSearch() {
  results.value = []
  aiAnswer.value = ''

  if (aiMode.value === 'ai') {
    doAiSearch()
  } else {
    keywordSearch()
  }
}

// 切换模式
function switchMode(mode: 'keyword' | 'ai') {
  aiMode.value = mode
  limits.value = getAILimits()
}

// 跳转到成员详情
function goToPerson(person: Person) {
  uni.navigateTo({ url: `/pages/person/index?id=${person._id}` })
}

// 清除
function clearSearch() {
  query.value = ''
  results.value = []
  aiAnswer.value = ''
}
</script>

<template>
  <view class="search-page">
    <!-- 搜索框 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">🔍</text>
        <input
          v-model="query"
          class="search-input"
          placeholder="搜索姓名、字、号、地点..."
          @confirm="onSearch"
        />
        <text v-if="query" class="clear-btn" @click="clearSearch">✕</text>
      </view>
    </view>

    <!-- 模式切换 -->
    <view class="mode-toggle">
      <view
        class="mode-btn"
        :class="{ active: aiMode === 'keyword' }"
        @click="switchMode('keyword')"
      >
        <text>关键词</text>
      </view>
      <view
        class="mode-btn"
        :class="{ active: aiMode === 'ai' }"
        @click="switchMode('ai')"
      >
        <text>AI搜索</text>
        <text class="limit-badge">{{ limits.limits.search >= 0 ? limits.limits.search : '∞' }}</text>
      </view>
    </view>

    <!-- AI模式提示 -->
    <view v-if="aiMode === 'ai'" class="ai-tips">
      <text>💡 可用自然语言搜索，如"曾祖父的弟弟叫什么"</text>
    </view>

    <!-- 搜索按钮 -->
    <button class="btn-primary search-btn" :disabled="loading || !query.trim()" @click="onSearch">
      {{ loading ? '搜索中...' : '搜索' }}
    </button>

    <!-- AI回答 -->
    <view v-if="aiAnswer" class="ai-answer">
      <text class="answer-label">🤖 AI回答</text>
      <text class="answer-text">{{ aiAnswer }}</text>
    </view>

    <!-- 结果列表 -->
    <view class="results">
      <view
        v-for="item in results"
        :key="item.person._id"
        class="result-item"
        @click="goToPerson(item.person)"
      >
        <view class="result-avatar">
          <text>{{ item.person.name?.[0] || '?' }}</text>
        </view>
        <view class="result-info">
          <text class="result-name">{{ item.person.name }}</text>
          <text class="result-meta">
            {{ item.person.generation_name ? `第${item.person.generation}世 ${item.person.generation_name}` : `第${item.person.generation}世` }}
            <text v-if="item.person.birth_date"> · {{ item.person.birth_date }}</text>
          </text>
          <text v-if="item.match_type" class="result-type">{{ item.match_type }}</text>
        </view>
        <text class="result-score">{{ (item.score * 100).toFixed(0) }}%</text>
      </view>

      <view v-if="results.length === 0 && !loading" class="empty-results">
        <text>搜索结果将显示在这里</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.search-page {
  min-height: 100vh;
  background: var(--bg-light);
  padding: 24rpx;
}

.search-bar {
  margin-bottom: 16rpx;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  background: #fff;
  border: 2rpx solid var(--border);
  border-radius: 12rpx;
  padding: 0 24rpx;

  &:focus-within {
    border-color: var(--primary);
  }
}

.search-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  padding: 24rpx 0;
  font-size: 15px;
  color: var(--text-dark);
}

.clear-btn {
  padding: 8rpx;
  font-size: 24rpx;
  color: var(--text-muted);
}

.mode-toggle {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.mode-btn {
  flex: 1;
  padding: 16rpx;
  text-align: center;
  background: #fff;
  border-radius: 12rpx;
  font-size: 14px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;

  &.active {
    background: var(--primary);
    color: #fff;
  }

  .limit-badge {
    font-size: 11px;
    padding: 2rpx 8rpx;
    background: rgba(255,255,255,0.3);
    border-radius: 10rpx;
  }
}

.ai-tips {
  font-size: 12px;
  color: var(--text-muted);
  padding: 12rpx 16rpx;
  background: var(--gradient-end);
  border-radius: 8rpx;
  margin-bottom: 16rpx;
}

.search-btn {
  width: 100%;
  margin-bottom: 24rpx;
}

.ai-answer {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;

  .answer-label {
    font-size: 13px;
    color: var(--primary);
    font-weight: 500;
    display: block;
    margin-bottom: 12rpx;
  }

  .answer-text {
    font-size: 14px;
    line-height: 1.8;
    color: var(--text-dark);
  }
}

.results {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  cursor: pointer;

  &:active {
    background: var(--gradient-end);
  }
}

.result-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #fff;
  font-weight: 600;
}

.result-info {
  flex: 1;
}

.result-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-dark);
  display: block;
  margin-bottom: 4rpx;
}

.result-meta {
  font-size: 12px;
  color: var(--text-muted);
  display: block;
  margin-bottom: 4rpx;
}

.result-type {
  font-size: 11px;
  color: var(--secondary);
  padding: 2rpx 8rpx;
  background: var(--gradient-end);
  border-radius: 6rpx;
}

.result-score {
  font-size: 12px;
  color: var(--text-muted);
}

.empty-results {
  text-align: center;
  padding: 80rpx;
  color: var(--text-muted);
  font-size: 13px;
}
</style>