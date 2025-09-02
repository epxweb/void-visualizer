import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/ShaderPass.js';

let scene, camera, renderer, composer;
let analyser, dataArray;
let bass = 0, mid = 0, treble = 0;
let time = 0;

// --- Scene 1: Wavy Lines ---
let linesGroup;
const MAX_LINES = 20;
const LINE_SEGMENTS = 120;

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
  setupPostprocessing();

  window.addEventListener('resize', onWindowResize, false);
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
    line.visible = false;
    linesGroup.add(line);
  }
  scene.add(linesGroup);
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

  bass = (bassSum / bassDivisor) / 255;
  mid = (midSum / midDivisor) / 255;
  treble = (trebleSum / (trebleDivisor > 0 ? trebleDivisor : 1)) / 255;
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

// --- ANIMATION LOOP ---
const animate = () => {
  requestAnimationFrame(animate);
  time += 0.02;

  if (analyser) {
    updateAudio();
    updateWavyLinesScene();
  }

  if (composer) {
    composer.passes[1].uniforms.amount.value = treble * 0.25 + 0.02;
    composer.render();
  }
};

// --- EVENT LISTENERS ---
const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
};

// --- START ---
init();