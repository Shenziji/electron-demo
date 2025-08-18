<script setup>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { checkUpdate } from '@/utils/electronUtils'
import { ipcRenderer } from 'electron'
import si from 'systeminformation'
const container = ref(null)
let scene, camera, renderer, cube, controls, animationId
let isAnimating = false
let startTime = 0
let duration = 0

// 动画状态
const state = reactive({
  speed: 0.1, // 移动速度
  distance: 5, // 移动距离
  direction: 'x', // 移动方向 (x, y, z)
  easingType: 'linear', // 动画类型
  progress: 0, // 移动进度 (0-1)
})

// 位置状态
const position = reactive({
  x: 0,
  y: 0,
  z: 0,
})

// 目标位置
const targetPosition = reactive({
  x: 0,
  y: 0,
  z: 0,
})

// 初始位置
const initialPosition = {
  x: 0,
  y: 0,
  z: 0,
}

// 格式化数值
function formatNumber(num, decimals = 2) {
  return Number.parseFloat(num).toFixed(decimals)
}

// 格式化位置显示
function formatPosition(pos) {
  return `(${formatNumber(pos.x)}, ${formatNumber(pos.y)}, ${formatNumber(
    pos.z
  )})`
}

// 初始化场景
function init() {
  // 创建场景、相机和渲染器
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf0f0f0)

  /**
   * THREE.PerspectiveCamera(fov, aspect, near, far)
   * fov常见值：
      45-60：接近人眼的自然视角，适合大多数场景。
      较小值（如 30）：长焦效果，物体看起来更大，视野变窄。
      较大值（如 120）：广角效果，视野变宽，但可能产生扭曲（鱼眼效果）。
   * aspect（宽高比）
      作用：确保渲染的图像不会变形，通常与渲染窗口的宽高比一致。
   * near（近截面）
      作用：定义相机前方的裁剪平面，距离相机小于 near 的物体会被隐藏。
      值不能为 0，通常设置为 0.1 或更小（如 0.001）。
   * far（远截面）
      作用：定义相机前方的最远可见距离，超过 far 的物体会被隐藏。
      设置过大会降低深度缓冲区的精度，导致远处物体的深度排序错误。
      通常根据场景规模设置（如 1000、10000）。
   */
  camera = new THREE.PerspectiveCamera(
    75, // 视野角度（Field of View），垂直方向的视角范围（单位：度）。
    window.innerWidth / window.innerHeight, // 宽高比，通常设置为 窗口宽度 / 窗口高度。
    0.1, // 近截面距离，相机能看到的最近距离，小于此距离的物体会被裁剪。
    1000 // 远截面距离，相机能看到的最远距离，大于此距离的物体会被裁剪。
  )
  camera.position.z = 15
  camera.position.y = 5
  camera.position.x = 15

  renderer = new THREE.WebGLRenderer({
    antialias: true, // 启用抗锯齿
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  container.value.appendChild(renderer.domElement)

  // 添加环境光源
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)
  // 添加平行光源
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(5, 5, 5)
  scene.add(directionalLight)

  // 创建网格辅助线
  /**
   * new THREE.GridHelper(size, divisions, colorCenterLine, colorGrid)
   * size 网格的总尺寸（从中心向四周扩展的范围），默认值为 10。
   * divisions 网格的分割数（行数和列数），默认值为 10，表示将网格分为 10x10 个单元格。
   * colorCenterLine 中央轴线（X=0 和 Z=0 的线）的颜色，默认值为 0x444444（深灰色）。
   * colorGrid 其他网格线的颜色，默认值为 0x888888（浅灰色）。
   */
  const gridHelper = new THREE.GridHelper(20, 20, 0xcccccc, 0xcccccc)
  scene.add(gridHelper)

  // 创建移动的立方体
  // 定义物体形状
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  // 定义材质
  const material = new THREE.MeshLambertMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.8,
  })
  /**
   * Mesh 创建 3D 物体的核心类，用于将几何形状（Geometry 或 BufferGeometry）与材质（Material）结合，形成可渲染的实体对象
   * geometry 定义网格的几何形状（如顶点、面、UV 坐标等）
   * material 定义网格的材质（如颜色、纹理、光照反应等）。可以是单个材质或材质数组
   */
  cube = new THREE.Mesh(geometry, material)
  scene.add(cube)

  // 添加轨道控制器
  controls = new OrbitControls(camera, renderer.domElement)
  // 启用阻尼（平滑效果）
  controls.enableDamping = true
  // controls.dampingFactor = 0.05 // 阻尼系数，值越小阻尼效果越明显 默认值为 0.05

  // 保存初始位置
  initialPosition.x = cube.position.x
  initialPosition.y = cube.position.y
  initialPosition.z = cube.position.z

  // 更新目标位置
  updateTargetPosition()

  // 处理窗口大小变化
  window.addEventListener('resize', onWindowResize)

  // 开始渲染循环
  animate()
}

