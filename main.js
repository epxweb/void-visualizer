import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/ShaderPass.js';
import { Pane } from 'https://cdn.jsdelivr.net/npm/tweakpane@4.0.3/dist/tweakpane.min.js';

// --- モジュール化されたシーンをインポート ---
import { WavyLinesScene } from './scenes/WavyLines.js';
import { ParticleBurstScene } from './scenes/ParticleBurst.js';
import { PulsingPolygonScene } from './scenes/PulsingPolygon.js';

let scene, camera, renderer, composer;
let analyser, dataArray;
let bass = 0, mid = 0, treble = 0;
let time = 0;
let clock = new THREE.Clock(); // 時間管理用のClockオブジェクト

// --- Tweakpane Parameters ---
const params = {
  audio: {
    bassSensitivity: 1.0,
    midSensitivity: 1.0,
    trebleSensitivity: 1.0,
  },
  visual: {
    grain: 0.05,
    backgroundColor: '#000000',
    foregroundColor: '#ffffff',
  },
  // --- 自動遷移用のパラメータを追加 ---
  transition: {
    auto: false, // 自動遷移を有効にするか
    interval: 30, // 切り替え間隔（秒）
  }
};

// --- シーンマネージャー ---
const sceneManager = {
  availableScenes: {},
  activeSlots: [],
  currentSlotIndex: 0,
  lastSwitchTime: 0, // 最後にシーンが切り替わった時間を記録

  init(threeScene, params) {
    this.availableScenes['Wavy Lines'] = new WavyLinesScene(threeScene, params);
    this.availableScenes['Particle Burst'] = new ParticleBurstScene(threeScene, params);
    this.availableScenes['Pulsing Polygon'] = new PulsingPolygonScene(threeScene, params);

    const sceneKeys = Object.keys(this.availableScenes);
    for (let i = 0; i < 5; i++) {
      this.activeSlots[i] = this.availableScenes[sceneKeys[i % sceneKeys.length]];
    }

    for (const key in this.availableScenes) {
      this.availableScenes[key].hide();
    }

    this.switchTo(0);
  },

  update(audioData, time) {
    if (this.activeSlots[this.currentSlotIndex]) {
      this.activeSlots[this.currentSlotIndex].update(audioData, time);
    }
  },

  switchTo(slotIndex) {
    if (slotIndex < 0 || slotIndex >= this.activeSlots.length) return;

    if (this.activeSlots[this.currentSlotIndex]) {
      this.activeSlots[this.currentSlotIndex].hide();
    }

    this.currentSlotIndex = slotIndex;
    if (this.activeSlots[this.currentSlotIndex]) {
      this.activeSlots[this.currentSlotIndex].show();
    }
    
    // 切り替え時間をリセット
    this.lastSwitchTime = clock.getElapsedTime();
  },

  // 次のスロットに切り替えるメソッド
  switchToNext() {
    const nextSlotIndex = (this.currentSlotIndex + 1) % this.activeSlots.length;
    this.switchTo(nextSlotIndex);
  },

  updateForegroundColor(color) {
    for (const key in this.availableScenes) {
      if (this.availableScenes[key].updateForegroundColor) {
        this.availableScenes[key].updateForegroundColor(color);
      }
    }
  }
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
  
  sceneManager.init(scene, params);

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
    renderer.setClearColor(new THREE.Color(ev.value));
  });
   visualFolder.addBinding(params.visual, 'foregroundColor').on('change', (ev) => {
    const color = new THREE.Color(ev.value);
    sceneManager.updateForegroundColor(color);
  });
  
  const sceneFolder = pane.addFolder({ title: 'Scene Slots' });
  const sceneOptions = Object.keys(sceneManager.availableScenes).map(name => ({
    text: name,
    value: name
  }));

  const slotParams = {};
  for (let i = 0; i < 5; i++) {
    slotParams[`Slot ${i + 1}`] = sceneManager.activeSlots[i] ? 
        Object.keys(sceneManager.availableScenes).find(key => sceneManager.availableScenes[key] === sceneManager.activeSlots[i])
        : sceneOptions[0].value;
  }

  for (let i = 1; i <= 5; i++) {
    sceneFolder.addBinding(slotParams, `Slot ${i}`, {
      options: sceneOptions
    }).on('change', (ev) => {
      const oldScene = sceneManager.activeSlots[i - 1];
      const newScene = sceneManager.availableScenes[ev.value];
      
      if(oldScene !== newScene) {
          if (sceneManager.currentSlotIndex === i - 1) {
              oldScene.hide();
              newScene.show();
          }
          sceneManager.activeSlots[i - 1] = newScene;
      }
    });
  }

  // --- 自動遷移UIを追加 ---
  const transitionFolder = pane.addFolder({ title: 'Scene Transition' });
  transitionFolder.addBinding(params.transition, 'auto', { label: 'Auto Transition' });
  transitionFolder.addBinding(params.transition, 'interval', { label: 'Interval (sec)', min: 5, max: 180, step: 1 });


  const systemFolder = pane.addFolder({ title: 'System' });
  systemFolder.addButton({ title: 'Toggle Fullscreen' }).on('click', toggleFullscreen);
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

// --- ANIMATION LOOP ---
const animate = () => {
  requestAnimationFrame(animate);
  const elapsedTime = clock.getElapsedTime();
  time += 0.02; // Keep for shaders if needed, but elapsedTime is better for logic

  if (analyser) {
    updateAudio();
    const audioData = { bass, mid, treble };
    sceneManager.update(audioData, time);
  }
  
  // --- 自動遷移ロジック ---
  if (params.transition.auto) {
    if (elapsedTime - sceneManager.lastSwitchTime > params.transition.interval) {
      sceneManager.switchToNext();
    }
  }

  if (composer) {
    composer.passes[1].uniforms.amount.value = params.visual.grain;
    composer.render();
  }
};

// --- EVENT LISTENERS ---
const onWindowResize = () => {
  setTimeout(() => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);

    if (composer) {
      composer.render();
    }
  }, 0);
};

const onKeyDown = (event) => {
  if (event.target.tagName === 'INPUT') return;

  if (event.key === 'f') {
    toggleFullscreen();
  }

  if (event.key >= '1' && event.key <= '5') {
    sceneManager.switchTo(parseInt(event.key) - 1);
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