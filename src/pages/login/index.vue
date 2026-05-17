<template>
  <view class="login-page">
    <!-- 顶部装饰 -->
    <view class="login-header">
      <view class="logo-area">
        <view class="logo-icon">📜</view>
        <text class="app-name">族见</text>
      </view>
      <text class="app-slogan">见家族，见自己</text>
    </view>

    <!-- 登录区域 -->
    <view class="login-section">
      <text class="section-title">登录账号</text>
      <text class="section-desc">登录后可以同步族谱数据到云端</text>

      <!-- 微信登录按钮 -->
      <button class="btn-weixin" :disabled="loading" @click="doWeixinLogin">
        <text class="btn-icon">🟢</text>
        <text class="btn-text">{{ loading ? '登录中...' : '微信一键登录' }}</text>
      </button>

      <!-- 分割线 -->
      <view class="divider">
        <view class="divider-line"></view>
        <text class="divider-text">其他登录方式</text>
        <view class="divider-line"></view>
      </view>

      <!-- 手机号登录 -->
      <view class="phone-login" @click="switchToPhoneLogin">
        <text class="phone-icon">📱</text>
        <text class="phone-text">手机号登录</text>
      </view>
    </view>

    <!-- 用户协议 -->
    <view class="agreement-row">
      <view class="checkbox" :class="{ checked: agreed }" @click="agreed = !agreed">
        <text v-if="agreed" class="check-icon">✓</text>
      </view>
      <text class="agreement-text">
        登录即表示同意
        <text class="link" @click.stop="showAgreement('user')">《用户协议》</text>
        和
        <text class="link" @click.stop="showAgreement('privacy')">《隐私政策》</text>
      </text>
    </view>

    <!-- 手机号登录弹窗 -->
    <view v-if="showPhoneModal" class="modal-overlay" @click="showPhoneModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">手机号登录</text>
          <text class="modal-close" @click="showPhoneModal = false">✕</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <view class="phone-input-row">
              <text class="phone-prefix">+86</text>
              <input
                v-model="phoneNumber"
                class="phone-input"
                style="flex:1;min-width:0;padding:24rpx;border:2rpx solid var(--border);border-radius:12rpx;font-size:15px;background:var(--bg-light);color:var(--text-dark);box-sizing:border-box;outline:none;"
                type="tel"
                maxlength="11"
                placeholder="请输入手机号"
              />
            </view>
          </view>
          <view class="form-item">
            <input
              v-model="verifyCode"
              class="code-input"
              style="flex:1;min-width:0;padding:24rpx;border:2rpx solid var(--border);border-radius:12rpx;font-size:15px;background:var(--bg-light);color:var(--text-dark);box-sizing:border-box;outline:none;"
              type="number"
              maxlength="6"
              placeholder="请输入验证码"
            />
            <button class="btn-code" :disabled="codeCountdown > 0" @click="sendVerifyCode">
              <text>{{ codeCountdown > 0 ? `${codeCountdown}s` : '获取验证码' }}</text>
            </button>
          </view>
        </view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="showPhoneModal = false">取消</button>
          <button class="btn-confirm" :disabled="!canPhoneLogin" @click="doPhoneLogin">登录</button>
        </view>
      </view>
    </view>

    <!-- 加载提示 -->
    <view v-if="loading" class="loading-overlay">
      <view class="loading-box">
        <view class="loading-spinner"></view>
        <text class="loading-title">正在登录...</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const loading = ref(false)
const agreed = ref(false)
const showPhoneModal = ref(false)
const phoneNumber = ref('')
const verifyCode = ref('')
const codeCountdown = ref(0)

const canPhoneLogin = computed(() => {
  return phoneNumber.value.length === 11 && verifyCode.value.length === 6
})

