import * as THREE from 'three'
import './style.css'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Could not find the #app element')
}

// Create the 3D scene
const scene = new THREE.Scene()
scene.background = new THREE.Color('#1a1a1a')

// Create the camera
const camera = new THREE.PerspectiveCamera(
  35,
  window.innerWidth / window.innerHeight,
  0.1,
  100
)

camera.position.z = 7

// Create the renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true,
})

renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

app.appendChild(renderer.domElement)

// Add lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 3)
directionalLight.position.set(3, 4, 5)
scene.add(directionalLight)

// Create a temporary badge
const badgeGeometry = new THREE.BoxGeometry(2.1, 2.8, 0.12)

const badgeMaterial = new THREE.MeshStandardMaterial({
  color: 0xdddddd,
  roughness: 0.45,
  metalness: 0.05,
})

const badge = new THREE.Mesh(
  badgeGeometry,
  badgeMaterial
)

scene.add(badge)

// Keep everything responsive
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  )
})

// Animate the badge
function animate() {
  badge.rotation.y += 0.005

  renderer.render(scene, camera)
}

renderer.setAnimationLoop(animate)
