/**
 * Unicloud 数据库封装（支持 H5 / 小程序 / App 多端）
 */

export const COLLECTIONS = {
  PERSON: 'person',
  FAMILY: 'family',
  SOURCE: 'source',
  OCR_RECORD: 'ocr_record',
  RELATION: 'relation',
  MEDIA: 'media'
} as const;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

const db = {
  // 获取当前用户族谱列表
  async getFamiliesByOwner(ownerUid: string) {
    try {
      const res = await uniCloud.database().collection(COLLECTIONS.FAMILY)
        .where({ owner_uid: ownerUid })
        .get();
      return { success: true, result: { data: res.data } };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // 创建族谱
  async addFamily(data: any) {
    try {
      const res = await uniCloud.database().collection(COLLECTIONS.FAMILY).add({
        ...data,
        created_at: Date.now()
      });
      return { success: true, result: { _id: res.id } };
    } catch (e: any) {
      console.error('[db] addFamily error:', e.message);
      return { success: false, error: e.message };
    }
  },

  // 删除族谱
  async deleteFamily(familyId: string) {
    try {
      await uniCloud.database().collection(COLLECTIONS.FAMILY).doc(familyId).remove();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // 保存 OCR 记录
  async addOcrRecord(data: any) {
    try {
      const res = await uniCloud.database().collection(COLLECTIONS.OCR_RECORD).add({
        ...data,
        status: data.status || 'pending',
        created_at: Date.now()
      });
      return { success: true, result: { _id: res.id } };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // 批量保存人物
  async addPersons(familyId: string, personList: Array<any>) {
    try {
      const items = personList.map(p => ({
        ...p,
        family_id: familyId,
        created_at: Date.now()
      }));
      const res = await uniCloud.database().collection(COLLECTIONS.PERSON).add(items);
      return { success: true, result: { id: res.id, count: items.length } };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // 批量保存关系
  async addRelations(familyId: string, relationList: Array<any>) {
    try {
      const items = relationList.map(r => ({
        ...r,
        family_id: familyId
      }));
      await uniCloud.database().collection(COLLECTIONS.RELATION).add(items);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // 查询族谱所有人物
  async getPersonsByFamily(familyId: string) {
    try {
      const res = await uniCloud.database().collection(COLLECTIONS.PERSON)
        .where({ family_id: familyId })
        .get();
      return { success: true, result: { data: res.data } };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // 查询关系
  async getRelationsByFamily(familyId: string) {
    try {
      const res = await uniCloud.database().collection(COLLECTIONS.RELATION)
        .where({ family_id: familyId })
        .get();
      return { success: true, result: { data: res.data } };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // 搜索人物（姓名、字、号模糊搜索）
  async searchPersons(familyId: string, keyword: string) {
    try {
      const res = await uniCloud.database().collection(COLLECTIONS.PERSON)
        .where({
          family_id: familyId,
          name: new RegExp(keyword, 'i')
        })
        .get();
      return { success: true, result: { data: res.data } };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // 删除人物
  async deletePerson(personId: string) {
    try {
      await uniCloud.database().collection(COLLECTIONS.PERSON).doc(personId).remove();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // 更新族谱根人物
  async updateFamilyRoot(familyId: string, rootPersonId: string) {
    try {
      await uniCloud.database().collection(COLLECTIONS.FAMILY).doc(familyId).update({
        root_person_id: rootPersonId
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // 获取族谱详情
  async getFamilyById(familyId: string) {
    try {
      const res = await uniCloud.database().collection(COLLECTIONS.FAMILY)
        .doc(familyId)
        .get();
      return { success: true, result: res.data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
};

export { db };
export type Family = any;
export type Person = any;
export type Relation = any;