/**
 * Unicloud 数据库封装（支持 H5 / 小程序 / App 多端）
 */

const DB_CONFIG = {
  // 占位配置，实际使用时替换为真实 Unicloud spaceId
  spaceId: ''
};

// 各表名常量
export const COLLECTIONS = {
  PERSON: 'person',
  FAMILY: 'family',
  SOURCE: 'source',
  OCR_RECORD: 'ocr_record',
  RELATION: 'relation',
  MEDIA: 'media'
} as const;

// ========== 本地模拟数据（无云端时使用）==========

// 族谱数据
let families: Array<any> = [];
let persons: Array<any> = [];
let relations: Array<any> = [];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ========== 数据库操作==========

const db = {
  // 获取当前用户族谱列表
  async getFamiliesByOwner(ownerUid: string) {
    try {
      // #ifdef MP-WEIXIN || APP-PLUS
      const res = await uniCloud.database().collection(COLLECTIONS.FAMILY)
        .where({ owner_uid: ownerUid })
        .get();
      return { success: true, result: { data: res.data } };
      // #endif

      // #ifdef H5
      // H5 本地模拟
      const myFamilies = families.filter(f => f.owner_uid === ownerUid);
      return { success: true, result: { data: deepClone(myFamilies) } };
      // #endif
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // 创建族谱
  async addFamily(data: any) {
    try {
      // #ifdef MP-WEIXIN || APP-PLUS
      const res = await uniCloud.database().collection(COLLECTIONS.FAMILY).add(data);
      return { success: true, result: { _id: res.id } };
      // #endif

      // #ifdef H5
      const newFamily = { ...data, _id: generateId(), created_at: Date.now() };
      families.push(newFamily);
      return { success: true, result: { _id: newFamily._id } };
      // #endif
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // 删除族谱
  async deleteFamily(familyId: string) {
    try {
      // #ifdef MP-WEIXIN || APP-PLUS
      await uniCloud.database().collection(COLLECTIONS.FAMILY).doc(familyId).remove();
      return { success: true };
      // #endif

      // #ifdef H5
      families = families.filter(f => f._id !== familyId);
      persons = persons.filter(p => p.family_id !== familyId);
      relations = relations.filter(r => r.family_id !== familyId);
      return { success: true };
      // #endif
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // 保存 OCR 记录
  async addOcrRecord(data: any) {
    try {
      // #ifdef MP-WEIXIN || APP-PLUS
      const res = await uniCloud.database().collection(COLLECTIONS.OCR_RECORD).add(data);
      return { success: true, result: { _id: res.id } };
      // #endif

      // #ifdef H5
      const newRecord = { ...data, _id: generateId(), created_at: Date.now() };
      return { success: true, result: { _id: newRecord._id } };
      // #endif
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // 批量保存人物
  async addPersons(familyId: string, personList: Array<any>) {
    try {
      // #ifdef MP-WEIXIN || APP-PLUS
      const res = await uniCloud.database().collection(COLLECTIONS.PERSON).add(personList);
      return { success: true, result: { _id: res.id, count: personList.length } };
      // #endif

      // #ifdef H5
      const newPersons = personList.map(p => ({ ...p, _id: generateId(), family_id: familyId }));
      persons.push(...newPersons);
      return { success: true, result: { count: newPersons.length } };
      // #endif
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // 批量保存关系
  async addRelations(familyId: string, relationList: Array<any>) {
    try {
      // #ifdef MP-WEIXIN || APP-PLUS
      await uniCloud.database().collection(COLLECTIONS.RELATION).add(relationList);
      return { success: true };
      // #endif

      // #ifdef H5
      const newRelations = relationList.map(r => ({ ...r, _id: generateId(), family_id: familyId }));
      relations.push(...newRelations);
      return { success: true };
      // #endif
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // 查询族谱所有人物
  async getPersonsByFamily(familyId: string) {
    try {
      // #ifdef MP-WEIXIN || APP-PLUS
      const res = await uniCloud.database().collection(COLLECTIONS.PERSON)
        .where({ family_id: familyId })
        .get();
      return { success: true, result: { data: res.data } };
      // #endif

      // #ifdef H5
      const result = persons.filter(p => p.family_id === familyId);
      return { success: true, result: { data: deepClone(result) } };
      // #endif
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // 查询关系
  async getRelationsByFamily(familyId: string) {
    try {
      // #ifdef MP-WEIXIN || APP-PLUS
      const res = await uniCloud.database().collection(COLLECTIONS.RELATION)
        .where({ family_id: familyId })
        .get();
      return { success: true, result: { data: res.data } };
      // #endif

      // #ifdef H5
      const result = relations.filter(r => r.family_id === familyId);
      return { success: true, result: { data: deepClone(result) } };
      // #endif
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // 搜索人物（姓名、字、号模糊搜索）
  async searchPersons(familyId: string, keyword: string) {
    try {
      // #ifdef MP-WEIXIN || APP-PLUS
      const res = await uniCloud.database().collection(COLLECTIONS.PERSON)
        .where({
          family_id: familyId,
          name: new RegExp(keyword, 'i')
        })
        .get();
      return { success: true, result: { data: res.data } };
      // #endif

      // #ifdef H5
      const result = persons.filter(p =>
        p.family_id === familyId && (
          p.name?.includes(keyword) ||
          p.courtesy_name?.includes(keyword) ||
          p.art_name?.includes(keyword)
        )
      );
      return { success: true, result: { data: deepClone(result) } };
      // #endif
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // 删除人物
  async deletePerson(personId: string) {
    try {
      // #ifdef MP-WEIXIN || APP-PLUS
      await uniCloud.database().collection(COLLECTIONS.PERSON).doc(personId).remove();
      return { success: true };
      // #endif

      // #ifdef H5
      persons = persons.filter(p => p._id !== personId);
      relations = relations.filter(r => r.from_id !== personId && r.to_id !== personId);
      return { success: true };
      // #endif
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
};

export { db };
export type Family = any;
export type Person = any;
export type Relation = any;