<template>
  <view class="search-page">
    <!-- 搜索框区域 -->
    <view class="search-header">
      <view class="search-box">
        <text class="search-icon">🔍</text>
        <input
          v-model="query"
          class="search-input"
          style="flex:1;min-width:0;padding:16rpx 16rpx;font-size:15px;background:transparent;border:none;outline:none;color:var(--text-dark);"
          placeholder="搜索姓名、字、号、地点..."
          @confirm="onSearch"
          @input="onInputChange"
        />
        <text v-if="query" class="clear-btn" @click="clearSearch">✕</text>
      </view>
      <button class="search-btn" :disabled="!query.trim()" @click="onSearch">
        搜索
      </button>
    </view>

    <!-- 模式切换 -->
    <view class="mode-toggle">
      <view
        class="mode-btn"
        :class="{ active: aiMode === 'keyword' }"
        @click="switchMode('keyword')"
      >
        <text class="mode-icon">🔤</text>
        <text class="mode-text">关键词</text>
      </view>
      <view
        class="mode-btn"
        :class="{ active: aiMode === 'ai' }"
        @click="switchMode('ai')"
      >
        <text class="mode-icon">🤖</text>
        <text class="mode-text">AI搜索</text>
        <text class="limit-badge" v-if="limits.limits.search >= 0">{{ limits.limits.search }}</text>
      </view>
    </view>

    <!-- AI模式提示 -->
    <view v-if="aiMode === 'ai'" class="ai-tips">
      <text>💡 可用自然语言搜索，如"曾祖父的弟弟叫什么"</text>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <view class="loading-spinner"></view>
      <text class="loading-text">搜索中...</text>
    </view>

    <!-- AI回答 -->
    <view v-if="aiAnswer && !loading" class="ai-answer">
      <view class="answer-header">
        <text class="answer-icon">🤖</text>
        <text class="answer-title">AI 回答</text>
      </view>
      <text class="answer-text">{{ aiAnswer }}</text>
    </view>

    <!-- 结果列表 -->
    <view class="results-section">
      <view v-if="!loading && results.length === 0 && query" class="empty-results">
        <text class="empty-icon">🔍</text>
        <text class="empty-text">未找到相关结果</text>
        <text class="empty-hint">尝试其他关键词或切换到AI搜索</text>
      </view>

      <view v-else-if="!loading && results.length === 0 && !query" class="hint-results">
        <view class="hint-item" @click="query = '张'; onSearch()">
          <text class="hint-icon">👤</text>
          <text class="hint-text">张姓族人</text>
        </view>
        <view class="hint-item" @click="query = '字：'; onSearch()">
          <text class="hint-icon">📝</text>
          <text class="hint-text">搜索字/号</text>
        </view>
      </view>

      <view v-else class="result-list">
        <view class="result-header" v-if="results.length > 0">
          <text class="result-count">找到 {{ results.length }} 个结果</text>
        </view>

        <view
          v-for="item in results"
          :key="item.person._id"
          class="result-card"
          @click="goToPerson(item.person)"
        >
          <view class="result-avatar">
            <text>{{ item.person.name?.[0] || '?' }}</text>
          </view>
          <view class="result-info">
            <text class="result-name">{{ item.person.name }}</text>
            <text class="result-meta">
              <text v-if="item.person.generation_name">第{{ item.person.generation }}世 {{ item.person.generation_name }}</text>
              <text v-else>第{{ item.person.generation }}世</text>
              <text v-if="item.person.birth_date"> · {{ item.person.birth_date }}</text>
            </text>
            <view class="result-tags">
              <text class="result-tag" :class="item.match_type">{{ item.match_type }}</text>
            </view>
          </view>
          <view class="result-score-wrap">
            <view class="result-score" :style="{ width: (item.score * 100) + '%' }"></view>
            <text class="score-text">{{ (item.score * 100).toFixed(0) }}%</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { aiSearch } from '@/api/ai'
import { db, Person } from '@/utils/db'
import { getAILimits } from '@/api/ai'

const query = ref('')
const results = ref<Array<{ person: Person; score: number; match_type: string }>>([])
const aiAnswer = ref('')
const loading = ref(false)
const aiMode = ref<'keyword' | 'ai'>('keyword')
const limits = ref(getAILimits())

function onInputChange() {
  if (!query.value.trim()) {
    results.value = []
    aiAnswer.value = ''
  }
}

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

function onSearch() {
  results.value = []
  aiAnswer.value = ''

  if (aiMode.value === 'ai') {
    doAiSearch()
  } else {
    keywordSearch()
  }
}

