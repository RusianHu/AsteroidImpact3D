<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as CANNON from 'cannon-es';
import Stats from 'stats.js';
import gsap from 'gsap';

// 场景引用
const sceneContainer = ref<HTMLElement | null>(null);

// 场景状态
const isSimulationRunning = ref(false);
const simulationProgress = ref(0);
const simulationSpeed = ref(1);

// Three.js 对象
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let stats: Stats;

// 物理世界
let world: CANNON.World;

// 地球和陨石对象
let earth: THREE.Mesh;
let earthBody: CANNON.Body;
let asteroid: THREE.Mesh;
let asteroidBody: CANNON.Body;

// 大气层
let atmosphere: THREE.Mesh;

// 加载管理器
const loadingProgress = ref(0);
const isLoading = ref(true);
const loadingManager = new THREE.LoadingManager(
  // 加载完成
  () => {
    isLoading.value = false;
  },
  // 加载进度
  (url, itemsLoaded, itemsTotal) => {
    loadingProgress.value = Math.floor((itemsLoaded / itemsTotal) * 100);
  }
);

// 初始化场景
const initScene = () => {
  // 创建场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // 创建相机
  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
  camera.position.set(0, 5, 15);

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;

  if (sceneContainer.value) {
    sceneContainer.value.appendChild(renderer.domElement);
  }

  // 添加轨道控制
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 5;
  controls.maxDistance = 50;

  // 添加光源
  const ambientLight = new THREE.AmbientLight(0x404040, 1);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffffff, 1);
  sunLight.position.set(10, 10, 10);
  sunLight.castShadow = true;
  scene.add(sunLight);

  // 初始化性能监视器
  stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);

  // 初始化物理世界
  initPhysicsWorld();

  // 创建地球
  createEarth();

  // 创建陨石
  createAsteroid();

  // 添加星空背景
  createStarfield();

  // 窗口大小调整事件
  window.addEventListener('resize', onWindowResize);

  // 开始动画循环
  animate();
};

// 初始化物理世界
const initPhysicsWorld = () => {
  world = new CANNON.World({
    gravity: new CANNON.Vec3(0, 0, 0), // 太空中没有重力
  });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;
};

// 创建地球
const createEarth = () => {
  // 加载地球纹理
  const textureLoader = new THREE.TextureLoader(loadingManager);
  // 使用相对路径加载纹理
  const earthTexture = textureLoader.load('/assets/textures/earth_daymap.jpg');

  // 创建地球几何体和材质
  const earthGeometry = new THREE.SphereGeometry(5, 64, 64);
  const earthMaterial = new THREE.MeshStandardMaterial({
    map: earthTexture,
    roughness: 0.5,
  });

  earth = new THREE.Mesh(earthGeometry, earthMaterial);
  earth.castShadow = true;
  earth.receiveShadow = true;
  scene.add(earth);

  // 创建地球物理体
  const earthShape = new CANNON.Sphere(5);
  earthBody = new CANNON.Body({
    mass: 5.972e24, // 地球质量
    shape: earthShape,
    position: new CANNON.Vec3(0, 0, 0),
  });
  world.addBody(earthBody);

  // 创建大气层
  const atmosphereGeometry = new THREE.SphereGeometry(5.2, 64, 64);
  const atmosphereMaterial = new THREE.MeshPhongMaterial({
    color: 0x88aaff,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
  });

  atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
  scene.add(atmosphere);
};

