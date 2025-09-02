import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/ShaderPass.js';

let scene, camera, renderer, composer;
let analyser, dataArray;
let bass = 0, mid = 0, treble = 0;
let time = 0;
let currentScene = 1;

// --- Scene 1: Wavy Lines ---
let linesGroup;
const MAX_LINES = 20;
const LINE_SEGMENTS = 120;

// --- Scene 2: Particle Burst ---
let particleSystem;
const MAX_PARTICLES = 1000;
let particleNextIndex = 0;
let prevBass = 0;

// --- UTILITY FUNCTIONS ---
const map = (value, start1, stop1, start2, stop2) => {
  return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
};

// --- INITIALIZATION ---
const init = () => {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 10;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  createWavyLinesScene();
  createParticleScene();
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

// --- SCENE SETUP ---
const createWavyLinesScene = () => {
  linesGroup = new THREE.Group();
  for (let i = 0; i < MAX_LINES; i++) {
    const positions = new Float32Array((LINE_SEGMENTS + 1) * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
    const line = new THREE.Line(geometry, material);
    line.visible = true; // Initially visible for scene 1
    linesGroup.add(line);
  }
  scene.add(linesGroup);
};

const createParticleScene = () => {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(MAX_PARTICLES * 3);
  const velocities = new Float32Array(MAX_PARTICLES * 3);
  const lifespans = new Float32Array(MAX_PARTICLES);

  for (let i = 0; i < MAX_PARTICLES; i++) {
    lifespans[i] = 0; // Initially dead
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
  geometry.setAttribute('lifespan', new THREE.BufferAttribute(lifespans, 1));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });

  particleSystem = new THREE.Points(geometry, material);
  particleSystem.visible = false; // Initially hidden
  scene.add(particleSystem);
};

// --- POST-PROCESSING SETUP ---
const setupPostprocessing = () => {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const grainShader = {
    uniforms: {
      'tDiffuse': { value: null },
      'amount': { value: 0.05 }
    },
    vertexShader: `...`, // (omitted for brevity)
    fragmentShader: `...` // (omitted for brevity)
  };
  const grainPass = new ShaderPass(grainShader);
  composer.addPass(grainPass);
};

// --- AUDIO SETUP ---
const startAudio = async () => { /* ... */ };

// --- UPDATE FUNCTIONS ---
const updateAudio = () => { /* ... */ };

const updateWavyLinesScene = () => { /* ... */ };

const updateParticleScene = () => {
  const beatThreshold = 0.3;
  if (bass > prevBass + beatThreshold && bass > 0.6) {
    const count = Math.floor(map(bass, 0.6, 1, 10, 50));
    emitParticles(count);
  }
  prevBass = bass;

  const positions = particleSystem.geometry.attributes.position.array;
  const velocities = particleSystem.geometry.attributes.velocity.array;
  const lifespans = particleSystem.geometry.attributes.lifespan.array;

  const speedFactor = map(mid, 0, 1, 0.98, 1.02);
  particleSystem.material.size = map(treble, 0, 1, 0.05, 0.25);

  for (let i = 0; i < MAX_PARTICLES; i++) {
    if (lifespans[i] > 0) {
      positions[i * 3] += velocities[i * 3];
      positions[i * 3 + 1] += velocities[i * 3 + 1];
      
      velocities[i*3] *= speedFactor;
      velocities[i*3+1] *= speedFactor;

      lifespans[i] -= 0.015;
    }
  }
  particleSystem.geometry.attributes.position.needsUpdate = true;
};

const emitParticles = (count) => {
  const positions = particleSystem.geometry.attributes.position.array;
  const velocities = particleSystem.geometry.attributes.velocity.array;
  const lifespans = particleSystem.geometry.attributes.lifespan.array;

  for (let i = 0; i < count; i++) {
    const pIndex = particleNextIndex;
    
    positions[pIndex * 3] = 0;
    positions[pIndex * 3 + 1] = 0;
    positions[pIndex * 3 + 2] = 0;

    const angle = Math.random() * 2 * Math.PI;
    const power = Math.random() * 0.08 + 0.02;
    velocities[pIndex * 3] = Math.cos(angle) * power;
    velocities[pIndex * 3 + 1] = Math.sin(angle) * power;

    lifespans[pIndex] = 1.0;
    particleNextIndex = (particleNextIndex + 1) % MAX_PARTICLES;
  }
  particleSystem.geometry.attributes.lifespan.needsUpdate = true;
};


// --- ANIMATION LOOP ---
const animate = () => {
  requestAnimationFrame(animate);
  time += 0.02;

  if (analyser) {
    updateAudio();
    if (currentScene === 1) {
      updateWavyLinesScene();
    } else if (currentScene === 2) {
      updateParticleScene();
    }
  }

  if (composer) {
    composer.passes[1].uniforms.amount.value = treble * 0.25 + 0.02;
    composer.render();
  }
};

// --- EVENT LISTENERS ---
const onWindowResize = () => { /* ... */ };

const onKeyDown = (event) => {
  if (event.key === '1') {
    currentScene = 1;
    linesGroup.visible = true;
    particleSystem.visible = false;
  } else if (event.key === '2') {
    currentScene = 2;
    linesGroup.visible = false;
    particleSystem.visible = true;
  }
};

// --- START ---
init();