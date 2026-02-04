import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const container = document.getElementById("game-container");
const scoreEl = document.getElementById("score");
const dialogueEl = document.getElementById("dialogue");

let scene;
let camera;
let renderer;
let bikeGroup;
let ground;
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

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd8f3dc, 12, 60);

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

  ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ color: 0x74c69d })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 120),
    new THREE.MeshStandardMaterial({ color: 0x40916c })
  );
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.01;
  scene.add(path);

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

function createPickups() {
  const material = new THREE.MeshStandardMaterial({ color: 0x2d6a4f });
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
