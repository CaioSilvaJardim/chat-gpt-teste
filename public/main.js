import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const container = document.getElementById("game-container");
const scoreEl = document.getElementById("score");
const speedEl = document.getElementById("speed");
const dialogueEl = document.getElementById("dialogue");

let scene;
let camera;
let renderer;
let bikeGroup;
let clock;
let ecoPoints = 0;

const keysPressed = new Set();
const pickups = [];
const obstacles = [];
const trackRadius = 20;
const trackWidth = 6;

const tips = [
  "Draft smart and keep the city clean — zero-emission racing!",
  "Grab the recyclables to unlock eco boosts.",
  "Reduce • Reuse • Recycle — every lap matters.",
  "Sustainable commutes start with bikes, not burnouts.",
  "Protect green spaces by staying on the track.",
];

const textures = {
  grass: "https://threejs.org/examples/textures/terrain/grasslight-big.jpg",
  asphalt: "https://threejs.org/examples/textures/floors/FloorsCheckerboard_S_Diffuse.jpg",
  metal: "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
  sky: "https://threejs.org/examples/textures/2294472375_24a3b8ef46_o.jpg",
};

const physics = {
  velocity: 0,
  maxSpeed: 18,
  acceleration: 28,
  brakeDecel: 36,
  turnSpeed: 2.6,
  drag: 10,
  boostTimer: 0,
};

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xb7e4c7, 18, 90);

  camera = new THREE.PerspectiveCamera(
    68,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 9, 16);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const hemisphere = new THREE.HemisphereLight(0xf0f9ff, 0x2d6a4f, 1.05);
  scene.add(hemisphere);

  const sunlight = new THREE.DirectionalLight(0xffffff, 1.2);
  sunlight.position.set(10, 14, 8);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(1024, 1024);
  scene.add(sunlight);

  buildSkyDome();
  buildGround();
  buildTrack();
  buildDecorations();

  bikeGroup = new THREE.Group();
  bikeGroup.position.set(trackRadius, 0.5, 0);
  bikeGroup.rotation.y = Math.PI / 2;
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
      model.scale.set(0.65, 0.65, 0.65);
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

  spawnPickups(loader);
  spawnObstacles(loader);
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
  const skyGeometry = new THREE.SphereGeometry(140, 48, 48);
  const skyMaterial = new THREE.MeshBasicMaterial({
    map: skyTexture,
    side: THREE.BackSide,
  });
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  scene.add(sky);
}

function buildGround() {
  const groundTexture = loadRepeatingTexture(textures.grass, 16, 16);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(80, 64),
    new THREE.MeshStandardMaterial({
      map: groundTexture,
      roughness: 0.9,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
}

function buildTrack() {
  const trackTexture = loadRepeatingTexture(textures.asphalt, 8, 24);
  const track = new THREE.Mesh(
    new THREE.RingGeometry(trackRadius - trackWidth / 2, trackRadius + trackWidth / 2, 64),
    new THREE.MeshStandardMaterial({
      map: trackTexture,
      roughness: 0.6,
    })
  );
  track.rotation.x = -Math.PI / 2;
  track.receiveShadow = true;
  scene.add(track);

  const barrierMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const barrierGeo = new THREE.BoxGeometry(0.6, 0.4, 1.6);
  for (let i = 0; i < 48; i += 1) {
    const angle = (i / 48) * Math.PI * 2;
    const radius = trackRadius + trackWidth / 2 + 0.5;
    const barrier = new THREE.Mesh(barrierGeo, barrierMat);
    barrier.position.set(
      Math.cos(angle) * radius,
      0.2,
      Math.sin(angle) * radius
    );
    barrier.rotation.y = -angle;
    barrier.castShadow = true;
    scene.add(barrier);
  }
}

function buildDecorations() {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6f4e37 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f9e44 });

  for (let i = 0; i < 26; i += 1) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.22, 1.6, 8),
      trunkMat
    );
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.8, 1.8, 10),
      leafMat
    );
    const angle = (i / 26) * Math.PI * 2;
    const radius = trackRadius + 8 + (i % 2) * 2;
    trunk.position.set(Math.cos(angle) * radius, 0.8, Math.sin(angle) * radius);
    crown.position.set(trunk.position.x, 2.2, trunk.position.z);
    trunk.castShadow = true;
    crown.castShadow = true;
    scene.add(trunk, crown);
  }

  const bannerTexture = new THREE.TextureLoader().load(textures.metal);
  bannerTexture.colorSpace = THREE.SRGBColorSpace;
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 2.8),
    new THREE.MeshStandardMaterial({
      map: bannerTexture,
      transparent: true,
    })
  );
  banner.position.set(-6, 2.4, -14);
  banner.rotation.y = Math.PI / 5;
  scene.add(banner);
}

function spawnPickups(loader) {
  loader.load(
    "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Avocado/glTF/Avocado.gltf",
    (gltf) => {
      for (let i = 0; i < 12; i += 1) {
        const pickup = gltf.scene.clone(true);
        const angle = (i / 12) * Math.PI * 2;
        const radius = trackRadius - 0.5;
        pickup.position.set(
          Math.cos(angle) * radius,
          0.45,
          Math.sin(angle) * radius
        );
        pickup.scale.set(0.6, 0.6, 0.6);
        pickup.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
          }
        });
        scene.add(pickup);
        pickups.push(pickup);
      }
    },
    undefined,
    () => {
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
        const angle = (i / 12) * Math.PI * 2;
        const radius = trackRadius - 0.5;
        pickup.rotation.x = Math.PI / 2;
        pickup.position.set(
          Math.cos(angle) * radius,
          0.35,
          Math.sin(angle) * radius
        );
        pickup.castShadow = true;
        scene.add(pickup);
        pickups.push(pickup);
      }
    }
  );
}