// 创建陨石
const createAsteroid = () => {
  // 创建陨石几何体和材质 - 使用更复杂的几何体
  const asteroidGeometry = new THREE.IcosahedronGeometry(1, 2); // 增加细分度
  const asteroidMaterial = new THREE.MeshStandardMaterial({
    color: 0x8B4513,
    roughness: 0.9,
    metalness: 0.3,
    emissive: 0x441a00, // 添加微弱发光效果
  });

  // 随机变形陨石几何体，使其看起来更不规则
  const positionAttribute = asteroidGeometry.getAttribute('position');
  const vertex = new THREE.Vector3();

  for (let i = 0; i < positionAttribute.count; i++) {
    vertex.fromBufferAttribute(positionAttribute, i);
    vertex.normalize().multiplyScalar(1 + 0.3 * Math.random()); // 增大变形程度
    positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  asteroidGeometry.computeVertexNormals();

  asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
  asteroid.castShadow = true;
  asteroid.position.set(15, 0, 0); // 调整初始位置，使其更接近地球
  asteroid.userData.collided = false; // 添加碰撞状态标记
  scene.add(asteroid);

  // 添加陨石尾迹效果
  const trailGeometry = new THREE.ConeGeometry(0.3, 4, 8);
  const trailMaterial = new THREE.MeshBasicMaterial({
    color: 0xff3300,
    transparent: true,
    opacity: 0.7,
  });

  const trail = new THREE.Mesh(trailGeometry, trailMaterial);
  trail.position.set(0, -2, 0); // 尾迹位于陨石后方
  trail.rotation.x = Math.PI; // 旋转使尖端朝外
  asteroid.add(trail); // 将尾迹添加为陨石的子对象

  // 创建陨石物理体
  const asteroidShape = new CANNON.Sphere(1); // 简化为球体碰撞
  asteroidBody = new CANNON.Body({
    mass: 1e15, // 陨石质量
    shape: asteroidShape,
    position: new CANNON.Vec3(15, 0, 0), // 与视觉模型位置一致
    velocity: new CANNON.Vec3(0, 0, 0), // 初始速度为0
  });
  world.addBody(asteroidBody);
};

// 创建星空背景
const createStarfield = () => {
  const starsGeometry = new THREE.BufferGeometry();
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1,
  });

  const starsVertices = [];
  for (let i = 0; i < 10000; i++) {
    const x = THREE.MathUtils.randFloatSpread(2000);
    const y = THREE.MathUtils.randFloatSpread(2000);
    const z = THREE.MathUtils.randFloatSpread(2000);
    starsVertices.push(x, y, z);
  }

  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
  const starField = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(starField);
};

// 开始模拟
const startSimulation = () => {
  if (isSimulationRunning.value) return;

  isSimulationRunning.value = true;
  simulationProgress.value = 0;

  // 重置陨石位置 - 调整初始位置，使其更容易撞击地球
  asteroid.position.set(15, 0, 0);
  asteroidBody.position.set(15, 0, 0);
  asteroid.visible = true; // 确保陨石可见

  // 设置陨石初始速度，直接朝向地球中心
  const direction = new CANNON.Vec3();
  direction.copy(earthBody.position as any);
  direction.vsub(asteroidBody.position, direction);
  direction.normalize();
  direction.scale(1.2, asteroidBody.velocity); // 显著增加速度

  // 添加非常小的随机偏移，使其保持在直线路径上
  asteroidBody.velocity.x += (Math.random() - 0.5) * 0.05;
  asteroidBody.velocity.y += (Math.random() - 0.5) * 0.05;
  asteroidBody.velocity.z += (Math.random() - 0.5) * 0.05;

  console.log('陨石初始位置:', asteroid.position);
  console.log('陨石初始速度:', asteroidBody.velocity);
  console.log('地球位置:', earth.position);
};

// 停止模拟
const stopSimulation = () => {
  isSimulationRunning.value = false;
  asteroidBody.velocity.set(0, 0, 0);
};

// 重置模拟
const resetSimulation = () => {
  stopSimulation();
  simulationProgress.value = 0;

  // 重置陨石位置
  asteroid.position.set(15, 0, 0);
  asteroidBody.position.set(15, 0, 0);

  // 重置碰撞状态
  asteroid.userData.collided = false;
  asteroid.visible = true;
};

