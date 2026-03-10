import * as THREE from 'three';
import {
  BG_COLOR,
  TABLE_WIDTH,
  TABLE_DEPTH,
  TABLE_HEIGHT,
  TABLE_Y,
  TABLE_COLOR,
  TABLE_ROUGHNESS,
  TABLE_METALNESS,
} from '../config/constants';

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG_COLOR);

  // Hemisphere light — warm sky / cool ground for ambient variation
  const hemi = new THREE.HemisphereLight(0xffecd2, 0x6b6560, 0.6);
  scene.add(hemi);

  // Ambient fill to lift all shadows
  const ambient = new THREE.AmbientLight(0xfff0e0, 0.4);
  scene.add(ambient);

  // Key light — main directional, upper-right front
  const keyLight = new THREE.DirectionalLight(0xfff5ee, 1.2);
  keyLight.position.set(2, 5, 3);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 15;
  keyLight.shadow.camera.left = -3;
  keyLight.shadow.camera.right = 3;
  keyLight.shadow.camera.top = 3;
  keyLight.shadow.camera.bottom = -3;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  // Fill light — softer, opposite side, cool tint for contrast
  const fillLight = new THREE.DirectionalLight(0xc8d0e0, 0.5);
  fillLight.position.set(-3, 3, -1);
  scene.add(fillLight);

  // Rim/back light — edge definition on the arm
  const rimLight = new THREE.DirectionalLight(0xffe8d0, 0.5);
  rimLight.position.set(-1, 3, -4);
  scene.add(rimLight);

  // Workspace spotlight — wide pool on the table
  const spotLight = new THREE.SpotLight(0xfff0e0, 2.0, 8, Math.PI / 3, 0.5, 1.0);
  spotLight.position.set(0, 5, 0);
  spotLight.target.position.set(0, 0, 0);
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.set(1024, 1024);
  spotLight.shadow.bias = -0.0005;
  scene.add(spotLight);
  scene.add(spotLight.target);

  // Table surface
  const tableGeo = new THREE.BoxGeometry(TABLE_WIDTH, TABLE_HEIGHT, TABLE_DEPTH);
  const tableMat = new THREE.MeshStandardMaterial({
    color: TABLE_COLOR,
    roughness: TABLE_ROUGHNESS,
    metalness: TABLE_METALNESS,
  });
  const table = new THREE.Mesh(tableGeo, tableMat);
  table.position.set(0, TABLE_Y - TABLE_HEIGHT / 2, 0);
  table.receiveShadow = true;
  scene.add(table);

  return scene;
}

export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return renderer;
}
