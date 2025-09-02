import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/ShaderPass.js';

let scene, camera, renderer, cube, composer;
let analyser, dataArray;
let bass = 0, mid = 0, treble = 0;

// --- INITIALIZATION ---
const init = () => {
  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // A simple cube for testing audio reactivity
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshNormalMaterial();
  cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  // Post-processing for Grain Effect
  setupPostprocessing();

  // Event Listeners
  window.addEventListener('resize', onWindowResize, false);
  document.body.addEventListener('click', startAudio, { once: true });

  // Initial text prompt
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
        float noise = (random(vUv + fract(sin(gl_FragCoord.x * gl_FragCoord.y) * 1000.0)) - 0.5) * amount;
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

  bass = (bassSum / (bassEndIndex + 1)) / 255;
  mid = (midSum / (midEndIndex - bassEndIndex)) / 255;
  treble = (trebleSum / (freqBinCount - midEndIndex -1)) / 255;
};

// --- ANIMATION LOOP ---
const animate = () => {
  requestAnimationFrame(animate);

  updateAudio();

  if (cube) {
    const scale = 1 + bass * 2;
    cube.scale.set(scale, scale, scale);
    cube.rotation.x += mid * 0.05;
    cube.rotation.y += mid * 0.05;
  }
  
  if (composer) {
    composer.passes[1].uniforms.amount.value = treble * 0.15;
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
