<template>
  <div class="three-container">
    <div class="three" ref="target"></div>
  </div>
</template>

<script setup>
import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TrackballControls } from 'three/addons/controls/TrackballControls.js'
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js'
import CannonDebugger from 'cannon-es-debugger'
import { Pane } from 'tweakpane'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js'
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

const { currentScroll } = useLenis()

const target = ref(null)

let running = true

onMounted(async () => {
  if (!process.client) return

  const isMobile = window.innerWidth < 600

  let loaded = false

  let frustum = 3000
  const maxFrustum = (isMobile ? 9000 : 12000) / window.innerWidth
  const easeInQuint = t => t * t * t * t * t
  const ease = t => t * t * t * t * t
  const easeOutQuint = t => 1 + --t * t * t * t * t

  const state = {
    camera: {
      frustum: isMobile ? 1 : 25000 / window.innerWidth,
    },
    ambientLight: {
      color: '#fff3da',
      intensity: 1,
    },
    directionalLight: {
      position: { x: 10, y: 10, z: -20 },
      color: '#f4dfb1',
      intensity: 5,
    },
    hemisphereLight: {},
    logo: {
      positions: {
        c: -2.95,
        l: -2.356,
        u: -1.547,
        b: -0.684,
        '-': -0,
        m: 0.773,
        a: 1.852,
        t: 2.608,
        e: 3.363,
      },
    },
  }

  const aspect = window.innerWidth / window.outerHeight

  const scene = new THREE.Scene()
  const world = new CANNON.World()
  // world.gravity.set(0, 0, 9.82)

  // const cannonDebugger = new CannonDebugger(scene, world, {})

  // const axesHelper = new THREE.AxesHelper(5)
  // scene.add(axesHelper)

  // camera
  const camera = new THREE.OrthographicCamera(
    (frustum * aspect) / -2,
    (frustum * aspect) / 2,
    frustum / 2,
    frustum / -2,
    1,
    1000
  )

  camera.position.set(0, 10, 0)
  camera.lookAt(0, 0, 0)

  scene.add(camera)

  // renderer
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    setPixelRatio: Math.min(2, window.devicePixelRatio),
  })

  THREE.ColorManagement.enabled = true
  renderer.outputColorSpace = THREE.SRGBColorSpace

  renderer.setSize(window.innerWidth, window.outerHeight)
  target.value.appendChild(renderer.domElement)

  // controls
  const controls = new OrbitControls(camera, renderer.domElement)

  // controls.autoRotate = true
  // controls.enableDamping = true
  controls.enableZoom = false
  controls.enabled = false

  controls.update()

  world.defaultMaterial.contactEquationStiffness = 1e8
  world.defaultMaterial.contactEquationRelaxation = 10
  world.defaultMaterial.frictionEquationStiffness = 1e9
  world.defaultMaterial.frictionEquationRegularizationTime = 20

  const letterMaterial = new CANNON.Material('ground')
  const cursorMaterial = new CANNON.Material('cursor')
  // Adjust constraint equation parameters for ground/ground contact
  const letter_cursor = new CANNON.ContactMaterial(
    letterMaterial,
    cursorMaterial,
    {
      contactEquationRelaxation: 50,
      frictionEquationRegularizationTime: 50,
    }
  )

  // Add contact material to the world
  world.addContactMaterial(letter_cursor)

  // cursor
  const cursorBody = new CANNON.Body({
    type: CANNON.Body.KINEMATIC,
    material: cursorMaterial,
    shape: new CANNON.Sphere(1),
  })

  cursorBody.position.z = 50

  world.addBody(cursorBody)

  let vector = new THREE.Vector3()

  let objects = []

  const bubbleVisualMaterial = new THREE.MeshMatcapMaterial()
  const matcapBubbleTexture = new THREE.TextureLoader().load(
    '/img/matcap-pearl.jpg'
  )
  matcapBubbleTexture.colorSpace = THREE.SRGBColorSpace
  bubbleVisualMaterial.matcap = matcapBubbleTexture

  const bubbles = [...Array(isMobile ? 30 : 100)].map(() => {
    const scale = (isMobile ? 0.04 : 0.02) + Math.random() * 0.03
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(scale, 16, 16),
      bubbleVisualMaterial
    )

    const body = new CANNON.Body({
      mass: 1,
      material: letterMaterial,
      shape: new CANNON.Sphere(scale),
    })

    body.position.x = Math.random() * 10 - 5
    body.position.y = scale * 200 - 7
    body.position.z = Math.random() * 10 + 5

    mesh.position.clone(body.position)

    scene.add(mesh)
    world.addBody(body)

    return { mesh, body }
  })

  //Create a variable to keep track of mouse position
  const mouse = new THREE.Vector2()

  //A function to be called every time the mouse moves
  function onMouseMove(event) {
    // mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    // mouse.y = (event.clientY / window.innerHeight) * 2 - 1

    mouse.x = event.clientX - window.innerWidth / 2
    mouse.y = event.clientY - window.innerHeight / 2

    vector.set(
      (mouse.x * (camera.position.y * 0.5),
      0,
      mouse.y * (camera.position.y * 0.5))
    )

    cursorBody.position.copy(vector)
  }

  document.addEventListener('mousemove', onMouseMove, false)

  function render() {
    controls?.update()

    // cannonDebugger?.update()

    renderer.render(scene, camera)
  }

  const clock = new THREE.Clock()
  let delta

  let zoomProgress = 1

  function animate() {
    if (!running) return

    delta = Math.min(clock.getDelta(), 0.1)

    world.step(delta)

    requestAnimationFrame(animate)

    bubbles.forEach(bubble => {
      if (bubble.body.position.z < -5) {
        bubble.body.position.z = 5
        bubble.body.position.x = Math.random() * 10 - 5
      }

      if (bubble.body.velocity.z > -1) {
        bubble.body.force.set(0, 0, -1)
      }

      bubble.mesh.position.copy(bubble.body.position)
    })

    if (loaded) {
      zoomProgress = Math.max(0, zoomProgress - 0.01)
      const zoom = frustum * ease(zoomProgress) + maxFrustum

      const aspect = window.innerWidth / window.outerHeight

      camera.left = (zoom * aspect) / -2
      camera.right = (zoom * aspect) / 2
      camera.top = zoom / 2
      camera.bottom = zoom / -2

      objects.forEach((object, idx) => {
        const distanceFromInitPosition = [
          (object.initPosition.x - object.body.position.x) * 10,
          (object.initPosition.y - object.body.position.y) * 10,
          (object.initPosition.z - object.body.position.z) * 10,
        ]

        const slower = object.body.velocity.scale(0.9)
        const slowerSpin = object.body.angularVelocity.scale(0.9)

        object.body.velocity.set(slower.x, slower.y, slower.z)
        object.body.angularVelocity.set(
          slowerSpin.x,
          slowerSpin.y,
          slowerSpin.z
        )
        object.body.force.set(...distanceFromInitPosition)

        object.body.position.z =
          object.initPosition.z - currentScroll.value / (window.innerWidth / 10)

        object.scene.position.copy(object.body.position)
        object.scene.quaternion.copy(object.body.quaternion)
      })
    }

    render()
  }

  const loader = new GLTFLoader()
  const paths = [
    '/objects/C.glb',
    '/objects/L.glb',
    '/objects/U.glb',
    '/objects/B.glb',
    '/objects/dash.glb',
    '/objects/M.glb',
    '/objects/A.glb',
    '/objects/T.glb',
    '/objects/E.glb',
  ]

  const letterVisualMaterial = new THREE.MeshMatcapMaterial()
  const matcapTexture = new THREE.TextureLoader().load('/img/matcap-blue.png')
  matcapTexture.colorSpace = THREE.SRGBColorSpace
  letterVisualMaterial.matcap = matcapTexture

  /**
   * add objects
   */
  const meshs = await Promise.all(
    paths.map((path, idx) => {
      return new Promise(resolve => {
        loader.load(path, async gltf => {
          gltf.scene.children.forEach(mesh => {
            mesh.material = letterVisualMaterial
            // mesh.rotation.x = -Math.PI / 8
            // mesh.rotation.z = -Math.PI / 16
          })

          gltf.scene.position.y = 0
          gltf.scene.position.z = -0.5
          gltf.scene.position.x =
            Object.values(state.logo.positions)[idx] * 1.2 - 0.3

          // wait until the model can be added to the scene without blocking due to shader compilation
          // await renderer.compileAsync(model, camera, scene)

          scene.add(gltf.scene)
          resolve(gltf.scene)
        })
      })
    })
  )

  loaded = true

  objects = meshs.map((scene, i) => {
    // const shape = CannonUtils.CreateTrimesh(mesh.geometry)
    const bboxs = scene.children.map(mesh => {
      return new THREE.Box3().setFromObject(mesh)
    })

    const scale = {
      x:
        Math.max(...bboxs.map(bbox => bbox.max.x)) -
        Math.min(...bboxs.map(bbox => bbox.min.x)),
      y:
        Math.max(...bboxs.map(bbox => bbox.max.y)) -
        Math.min(...bboxs.map(bbox => bbox.min.y)),
      z:
        Math.max(...bboxs.map(bbox => bbox.max.z)) -
        Math.min(...bboxs.map(bbox => bbox.min.z)),
    }

    const body = new CANNON.Body({
      mass: 1,
      material: letterMaterial,
      shape: new CANNON.Box(
        new CANNON.Vec3(scale.x / 2 - 0.02, scale.y / 2, scale.z / 2)
      ),
    })

    const [mesh] = scene.children

    body.position.x = scene.position.x
    body.position.y = scene.position.y
    body.position.z = scene.position.z

    body.quaternion.x = -Math.PI / 16
    body.quaternion.z = -Math.PI / 32

    world.addBody(body)

    return { scene, body, initPosition: { ...scene.position } }
  })

  window.addEventListener('resize', onWindowResize, false)

  function onWindowResize() {
    const aspect = window.innerWidth / window.outerHeight

    camera.left = (state.camera.frustum * aspect) / -2
    camera.right = (state.camera.frustum * aspect) / 2
    camera.top = state.camera.frustum / 2
    camera.bottom = state.camera.frustum / -2

    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.outerHeight)
    render()
  }

  if (window.location.hostname.includes('localhost')) {
    // const pane = new Pane()
    // gui(
    //   {
    //     camera,
    //     ambientLight,
    //     directionalLight,
    //     objects
    //   },
    //   render
    // )
  }

  animate()
})

onUnmounted(() => {
  running = false
})
</script>

<style>
.three-container {
  width: 100vw;
  height: 100vh;
}

.three {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 0;

  width: 100vw;
  height: 100vh;
}

.tp-dfwv {
  --tp-blade-value-width: 300px;
  position: fixed !important;
  z-index: 10;
  width: 450px !important;
}
</style>
