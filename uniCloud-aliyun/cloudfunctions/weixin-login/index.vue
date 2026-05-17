'use strict';
const db = uniCloud.database()
const usersCollection = db.collection('users')

exports.main = async (event, context) => {
  const { code } = event

  if (!code) {
    return { success: false, message: '缺少 code 参数' }
  }

  try {
    // 向微信接口申请 session_key
    const wxLoginUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${context.APPID}&secret=${context.APPSECRET}&js_code=${code}&grant_type=authorization_code`

    let sessionData
    try {
      const res = await uniCloud.httpclient.request(wxLoginUrl, { method: 'GET', dataType: 'json' })
      sessionData = res.data
    } catch (e) {
      return { success: false, message: '微信接口调用失败' }
    }

    if (sessionData.errcode) {
      return { success: false, message: sessionData.errmsg || '微信登录失败' }
    }

    const openid = sessionData.openid
    const unionid = sessionData.unionid || ''

    // 查询用户是否已存在
    let user = null
    try {
      user = await usersCollection.where({ openid }).get()
    } catch (e) {
      // users 表不存在，先创建
    }

    let uid
    let token

    if (user && user.data && user.data.length > 0) {
      // 已存在用户，更新信息
      uid = user.data[0]._id
      await usersCollection.doc(uid).update({
        last_login_date: Date.now(),
        session_key: sessionData.session_key || ''
      })
    } else {
      // 新用户创建
      const now = Date.now()
      const newUser = {
        openid,
        unionid,
        nickname: '',
        avatar: '',
        phone: '',
        level: 'free',
        create_date: now,
        last_login_date: now,
        session_key: sessionData.session_key || ''
      }

      let addRes
      try {
        addRes = await usersCollection.add(newUser)
        uid = addRes.id
      } catch (e) {
        // 如果 users 表不存在，创建用户
        try {
          // 创建 users 表的 schema（如果不存在）
          await db.createCollection('users').then(() => {
            return usersCollection.add(newUser)
          }).then(addRes => {
            uid = addRes.id
          })
        } catch (createErr) {
          // 如果表已存在但添加失败，返回匿名登录成功
          uid = 'guest_' + openid.substring(0, 16)
        }
      }
    }

    // 生成自定义 token（简单实现，生产环境应使用 JWT）
    token = require('crypto').createHash('sha256').update(uid + Date.now()).digest('hex').substring(0, 32)

    // 返回用户信息和 token
    return {
      success: true,
      userInfo: {
        uid,
        openid,
        unionid
      },
      token
    }
  } catch (e) {
    console.error('weixin-login error:', e.message)
    return { success: false, message: e.message || '登录失败' }
  }
}