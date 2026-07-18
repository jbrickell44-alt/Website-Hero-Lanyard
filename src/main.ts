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

  const ANCHOR_Y = 3.2

  const ROPE_SEGMENTS = 11
  const SEGMENT_LENGTH = 0.2
  const BADGE_LINK_LENGTH = 0.14

  const LANYARD_SAMPLES = 48
  const LANYARD_HALF_WIDTH = 0.055

  const FIXED_TIMESTEP = 1 / 60

  const TOTAL_ROPE_LENGTH =
    ROPE_SEGMENTS * SEGMENT_LENGTH +
    BADGE_LINK_LENGTH

  const MAX_DRAG_DISTANCE =
    TOTAL_ROPE_LENGTH + 1.5

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
    1.4
  )

  fillLight.position.set(-4, 1, 2)

  scene.add(fillLight)

  /*
   * Physics world
   */

  const world = new RAPIER.World({
    x: 0,
    y: -9.81,
    z: 0,
  })

  world.timestep = FIXED_TIMESTEP

  /*
   * Fixed anchor
   */

  const anchorBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed()
      .setTranslation(0, ANCHOR_Y, 0)
  )

  /*
   * Physics lanyard nodes
   */

  const ropeBodies: RAPIER.RigidBody[] = []

  for (
    let index = 0;
    index < ROPE_SEGMENTS;
    index += 1
  ) {
    const bodyY =
      ANCHOR_Y -
      SEGMENT_LENGTH * (index + 1)

    const ropeBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, bodyY, 0)
        .setAdditionalMass(0.035)
        .setLinearDamping(0.7)
        .setAngularDamping(1.2)
        .setCanSleep(false)
        .setAdditionalSolverIterations(8)
    )

    ropeBodies.push(ropeBody)

    const previousBody =
      index === 0
        ? anchorBody
        : ropeBodies[index - 1]

    const ropeJoint = RAPIER.JointData.rope(
      SEGMENT_LENGTH,
      {
        x: 0,
        y: 0,
        z: 0,
      },
      {
        x: 0,
        y: 0,
        z: 0,
      }
    )

    world.createImpulseJoint(
      ropeJoint,
      previousBody,
      ropeBody,
      true
    )
  }

  /*
   * Visible badge
   */

  const badgeGeometry = new THREE.BoxGeometry(
    2.1,
    2.8,
    0.12
  )

  const badgeMaterial =
    new THREE.MeshStandardMaterial({
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

  const badgeStartY =
    ANCHOR_Y -
    ROPE_SEGMENTS * SEGMENT_LENGTH -
    BADGE_LINK_LENGTH -
    1.4

  const badgeBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(
        0.35,
        badgeStartY,
        0
      )
      .setRotation({
        x: 0,
        y: 0,
        z: 0.08,
        w: 0.9968,
      })
      .setLinearDamping(0.45)
      .setAngularDamping(0.9)
      .setAdditionalSolverIterations(12)
  )

  const badgeCollider =
    RAPIER.ColliderDesc.cuboid(
      1.05,
      1.4,
      0.06
    )
      .setRestitution(0.05)
      .setFriction(0.7)
      .setDensity(0.8)

  world.createCollider(
    badgeCollider,
    badgeBody
  )

  /*
   * Connect lanyard to badge
   */

  const finalRopeBody =
    ropeBodies[ropeBodies.length - 1]

  const badgeJoint = RAPIER.JointData.rope(
    BADGE_LINK_LENGTH,
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
    badgeJoint,
    finalRopeBody,
    badgeBody,
    true
  )

  /*
   * Reusable lanyard points
   */

  const lanyardPoints: THREE.Vector3[] =
    Array.from(
      {
        length: ROPE_SEGMENTS + 2,
      },
      () => new THREE.Vector3()
    )

  function updateLanyardPoints() {
    lanyardPoints[0].set(
      0,
      ANCHOR_Y,
      0
    )

    ropeBodies.forEach(
      (ropeBody, index) => {
        const position =
          ropeBody.translation()

        lanyardPoints[index + 1].set(
          position.x,
          position.y,
          position.z
        )
      }
    )

    const badgeTop =
      lanyardPoints[
        lanyardPoints.length - 1
      ]

    badgeTop.set(0, 1.4, 0)

    badgeTop.applyQuaternion(
      badge.quaternion
    )

    badgeTop.add(
      badge.position
    )
  }

  updateLanyardPoints()

  const lanyardCurve =
    new THREE.CatmullRomCurve3(
      lanyardPoints,
      false,
      'centripetal'
    )

  /*
   * Reusable ribbon geometry
   */

  const vertexCount =
    (LANYARD_SAMPLES + 1) * 2

  const lanyardPositions =
    new Float32Array(
      vertexCount * 3
    )

  const lanyardUvs =
    new Float32Array(
      vertexCount * 2
    )

  const lanyardIndices: number[] = []

  for (
    let index = 0;
    index <= LANYARD_SAMPLES;
    index += 1
  ) {
    const progress =
      index / LANYARD_SAMPLES

    const uvOffset = index * 4

    lanyardUvs[uvOffset] = 0
    lanyardUvs[uvOffset + 1] = progress

    lanyardUvs[uvOffset + 2] = 1
    lanyardUvs[uvOffset + 3] = progress

    if (index < LANYARD_SAMPLES) {
      const first = index * 2
      const second = first + 1
      const third = first + 2
      const fourth = first + 3

      lanyardIndices.push(
        first,
        third,
        second,

        second,
        third,
        fourth
      )
    }
  }

  const lanyardGeometry =
    new THREE.BufferGeometry()

  const lanyardPositionAttribute =
    new THREE.BufferAttribute(
      lanyardPositions,
      3
    )

  lanyardPositionAttribute.setUsage(
    THREE.DynamicDrawUsage
  )

  lanyardGeometry.setAttribute(
    'position',
    lanyardPositionAttribute
  )

  lanyardGeometry.setAttribute(
    'uv',
    new THREE.BufferAttribute(
      lanyardUvs,
      2
    )
  )

  lanyardGeometry.setIndex(
    lanyardIndices
  )

  const lanyardMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.9,
      metalness: 0,
      side: THREE.DoubleSide,
    })

  const lanyard = new THREE.Mesh(
    lanyardGeometry,
    lanyardMaterial
  )

  lanyard.frustumCulled = false

  scene.add(lanyard)

  /*
   * Temporary vectors for updating
   * the lanyard without allocations
   */

  const curvePoint = new THREE.Vector3()
  const curveTangent = new THREE.Vector3()
  const ribbonSide = new THREE.Vector3()
  const leftPoint = new THREE.Vector3()
  const rightPoint = new THREE.Vector3()
  const cameraForward = new THREE.Vector3()

  function updateLanyardGeometry() {
    updateLanyardPoints()

    camera.getWorldDirection(
      cameraForward
    )

    for (
      let index = 0;
      index <= LANYARD_SAMPLES;
      index += 1
    ) {
      const progress =
        index / LANYARD_SAMPLES

      lanyardCurve.getPointAt(
        progress,
        curvePoint
      )

      lanyardCurve.getTangentAt(
        progress,
        curveTangent
      )

      ribbonSide.crossVectors(
        curveTangent,
        cameraForward
      )

      if (
        ribbonSide.lengthSq() <
        0.000001
      ) {
        ribbonSide.set(1, 0, 0)
      }

      ribbonSide
        .normalize()
        .multiplyScalar(
          LANYARD_HALF_WIDTH
        )

      leftPoint
        .copy(curvePoint)
        .add(ribbonSide)

      rightPoint
        .copy(curvePoint)
        .sub(ribbonSide)

      const positionOffset =
        index * 6

      lanyardPositions[
        positionOffset
      ] = leftPoint.x

      lanyardPositions[
        positionOffset + 1
      ] = leftPoint.y

      lanyardPositions[
        positionOffset + 2
      ] = leftPoint.z

      lanyardPositions[
        positionOffset + 3
      ] = rightPoint.x

      lanyardPositions[
        positionOffset + 4
      ] = rightPoint.y

      lanyardPositions[
        positionOffset + 5
      ] = rightPoint.z
    }

    lanyardPositionAttribute.needsUpdate =
      true

    lanyardGeometry.computeVertexNormals()
  }

  updateLanyardGeometry()

  /*
   * Mouse and touch dragging
   */

  const raycaster =
    new THREE.Raycaster()

  const pointer =
    new THREE.Vector2()

  const dragPlane =
    new THREE.Plane()

  const dragCameraDirection =
    new THREE.Vector3()

  const dragTarget =
    new THREE.Vector3()

  const previousDragTarget =
    new THREE.Vector3()

  const anchorPosition =
    new THREE.Vector3(
      0,
      ANCHOR_Y,
      0
    )

  const releaseVelocity =
    new THREE.Vector3()

  const dragBody = world.createRigidBody(
    RAPIER.RigidBodyDesc
      .kinematicPositionBased()
      .setTranslation(0, 0, 0)
  )

  let dragJoint:
    RAPIER.ImpulseJoint | null = null

  let dragging = false

  let activePointerId:
    number | null = null

  let previousDragTime =
    performance.now()

  function updatePointer(
    event: PointerEvent
  ) {
    const bounds =
      renderer.domElement
        .getBoundingClientRect()

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

  function clampDragTarget(
    target: THREE.Vector3
  ) {
    const offset =
      target
        .clone()
        .sub(anchorPosition)

    if (
      offset.length() >
      MAX_DRAG_DISTANCE
    ) {
      offset.setLength(
        MAX_DRAG_DISTANCE
      )

      target.copy(
        anchorPosition
          .clone()
          .add(offset)
      )
    }
  }

  renderer.domElement.addEventListener(
    'pointerdown',
    event => {
      updatePointer(event)

      raycaster.setFromCamera(
        pointer,
        camera
      )

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
      activePointerId =
        event.pointerId

      renderer.domElement
        .setPointerCapture(
          event.pointerId
        )

      renderer.domElement.style.cursor =
        'grabbing'

      camera.getWorldDirection(
        dragCameraDirection
      )

      dragPlane
        .setFromNormalAndCoplanarPoint(
          dragCameraDirection,
          hit.point
        )

      dragTarget.copy(hit.point)

      previousDragTarget.copy(
        hit.point
      )

      previousDragTime =
        performance.now()

      dragBody.setTranslation(
        {
          x: hit.point.x,
          y: hit.point.y,
          z: hit.point.z,
        },
        true
      )

      badge.updateMatrixWorld(true)

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

      dragJoint =
        world.createImpulseJoint(
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
        event.pointerId !==
          activePointerId
      ) {
        return
      }

      updatePointer(event)

      raycaster.setFromCamera(
        pointer,
        camera
      )

      const intersection =
        raycaster.ray
          .intersectPlane(
            dragPlane,
            dragTarget
          )

      if (!intersection) {
        return
      }

      clampDragTarget(
        dragTarget
      )

      const now =
        performance.now()

      const deltaSeconds =
        Math.max(
          (now - previousDragTime) /
            1000,
          0.001
        )

      releaseVelocity
        .copy(dragTarget)
        .sub(previousDragTarget)
        .divideScalar(deltaSeconds)

      releaseVelocity.clampLength(
        0,
        6
      )

      previousDragTarget.copy(
        dragTarget
      )

      previousDragTime = now

      dragBody
        .setNextKinematicTranslation({
          x: dragTarget.x,
          y: dragTarget.y,
          z: dragTarget.z,
        })
    }
  )

  function releaseBadge(
    event: PointerEvent
  ) {
    if (
      !dragging ||
      event.pointerId !==
        activePointerId
    ) {
      return
    }

    dragging = false

    renderer.domElement.style.cursor =
      'grab'

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
      Math.min(
        window.devicePixelRatio,
        2
      )
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

    while (
      accumulator >=
      FIXED_TIMESTEP
    ) {
      world.step()

      accumulator -=
        FIXED_TIMESTEP
    }

    const badgePosition =
      badgeBody.translation()

    const badgeRotation =
      badgeBody.rotation()

    badge.position.set(
      badgePosition.x,
      badgePosition.y,
      badgePosition.z
    )

    badge.quaternion.set(
      badgeRotation.x,
      badgeRotation.y,
      badgeRotation.z,
      badgeRotation.w
    )

    updateLanyardGeometry()

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