// 更新目标位置
function updateTargetPosition() {
  targetPosition.x = initialPosition.x
  targetPosition.y = initialPosition.y
  targetPosition.z = initialPosition.z

  if (state.direction === 'x') {
    targetPosition.x += state.distance
  } else if (state.direction === 'y') {
    targetPosition.y += state.distance
  } else if (state.direction === 'z') {
    targetPosition.z += state.distance
  }
}

// 窗口大小变化处理
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

// 动画循环
function animate() {
  animationId = requestAnimationFrame(animate)
  if (isAnimating) {
    const elapsedTime = Date.now() - startTime
    state.progress = Math.min(elapsedTime / duration, 1)

    // 使用缓动函数计算当前位置
    const easeProgress = applyEasing(state.progress, state.easingType)

    // 更新立方体位置
    cube.position.x =
      initialPosition.x + (targetPosition.x - initialPosition.x) * easeProgress
    cube.position.y =
      initialPosition.y + (targetPosition.y - initialPosition.y) * easeProgress
    cube.position.z =
      initialPosition.z + (targetPosition.z - initialPosition.z) * easeProgress

    // 更新状态
    position.x = cube.position.x
    position.y = cube.position.y
    position.z = cube.position.z

    // 动画完成
    if (state.progress >= 1) {
      isAnimating = false
    }
  }

  // 更新控制器和渲染
  controls.update()
  renderer.render(scene, camera)

  if (Number.parseFloat(camera.position.y) === 30) {
    camera.position.y = 0
  }
  camera.position.y += 0.01
}

// 应用缓动函数
function applyEasing(t, type) {
  switch (type) {
    case 'easeIn':
      return t * t // 二次方加速
    case 'easeOut':
      return -t * (t - 2) // 二次方减速
    case 'easeInOut':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t // 先加速后减速
    default: // linear
      return t
  }
}

// 开始动画
function startAnimation() {
  if (isAnimating) return

  // 保存当前位置为初始位置
  initialPosition.x = cube.position.x
  initialPosition.y = cube.position.y
  initialPosition.z = cube.position.z

  // 更新目标位置
  updateTargetPosition()

  // 计算动画持续时间
  duration = (state.distance / state.speed) * 1000 // 转换为毫秒

  // 重置动画状态
  state.progress = 0
  startTime = Date.now()
  isAnimating = true
}

// 重置位置
function resetPosition() {
  isAnimating = false

  // 直接设置回初始位置
  cube.position.x = 0
  cube.position.y = 0
  cube.position.z = 0

  camera.position.set(15, 5, 15)

  // 更新状态
  position.x = cube.position.x
  position.y = cube.position.y
  position.z = cube.position.z

  // 保存初始位置
  initialPosition.x = cube.position.x
  initialPosition.y = cube.position.y
  initialPosition.z = cube.position.z

  // 更新目标位置
  updateTargetPosition()
  state.progress = 0
}

// 设置移动方向
function setDirection(dir) {
  state.direction = dir
  updateTargetPosition()
}

// 版本更新，处理下载进度回调
function downloadProgressHandle(e, data) {
  console.log('下载进度', data)
}

const handleCheckUpdate = () => {
  console.log('点击更新检测')
  checkUpdate()
}

const checkSystermInfo = () => {
  // 获取设备信息
  si.system()
    .then((data) => console.log('获取设备信息', data))
    .catch((error) => console.error(error))
  // 获取uuid
  si.uuid()
    .then((data) => console.log('获取uuid', data))
    .catch((error) => console.error(error))

  // 获取 CPU 信息
  // si.cpu()
  //   .then((data) => console.log('获取 CPU 信息', data))
  //   .catch((error) => console.error(error))

  // 获取内存信息
  // si.mem()
  //   .then((data) => console.log('获取内存信息', data))
  //   .catch((error) => console.error(error))

  // 获取操作系统信息
  // si.osInfo()
  //   .then((data) => console.log('获取操作系统信息', data))
  //   .catch((error) => console.error(error))
}

