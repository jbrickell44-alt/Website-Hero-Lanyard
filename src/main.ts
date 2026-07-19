import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import RAPIER from '@dimforge/rapier3d-compat'
import './style.css'

import badgeFrontUrl from './assets/Front_V1.jpg'
import badgeBackUrl from './assets/Back_V1.jpg'

async function start() {
  await RAPIER.init()

  const app = document.querySelector<HTMLDivElement>('#app')

  if (!app) {
    throw new Error('Could not find the #app element')
  }

  /*
   * Main configuration
   */

  const ANCHOR_Y = 4.1

  const ROPE_SEGMENTS = 11
  const SEGMENT_LENGTH = 0.2
  const BADGE_LINK_LENGTH = 0.14

  const LANYARD_SAMPLES = 48

  /*
   * Wide strap settings
   */

  const LANYARD_HALF_WIDTH = 0.22
  const MAIN_STRAP_WIDTH = LANYARD_HALF_WIDTH * 2
  const STRAP_DEPTH = 0.06

  /*
   * Plastic buckle scale
   */

  const CLIP_SCALE = 0.5

  /*
   * The fixed strap pieces are modelled larger
   * because the whole buckle assembly is scaled.
   */

  const CLIP_LOCAL_STRAP_WIDTH =
    MAIN_STRAP_WIDTH / CLIP_SCALE

  const CLIP_LOCAL_STRAP_DEPTH =
    STRAP_DEPTH / CLIP_SCALE

  const FIXED_TIMESTEP = 1 / 60

  /*
   * Badge dimensions
   */

  const BADGE_WIDTH = 2.1
  const BADGE_HEIGHT = 2.8
  const BADGE_DEPTH = 0.18

  const BADGE_HALF_WIDTH = BADGE_WIDTH / 2
  const BADGE_HALF_HEIGHT = BADGE_HEIGHT / 2
  const BADGE_HALF_DEPTH = BADGE_DEPTH / 2

  const BADGE_CORNER_SEGMENTS = 8
  const BADGE_CORNER_RADIUS = 0.085

  /*
   * Badge eyelet position
   */

  const EYELET_CENTER_Y =
    BADGE_HALF_HEIGHT - 0.2

  /*
   * Clip assembly pivot
   */

  const BADGE_RING_Y =
    BADGE_HALF_HEIGHT + 0.01

  /*
   * Clip-local positions
   */

  const CONNECTOR_UPPER_RING_Y = 0.38
  const CLIP_LOWER_SLOT_Y = 0.72
  const CLIP_BUCKLE_CENTER_Y = 0.98
  const CLIP_UPPER_SLOT_Y = 1.24
  const CLIP_STRAP_CONNECTION_Y = 1.72

  /*
   * Convert the clip-local connection point
   * into the badge assembly coordinate system.
   */

  const STRAP_CONNECTION_Y =
    BADGE_RING_Y +
    CLIP_STRAP_CONNECTION_Y * CLIP_SCALE

  const TOTAL_ROPE_LENGTH =
    ROPE_SEGMENTS * SEGMENT_LENGTH +
    BADGE_LINK_LENGTH

  const MAX_DRAG_DISTANCE =
    TOTAL_ROPE_LENGTH + 1.5

  /*
   * Scene
   */

  const scene = new THREE.Scene()

  scene.background =
    new THREE.Color('#1a1a1a')

  const camera =
    new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )

  camera.position.set(0, 0, 10.5)

  const renderer =
    new THREE.WebGLRenderer({
      antialias: true,
    })

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

  renderer.outputColorSpace =
    THREE.SRGBColorSpace

  renderer.domElement.style.cursor =
    'grab'

  renderer.domElement.style.touchAction =
    'none'

  app.appendChild(renderer.domElement)

  /*
   * Lighting
   */

  const ambientLight =
    new THREE.AmbientLight(
      0xffffff,
      1.45
    )

  scene.add(ambientLight)

  const keyLight =
    new THREE.DirectionalLight(
      0xffffff,
      3.2
    )

  keyLight.position.set(3, 4, 5)

  scene.add(keyLight)

  const fillLight =
    new THREE.DirectionalLight(
      0x9eb2ff,
      1.3
    )

  fillLight.position.set(-4, 1, 3)

  scene.add(fillLight)

  const rimLight =
    new THREE.DirectionalLight(
      0xffffff,
      1
    )

  rimLight.position.set(0, -2, -4)

  scene.add(rimLight)

  /*
   * Physics world
   */

  const world =
    new RAPIER.World({
      x: 0,
      y: -9.81,
      z: 0,
    })

  world.timestep =
    FIXED_TIMESTEP

  /*
   * Fixed lanyard anchor
   */

  const anchorBody =
    world.createRigidBody(
      RAPIER.RigidBodyDesc
        .fixed()
        .setTranslation(
          0,
          ANCHOR_Y,
          0
        )
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

    const ropeBody =
      world.createRigidBody(
        RAPIER.RigidBodyDesc
          .dynamic()
          .setTranslation(
            0,
            bodyY,
            0
          )
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

    const ropeJoint =
      RAPIER.JointData.rope(
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
   * Badge textures
   */

  const textureLoader =
    new THREE.TextureLoader()

  const maxAnisotropy =
    renderer.capabilities.getMaxAnisotropy()

  async function loadBadgeTexture(
    url: string,
    label: string
  ): Promise<THREE.Texture | null> {
    try {
      const texture =
        await textureLoader.loadAsync(url)

      texture.colorSpace =
        THREE.SRGBColorSpace

      texture.anisotropy =
        maxAnisotropy

      return texture
    } catch (error) {
      console.error(
        `Could not load ${label}:`,
        error
      )

      return null
    }
  }

  const [
    badgeFrontTexture,
    badgeBackTexture,
  ] = await Promise.all([
    loadBadgeTexture(
      badgeFrontUrl,
      'front badge texture'
    ),
    loadBadgeTexture(
      badgeBackUrl,
      'back badge texture'
    ),
  ])

  /*
   * Badge assembly
   */

  const badgeAssembly =
    new THREE.Group()

  badgeAssembly.name =
    'badge-assembly'

  scene.add(badgeAssembly)

  /*
   * Badge card
   */

  const badgeGeometry =
    new RoundedBoxGeometry(
      BADGE_WIDTH,
      BADGE_HEIGHT,
      BADGE_DEPTH,
      BADGE_CORNER_SEGMENTS,
      BADGE_CORNER_RADIUS
    )

  const badgeSideMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x202020,
      roughness: 0.55,
      metalness: 0.05,
    })

  const badgeFrontMaterial =
    new THREE.MeshStandardMaterial({
      color: badgeFrontTexture
        ? 0xffffff
        : 0xdddddd,
      map: badgeFrontTexture,
      roughness: 0.42,
      metalness: 0,
    })

  const badgeBackMaterial =
    new THREE.MeshStandardMaterial({
      color: badgeBackTexture
        ? 0xffffff
        : 0xbcbcbc,
      map: badgeBackTexture,
      roughness: 0.42,
      metalness: 0,
    })

  const badgeMaterials = [
    badgeSideMaterial,
    badgeSideMaterial,
    badgeSideMaterial,
    badgeSideMaterial,
    badgeFrontMaterial,
    badgeBackMaterial,
  ]

  const badge =
    new THREE.Mesh(
      badgeGeometry,
      badgeMaterials
    )

  badge.name = 'badge-card'

  badgeAssembly.add(badge)

  /*
   * Materials
   */

  const plasticMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x17191c,
      roughness: 0.62,
      metalness: 0,
    })

  const plasticHighlightMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x2b2e33,
      roughness: 0.5,
      metalness: 0,
    })

  const plasticDarkMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x070809,
      roughness: 0.76,
      metalness: 0,
      side: THREE.DoubleSide,
    })

  const strapMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x101010,
      roughness: 0.88,
      metalness: 0,
      side: THREE.DoubleSide,
    })

  /*
   * Geometry helper
   */

  function createRoundedPart(
    width: number,
    height: number,
    depth: number,
    radius: number,
    material: THREE.Material
  ) {
    return new THREE.Mesh(
      new RoundedBoxGeometry(
        width,
        height,
        depth,
        5,
        radius
      ),
      material
    )
  }

  /*
   * Strap slot helper
   */

  function createStrapSlot() {
    const slotGroup =
      new THREE.Group()

    const slotOuterWidth = 1.1
    const slotOuterHeight = 0.3
    const slotDepth = 0.24
    const barThickness = 0.095

    const topBar =
      createRoundedPart(
        slotOuterWidth,
        barThickness,
        slotDepth,
        0.032,
        plasticMaterial
      )

    topBar.position.y =
      slotOuterHeight / 2

    slotGroup.add(topBar)

    const bottomBar =
      createRoundedPart(
        slotOuterWidth,
        barThickness,
        slotDepth,
        0.032,
        plasticMaterial
      )

    bottomBar.position.y =
      -slotOuterHeight / 2

    slotGroup.add(bottomBar)

    const leftBar =
      createRoundedPart(
        barThickness,
        slotOuterHeight,
        slotDepth,
        0.032,
        plasticMaterial
      )

    leftBar.position.x =
      -slotOuterWidth / 2

    slotGroup.add(leftBar)

    const rightBar =
      createRoundedPart(
        barThickness,
        slotOuterHeight,
        slotDepth,
        0.032,
        plasticMaterial
      )

    rightBar.position.x =
      slotOuterWidth / 2

    slotGroup.add(rightBar)

    return slotGroup
  }

  /*
   * Badge eyelet hole
   */

  const eyeletHoleGeometry =
    new THREE.CircleGeometry(
      0.078,
      32
    )

  const eyeletHoleFront =
    new THREE.Mesh(
      eyeletHoleGeometry,
      plasticDarkMaterial
    )

  eyeletHoleFront.position.set(
    0,
    EYELET_CENTER_Y,
    BADGE_HALF_DEPTH + 0.004
  )

  badgeAssembly.add(
    eyeletHoleFront
  )

  const eyeletHoleBack =
    new THREE.Mesh(
      eyeletHoleGeometry,
      plasticDarkMaterial
    )

  eyeletHoleBack.position.set(
    0,
    EYELET_CENTER_Y,
    -BADGE_HALF_DEPTH - 0.004
  )

  eyeletHoleBack.rotation.y =
    Math.PI

  badgeAssembly.add(
    eyeletHoleBack
  )

  /*
   * Eyelet sleeve
   */

  const eyeletSleeveGeometry =
    new THREE.CylinderGeometry(
      0.079,
      0.079,
      BADGE_DEPTH + 0.052,
      32,
      1,
      true
    )

  const eyeletSleeve =
    new THREE.Mesh(
      eyeletSleeveGeometry,
      plasticMaterial
    )

  eyeletSleeve.position.set(
    0,
    EYELET_CENTER_Y,
    0
  )

  eyeletSleeve.rotation.x =
    Math.PI / 2

  badgeAssembly.add(
    eyeletSleeve
  )

  /*
   * Eyelet rims
   */

  const eyeletRimGeometry =
    new THREE.TorusGeometry(
      0.104,
      0.026,
      16,
      48
    )

  const eyeletFront =
    new THREE.Mesh(
      eyeletRimGeometry,
      plasticHighlightMaterial
    )

  eyeletFront.position.set(
    0,
    EYELET_CENTER_Y,
    BADGE_HALF_DEPTH + 0.019
  )

  badgeAssembly.add(
    eyeletFront
  )

  const eyeletBack =
    new THREE.Mesh(
      eyeletRimGeometry,
      plasticHighlightMaterial
    )

  eyeletBack.position.set(
    0,
    EYELET_CENTER_Y,
    -BADGE_HALF_DEPTH - 0.019
  )

  badgeAssembly.add(
    eyeletBack
  )

  /*
   * Scaled breakaway buckle assembly
   */

  const clipAssembly =
    new THREE.Group()

  clipAssembly.name =
    'plastic-breakaway-clip'

  clipAssembly.position.set(
    0,
    BADGE_RING_Y,
    0
  )

  clipAssembly.scale.setScalar(
    CLIP_SCALE
  )

  badgeAssembly.add(
    clipAssembly
  )

  /*
   * Small ring through badge eyelet
   */

  const badgeConnectorRingGeometry =
    new THREE.TorusGeometry(
      0.18,
      0.045,
      16,
      48
    )

  const badgeConnectorRing =
    new THREE.Mesh(
      badgeConnectorRingGeometry,
      plasticMaterial
    )

  badgeConnectorRing.name =
    'badge-connector-ring'

  badgeConnectorRing.position.set(
    0,
    0,
    0
  )

  clipAssembly.add(
    badgeConnectorRing
  )

  /*
   * Small ring beneath the lower strap
   */

  const upperConnectorRingGeometry =
    new THREE.TorusGeometry(
      0.16,
      0.045,
      16,
      48
    )

  const upperConnectorRing =
    new THREE.Mesh(
      upperConnectorRingGeometry,
      plasticMaterial
    )

  upperConnectorRing.name =
    'upper-connector-ring'

  upperConnectorRing.position.set(
    0,
    CONNECTOR_UPPER_RING_Y,
    0
  )

  clipAssembly.add(
    upperConnectorRing
  )

  /*
   * Elongated moulded plastic connector
   *
   * The upper hole connects to the small ring
   * beneath the strap. The larger lower hole
   * surrounds the badge ring.
   */

  const connectorShape =
    new THREE.Shape()

  connectorShape.moveTo(
    -0.09,
    0.45
  )

  connectorShape.lineTo(
    0.09,
    0.45
  )

  connectorShape.bezierCurveTo(
    0.14,
    0.42,
    0.17,
    0.35,
    0.17,
    0.27
  )

  connectorShape.bezierCurveTo(
    0.17,
    0.18,
    0.24,
    0.08,
    0.24,
    -0.03
  )

  connectorShape.bezierCurveTo(
    0.24,
    -0.18,
    0.14,
    -0.34,
    0,
    -0.42
  )

  connectorShape.bezierCurveTo(
    -0.14,
    -0.34,
    -0.24,
    -0.18,
    -0.24,
    -0.03
  )

  connectorShape.bezierCurveTo(
    -0.24,
    0.08,
    -0.17,
    0.18,
    -0.17,
    0.27
  )

  connectorShape.bezierCurveTo(
    -0.17,
    0.35,
    -0.14,
    0.42,
    -0.09,
    0.45
  )

  connectorShape.closePath()

  /*
   * Upper round opening
   */

  const upperConnectorHole =
    new THREE.Path()

  upperConnectorHole.absellipse(
    0,
    0.33,
    0.067,
    0.067,
    0,
    Math.PI * 2,
    false
  )

  connectorShape.holes.push(
    upperConnectorHole
  )

  /*
   * Lower elongated opening
   */

  const lowerConnectorHole =
    new THREE.Path()

  lowerConnectorHole.absellipse(
    0,
    -0.06,
    0.105,
    0.19,
    0,
    Math.PI * 2,
    false
  )

  connectorShape.holes.push(
    lowerConnectorHole
  )

  const connectorDepth = 0.15

  const connectorGeometry =
    new THREE.ExtrudeGeometry(
      connectorShape,
      {
        depth: connectorDepth,
        steps: 1,
        curveSegments: 24,
        bevelEnabled: true,
        bevelThickness: 0.018,
        bevelSize: 0.018,
        bevelSegments: 3,
      }
    )

  connectorGeometry.translate(
    0,
    0,
    -connectorDepth / 2
  )

  const dropConnector =
    new THREE.Mesh(
      connectorGeometry,
      plasticMaterial
    )

  dropConnector.name =
    'moulded-drop-connector'

  dropConnector.position.set(
    0,
    0,
    0
  )

  clipAssembly.add(
    dropConnector
  )

  /*
   * Raised front face
   */

  const connectorFaceShape =
    connectorShape.clone()

  const connectorFaceGeometry =
    new THREE.ShapeGeometry(
      connectorFaceShape,
      24
    )

  const connectorFace =
    new THREE.Mesh(
      connectorFaceGeometry,
      plasticHighlightMaterial
    )

  connectorFace.name =
    'drop-connector-front-face'

  connectorFace.position.set(
    0,
    0,
    connectorDepth / 2 + 0.003
  )

  connectorFace.scale.set(
    0.9,
    0.9,
    1
  )

  clipAssembly.add(
    connectorFace
  )

  /*
   * Lower fixed strap
   */

  const lowerStrapBottomY =
    CONNECTOR_UPPER_RING_Y + 0.13

  const lowerStrapTopY =
    CLIP_LOWER_SLOT_Y

  const lowerStrapHeight =
    lowerStrapTopY -
    lowerStrapBottomY

  const lowerStrap =
    createRoundedPart(
      CLIP_LOCAL_STRAP_WIDTH,
      lowerStrapHeight,
      CLIP_LOCAL_STRAP_DEPTH,
      0.035,
      strapMaterial
    )

  lowerStrap.position.set(
    0,
    (
      lowerStrapBottomY +
      lowerStrapTopY
    ) / 2,
    0.055
  )

  clipAssembly.add(
    lowerStrap
  )

  /*
   * Lower strap slot
   */

  const lowerSlot =
    createStrapSlot()

  lowerSlot.position.set(
    0,
    CLIP_LOWER_SLOT_Y,
    0
  )

  clipAssembly.add(
    lowerSlot
  )

  /*
   * Lower strap fold
   */

  const lowerStrapFold =
    createRoundedPart(
      CLIP_LOCAL_STRAP_WIDTH,
      0.12,
      0.28,
      0.04,
      strapMaterial
    )

  lowerStrapFold.position.set(
    0,
    CLIP_LOWER_SLOT_Y,
    0
  )

  clipAssembly.add(
    lowerStrapFold
  )

  /*
   * Breakaway buckle halves
   */

  const buckleUpperHalf =
    createRoundedPart(
      1.16,
      0.25,
      0.26,
      0.065,
      plasticMaterial
    )

  buckleUpperHalf.position.set(
    0,
    CLIP_BUCKLE_CENTER_Y + 0.125,
    0
  )

  clipAssembly.add(
    buckleUpperHalf
  )

  const buckleLowerHalf =
    createRoundedPart(
      1.16,
      0.25,
      0.26,
      0.065,
      plasticMaterial
    )

  buckleLowerHalf.position.set(
    0,
    CLIP_BUCKLE_CENTER_Y - 0.125,
    0
  )

  clipAssembly.add(
    buckleLowerHalf
  )

  /*
   * Breakaway seam
   */

  const buckleSeam =
    createRoundedPart(
      1.18,
      0.04,
      0.275,
      0.012,
      plasticDarkMaterial
    )

  buckleSeam.position.set(
    0,
    CLIP_BUCKLE_CENTER_Y,
    0
  )

  clipAssembly.add(
    buckleSeam
  )

  /*
   * Raised buckle face
   */

  const buckleFace =
    createRoundedPart(
      0.85,
      0.25,
      0.035,
      0.03,
      plasticHighlightMaterial
    )

  buckleFace.position.set(
    0,
    CLIP_BUCKLE_CENTER_Y,
    0.148
  )

  clipAssembly.add(
    buckleFace
  )

  /*
   * Side grips
   */

  const leftGrip =
    createRoundedPart(
      0.11,
      0.18,
      0.27,
      0.035,
      plasticHighlightMaterial
    )

  leftGrip.position.set(
    -0.58,
    CLIP_BUCKLE_CENTER_Y,
    0
  )

  clipAssembly.add(
    leftGrip
  )

  const rightGrip =
    createRoundedPart(
      0.11,
      0.18,
      0.27,
      0.035,
      plasticHighlightMaterial
    )

  rightGrip.position.set(
    0.58,
    CLIP_BUCKLE_CENTER_Y,
    0
  )

  clipAssembly.add(
    rightGrip
  )

  /*
   * Upper strap slot
   */

  const upperSlot =
    createStrapSlot()

  upperSlot.position.set(
    0,
    CLIP_UPPER_SLOT_Y,
    0
  )

  clipAssembly.add(
    upperSlot
  )

  /*
   * Upper fixed strap
   */

  const upperStrapBottomY =
    CLIP_UPPER_SLOT_Y

  const upperStrapHeight =
    CLIP_STRAP_CONNECTION_Y -
    upperStrapBottomY

  const upperStrap =
    createRoundedPart(
      CLIP_LOCAL_STRAP_WIDTH,
      upperStrapHeight,
      CLIP_LOCAL_STRAP_DEPTH,
      0.035,
      strapMaterial
    )

  upperStrap.position.set(
    0,
    (
      CLIP_STRAP_CONNECTION_Y +
      upperStrapBottomY
    ) / 2,
    0.065
  )

  clipAssembly.add(
    upperStrap
  )

  /*
   * Upper strap fold
   */

  const upperStrapFold =
    createRoundedPart(
      CLIP_LOCAL_STRAP_WIDTH,
      0.12,
      0.28,
      0.04,
      strapMaterial
    )

  upperStrapFold.position.set(
    0,
    CLIP_UPPER_SLOT_Y,
    0
  )

  clipAssembly.add(
    upperStrapFold
  )

  /*
   * Upper return tail
   */

  const returnTailHeight = 0.36

  const upperReturnTail =
    createRoundedPart(
      CLIP_LOCAL_STRAP_WIDTH,
      returnTailHeight,
      CLIP_LOCAL_STRAP_DEPTH,
      0.035,
      strapMaterial
    )

  upperReturnTail.position.set(
    0,
    CLIP_UPPER_SLOT_Y +
      returnTailHeight / 2 -
      0.02,
    -0.12
  )

  clipAssembly.add(
    upperReturnTail
  )

  /*
   * Badge physics body
   */

  const badgeStartY =
    ANCHOR_Y -
    ROPE_SEGMENTS * SEGMENT_LENGTH -
    BADGE_LINK_LENGTH -
    STRAP_CONNECTION_Y

  const badgeBody =
    world.createRigidBody(
      RAPIER.RigidBodyDesc
        .dynamic()
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
    RAPIER.ColliderDesc
      .cuboid(
        BADGE_HALF_WIDTH,
        BADGE_HALF_HEIGHT,
        BADGE_HALF_DEPTH
      )
      .setRestitution(0.05)
      .setFriction(0.7)
      .setDensity(0.8)

  world.createCollider(
    badgeCollider,
    badgeBody
  )

  /*
   * Connect lanyard physics to strap
   */

  const finalRopeBody =
    ropeBodies[ropeBodies.length - 1]

  const badgeJoint =
    RAPIER.JointData.rope(
      BADGE_LINK_LENGTH,
      {
        x: 0,
        y: 0,
        z: 0,
      },
      {
        x: 0,
        y: STRAP_CONNECTION_Y,
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
   * Initial badge transform
   */

  const initialBadgePosition =
    badgeBody.translation()

  const initialBadgeRotation =
    badgeBody.rotation()

  badgeAssembly.position.set(
    initialBadgePosition.x,
    initialBadgePosition.y,
    initialBadgePosition.z
  )

  badgeAssembly.quaternion.set(
    initialBadgeRotation.x,
    initialBadgeRotation.y,
    initialBadgeRotation.z,
    initialBadgeRotation.w
  )

  /*
   * Lanyard curve points
   */

  const lanyardPoints: THREE.Vector3[] =
    Array.from(
      {
        length: ROPE_SEGMENTS + 2,
      },
      () => new THREE.Vector3()
    )

  const badgeConnectionPoint =
    new THREE.Vector3()

  function updateLanyardPoints() {
    lanyardPoints[0].set(
      0,
      ANCHOR_Y,
      0
    )

    ropeBodies.forEach(
      (
        ropeBody,
        index
      ) => {
        const position =
          ropeBody.translation()

        lanyardPoints[index + 1].set(
          position.x,
          position.y,
          position.z
        )
      }
    )

    badgeConnectionPoint.set(
      0,
      STRAP_CONNECTION_Y,
      0
    )

    badgeConnectionPoint.applyQuaternion(
      badgeAssembly.quaternion
    )

    badgeConnectionPoint.add(
      badgeAssembly.position
    )

    lanyardPoints[
      lanyardPoints.length - 1
    ].copy(
      badgeConnectionPoint
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
   * Dynamic lanyard geometry
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

    const uvOffset =
      index * 4

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

  const lanyard =
    new THREE.Mesh(
      lanyardGeometry,
      strapMaterial
    )

  lanyard.frustumCulled = false

  scene.add(lanyard)

  /*
   * Reusable lanyard vectors
   */

  const curvePoint =
    new THREE.Vector3()

  const curveTangent =
    new THREE.Vector3()

  const ribbonSide =
    new THREE.Vector3()

  const leftPoint =
    new THREE.Vector3()

  const rightPoint =
    new THREE.Vector3()

  const cameraForward =
    new THREE.Vector3()

  function updateLanyardGeometry() {
    updateLanyardPoints()

    lanyardCurve.updateArcLengths()

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
   * Pointer dragging
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

  const dragOffset =
    new THREE.Vector3()

  const releaseVelocity =
    new THREE.Vector3()

  const localHitPoint =
    new THREE.Vector3()

  const dragBody =
    world.createRigidBody(
      RAPIER.RigidBodyDesc
        .kinematicPositionBased()
        .setTranslation(
          0,
          0,
          0
        )
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
    dragOffset
      .copy(target)
      .sub(anchorPosition)

    if (
      dragOffset.length() >
      MAX_DRAG_DISTANCE
    ) {
      dragOffset.setLength(
        MAX_DRAG_DISTANCE
      )

      target
        .copy(anchorPosition)
        .add(dragOffset)
    }
  }

  renderer.domElement.addEventListener(
    'pointerdown',
    (
      event: PointerEvent
    ) => {
      updatePointer(event)

      raycaster.setFromCamera(
        pointer,
        camera
      )

      const intersections =
        raycaster.intersectObject(
          badgeAssembly,
          true
        )

      const hit =
        intersections[0]

      if (!hit) {
        return
      }

      dragging = true

      activePointerId =
        event.pointerId

      renderer.domElement.setPointerCapture(
        event.pointerId
      )

      renderer.domElement.style.cursor =
        'grabbing'

      camera.getWorldDirection(
        dragCameraDirection
      )

      dragPlane.setFromNormalAndCoplanarPoint(
        dragCameraDirection,
        hit.point
      )

      dragTarget.copy(
        hit.point
      )

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

      badgeAssembly.updateMatrixWorld(
        true
      )

      localHitPoint.copy(
        hit.point
      )

      badgeAssembly.worldToLocal(
        localHitPoint
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
    (
      event: PointerEvent
    ) => {
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
        raycaster.ray.intersectPlane(
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

      dragBody.setNextKinematicTranslation({
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
   * Resize
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

  const clock =
    new THREE.Clock()

  let accumulator = 0

  function animate() {
    const deltaTime =
      Math.min(
        clock.getDelta(),
        0.05
      )

    accumulator += deltaTime

    while (
      accumulator >= FIXED_TIMESTEP
    ) {
      world.step()

      accumulator -=
        FIXED_TIMESTEP
    }

    const badgePosition =
      badgeBody.translation()

    const badgeRotation =
      badgeBody.rotation()

    badgeAssembly.position.set(
      badgePosition.x,
      badgePosition.y,
      badgePosition.z
    )

    badgeAssembly.quaternion.set(
      badgeRotation.x,
      badgeRotation.y,
      badgeRotation.z,
      badgeRotation.w
    )

    badgeAssembly.updateMatrixWorld(
      true
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