async function doWeixinLogin() {
  if (!agreed.value) {
    uni.showToast({ title: '请先同意用户协议', icon: 'none' })
    return
  }

  loading.value = true
  try {
    // #ifdef MP-WEIXIN
    const [loginErr, loginRes] = await uni.login({ provider: 'weixin' })
    if (loginErr) throw new Error('微信登录失败')
    
    // 调用云函数完成登录
    const res = await uniCloud.callFunction({
      name: 'weixin-login',
      data: { code: loginRes.code }
    })
    
    if (res.success && res.userInfo) {
      uni.setStorageSync('user_id', res.userInfo.uid)
      uni.setStorageSync('token', res.token)
      uni.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => uni.navigateBack(), 1500)
    } else {
      throw new Error(res.message || '登录失败')
    }
    // #endif

    // #ifndef MP-WEIXIN
    uni.showToast({ title: '请在微信小程序中使用', icon: 'none' })
    // #endif
  } catch (e: any) {
    uni.showToast({ title: e.message || '登录失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function switchToPhoneLogin() {
  if (!agreed.value) {
    uni.showToast({ title: '请先同意用户协议', icon: 'none' })
    return
  }
  showPhoneModal.value = true
}

async function sendVerifyCode() {
  if (phoneNumber.value.length !== 11) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }

  try {
    await uniCloud.callFunction({
      name: 'send-verify-code',
      data: { phone: phoneNumber.value }
    })
    uni.showToast({ title: '验证码已发送', icon: 'success' })
    
    codeCountdown.value = 60
    const timer = setInterval(() => {
      codeCountdown.value--
      if (codeCountdown.value <= 0) clearInterval(timer)
    }, 1000)
  } catch (e: any) {
    uni.showToast({ title: e.message || '发送失败', icon: 'none' })
  }
}

async function doPhoneLogin() {
  if (!canPhoneLogin.value) return

  loading.value = true
  try {
    const res = await uniCloud.callFunction({
      name: 'phone-login',
      data: { phone: phoneNumber.value, code: verifyCode.value }
    })

    if (res.success && res.userInfo) {
      uni.setStorageSync('user_id', res.userInfo.uid)
      uni.setStorageSync('token', res.token)
      showPhoneModal.value = false
      uni.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => uni.navigateBack(), 1500)
    } else {
      throw new Error(res.message || '登录失败')
    }
  } catch (e: any) {
    uni.showToast({ title: e.message || '登录失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function showAgreement(type: 'user' | 'privacy') {
  const url = type === 'user' ? '/pages/about/user-agreement' : '/pages/about/privacy-policy'
  uni.navigateTo({ url })
}
</script>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #F9F5F0 0%, #F5EFE6 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 48rpx;
}

.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;
  padding-bottom: 60rpx;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.logo-icon {
  font-size: 72rpx;
}

.app-name {
  font-size: 40px;
  font-weight: 700;
  color: var(--primary);
  font-family: 'Noto Serif SC', serif;
}

.app-slogan {
  font-size: 14px;
  color: var(--text-muted);
}

.login-section {
  width: 100%;
  max-width: 600rpx;
  margin-top: 40rpx;
}

.section-title {
  display: block;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-dark);
  text-align: center;
  margin-bottom: 8rpx;
}

.section-desc {
  display: block;
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
  margin-bottom: 48rpx;
}

.btn-weixin {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 28rpx;
  background: #07C160;
  color: #fff;
  border-radius: 16rpx;
  font-size: 16px;
  font-weight: 500;
  border: none;
  box-shadow: 0 4rpx 16rpx rgba(7, 193, 96, 0.3);

  &:active { opacity: 0.9; }
  &:disabled { opacity: 0.6; }
}

.btn-icon {
  font-size: 36rpx;
}

.divider {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin: 40rpx 0;
}

.divider-line {
  flex: 1;
  height: 1rpx;
  background: var(--border);
}

.divider-text {
  font-size: 12px;
  color: var(--text-muted);
}

.phone-login {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 24rpx;
  background: #fff;
  border: 2rpx solid var(--border);
  border-radius: 16rpx;

  &:active { background: var(--bg-light); }
}

.phone-icon {
  font-size: 36rpx;
}

.phone-text {
  font-size: 15px;
  color: var(--text-dark);
}

.agreement-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-top: 48rpx;
  padding-bottom: 48rpx;
}

.checkbox {
  width: 40rpx;
  height: 40rpx;
  border-radius: 8rpx;
  border: 2rpx solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 4rpx;

  &.checked {
    background: var(--primary);
    border-color: var(--primary);
  }
}

.check-icon {
  color: #fff;
  font-size: 24rpx;
}

.agreement-text {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.6;
  flex: 1;
}

.link {
  color: var(--primary);
}

// Modal styles
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-content {
  width: 90%;
  max-width: 640rpx;
  background: #fff;
  border-radius: 24rpx;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 40rpx 40rpx 0;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-dark);
}

.modal-close {
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

.modal-body {
  padding: 32rpx 40rpx;
}

.form-item {
  margin-bottom: 24rpx;
}

.phone-input-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.phone-prefix {
  font-size: 15px;
  color: var(--text-dark);
  padding: 24rpx 0;
}

.code-input {
  flex: 1;
}

.btn-code {
  padding: 24rpx;
  background: var(--primary);
  color: #fff;
  border-radius: 12rpx;
  font-size: 13px;
  border: none;
  white-space: nowrap;

  &:disabled { opacity: 0.5; }
}

.modal-footer {
  display: flex;
  gap: 20rpx;
  padding: 0 40rpx 40rpx;
}

.btn-cancel, .btn-confirm {
  flex: 1;
  padding: 28rpx;
  border-radius: 16rpx;
  font-size: 16px;
  font-weight: 500;
  text-align: center;
  border: none;

  &:active { opacity: 0.9; }
}

.btn-cancel {
  background: var(--bg-light);
  color: var(--text-dark);
}

.btn-confirm {
  background: var(--primary);
  color: #fff;

  &:disabled { opacity: 0.5; }
}

.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 998;
}

.loading-box {
  background: #fff;
  border-radius: 24rpx;
  padding: 48rpx 64rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-spinner {
  width: 64rpx;
  height: 64rpx;
  border: 4rpx solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 24rpx;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-title {
  font-size: 15px;
  color: var(--text-dark);
}
</style>