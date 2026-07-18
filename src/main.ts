import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import './style.css'

async function start() {
  await RAPIER.init()

  const app = document.querySelector<HTMLDivElement>('#app')

  if (!app) {
    throw new Error('Could not find the #app element')
  }

  /*
   * Three.js scene
   */

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

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  )

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
  )

  app.appendChild(renderer.domElement)

  /*
   * Lighting
   */

  const ambientLight = new THREE.AmbientLight(
    0xffffff,
    1.5
  )

  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(
    0xffffff,
    3
  )

  directionalLight.position.set(3, 4, 5)

  scene.add(directionalLight)

  const fillLight = new THREE.DirectionalLight(
    0x8ea7ff,
    1.5
  )

  fillLight.position.set(-4, 1, 2)

  scene.add(fillLight)

  /*
   * Rapier physics world
   */

  const gravity = {
    x: 0,
    y: -9.81,
    z: 0,
  }

  const world = new RAPIER.World(gravity)

  /*
   * Visible badge
   */

  const badgeGeometry = new THREE.BoxGeometry(
    2.1,
    2.8,
    0.12
  )

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

  /*
   * Badge physics body
   */

  const badgeBodyDescription =
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0.65, 1.85, 0)
      .setRotation({
        x: 0,
        y: 0,
        z: 0.12,
        w: 0.9928,
      })
      .setLinearDamping(0.4)
      .setAngularDamping(0.8)

  const badgeBody = world.createRigidBody(
    badgeBodyDescription
  )

  const badgeColliderDescription =
    RAPIER.ColliderDesc.cuboid(
      1.05,
      1.4,
      0.06
    )
      .setRestitution(0.1)
      .setFriction(0.7)

  world.createCollider(
    badgeColliderDescription,
    badgeBody
  )

  /*
   * Fixed anchor
   */

  const anchorBodyDescription =
    RAPIER.RigidBodyDesc.fixed()
      .setTranslation(0, 3.4, 0)

  const anchorBody = world.createRigidBody(
    anchorBodyDescription
  )

  /*
   * Joint connecting badge to anchor
   */

  const jointData = RAPIER.JointData.spherical(
    {
      x: 0,
      y: 0,
      z: 0,
    },
    {
      x: 0,
      y: 1.4,
      z: 0,
    }
  )

  world.createImpulseJoint(
    jointData,
    anchorBody,
    badgeBody,
    true
  )

  /*
   * Temporary visible attachment line
   */

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x777777,
  })

  const lineGeometry = new THREE.BufferGeometry()

  const linePositions = new Float32Array(6)

  lineGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(
      linePositions,
      3
    )
  )

  const attachmentLine = new THREE.Line(
    lineGeometry,
    lineMaterial
  )

  scene.add(attachmentLine)

  /*
   * Resize handling
   */

  function handleResize() {
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
  }

  window.addEventListener(
    'resize',
    handleResize
  )

  /*
   * Animation
   */

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

    const badgeTop = new THREE.Vector3(
      0,
      1.4,
      0
    )

    badgeTop.applyQuaternion(
      badge.quaternion
    )

    badgeTop.add(
      badge.position
    )

    const positions =
      attachmentLine.geometry.attributes
        .position as THREE.BufferAttribute

    positions.setXYZ(
      0,
      0,
      3.4,
      0
    )

    positions.setXYZ(
      1,
      badgeTop.x,
      badgeTop.y,
      badgeTop.z
    )

    positions.needsUpdate = true

    renderer.render(
      scene,
      camera
    )
  }

  renderer.setAnimationLoop(
    animate
  )
}

start().catch(error => {
  console.error(
    'Could not start the physics scene:',
    error
  )
})