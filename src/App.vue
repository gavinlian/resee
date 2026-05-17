<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

onLaunch(() => {
  // 应用启动
})

onShow(() => {
  // 应用显示
})

onHide(() => {
  // 应用隐藏
})

function checkLogin() {
  // 登录检查逻辑，后续接入真实登录
  const token = uni.getStorageSync('token')
  if (!token) {
    // 可选：跳转登录页
  }
}
</script>

<style>
@import '@/styles/global.scss';
</style>