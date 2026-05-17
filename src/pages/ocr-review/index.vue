<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { parseOcrText } from '@/api/ai'
import { db, Person, Relation } from '@/utils/db'
import { generateId } from '@/utils/index'

interface ParsedPerson {
  name: string
  gender: string | null
  birth_year: string | null
  death_year: string | null
  generation: number | null
  generation_name: string | null
  courtesy_name: string | null
  art_name: string | null
  parent_name: string | null
  spouse_name: string | null
  confidence: number
  status: 'confirmed' | 'pending_review'
}

interface ParsedRelation {
  from: string
  to: string
  type: string
  confidence: number
}

const familyId = ref('')
const rawText = ref('')
const parsedPersons = ref<ParsedPerson[]>([])
const parsedRelations = ref<ParsedRelation[]>([])
const loading = ref(false)
const step = ref<'preview' | 'review' | 'done'>('preview')
const aiHint = ref('')

onMounted(() => {
  const pages = getCurrentPages()
  const current = pages[current.length - 1]
  const options = (current as any).$page?.options || {}
  familyId.value = options.familyId || uni.getStorageSync('current_family_id') || ''
  rawText.value = uni.getStorageSync('ocr_raw_text') || ''

  if (!rawText.value) {
    uni.showToast({ title: '请先上传族谱图片', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1000)
    return
  }
})

// 执行AI解析
async function doParse() {
  if (!rawText.value.trim()) {
    uni.showToast({ title: '请输入族谱文字', icon: 'none' })
    return
  }

  loading.value = true

  try {
    const result = await parseOcrText(rawText.value)

    parsedPersons.value = result.persons.map((p: any) => ({
      ...p,
      confidence: p.confidence || 0.8,
      status: p.confidence >= 0.8 ? 'confirmed' : 'pending_review'
    }))

    parsedRelations.value = result.relations || []

    step.value = 'review'
    aiHint.value = `AI 解析完成：识别到 ${parsedPersons.value.length} 个人物，${parsedRelations.value.length} 条关系`
    uni.showToast({ title: aiHint.value, icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e.message || '解析失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// 手动添加人物
function addPerson() {
  parsedPersons.value.push({
    name: '',
    gender: null,
    birth_year: null,
    death_year: null,
    generation: null,
    generation_name: null,
    courtesy_name: null,
    art_name: null,
    parent_name: null,
    spouse_name: null,
    confidence: 0,
    status: 'pending_review'
  })
}

// 删除人物
function removePerson(index: number) {
  parsedPersons.value.splice(index, 1)
}

// 修改人物字段
function updatePerson(index: number, field: keyof ParsedPerson, value: any) {
  parsedPersons.value[index][field] = value
  parsedPersons.value[index].status = 'pending_review'
}

// 确认人物
function confirmPerson(index: number) {
  parsedPersons.value[index].status = 'confirmed'
}

// 确认并保存
async function saveAll() {
  if (parsedPersons.value.length === 0) {
    uni.showToast({ title: '请至少添加一个人物', icon: 'none' })
    return
  }

  loading.value = true

  try {
    // 创建人物
    const personIdMap = new Map<string, string>()

    for (const p of parsedPersons.value) {
      if (!p.name) continue

      const personData = {
        family_id: familyId.value,
        name: p.name,
        gender: p.gender as 'male' | 'female' | null,
        birth_date: p.birth_year,
        death_date: p.death_year,
        generation: p.generation || 1,
        generation_name: p.generation_name,
        courtesy_name: p.courtesy_name,
        art_name: p.art_name,
        bio: null,
        avatar: null,
        photos: [],
        videos: [],
        parent_id: null,
        spouse_ids: [],
        children_ids: [],
        siblings_ids: [],
        custom_fields: {},
        tags: [],
        location: { county: '', town: '', district: '', village: '' },
        marital_type: null,
        adopted_out: false,
        adopted_from: null,
        adopted_to: null,
        has_descendants: true,
        inheritance_line: null,
        tombstone: {
          has_tombstone: false,
          photo_url: null,
          inscription_text: null,
          location: null,
          date_recorded: null
        },
        biography: {
          education: null,
          career: null,
          achievements: null,
          moral_stories: []
        },
        residence: {
          birth_place: { county: '', town: '', village: '' },
          migrations: []
        },
        sources: [],
        ocr_raw_text: null,
        ai_confidence: p.confidence,
        status: p.status
      }

      const res = await db.addPerson(personData)
      if (res.success && res.id) {
        personIdMap.set(p.name, res.id)
      }
    }

    // 创建关系
    for (const r of parsedRelations.value) {
      const fromId = personIdMap.get(r.from)
      const toId = personIdMap.get(r.to)

      if (fromId && toId) {
        const relData: Partial<Relation> = {
          family_id: familyId.value,
          from_person_id: fromId,
          to_person_id: toId,
          relation_type: r.type,
          direction: 'down',
          status: r.confidence >= 0.8 ? 'confirmed' : 'inferred',
          confidence: r.confidence,
          alternative_relations: [],
          source_ids: [],
          note: null
        }
        await db.addRelation(relData)
      }
    }

    step.value = 'done'
    uni.showToast({ title: '保存成功', icon: 'success' })

    setTimeout(() => {
      uni.navigateTo({ url: `/pages/tree/index?familyId=${familyId.value}` })
    }, 1500)
  } catch (e: any) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="ocr-review-page">
    <!-- 预览阶段：显示原始文字 + 解析按钮 -->
    <view v-if="step === 'preview'" class="preview-section">
      <view class="section-header">
        <text class="section-title">原始文字</text>
        <text class="section-copy" @click="uni.setClipboardData({ data: rawText }); uni.showToast({ title: '已复制', icon: 'success' })">复制</text>
      </view>

      <textarea
        v-model="rawText"
        class="raw-text-input"
        placeholder="粘贴或编辑族谱文字..."
      />

      <view class="preview-tips">
        <text>💡 将 OCR 识别的文字粘贴到上方，AI 将自动解析人物和关系</text>
      </view>

      <button class="btn-primary full-width" :disabled="loading || !rawText.trim()" @click="doParse">
        {{ loading ? 'AI 解析中...' : '开始 AI 解析' }}
      </button>
    </view>

    <!-- 校正阶段：显示解析结果 + 可编辑 -->
    <view v-if="step === 'review'" class="review-section">
      <view class="review-header">
        <text class="review-title">{{ aiHint }}</text>
      </view>

      <!-- 人物列表 -->
      <view class="persons-section">
        <view class="section-label">
          <text>👥 人物 ({{ parsedPersons.length }})</text>
          <text class="add-btn" @click="addPerson">+ 添加</text>
        </view>

        <view
          v-for="(person, index) in parsedPersons"
          :key="index"
          class="person-card"
          :class="{ 'pending': person.status === 'pending_review' }"
        >
          <view class="person-header">
            <view class="person-name-row">
              <input
                :value="person.name"
                @input="updatePerson(index, 'name', ($event.target as any).value)"
                class="input-name"
                placeholder="姓名"
              />
              <text
                class="status-badge"
                :class="person.status"
              >{{ person.status === 'confirmed' ? '✓' : '?' }}</text>
            </view>
            <text class="confidence-text">{{ (person.confidence * 100).toFixed(0) }}% 置信</text>
          </view>

          <view class="person-fields">
            <view class="field-row">
              <label>辈分</label>
              <input
                :value="person.generation"
                @input="updatePerson(index, 'generation', Number(($event.target as any).value))"
                type="number"
                placeholder="代数"
              />
            </view>
            <view class="field-row">
              <label>字/号</label>
              <input
                :value="person.courtesy_name || person.art_name"
                @input="updatePerson(index, 'courtesy_name', ($event.target as any).value)"
                placeholder="字/号"
              />
            </view>
            <view class="field-row">
              <label>生年</label>
              <input
                :value="person.birth_year"
                @input="updatePerson(index, 'birth_year', ($event.target as any).value)"
                placeholder="生年"
              />
            </view>
            <view class="field-row">
              <label>卒年</label>
              <input
                :value="person.death_year"
                @input="updatePerson(index, 'death_year', ($event.target as any).value)"
                placeholder="卒年"
              />
            </view>
            <view class="field-row">
              <label>父亲</label>
              <input
                :value="person.parent_name"
                @input="updatePerson(index, 'parent_name', ($event.target as any).value)"
                placeholder="父亲姓名"
              />
            </view>
          </view>

          <view class="person-actions">
            <button class="btn-small-outline" @click="confirmPerson(index)">确认</button>
            <button class="btn-small-outline danger" @click="removePerson(index)">删除</button>
          </view>
        </view>
      </view>

      <!-- 关系列表 -->
      <view v-if="parsedRelations.length > 0" class="relations-section">
        <view class="section-label">
          <text>🔗 关系 ({{ parsedRelations.length }})</text>
        </view>

        <view
          v-for="(rel, index) in parsedRelations"
          :key="index"
          class="relation-item"
        >
          <text class="rel-from">{{ rel.from }}</text>
          <text class="rel-type">{{ rel.type }}</text>
          <text class="rel-to">{{ rel.to }}</text>
          <text class="rel-confidence">{{ (rel.confidence * 100).toFixed(0) }}%</text>
        </view>
      </view>

      <button class="btn-primary full-width" :disabled="loading" @click="saveAll">
        {{ loading ? '保存中...' : '确认并保存' }}
      </button>
    </view>

    <!-- 完成阶段 -->
    <view v-if="step === 'done'" class="done-section">
      <text class="done-icon">✅</text>
      <text class="done-text">保存成功！</text>
      <text class="done-hint">正在跳转到族谱树...</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ocr-review-page {
  min-height: 100vh;
  background: var(--bg-light);
  padding: 24rpx;
  padding-bottom: 160rpx;
}

.section-header, .review-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.section-title, .review-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-dark);
}

.section-copy {
  font-size: 13px;
  color: var(--primary);
}

.raw-text-input {
  width: 100%;
  min-height: 400rpx;
  padding: 24rpx;
  background: #fff;
  border: 2rpx solid var(--border);
  border-radius: 16rpx;
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-dark);
  margin-bottom: 24rpx;
}

.preview-tips {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 24rpx;
  padding: 16rpx;
  background: var(--gradient-end);
  border-radius: 8rpx;
}

.full-width {
  width: 100%;
  padding: 28rpx;
}

/* Review Section */
.review-header {
  padding: 24rpx;
  background: var(--secondary);
  color: #fff;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
}

.persons-section {
  margin-bottom: 32rpx;
}

.section-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-dark);
  margin-bottom: 16rpx;

  .add-btn {
    color: var(--primary);
    font-size: 13px;
  }
}

.person-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  border-left: 6rpx solid var(--primary);

  &.pending {
    border-left-color: var(--accent);
  }
}