// 处理碰撞效果
const handleImpact = () => {
  // 创建主爆炸效果
  const explosionGeometry = new THREE.SphereGeometry(0.5, 32, 32);
  const explosionMaterial = new THREE.MeshBasicMaterial({
    color: 0xff5500,
    transparent: true,
    opacity: 1,
  });

  const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
  explosion.position.copy(asteroid.position);
  scene.add(explosion);

  // 使用GSAP动画爆炸效果
  gsap.to(explosion.scale, {
    x: 15,
    y: 15,
    z: 15,
    duration: 3,
    ease: "power2.out",
  });

  gsap.to(explosionMaterial, {
    opacity: 0,
    duration: 3,
    onComplete: () => {
      scene.remove(explosion);
    },
  });

  // 创建冲击波效果
  const shockwaveGeometry = new THREE.RingGeometry(0.1, 0.5, 32);
  const shockwaveMaterial = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  });

  const shockwave = new THREE.Mesh(shockwaveGeometry, shockwaveMaterial);
  shockwave.position.copy(asteroid.position);
  shockwave.lookAt(earth.position); // 使冲击波面向地球
  scene.add(shockwave);

  // 动画冲击波
  gsap.to(shockwave.scale, {
    x: 30,
    y: 30,
    z: 30,
    duration: 2.5,
    ease: "power1.out",
  });

  gsap.to(shockwaveMaterial, {
    opacity: 0,
    duration: 2.5,
    onComplete: () => {
      scene.remove(shockwave);
    },
  });

  // 创建多个碎片
  for (let i = 0; i < 20; i++) {
    const debrisGeometry = new THREE.IcosahedronGeometry(0.2 * Math.random() + 0.1, 0);
    const debrisMaterial = new THREE.MeshBasicMaterial({
      color: 0xff3300,
    });

    const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
    debris.position.copy(asteroid.position);
    scene.add(debris);

    // 随机方向弹出
    const direction = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize();

    // 动画碎片
    gsap.to(debris.position, {
      x: debris.position.x + direction.x * (5 + Math.random() * 10),
      y: debris.position.y + direction.y * (5 + Math.random() * 10),
      z: debris.position.z + direction.z * (5 + Math.random() * 10),
      duration: 2 + Math.random() * 2,
      ease: "power1.out",
      onComplete: () => {
        scene.remove(debris);
      },
    });
  }

  // 隐藏原陨石
  asteroid.visible = false;
  asteroid.userData.collided = true; // 设置碰撞标记

  // 停止模拟
  stopSimulation();

  // 将模拟进度设置为100%
  simulationProgress.value = 100;
};

// 检测碰撞
const checkCollision = () => {
  const distance = new THREE.Vector3()
    .copy(earth.position as any)
    .distanceTo(asteroid.position);

  // 调整碰撞检测距离，地球半径(5) + 陨石半径(1)
  if (distance < 6.0) {
    console.log('检测到碰撞！距离：', distance);
    handleImpact();
    return true;
  }

  // 更频繁地输出距离信息，便于调试
  if (isSimulationRunning.value && Math.random() < 0.05) {
    console.log('当前距离：', distance);

    // 如果陨石越过地球但没有碰撞，强制触发碰撞
    if (asteroid.position.x < -10 && !asteroid.userData.collided) {
      console.log('陨石越过地球但没有碰撞，强制触发碰撞');
      handleImpact();
      return true;
    }
  }

  return false;
};

// 窗口大小调整
const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

