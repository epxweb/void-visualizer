import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/ShaderPass.js';
import { Pane } from 'https://cdn.jsdelivr.net/npm/tweakpane@4.0.3/dist/tweakpane.min.js';

let scene, camera, renderer, composer;
let analyser, dataArray;
let bass = 0, mid = 0, treble = 0;
let time = 0;
let currentScene = 1;

// --- Tweakpane Parameters ---
const params = {
  audio: {
    bassSensitivity: 1.0,
    midSensitivity: 1.0,
    trebleSensitivity: 1.0,
  },
  visual: {
    hue: 0.0,
    brightness: 1.0,
    grain: 0.05,
    backgroundColor: '#000000',
    foregroundColor: '#ffffff',
  },
};

// --- Scene 1: Wavy Lines ---
let linesGroup;
const MAX_LINES = 20;
const LINE_SEGMENTS = 120;

// --- Scene 2: Particle Burst ---
let particleSystem;
const MAX_PARTICLES = 1000;
let particleNextIndex = 0;
let prevBass = 0;

// --- Scene 3: Pulsing Polygon ---
let polygon;
const POLYGON_SIDES = 6;

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
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  createWavyLinesScene();
  createParticleScene();
  createPolygonScene();
  setupPostprocessing();
  setupUI();

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

// --- UI SETUP ---
const setupUI = () => {
  const pane = new Pane();

  const audioFolder = pane.addFolder({ title: 'Audio Sensitivity' });
  audioFolder.addBinding(params.audio, 'bassSensitivity', { min: 0, max: 5, step: 0.1, label: 'Bass' });
  audioFolder.addBinding(params.audio, 'midSensitivity', { min: 0, max: 5, step: 0.1, label: 'Mid' });
  audioFolder.addBinding(params.audio, 'trebleSensitivity', { min: 0, max: 5, step: 0.1, label: 'Treble' });

  const visualFolder = pane.addFolder({ title: 'Visuals' });
  visualFolder.addBinding(params.visual, 'grain', { min: 0, max: 0.5, step: 0.01 });
  visualFolder.addBinding(params.visual, 'backgroundColor').on('change', (ev) => {
    document.body.style.backgroundColor = ev.value;
    renderer.setClearColor(ev.value);
  });
   visualFolder.addBinding(params.visual, 'foregroundColor').on('change', (ev) => {
    const color = new THREE.Color(ev.value);
    scene.traverse((obj) => {
      if (obj.material && obj.material.color) {
        obj.material.color.set(color);
      }
    });
  });

  const systemFolder = pane.addFolder({ title: 'System' });
  systemFolder.addButton({ title: 'Toggle Fullscreen' }).on('click', toggleFullscreen);
};


