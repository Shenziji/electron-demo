<script setup>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { onMounted } from 'vue'

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshBasicMaterial({ color: 0x00FF00 })
const cube = new THREE.Mesh(geometry, material)
scene.add(cube)
camera.position.z = 5
const controls = new OrbitControls(camera, renderer.domElement)
function animate() {
  requestAnimationFrame(animate)

  cube.rotation.x += 0.01
  cube.rotation.y += 0.01
  controls.update()
  renderer.render(scene, camera)
}
animate()

function onWindowResize() {
  const SCREEN_WIDTH = window.innerWidth
  const SCREEN_HEIGHT = window.innerHeight
  // CSS3renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
  renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT)
  camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT
  camera.updateProjectionMatrix()
}

window.addEventListener('resize', onWindowResize) // 添加窗口改变相机刷新时间

onMounted(() => {
  const threediv = document.getElementById('three')
  threediv.appendChild(renderer.domElement)
})
</script>

<template>
  <div id="three" />
  <div class="title">
    threejs+vue3
  </div>
</template>

<style lang="scss" scoped>
.title {
  width: 100vw;
  height: 100vh;
  position: absolute;
  margin: auto;
  top: 60px;
  color: white;
  text-align: center;
  font-size: 30px;
  // font-weight: bold;
  pointer-events: none;
}
</style>