onMounted(() => {
  init()
  // 版本更新，下载进度回调
  ipcRenderer.on('download-progress', downloadProgressHandle)
})

onBeforeUnmount(() => {
  // 清理资源
  if (animationId) cancelAnimationFrame(animationId)
  if (renderer) renderer.dispose()
  if (container.value && renderer.domElement) {
    container.value.removeChild(renderer.domElement)
  }
  window.removeEventListener('resize', onWindowResize)
  ipcRenderer.removeListener('download-progress', downloadProgressHandle)
})
</script>

<template>
  <div ref="container" class="w-full h-screen bg-gray-100" />
  <div class="fixed top-4 left-4 bg-white/80 p-4 rounded shadow-lg z-10 w-80">
    <div class="mb-3">
      <label class="block text-sm font-medium text-gray-700">移动速度</label>
      <input
        v-model.number="state.speed"
        type="range"
        min="0.01"
        max="1"
        step="0.01"
        class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <span class="text-xs text-gray-500 mt-1 block">{{
        formatNumber(state.speed, 2)
      }}</span>
    </div>

    <div class="mb-3">
      <label class="block text-sm font-medium text-gray-700">移动距离</label>
      <input
        v-model.number="state.distance"
        type="range"
        min="1"
        max="10"
        step="0.5"
        class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <span class="text-xs text-gray-500 mt-1 block"
        >{{ formatNumber(state.distance, 1) }} 单位</span
      >
    </div>

    <div class="mb-3">
      <label class="block text-sm font-medium text-gray-700">移动方向</label>
      <div class="flex space-x-2 mt-2">
        <button
          :class="
            state.direction === 'x'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'
          "
          class="px-3 py-1 rounded text-sm"
          @click="setDirection('x')"
        >
          X轴
        </button>
        <button
          :class="
            state.direction === 'y'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'
          "
          class="px-3 py-1 rounded text-sm"
          @click="setDirection('y')"
        >
          Y轴
        </button>
        <button
          :class="
            state.direction === 'z'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'
          "
          class="px-3 py-1 rounded text-sm"
          @click="setDirection('z')"
        >
          Z轴
        </button>
      </div>
    </div>

    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700">动画类型</label>
      <select
        v-model="state.easingType"
        class="w-full p-2 border border-gray-300 rounded mt-1"
      >
        <option value="linear">线性运动</option>
        <option value="easeIn">加速运动</option>
        <option value="easeOut">减速运动</option>
        <option value="easeInOut">先加速后减速</option>
      </select>
    </div>

    <div class="flex space-x-2">
      <button
        class="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        @click="startAnimation"
      >
        开始移动
      </button>
      <button
        class="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        @click="resetPosition"
      >
        重置位置
      </button>
    </div>

    <div class="mt-4 pt-4 border-t border-gray-200">
      <div class="flex justify-between text-sm">
        <span class="text-gray-600">当前位置:</span>
        <span class="font-medium">{{ formatPosition(position) }}</span>
      </div>
      <div class="flex justify-between text-sm mt-1">
        <span class="text-gray-600">目标位置:</span>
        <span class="font-medium">{{ formatPosition(targetPosition) }}</span>
      </div>
      <div class="flex justify-between text-sm mt-1">
        <span class="text-gray-600">移动进度:</span>
        <span class="font-medium"
          >{{ formatNumber(state.progress * 100, 1) }}%</span
        >
      </div>
    </div>
  </div>
  <div
    class="fixed top-4 right-4 bg-white/80 px-2 py-1 rounded shadow-lg z-10 w-20 cursor-pointer hover:bg-blue-50 transition duration-300 ease-in-out"
    @click="checkUpdate"
  >
    检查更新1.0.7
  </div>
  <div
    class="fixed top-30 right-4 bg-white/80 px-2 py-1 rounded shadow-lg z-10 w-20 cursor-pointer hover:bg-blue-50 transition duration-300 ease-in-out"
    @click="checkSystermInfo"
  >
    获取设备信息
  </div>
</template>

<style scoped>
div[ref='container'] {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
