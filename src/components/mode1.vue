<script setup>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { onBeforeUnmount, onMounted, ref } from 'vue'

// 引用DOM元素的容器
const container = ref(null)
// 加载状态指示器
const isLoading = ref(false)
// 声明Three.js对象变量
let scene, camera, renderer, controls, fbxModel, mixer, clock

/**
 * 初始化Three.js场景
 */
function initThreeJS() {
  // 创建场景对象
  scene = new THREE.Scene()
  // 设置场景背景颜色为黑色
  scene.background = new THREE.Color(0x000000)

  // 创建透视相机：参数依次为视角、宽高比、近截面、远截面
  camera = new THREE.PerspectiveCamera(
    75,
    container.value.clientWidth / container.value.clientHeight,
    0.1,
    1000,
  )
  // 设置相机初始位置（Z轴方向）
  camera.position.z = 5

  // 创建WebGL渲染器，开启抗锯齿
  renderer = new THREE.WebGLRenderer({ antialias: true })
  // 设置渲染器尺寸与容器一致
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
  // 设置渲染器像素比，适配高DPI屏幕
  renderer.setPixelRatio(window.devicePixelRatio)
  // 将渲染器的DOM元素添加到容器中
  container.value.appendChild(renderer.domElement)

  // 添加轨道控制器，允许用户通过鼠标交互控制相机
  controls = new OrbitControls(camera, renderer.domElement)
  // 启用阻尼效果，使相机移动更平滑
  controls.enableDamping = true

  // 添加环境光，提供基础照明
  const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.5)
  scene.add(ambientLight)

  // 添加平行光，提供定向照明，产生阴影效果
  const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1)
  directionalLight.position.set(5, 5, 5)
  scene.add(directionalLight)

  // 创建时钟对象，用于动画计时
  clock = new THREE.Clock()

  // 启动动画循环
  animate()
}

/**
 * 加载FBX模型
 * @param {string} url - 模型文件的URL
 */
function loadFBXModel(url) {
  // 设置加载状态为true
  isLoading.value = true

  // 创建FBX加载器实例
  const loader = new FBXLoader()

  // 如果已有模型，先从场景中移除
  if (fbxModel) {
    scene.remove(fbxModel)
    // 如果有动画混合器，停止所有动画
    if (mixer)
      mixer.stopAllAction()
  }

  // 加载FBX模型
  loader.load(
    // 模型URL
    url,
    // 加载成功回调
    (object) => {
      // 保存模型引用
      fbxModel = object
      // 将模型添加到场景中
      scene.add(fbxModel)

      // 计算模型的包围盒，用于自动调整相机位置
      const box = new THREE.Box3().setFromObject(fbxModel)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())

      // 将模型居中
      fbxModel.position.sub(center)
      // 根据模型大小调整相机位置，确保模型完全可见
      camera.position.set(0, 0, Math.max(size.x, size.y, size.z) * 1.5)

      // 设置控制器的目标点为模型中心
      controls.target.set(0, 0, 0)
      // 更新控制器
      controls.update()

      // 检查模型是否包含动画
      if (object.animations && object.animations.length > 0) {
        // 创建动画混合器
        mixer = new THREE.AnimationMixer(object)
        // 获取并播放第一个动画
        const action = mixer.clipAction(object.animations[0])
        action.play()
      }

      // 加载完成，设置加载状态为false
      isLoading.value = false
    },
    // 加载进度回调
    (xhr) => {
      console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`)
    },
    // 加载错误回调
    (error) => {
      console.error('加载模型失败:', error)
      isLoading.value = false
      // alert(`模型加载失败: ${error.message}`)
    },
  )
}

/**
 * 处理文件上传事件
 * @param {Event} event - 文件选择事件
 */
function handleFileUpload(event) {
  // 获取用户选择的文件
  const file = event.target.files[0]
  // 如果没有选择文件，直接返回
  if (!file)
    return

  // 检查文件格式是否为FBX
  if (!file.name.endsWith('.fbx')) {
    // alert('请选择FBX格式的文件')
    console.log('请选择FBX格式的文件')
    return
  }

  // 创建文件的临时URL
  const url = URL.createObjectURL(file)
  // 加载模型
  loadFBXModel(url)
}

/**
 * 动画循环函数：每一帧都会被调用
 */
function animate() {
  // 请求下一帧动画
  requestAnimationFrame(animate)
  // 更新控制器状态
  controls.update()
  // 如果有动画混合器，更新动画
  if (mixer)
    mixer.update(clock.getDelta())
  // 渲染场景
  renderer.render(scene, camera)
}

/**
 * 处理窗口大小变化事件
 */
function handleResize() {
  if (camera && renderer && container.value) {
    // 更新相机的宽高比
    camera.aspect = container.value.clientWidth / container.value.clientHeight
    // 更新相机投影矩阵
    camera.updateProjectionMatrix()
    // 更新渲染器尺寸
    renderer.setSize(container.value.clientWidth, container.value.clientHeight)
  }
}

// 组件挂载时执行
onMounted(() => {
  // 初始化Three.js场景
  initThreeJS()
  // 添加窗口大小变化监听器
  window.addEventListener('resize', handleResize)
})

// 组件卸载前执行
onBeforeUnmount(() => {
  // 释放控制器资源
  if (controls)
    controls.dispose()
  // 释放渲染器资源
  if (renderer)
    renderer.dispose()
  // 从容器中移除渲染器DOM元素
  if (container.value && renderer)
    container.value.removeChild(renderer.domElement)
  // 移除窗口大小变化监听器
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <!-- 主容器：垂直布局，顶部是文件上传区，底部是3D渲染区 -->
  <div class="flex flex-col h-screen">
    <!-- 文件上传区域 -->
    <div class="p-4 bg-gray-800 text-white">
      <input
        type="file"
        accept=".fbx"
        class="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors cursor-pointer"
        @change="handleFileUpload"
      >
    </div>
    <!-- 3D渲染容器 -->
    <div ref="container" class="flex-1 bg-gray-900 relative">
      <!-- 加载指示器：当模型正在加载时显示 -->
      <div
        v-if="isLoading"
        class="absolute inset-0 flex items-center justify-center bg-black/50"
      >
        <div class="text-white text-xl">
          加载中...
        </div>
      </div>
    </div>
  </div>
</template>