function switchMode(mode: 'keyword' | 'ai') {
  aiMode.value = mode
  limits.value = getAILimits()
}

function goToPerson(person: Person) {
  uni.navigateTo({ url: `/pages/person/index?id=${person._id}` })
}

function clearSearch() {
  query.value = ''
  results.value = []
  aiAnswer.value = ''
}
</script>

<style scoped lang="scss">
.search-page {
  min-height: 100vh;
  background: var(--bg-light);
  padding-bottom: env(safe-area-inset-bottom);
}

.search-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  background: #fff;
  border-bottom: 2rpx solid var(--border);
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  background: var(--bg-light);
  border: 2rpx solid var(--border);
  border-radius: 16rpx;
  padding: 0 20rpx;
  height: 80rpx;
  transition: border-color 0.2s;

  &:focus-within {
    border-color: var(--primary);
  }
}

.search-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
  color: var(--text-muted);
}

.search-input {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  color: var(--text-dark);
  border: none;
  background: transparent;
  outline: none;
}

.clear-btn {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  color: var(--text-muted);
  margin-left: 8rpx;
}

.search-btn {
  padding: 20rpx 32rpx;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  color: #fff;
  border-radius: 16rpx;
  font-size: 14px;
  font-weight: 500;
  border: none;
  box-shadow: 0 4rpx 12rpx rgba(139, 111, 71, 0.3);

  &:disabled {
    opacity: 0.5;
  }

  &:active { opacity: 0.9; }
}

.mode-toggle {
  display: flex;
  gap: 16rpx;
  padding: 24rpx;
}

.mode-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  border: 2rpx solid var(--border);
  transition: all 0.2s;

  &.active {
    background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
    border-color: transparent;
    color: #fff;
    box-shadow: 0 4rpx 12rpx rgba(139, 111, 71, 0.3);

    .mode-icon, .mode-text {
      color: #fff;
    }

    .limit-badge {
      background: rgba(255,255,255,0.3);
      color: #fff;
    }
  }
}

.mode-icon {
  font-size: 28rpx;
}

.mode-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-dark);
}

.limit-badge {
  font-size: 11px;
  padding: 4rpx 10rpx;
  background: var(--gradient-end);
  border-radius: 20rpx;
  color: var(--primary);
}

.ai-tips {
  margin: 0 24rpx 24rpx;
  padding: 16rpx 20rpx;
  background: var(--gradient-end);
  border-radius: 12rpx;
  font-size: 13px;
  color: var(--primary);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
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

.ai-answer {
  margin: 0 24rpx 24rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx var(--shadow);
}

.answer-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.answer-icon {
  font-size: 32rpx;
}

.answer-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--primary);
}

.answer-text {
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-dark);
}

.results-section {
  padding: 0 24rpx;
}

.empty-results, .hint-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 40rpx;
  gap: 12rpx;
}

.empty-icon {
  font-size: 64rpx;
  margin-bottom: 8rpx;
}

.empty-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-dark);
}

.empty-hint {
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
}

.hint-results {
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16rpx;
}

.hint-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 24rpx;
  background: #fff;
  border-radius: 40rpx;
  box-shadow: 0 2rpx 8rpx var(--shadow);
}

.hint-icon {
  font-size: 24rpx;
}

.hint-text {
  font-size: 13px;
  color: var(--text-dark);
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.result-header {
  margin-bottom: 8rpx;
}

.result-count {
  font-size: 12px;
  color: var(--text-muted);
}

.result-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  cursor: pointer;
  box-shadow: 0 2rpx 12rpx var(--shadow);
  transition: all 0.2s;

  &:active {
    transform: scale(0.99);
    box-shadow: 0 1rpx 6rpx var(--shadow);
  }
}

.result-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #fff;
  font-weight: 600;
  flex-shrink: 0;
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-name {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-dark);
  display: block;
  margin-bottom: 6rpx;
}

.result-meta {
  font-size: 12px;
  color: var(--text-muted);
  display: block;
  margin-bottom: 8rpx;
}

.result-tags {
  display: flex;
  gap: 8rpx;
}

.result-tag {
  font-size: 11px;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background: var(--gradient-end);
  color: var(--primary);

  &.name {
    background: #E8F5E9;
    color: #4CAF50;
  }

  &.generation {
    background: #E3F2FD;
    color: #2196F3;
  }

  &.location {
    background: #FFF3E0;
    color: var(--accent);
  }
}

.result-score-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
  min-width: 80rpx;
}

.result-score {
  height: 6rpx;
  background: linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%);
  border-radius: 3rpx;
}

.score-text {
  font-size: 12px;
  color: var(--text-muted);
}
</style>