.person-header {
  margin-bottom: 16rpx;
}

.person-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.input-name {
  flex: 1;
  font-size: 17px;
  font-weight: 500;
  border: none;
  background: transparent;
  color: var(--text-dark);
}

.status-badge {
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

  &.pending_review {
    background: var(--accent);
    color: #fff;
  }
}

.confidence-text {
  font-size: 11px;
  color: var(--text-muted);
}

.person-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 8rpx;

  label {
    font-size: 12px;
    color: var(--text-muted);
    min-width: 40rpx;
  }

  input {
    width: 120rpx;
    padding: 8rpx 12rpx;
    border: 1px solid var(--border);
    border-radius: 6rpx;
    font-size: 13px;
    background: var(--bg-light);
  }
}

.person-actions {
  display: flex;
  gap: 12rpx;

  .btn-small-outline {
    flex: 1;
    padding: 12rpx;
    font-size: 12px;
    border: 1px solid var(--border);
    border-radius: 8rpx;
    background: transparent;
    color: var(--text-dark);

    &.danger {
      color: #F44336;
      border-color: #FFCDD2;
    }
  }
}

.relations-section {
  margin-bottom: 32rpx;
}

.relation-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx;
  background: #fff;
  border-radius: 8rpx;
  margin-bottom: 8rpx;
  font-size: 13px;

  .rel-from, .rel-to {
    color: var(--text-dark);
    font-weight: 500;
  }

  .rel-type {
    color: var(--text-muted);
    flex: 1;
  }

  .rel-confidence {
    color: var(--text-muted);
    font-size: 11px;
  }
}

.done-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 40rpx;

  .done-icon {
    font-size: 100rpx;
    margin-bottom: 24rpx;
  }

  .done-text {
    font-size: 20px;
    font-weight: 500;
    color: var(--primary);
    margin-bottom: 12rpx;
  }

  .done-hint {
    font-size: 13px;
    color: var(--text-muted);
  }
}
</style>