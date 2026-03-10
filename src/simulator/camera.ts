import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(1.2, 1.4, 1.2);
  camera.lookAt(0, 0.3, 0);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  return camera;
}

export function createOrbitControls(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement
): OrbitControls {
  const controls = new OrbitControls(camera, domElement);
  controls.target.set(0, 0.3, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;

  // Constrain: no going below table
  controls.minPolarAngle = 0.1; // nearly top-down
  controls.maxPolarAngle = Math.PI / 2 - 0.05; // just above horizon

  // Zoom limits
  controls.minDistance = 0.5;
  controls.maxDistance = 4.0;

  // Keyboard panning is not used (keyboard is for arm control)
  controls.keys = { LEFT: '', UP: '', RIGHT: '', BOTTOM: '' };

  controls.update();
  return controls;
}
