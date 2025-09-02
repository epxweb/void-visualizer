import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/ShaderPass.js';

let scene, camera, renderer, composer;
let analyser, dataArray;
let bass = 0, mid = 0, treble = 0;
let time = 0;
let currentScene = 1;

// Scene 1
let linesGroup;
const MAX_LINES = 20;
const LINE_SEGMENTS = 120;

// Scene 2
let particleSystem;
const MAX_PARTICLES = 1000;
let particleNextIndex = 0;
let prevBass = 0;

// Scene 3
let polygon;
const POLYGON_SIDES = 6;

const map = (value, start1, stop1, start2, stop2) => start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));

const init = () => {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 10;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  createWavyLinesScene();
  createParticleScene();
  createPolygonScene();
  setupPostprocessing();

  window.addEventListener('resize', onWindowResize, false);
  document.addEventListener('keydown', onKeyDown, false);
  document.body.addEventListener('click', startAudio, { once: true });

  const startText = document.createElement('div');
  startText.innerHTML = 'Click to start audio';
  startText.id = 'start-text';
  Object.assign(startText.style, {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: 'white',
    fontSize: '24px',
    fontFamily: 'sans-serif',
  });
  document.body.appendChild(startText);

  animate();
};

const createWavyLinesScene = () => {
  linesGroup = new THREE.Group();
  for (let i = 0; i < MAX_LINES; i++) {
    const positions = new Float32Array((LINE_SEGMENTS + 1) * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
    const line = new THREE.Line(geometry, material);
    linesGroup.add(line);
  }
  linesGroup.visible = true; // Default scene
  scene.add(linesGroup);
};

const createParticleScene = () => {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(MAX_PARTICLES * 3);
  const velocities = new Float32Array(MAX_PARTICLES * 3);
  const lifespans = new Float32Array(MAX_PARTICLES);
  for (let i = 0; i < MAX_PARTICLES; i++) { lifespans[i] = 0; }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
  geometry.setAttribute('lifespan', new THREE.BufferAttribute(lifespans, 1));
  const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
  particleSystem = new THREE.Points(geometry, material);
  particleSystem.visible = false;
  scene.add(particleSystem);
};

const createPolygonScene = () => {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array((POLYGON_SIDES + 1) * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color: 0xffffff });
  polygon = new THREE.LineLoop(geometry, material);
  polygon.visible = false;
  scene.add(polygon);
};

const setupPostprocessing = () => {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const grainShader = { /* ... */ };
  const grainPass = new ShaderPass(grainShader);
  composer.addPass(grainPass);
};

const startAudio = async () => { /* ... */ };
const updateAudio = () => { /* ... */ };
const updateWavyLinesScene = () => { /* ... */ };
const updateParticleScene = () => { /* ... */ };
const emitParticles = (count) => { /* ... */ };

const updatePolygonScene = () => {
  polygon.rotation.z += map(mid, 0, 1, 0, 0.05);
  const scale = 1 + map(bass, 0, 1, 0, 1.5);
  polygon.scale.set(scale, scale, scale);

  const positions = polygon.geometry.attributes.position.array;
  const baseRadius = 3;
  const spikeAmount = map(treble, 0, 1, 0, 2);

  for (let i = 0; i <= POLYGON_SIDES; i++) {
    const angle = (i / POLYGON_SIDES) * Math.PI * 2;
    let r = baseRadius;
    if (i % 2 === 0) { r += spikeAmount; }
    positions[i * 3] = Math.cos(angle) * r;
    positions[i * 3 + 1] = Math.sin(angle) * r;
  }
  polygon.geometry.attributes.position.needsUpdate = true;
};

const animate = () => {
  requestAnimationFrame(animate);
  time += 0.02;
  if (analyser) {
    updateAudio();
    if (currentScene === 1) updateWavyLinesScene();
    else if (currentScene === 2) updateParticleScene();
    else if (currentScene === 3) updatePolygonScene();
  }
  if (composer) {
    composer.passes[1].uniforms.amount.value = treble * 0.25 + 0.02;
    composer.render();
  }
};

const onWindowResize = () => { /* ... */ };

const onKeyDown = (event) => {
  linesGroup.visible = false;
  particleSystem.visible = false;
  polygon.visible = false;

  if (event.key === '1') {
    currentScene = 1;
    linesGroup.visible = true;
  } else if (event.key === '2') {
    currentScene = 2;
    particleSystem.visible = true;
  } else if (event.key === '3') {
    currentScene = 3;
    polygon.visible = true;
  }
};

init();