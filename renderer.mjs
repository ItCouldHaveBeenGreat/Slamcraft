import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createView(viewport, length) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1522);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const canvas = renderer.domElement;
  viewport.prepend(canvas);

  const center = length / 2;
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(center, 1, center);
  controls.enableDamping = true;
  controls.minDistance = 4;
  controls.maxDistance = 65;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
  controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;

  scene.add(new THREE.HemisphereLight(0xbddcff, 0x1b2432, 2.3));
  const light = new THREE.DirectionalLight(0xffffff, 2.4);
  light.position.set(9, 20, 14);
  scene.add(light);

  const grid = new THREE.GridHelper(length, length, 0x56838c, 0x314759);
  grid.position.set(center, -0.012, center);
  scene.add(grid);
  const activeGrid = new THREE.GridHelper(length, length, 0x68d9c4, 0x3f827f);
  scene.add(activeGrid);

  const blocks = new THREE.Group();
  scene.add(blocks);
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const edges = new THREE.EdgesGeometry(cube);
  const outline = new THREE.LineBasicMaterial({ color: 0x233344 });
  const highlight = new THREE.LineBasicMaterial({ color: 0xffffff });
  const materials = new Map();
  const ghost = new THREE.Mesh(cube, new THREE.MeshBasicMaterial({
    transparent: true, opacity: 0.38, depthWrite: false,
  }));
  ghost.visible = false;
  scene.add(ghost);

  function draw(items, selected) {
    blocks.clear();
    for (const { id, pos, size, color } of items) {
      if (!materials.has(color)) {
        materials.set(color, new THREE.MeshStandardMaterial({
          color, roughness: 0.48, metalness: 0.2,
        }));
      }
      const mesh = new THREE.Mesh(cube, materials.get(color));
      mesh.userData.id = id;
      mesh.position.set(...pos.map((value, axis) => value + size[axis] / 2));
      mesh.scale.set(...size.map(side => side - 0.04));
      mesh.add(new THREE.LineSegments(edges, id === selected ? highlight : outline));
      blocks.add(mesh);
    }
    scene.updateMatrixWorld(true);
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0));
  const hit = new THREE.Vector3();

  function aim(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((event.clientY - rect.top) / rect.height) * 2,
    );
    camera.updateMatrixWorld();
    raycaster.setFromCamera(pointer, camera);
  }

  let framed = false;
  function resize() {
    const { clientWidth: width, clientHeight: height } = viewport;
    if (!width || !height) return;
    camera.aspect = width / height;
    if (!framed) {
      framed = true;
      const distance = Math.max(1, 0.95 / camera.aspect);
      camera.position.copy(controls.target).add(
        new THREE.Vector3(14, 15, 17).multiplyScalar(distance),
      );
      controls.update();
    }
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(viewport);
  resize();
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  return {
    canvas,
    draw,
    setLayer(level) {
      plane.constant = -level;
      activeGrid.position.set(center, level + 0.004, center);
      activeGrid.visible = level !== 0;
    },
    cellAt(event, level) {
      aim(event);
      if (!raycaster.ray.intersectPlane(plane, hit)) return null;
      const pos = [Math.floor(hit.x), level, Math.floor(hit.z)];
      return pos.every(value => value >= 0 && value < length) ? pos : null;
    },
    pick(event) {
      aim(event);
      return raycaster.intersectObjects(blocks.children, false)[0]?.object.userData.id ?? null;
    },
    preview(pos, size, allowed) {
      ghost.visible = Boolean(pos);
      if (!pos) return;
      ghost.position.set(...pos.map((value, axis) => value + size[axis] / 2));
      ghost.scale.set(...size.map(side => side - 0.03));
      ghost.material.color.setHex(allowed ? 0x5de3bc : 0xff6666);
    },
  };
}