// 动画循环
const animate = () => {
  requestAnimationFrame(animate);

  stats.begin();

  // 更新物理世界
  if (isSimulationRunning.value) {
    world.step(1/60 * simulationSpeed.value);

    // 更新陨石位置
    asteroid.position.copy(asteroidBody.position as any);
    asteroid.quaternion.copy(asteroidBody.quaternion as any);

    // 使陨石始终朝向地球
    if (asteroid.visible) {
      const lookAtVector = new THREE.Vector3();
      lookAtVector.copy(earth.position as any);
      lookAtVector.sub(asteroid.position);
      asteroid.lookAt(lookAtVector.add(asteroid.position));
    }

    // 检查碰撞
    if (checkCollision()) {
      // 碰撞已处理
    }

    // 更新进度
    simulationProgress.value += 0.1 * simulationSpeed.value;
    if (simulationProgress.value >= 100) {
      stopSimulation();
    }
  }

  // 地球自转
  earth.rotation.y += 0.001;
  atmosphere.rotation.y += 0.0005;

  // 更新控制器
  controls.update();

  // 渲染场景
  renderer.render(scene, camera);

  stats.end();
};

// 组件挂载时初始化场景
onMounted(() => {
  initScene();
});

// 组件卸载前清理资源
onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize);

  if (sceneContainer.value) {
    sceneContainer.value.removeChild(renderer.domElement);
  }

  document.body.removeChild(stats.dom);

  // 释放资源
  scene.clear();
  renderer.dispose();
});
</script>

<template>
  <div class="asteroid-impact-scene">
    <!-- 加载界面 -->
    <div v-if="isLoading" class="loading-overlay">
      <el-progress type="circle" :percentage="loadingProgress" />
      <p>加载资源中... {{ loadingProgress }}%</p>
    </div>

    <!-- 3D场景容器 -->
    <div ref="sceneContainer" class="scene-container"></div>

    <!-- 控制面板 -->
    <div class="control-panel">
      <h2>希克苏鲁伯陨石撞击模拟</h2>

      <div class="controls">
        <el-button type="primary" @click="startSimulation" :disabled="isSimulationRunning">
          开始模拟
        </el-button>
        <el-button type="danger" @click="stopSimulation" :disabled="!isSimulationRunning">
          停止模拟
        </el-button>
        <el-button @click="resetSimulation">
          重置模拟
        </el-button>
      </div>

      <div class="simulation-speed">
        <span>模拟速度:</span>
        <el-slider v-model="simulationSpeed" :min="0.1" :max="5" :step="0.1" />
      </div>

      <div class="simulation-progress">
        <span>模拟进度:</span>
        <el-progress :percentage="simulationProgress" />
      </div>

      <div class="info-panel">
        <h3>希克苏鲁伯撞击体</h3>
        <p>约6600万年前，一颗直径约10-15公里的小行星撞击了现在的墨西哥尤卡坦半岛，形成了直径约180公里的希克苏鲁伯陨石坑。</p>
        <p>这次撞击释放了相当于100万亿吨TNT的能量，引发了全球性的环境变化，被认为是导致恐龙灭绝的主要原因。</p>
      </div>

      <div class="github-link">
        <a href="https://github.com/RusianHu/AsteroidImpact3D" target="_blank">
          <i class="github-icon"></i> 老司机 GitHub 
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.asteroid-impact-scene {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.scene-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 100;
  color: white;
}

.control-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 300px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 20px;
  border-radius: 10px;
  z-index: 10;
}

.controls {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.simulation-speed,
.simulation-progress {
  margin-bottom: 20px;
}

.info-panel {
  margin-top: 30px;
  font-size: 14px;
  line-height: 1.5;
}

.github-link {
  margin-top: 20px;
  text-align: center;
}

.github-link a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #24292e;
  color: white;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.github-link a:hover {
  background-color: #2c974b;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.github-icon {
  display: inline-block;
  width: 20px;
  height: 20px;
  margin-right: 8px;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill="white" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>');
  background-repeat: no-repeat;
  background-position: center;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .control-panel {
    width: 100%;
    top: auto;
    right: auto;
    bottom: 0;
    border-radius: 10px 10px 0 0;
  }

  .controls {
    flex-direction: column;
    gap: 10px;
  }

  .github-link {
    margin-top: 15px;
    margin-bottom: 10px;
  }
}
</style>
