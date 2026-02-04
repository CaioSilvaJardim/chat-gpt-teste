import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const container = document.getElementById("game-container");
const scoreEl = document.getElementById("score");
const dialogueEl = document.getElementById("dialogue");

let scene;
let camera;
let renderer;
let bikeGroup;
let ecoPoints = 0;
let clock;

const keysPressed = new Set();
const pickups = [];
const tips = [
  "Every ride is a chance to cut emissions. Pedal for cleaner air!",
  "Collect recyclables and keep the trail green.",
  "Reduce • Reuse • Recycle — build habits that protect our planet.",
  "Sustainable commutes start with small choices like biking today.",
  "Support local ecosystems by keeping waste out of nature trails.",
];

const textures = {
  grass: "https://threejs.org/examples/textures/terrain/grasslight-big.jpg",
  path: "https://threejs.org/examples/textures/floors/FloorsCheckerboard_S_Diffuse.jpg",
  metal: "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
  sky: "https://threejs.org/examples/textures/2294472375_24a3b8ef46_o.jpg",
};

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xb7e4c7, 15, 80);

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 6, 12);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const hemisphere = new THREE.HemisphereLight(0xf0f9ff, 0x2d6a4f, 1.0);
  scene.add(hemisphere);

  const sunlight = new THREE.DirectionalLight(0xffffff, 1.1);
  sunlight.position.set(8, 12, 6);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(1024, 1024);
  scene.add(sunlight);

  buildSkyDome();
  buildGround();
  buildPath();
  buildDecorations();

  bikeGroup = new THREE.Group();
  bikeGroup.position.set(0, 0.5, 0);
  scene.add(bikeGroup);

  const loader = new GLTFLoader();
  loader.load(
    "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Bicycle/glTF/Bicycle.gltf",
    (gltf) => {
      const model = gltf.scene;
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
        }
      });
      model.scale.set(0.6, 0.6, 0.6);
      model.position.y = -0.5;
      bikeGroup.add(model);
    },
    undefined,
    () => {
      const fallback = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.6, 2.2),
        new THREE.MeshStandardMaterial({ color: 0xf77f00 })
      );
      fallback.castShadow = true;
      bikeGroup.add(fallback);
    }
  );

  createPickups();
  setDialogue();

  clock = new THREE.Clock();

  window.addEventListener("resize", onWindowResize);
  window.addEventListener("keydown", (event) => {
    keysPressed.add(event.key.toLowerCase());
  });
  window.addEventListener("keyup", (event) => {
    keysPressed.delete(event.key.toLowerCase());
  });
}

function loadRepeatingTexture(url, repeatX, repeatY) {
  const texture = new THREE.TextureLoader().load(url);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildSkyDome() {
  const skyTexture = new THREE.TextureLoader().load(textures.sky);
  skyTexture.colorSpace = THREE.SRGBColorSpace;
  const skyGeometry = new THREE.SphereGeometry(120, 48, 48);
  const skyMaterial = new THREE.MeshBasicMaterial({
    map: skyTexture,
    side: THREE.BackSide,
  });
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  scene.add(sky);
}

function buildGround() {
  const groundTexture = loadRepeatingTexture(textures.grass, 12, 12);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({
      map: groundTexture,
      roughness: 0.9,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
}

function buildPath() {
  const pathTexture = loadRepeatingTexture(textures.path, 6, 30);
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 120),
    new THREE.MeshStandardMaterial({
      map: pathTexture,
      roughness: 0.7,
    })
  );
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.02;
  scene.add(path);
}

function buildDecorations() {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6f4e37 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f9e44 });

  for (let i = 0; i < 18; i += 1) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 1.4, 8),
      trunkMat
    );
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 1.6, 10),
      leafMat
    );
    trunk.position.set(
      THREE.MathUtils.randFloatSpread(18),
      0.7,
      THREE.MathUtils.randFloat(-45, 45)
    );
    crown.position.set(trunk.position.x, 1.8, trunk.position.z);
    trunk.castShadow = true;
    crown.castShadow = true;
    scene.add(trunk, crown);
  }

  const bannerTexture = new THREE.TextureLoader().load(textures.metal);
  bannerTexture.colorSpace = THREE.SRGBColorSpace;
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 2),
    new THREE.MeshStandardMaterial({
      map: bannerTexture,
      transparent: true,
    })
  );
  banner.position.set(-4, 2.2, -12);
  banner.rotation.y = Math.PI / 6;
  scene.add(banner);
}

function createPickups() {
  const pickupTexture = loadRepeatingTexture(textures.metal, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    map: pickupTexture,
    metalness: 0.3,
    roughness: 0.4,
  });

  for (let i = 0; i < 12; i += 1) {
    const pickup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.4, 16),
      material
    );
    pickup.rotation.x = Math.PI / 2;
    pickup.position.set(
      THREE.MathUtils.randFloatSpread(6),
      0.35,
      THREE.MathUtils.randFloat(-40, 40)
    );
    pickup.castShadow = true;
    scene.add(pickup);
    pickups.push(pickup);
  }
}

function setDialogue() {
  const tip = tips[Math.floor(Math.random() * tips.length)];
  dialogueEl.textContent = tip;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const speed = keysPressed.has(" ") ? 0.5 : 2.4;
  const turnSpeed = 2.2;

  if (keysPressed.has("w") || keysPressed.has("arrowup")) {
    bikeGroup.translateZ(-speed * delta);
  }
  if (keysPressed.has("s") || keysPressed.has("arrowdown")) {
    bikeGroup.translateZ(speed * delta);
  }
  if (keysPressed.has("a") || keysPressed.has("arrowleft")) {
    bikeGroup.rotation.y += turnSpeed * delta;
  }
  if (keysPressed.has("d") || keysPressed.has("arrowright")) {
    bikeGroup.rotation.y -= turnSpeed * delta;
  }

  bikeGroup.position.x = THREE.MathUtils.clamp(bikeGroup.position.x, -3, 3);
  bikeGroup.position.z = THREE.MathUtils.clamp(bikeGroup.position.z, -50, 50);

  pickups.forEach((pickup) => {
    pickup.rotation.z += delta * 1.5;
    pickup.rotation.y += delta;
  });

  checkPickups();
  updateCamera();

  renderer.render(scene, camera);
}

function updateCamera() {
  const offset = new THREE.Vector3(0, 5, 10);
  offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), bikeGroup.rotation.y);
  camera.position.copy(bikeGroup.position).add(offset);
  camera.lookAt(bikeGroup.position);
}

function checkPickups() {
  const threshold = 0.9;
  pickups.forEach((pickup) => {
    if (!pickup.visible) return;
    if (pickup.position.distanceTo(bikeGroup.position) < threshold) {
      pickup.visible = false;
      ecoPoints += 10;
      scoreEl.textContent = ecoPoints.toString();
      setDialogue();
    }
  });
}