// --- SCENE SETUP ---
const createWavyLinesScene = () => {
  linesGroup = new THREE.Group();
  for (let i = 0; i < MAX_LINES; i++) {
    const positions = new Float32Array((LINE_SEGMENTS + 1) * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color: params.visual.foregroundColor });
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

  for (let i = 0; i < MAX_PARTICLES; i++) {
    lifespans[i] = 0; // Initially dead
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
  geometry.setAttribute('lifespan', new THREE.BufferAttribute(lifespans, 1));

  const material = new THREE.PointsMaterial({
    color: params.visual.foregroundColor,
    size: 0.1,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });

  particleSystem = new THREE.Points(geometry, material);
  particleSystem.visible = false; // Initially hidden
  scene.add(particleSystem);
};

const createPolygonScene = () => {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array((POLYGON_SIDES + 1) * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color: params.visual.foregroundColor });
  polygon = new THREE.LineLoop(geometry, material);
  polygon.visible = false;
  scene.add(polygon);
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
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float amount;
      varying vec2 vUv;

      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      void main() {
        vec4 color = texture2D(tDiffuse, vUv);
        float noise = random(vUv + fract(sin(gl_FragCoord.x * gl_FragCoord.y) * 1000.0)) * amount;
        gl_FragColor = vec4(color.rgb + noise, color.a);
      }
    `
  };

  const grainPass = new ShaderPass(grainShader);
  composer.addPass(grainPass);
};

// --- AUDIO SETUP ---
const startAudio = async () => {
  const startText = document.getElementById('start-text');
  if (startText) startText.remove();

  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    console.log('Audio setup complete.');
  } catch (err) {
    console.error('Error setting up audio:', err);
  }
};

// --- UPDATE FUNCTIONS ---
const updateAudio = () => {
  if (!analyser) return;

  analyser.getByteFrequencyData(dataArray);

  const freqBinCount = analyser.frequencyBinCount;
  const bassEndIndex = Math.floor(freqBinCount * 0.2);
  const midEndIndex = Math.floor(freqBinCount * 0.5);

  let bassSum = 0, midSum = 0, trebleSum = 0;
  for (let i = 0; i < freqBinCount; i++) {
    if (i <= bassEndIndex) bassSum += dataArray[i];
    else if (i <= midEndIndex) midSum += dataArray[i];
    else trebleSum += dataArray[i];
  }

  const bassDivisor = bassEndIndex + 1;
  const midDivisor = midEndIndex - bassEndIndex;
  const trebleDivisor = freqBinCount - midEndIndex - 1;

  bass = ((bassSum / bassDivisor) / 255) * params.audio.bassSensitivity;
  mid = ((midSum / midDivisor) / 255) * params.audio.midSensitivity;
  treble = ((trebleSum / (trebleDivisor > 0 ? trebleDivisor : 1)) / 255) * params.audio.trebleSensitivity;
  
  bass = Math.min(bass, 1.0);
  mid = Math.min(mid, 1.0);
  treble = Math.min(treble, 1.0);
};

const updateWavyLinesScene = () => {
  const numLines = Math.floor(map(bass, 0, 1, 1, MAX_LINES));
  const waveAmplitude = map(mid, 0, 1, 0.1, 2);
  const noiseAmount = map(treble, 0, 1, 0, 0.5);

  linesGroup.children.forEach((line, i) => {
    if (i < numLines) {
      line.visible = true;
      const positions = line.geometry.attributes.position.array;
      const yOffset = map(i, 0, MAX_LINES, -5, 5);

      for (let j = 0; j <= LINE_SEGMENTS; j++) {
        const x = map(j, 0, LINE_SEGMENTS, -10, 10);
        const wave = Math.sin(time * 0.2 + x * 1.0 + i * 0.3) * waveAmplitude;
        const glitch = (Math.random() - 0.5) * noiseAmount;
        const y = yOffset + wave + glitch;
        positions[j * 3] = x;
        positions[j * 3 + 1] = y;
        positions[j * 3 + 2] = 0;
      }
      line.geometry.attributes.position.needsUpdate = true;
    } else {
      line.visible = false;
    }
  });
};

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

  const speedFactor = 0.995;
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
    const power = Math.random() * 0.25 + 0.1;
    velocities[pIndex * 3] = Math.cos(angle) * power;
    velocities[pIndex * 3 + 1] = Math.sin(angle) * power;

    lifespans[pIndex] = 1.0;
    particleNextIndex = (particleNextIndex + 1) % MAX_PARTICLES;
  }
  particleSystem.geometry.attributes.lifespan.needsUpdate = true;
};

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
    if (i % 2 === 0) {
      r += spikeAmount;
    }
    positions[i * 3] = Math.cos(angle) * r;
    positions[i * 3 + 1] = Math.sin(angle) * r;
  }
  polygon.geometry.attributes.position.needsUpdate = true;
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
    } else if (currentScene === 3) {
      updatePolygonScene();
    }
  }

  if (composer) {
    composer.passes[1].uniforms.amount.value = params.visual.grain;
    composer.render();
  }
};

// --- EVENT LISTENERS ---
const onWindowResize = () => {
  // Use a timeout to ensure the browser has finished its resizing logic
  setTimeout(() => {
    // The console.log can be removed later, it's here for debugging.
    console.log(`Resizing to ${window.innerWidth}x${window.innerHeight}`);
    
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);

    // Force a render call right after resizing
    if (composer) {
      composer.render();
    }
  }, 0); // A 0ms delay is enough to push this to the next event cycle
};

const onKeyDown = (event) => {
  if (event.target.tagName === 'INPUT') return;

  if (event.key === 'f') {
    toggleFullscreen();
  }

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

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
};

// --- START ---
init();
