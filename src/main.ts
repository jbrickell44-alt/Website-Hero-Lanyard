import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import './style.css'

async function start() {
  await RAPIER.init()

  const app = document.querySelector<HTMLDivElement>('#app')

  if (!app) {
    throw new Error('Could not find the #app element')
  }

  // Three.js scene
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#1a1a1a')

  const camera = new THREE.PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  )

  camera.position.set(0, 0, 8)

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
  })

  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  app.appendChild(renderer.domElement)

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 3)
  directionalLight.position.set(3, 4, 5)
  scene.add(directionalLight)

  // Physics world
  const gravity = {
    x: 0,
    y: -9.81,
    z: 0,
  }

  const world = new RAPIER.World(gravity)

  // Visible badge
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

  // Physics badge
  const badgeBodyDescription = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(0, 2, 0)
    .setRotation({
      x: 0,
      y: 0,
      z: 0.15,
      w: 0.9887,
    })

  const badgeBody = world.createRigidBody(
    badgeBodyDescription
  )

  const badgeCollider = RAPIER.ColliderDesc.cuboid(
    1.05,
    1.4,
    0.06
  )
    .setRestitution(0.25)
    .setFriction(0.7)

  world.createCollider(
    badgeCollider,
    badgeBody
  )

  // Visible floor
  const floorGeometry = new THREE.BoxGeometry(10, 0.2, 5)

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.8,
  })

  const floor = new THREE.Mesh(
    floorGeometry,
    floorMaterial
  )

  floor.position.y = -2.5
  scene.add(floor)

  // Physics floor
  const floorBodyDescription = RAPIER.RigidBodyDesc.fixed()
    .setTranslation(0, -2.5, 0)

  const floorBody = world.createRigidBody(
    floorBodyDescription
  )

  const floorCollider = RAPIER.ColliderDesc.cuboid(
    5,
    0.1,
    2.5
  )

  world.createCollider(
    floorCollider,
    floorBody
  )

  // Resize handling
  window.addEventListener('resize', () => {
    camera.aspect =
      window.innerWidth / window.innerHeight

    camera.updateProjectionMatrix()

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    )

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, 2)
    )
  })

  // Animation
  function animate() {
    world.step()

    const position = badgeBody.translation()
    const rotation = badgeBody.rotation()

    badge.position.set(
      position.x,
      position.y,
      position.z
    )

    badge.quaternion.set(
      rotation.x,
      rotation.y,
      rotation.z,
      rotation.w
    )

    renderer.render(scene, camera)
  }

  renderer.setAnimationLoop(animate)
}

start().catch(error => {
  console.error('Could not start the physics scene:', error)
})