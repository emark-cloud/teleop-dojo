import { initPhysics, createWorld, PhysicsStepper, OBJECT_GROUP } from './simulator/physics';
import { createScene, createRenderer } from './simulator/scene';
import { createCamera, createOrbitControls } from './simulator/camera';
import { createArm, syncArmBodies } from './simulator/arm';
import { updateGripperState, attemptGrip } from './simulator/gripper';
import { initKeyboard, initKeyJustPressed, flushJustPressed } from './controls/keyboard';
import { updateJoints } from './controls/joint-controller';
import { HUD } from './ui/hud';
import { OBJECTS } from './objects/object-defs';
import { spawnObject, syncObjectMesh, SpawnedObject } from './objects/object-loader';
import { TABLE_Y, TABLE_WIDTH, TABLE_DEPTH, TABLE_HEIGHT } from './config/constants';
import RAPIER from '@dimforge/rapier3d-compat';

async function main() {
  // Show loading screen
  const loadingScreen = document.getElementById('loading-screen')!;

  // 1. Init physics WASM
  await initPhysics();

  // 2. Create physics world
  const world = createWorld();

  // Create table collider (static)
  const tableBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, TABLE_Y - TABLE_HEIGHT / 2, 0);
  const tableBody = world.createRigidBody(tableBodyDesc);
  const tableColDesc = RAPIER.ColliderDesc.cuboid(
    TABLE_WIDTH / 2,
    TABLE_HEIGHT / 2,
    TABLE_DEPTH / 2
  ).setFriction(0.8).setRestitution(0.1).setCollisionGroups(OBJECT_GROUP);
  world.createCollider(tableColDesc, tableBody);

  // 3. Create Three.js scene, camera, renderer
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const scene = createScene();
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const controls = createOrbitControls(camera, canvas);

  // 4. Build arm
  const arm = createArm(world, scene);

  // 5. Init controls
  initKeyboard();
  initKeyJustPressed();

  // 6. Spawn all 4 objects at spread-out positions
  const spawnPositions: [number, number][] = [
    [ 0.22, -0.15],  // box
    [-0.20,  0.02],  // mug
    [ 0.15,  0.02],  // bottle
    [-0.10, -0.22],  // banana
    [ 0.00, -0.08],  // can
    [-0.30, -0.08],  // block
    [ 0.30, -0.08],  // puck
    [-0.02, -0.18],  // pen
  ];
  const spawnedObjects: SpawnedObject[] = OBJECTS.map((def, i) =>
    spawnObject(world, scene, def, spawnPositions[i][0], spawnPositions[i][1])
  );
  const objectBodies = spawnedObjects.map((o) => o.body);

  // 7. Init UI (key indicators only)
  const hud = new HUD();

  // Hide loading screen
  loadingScreen.classList.add('hidden');

  // 8. Game loop
  const stepper = new PhysicsStepper();
  let lastTime = performance.now();

  function loop(now: number) {
    const dt = Math.min((now - lastTime) / 1000, 0.1); // cap at 100ms
    lastTime = now;

    // a. Flush just-pressed buffer
    flushJustPressed();

    // b. Apply joint targets (sets FK pivot rotations & base position)
    updateJoints(arm, dt, world);

    // c. Sync FK hierarchy → kinematic physics bodies (BEFORE physics step)
    syncArmBodies(arm);

    // d. Step physics (kinematic arm bodies move, gripper fingers follow)
    stepper.step(world, dt);

    // e. Update gripper state (animate separation, detect finger contact)
    const squeezedBody = updateGripperState(arm.gripper, dt, world);

    // f. Grip only when both fingers physically contact the same object
    if (!arm.gripper.gripJoint && squeezedBody) {
      attemptGrip(arm.gripper, world, squeezedBody);
    }

    // g. Sync object meshes to physics
    for (const obj of spawnedObjects) {
      syncObjectMesh(obj);
    }

    // h. Update UI (key indicators)
    hud.update();

    // i. Update orbit controls
    controls.update();

    // j. Render
    renderer.render(scene, camera);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

main().catch((err) => {
  console.error('Failed to initialize Teleop Dojo:', err);
  const loadingText = document.querySelector('.loading-text');
  if (loadingText) {
    loadingText.textContent = 'Failed to initialize. Check console for errors.';
  }
});
