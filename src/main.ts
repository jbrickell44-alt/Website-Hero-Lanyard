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
   * Configuration
   */

  const ANCHOR_Y = 2.15
  const MAX_DRAG_DISTANCE = 3.5
  const FIXED_TIMESTEP = 1 / 60

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

  renderer.outputColorSpace = THREE.SRGBColorSpace

  renderer.domElement.style.cursor = 'grab'
  renderer.domElement.style.touchAction = 'none'

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

  const world = new RAPIER.World({
    x: 0,
    y: -9.81,
    z: 0,
  })

  world.timestep = FIXED_TIMESTEP

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
      .setTranslation(0.45, 0.65, 0)
      .setRotation({
        x: 0,
        y: 0,
        z: 0.12,
        w: 0.9928,
      })
      .setLinearDamping(0.5)
      .setAngularDamping(1)

  const badgeBody = world.createRigidBody(
    badgeBodyDescription
  )

  const badgeColliderDescription =
    RAPIER.ColliderDesc.cuboid(
      1.05,
      1.4,
      0.06
    )
      .setRestitution(0.05)
      .setFriction(0.7)
      .setDensity(0.8)

  world.createCollider(
    badgeColliderDescription,
    badgeBody
  )

  /*
   * Fixed hanging anchor
   */

  const anchorBodyDescription =
    RAPIER.RigidBodyDesc.fixed()
      .setTranslation(0, ANCHOR_Y, 0)

  const anchorBody = world.createRigidBody(
    anchorBodyDescription
  )

  const hangingJointData =
    RAPIER.JointData.spherical(
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
    hangingJointData,
    anchorBody,
    badgeBody,
    true
  )

  /*
   * Temporary visible lanyard line
   */

  const lineGeometry = new THREE.BufferGeometry()

  const linePositions = new Float32Array(6)

  lineGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(
      linePositions,
      3
    )
  )

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x777777,
  })

  const attachmentLine = new THREE.Line(
    lineGeometry,
    lineMaterial
  )

  scene.add(attachmentLine)

  /*
   * Dragging setup
   */

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const dragPlane = new THREE.Plane()

  const cameraDirection = new THREE.Vector3()
  const dragTarget = new THREE.Vector3()
  const previousDragTarget = new THREE.Vector3()
  const anchorPosition = new THREE.Vector3(
    0,
    ANCHOR_Y,
    0
  )

  const dragBodyDescription =
    RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(0, 0, 0)

  const dragBody = world.createRigidBody(
    dragBodyDescription
  )

  let dragJoint: RAPIER.ImpulseJoint | null = null
  let dragging = false
  let activePointerId: number | null = null
  let previousDragTime = performance.now()

  const releaseVelocity = new THREE.Vector3()

  function updatePointer(event: PointerEvent) {
    const bounds =
      renderer.domElement.getBoundingClientRect()

    pointer.x =
      ((event.clientX - bounds.left) /
        bounds.width) *
        2 -
      1

    pointer.y =
      -(
        ((event.clientY - bounds.top) /
          bounds.height) *
          2 -
        1
      )
  }

  function clampDragTarget(target: THREE.Vector3) {
    const offset = target
      .clone()
      .sub(anchorPosition)

    if (offset.length() > MAX_DRAG_DISTANCE) {
      offset.setLength(MAX_DRAG_DISTANCE)

      target.copy(
        anchorPosition.clone().add(offset)
      )
    }
  }

  renderer.domElement.addEventListener(
    'pointerdown',
    event => {
      updatePointer(event)

      raycaster.setFromCamera(pointer, camera)

      const intersections =
        raycaster.intersectObject(
          badge,
          false
        )

      const hit = intersections[0]

      if (!hit) {
        return
      }

      dragging = true
      activePointerId = event.pointerId

      renderer.domElement.setPointerCapture(
        event.pointerId
      )

      renderer.domElement.style.cursor =
        'grabbing'

      camera.getWorldDirection(
        cameraDirection
      )

      dragPlane.setFromNormalAndCoplanarPoint(
        cameraDirection,
        hit.point
      )

      dragTarget.copy(hit.point)
      previousDragTarget.copy(hit.point)
      previousDragTime = performance.now()

      dragBody.setTranslation(
        {
          x: hit.point.x,
          y: hit.point.y,
          z: hit.point.z,
        },
        true
      )

      const localHitPoint =
        badge.worldToLocal(
          hit.point.clone()
        )

      const dragJointData =
        RAPIER.JointData.spherical(
          {
            x: 0,
            y: 0,
            z: 0,
          },
          {
            x: localHitPoint.x,
            y: localHitPoint.y,
            z: localHitPoint.z,
          }
        )

      dragJoint = world.createImpulseJoint(
        dragJointData,
        dragBody,
        badgeBody,
        true
      )
    }
  )

  renderer.domElement.addEventListener(
    'pointermove',
    event => {
      if (
        !dragging ||
        event.pointerId !== activePointerId
      ) {
        return
      }

      updatePointer(event)

      raycaster.setFromCamera(pointer, camera)

      const intersection =
        raycaster.ray.intersectPlane(
          dragPlane,
          dragTarget
        )

      if (!intersection) {
        return
      }

      clampDragTarget(dragTarget)

      const now = performance.now()
      const deltaSeconds = Math.max(
        (now - previousDragTime) / 1000,
        0.001
      )

      releaseVelocity
        .copy(dragTarget)
        .sub(previousDragTarget)
        .divideScalar(deltaSeconds)

      releaseVelocity.clampLength(0, 8)

      previousDragTarget.copy(dragTarget)
      previousDragTime = now

      dragBody.setNextKinematicTranslation({
        x: dragTarget.x,
        y: dragTarget.y,
        z: dragTarget.z,
      })
    }
  )

  function releaseBadge(event: PointerEvent) {
    if (
      !dragging ||
      event.pointerId !== activePointerId
    ) {
      return
    }

    dragging = false

    renderer.domElement.style.cursor = 'grab'

    if (dragJoint) {
      world.removeImpulseJoint(
        dragJoint,
        true
      )

      dragJoint = null
    }

    badgeBody.setLinvel(
      {
        x: releaseVelocity.x,
        y: releaseVelocity.y,
        z: releaseVelocity.z,
      },
      true
    )

    activePointerId = null
  }

  renderer.domElement.addEventListener(
    'pointerup',
    releaseBadge
  )

  renderer.domElement.addEventListener(
    'pointercancel',
    releaseBadge
  )

  /*
   * Resize handling
   */

  function handleResize() {
    camera.aspect =
      window.innerWidth /
      window.innerHeight

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

  const clock = new THREE.Clock()
  let accumulator = 0

  function animate() {
    const deltaTime = Math.min(
      clock.getDelta(),
      0.05
    )

    accumulator += deltaTime

    while (accumulator >= FIXED_TIMESTEP) {
      world.step()
      accumulator -= FIXED_TIMESTEP
    }

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
      ANCHOR_Y,
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

  renderer.setAnimationLoop(animate)
}

start().catch(error => {
  console.error(
    'Could not start the physics scene:',
    error
  )
})