function spawnObstacles(loader) {
  loader.load(
    "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF/DamagedHelmet.gltf",
    (gltf) => {
      for (let i = 0; i < 6; i += 1) {
        const obstacle = gltf.scene.clone(true);
        const angle = ((i + 0.5) / 6) * Math.PI * 2;
        const radius = trackRadius + 1.2;
        obstacle.position.set(
          Math.cos(angle) * radius,
          0.35,
          Math.sin(angle) * radius
        );
        obstacle.scale.set(0.7, 0.7, 0.7);
        obstacle.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
          }
        });
        scene.add(obstacle);
        obstacles.push(obstacle);
      }
    },
    undefined,
    () => {
      const obstacleMat = new THREE.MeshStandardMaterial({ color: 0xadb5bd });
      for (let i = 0; i < 6; i += 1) {
        const obstacle = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 0.6, 1.2),
          obstacleMat
        );
        const angle = ((i + 0.5) / 6) * Math.PI * 2;
        const radius = trackRadius + 1.2;
        obstacle.position.set(
          Math.cos(angle) * radius,
          0.3,
          Math.sin(angle) * radius
        );
        obstacle.castShadow = true;
        scene.add(obstacle);
        obstacles.push(obstacle);
      }
    }
  );
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
  updateMovement(delta);
  updatePickups(delta);
  checkPickups();
  checkObstacles();
  updateCamera();

  renderer.render(scene, camera);
}

function updateMovement(delta) {
  const forward = keysPressed.has("w") || keysPressed.has("arrowup");
  const backward = keysPressed.has("s") || keysPressed.has("arrowdown");
  const braking = keysPressed.has(" ");
  const turningLeft = keysPressed.has("a") || keysPressed.has("arrowleft");
  const turningRight = keysPressed.has("d") || keysPressed.has("arrowright");

  if (forward) {
    physics.velocity += physics.acceleration * delta;
  } else if (backward) {
    physics.velocity -= physics.acceleration * delta * 0.6;
  } else {
    const drag = Math.sign(physics.velocity) * physics.drag * delta;
    if (Math.abs(drag) > Math.abs(physics.velocity)) {
      physics.velocity = 0;
    } else {
      physics.velocity -= drag;
    }
  }

  if (braking) {
    physics.velocity -= Math.sign(physics.velocity) * physics.brakeDecel * delta;
  }

  if (physics.boostTimer > 0) {
    physics.boostTimer -= delta;
  }

  const maxSpeed = physics.boostTimer > 0 ? physics.maxSpeed * 1.6 : physics.maxSpeed;
  physics.velocity = THREE.MathUtils.clamp(physics.velocity, -6, maxSpeed);

  const turnAmount = physics.turnSpeed * delta * (physics.velocity / physics.maxSpeed);
  if (turningLeft) {
    bikeGroup.rotation.y += turnAmount;
  }
  if (turningRight) {
    bikeGroup.rotation.y -= turnAmount;
  }

  bikeGroup.translateZ(-physics.velocity * delta);

  const distanceFromCenter = Math.sqrt(
    bikeGroup.position.x ** 2 + bikeGroup.position.z ** 2
  );
  const minRadius = trackRadius - trackWidth / 2 + 0.6;
  const maxRadius = trackRadius + trackWidth / 2 - 0.4;
  const clampedRadius = THREE.MathUtils.clamp(distanceFromCenter, minRadius, maxRadius);
  const angle = Math.atan2(bikeGroup.position.z, bikeGroup.position.x);
  bikeGroup.position.x = Math.cos(angle) * clampedRadius;
  bikeGroup.position.z = Math.sin(angle) * clampedRadius;

  speedEl.textContent = Math.round(Math.abs(physics.velocity) * 6).toString();
}

function updatePickups(delta) {
  pickups.forEach((pickup) => {
    if (!pickup.visible) return;
    pickup.rotation.y += delta * 1.6;
    pickup.rotation.z += delta * 0.6;
  });

  obstacles.forEach((obstacle) => {
    obstacle.rotation.y += delta * 0.3;
  });
}

function updateCamera() {
  const offset = new THREE.Vector3(0, 6, 14);
  offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), bikeGroup.rotation.y);
  camera.position.copy(bikeGroup.position).add(offset);
  camera.lookAt(bikeGroup.position);
}

function checkPickups() {
  const threshold = 1.2;
  pickups.forEach((pickup) => {
    if (!pickup.visible) return;
    if (pickup.position.distanceTo(bikeGroup.position) < threshold) {
      pickup.visible = false;
      ecoPoints += 15;
      scoreEl.textContent = ecoPoints.toString();
      physics.boostTimer = 1.2;
      setDialogue();
    }
  });
}

function checkObstacles() {
  const threshold = 1.4;
  obstacles.forEach((obstacle) => {
    if (obstacle.position.distanceTo(bikeGroup.position) < threshold) {
      physics.velocity *= 0.6;
      physics.boostTimer = 0;
    }
  });
}
