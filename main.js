import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/ShaderPass.js';
import { Pane } from 'https://cdn.jsdelivr.net/npm/tweakpane@4.0.3/dist/tweakpane.min.js';

// --- モジュールとシェーダーをインポート ---
import { WavyLinesScene } from './scenes/WavyLines.js';
import { PulsingPolygonScene } from './scenes/PulsingPolygon.js';
import { InfiniteTunnelScene } from './scenes/InfiniteTunnel.js';
import { RotatingRingsScene } from './scenes/RotatingRings.js';
import { WarpingGridScene } from './scenes/WarpingGrid.js';
import { Transitioner } from './core/Transitioner.js';
import { FadeShader } from './shaders/FadeShader.js';
import { StrobeShader } from './shaders/StrobeShader.js';

let scene, camera, renderer, composer, pane;
let analyser, dataArray;
let bass = 0, mid = 0, treble = 0;
let time = 0;
let clock = new THREE.Clock();

// --- レンダリングとトランジション用の変数 ---
let transitioner = new Transitioner();
let transitionPass, strobePass, grainPass;
let renderTargetA, renderTargetB;

const params = {
  audio: { bassSensitivity: 1.0, midSensitivity: 1.0, trebleSensitivity: 1.0 },
  visual: { grain: 0.1, backgroundColor: '#000000', foregroundColor: '#ffffff' },
  strobe: { enable: true, sensitivity: 0.6, brightness: 0.05 },
  transition: { auto: false, interval: 30, duration: 1.5 }
};

const sceneManager = {
  availableScenes: {},
  activeSlots: [],
  currentSlotIndex: 0,
  lastSwitchTime: 0,

  init(threeScene, params) {
    // availableScenesにはクラス（設計図）を格納
    this.availableScenes['Wavy Lines'] = WavyLinesScene;
    this.availableScenes['Pulsing Polygon'] = PulsingPolygonScene;
    this.availableScenes['Infinite Tunnel'] = InfiniteTunnelScene;
    this.availableScenes['Rotating Rings'] = RotatingRingsScene;
    this.availableScenes['Warping Grid'] = WarpingGridScene;

    const sceneKeys = Object.keys(this.availableScenes);
    // 各スロットに独立したインスタンスを生成
    for (let i = 0; i < 5; i++) {
      const SceneClass = this.availableScenes[sceneKeys[i % sceneKeys.length]];
      this.activeSlots[i] = new SceneClass(threeScene, params, camera);
      this.activeSlots[i].hide(); // まずはすべて非表示
    }
    
    this.setCurrentSlot(0);
    this.activeSlots[0].show(); // 最初のスロットだけ表示
  },

  update(audioData, time) {
    if (transitioner.isActive) {
      transitioner.fromScene.update(audioData, time);
      transitioner.toScene.update(audioData, time);
    } else if (this.activeSlots[this.currentSlotIndex]) {
      this.activeSlots[this.currentSlotIndex].update(audioData, time);
    }
  },

  switchTo(slotIndex) {
    if (slotIndex < 0 || slotIndex >= this.activeSlots.length || slotIndex === this.currentSlotIndex) return;
    const fromScene = this.activeSlots[this.currentSlotIndex];
    const toScene = this.activeSlots[slotIndex];
    
    const started = transitioner.start(fromScene, toScene, slotIndex);
    if (started) this.lastSwitchTime = clock.getElapsedTime();
  },
  
  switchToNext() {
    const nextSlotIndex = (this.currentSlotIndex + 1) % this.activeSlots.length;
    this.switchTo(nextSlotIndex);
  },
  
  setCurrentSlot(slotIndex) {
      this.currentSlotIndex = slotIndex;
      this.lastSwitchTime = clock.getElapsedTime();
  },

  updateForegroundColor(color) {
    // アクティブなスロットのインスタンスの色を更新
    this.activeSlots.forEach(sceneInstance => {
        if (sceneInstance && sceneInstance.updateForegroundColor) {
            sceneInstance.updateForegroundColor(color);
        }
    });
  }
};

const init = () => {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 10;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
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
  startText.id = 'start-text';
  startText.innerHTML = 'Click to start audio';
  Object.assign(startText.style, { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', fontSize: '24px', fontFamily: 'sans-serif' });
  document.body.appendChild(startText);

  animate();
};

const setupUI = () => {
  pane = new Pane();
  const audioFolder = pane.addFolder({ title: 'Audio Sensitivity' });
  audioFolder.addBinding(params.audio, 'bassSensitivity', { min: 0, max: 5, step: 0.1, label: 'Bass' });
  audioFolder.addBinding(params.audio, 'midSensitivity', { min: 0, max: 5, step: 0.1, label: 'Mid' });
  audioFolder.addBinding(params.audio, 'trebleSensitivity', { min: 0, max: 5, step: 0.1, label: 'Treble' });

  const visualFolder = pane.addFolder({ title: 'Visuals' });
  visualFolder.addBinding(params.visual, 'grain', { min: 0, max: 0.5, step: 0.01 });
  visualFolder.addBinding(params.visual, 'backgroundColor').on('change', (ev) => {
    renderer.setClearColor(new THREE.Color(ev.value), params.visual.backgroundColor === 'transparent' ? 0 : 1);
  });
  visualFolder.addBinding(params.visual, 'foregroundColor').on('change', (ev) => {
    sceneManager.updateForegroundColor(new THREE.Color(ev.value));
  });

  visualFolder.addBinding(params.strobe, 'enable', { label: 'Strobe' });
  visualFolder.addBinding(params.strobe, 'sensitivity', { label: 'Strobe Sensitivity', min: 0, max: 1.0, step: 0.05 });
  visualFolder.addBinding(params.strobe, 'brightness', { label: 'Strobe Brightness', min: 0, max: 1.0, step: 0.05 });
  
  const sceneFolder = pane.addFolder({ title: 'Scene Slots' });
  const sceneOptions = Object.keys(sceneManager.availableScenes).map(name => ({ text: name, value: name }));
  const slotParams = {};

  for (let i = 0; i < 5; i++) {
    const sceneInstance = sceneManager.activeSlots[i];
    const sceneName = Object.keys(sceneManager.availableScenes).find(key => sceneManager.availableScenes[key] === sceneInstance.constructor);
    slotParams[`Slot ${i + 1}`] = sceneName;
  }

  for (let i = 1; i <= 5; i++) {
    sceneFolder.addBinding(slotParams, `Slot ${i}`, { options: sceneOptions }).on('change', (ev) => {
      const slotIndex = i - 1;
      const oldScene = sceneManager.activeSlots[slotIndex];

      if (oldScene && oldScene.dispose) {
        oldScene.dispose();
      }

      const NewSceneClass = sceneManager.availableScenes[ev.value];
      const newScene = new NewSceneClass(scene, params, camera);
      sceneManager.activeSlots[slotIndex] = newScene;

      if (slotIndex === sceneManager.currentSlotIndex) {
        const fromScene = oldScene;
        const toScene = newScene;
        
        fromScene.hide();
        toScene.show();

        sceneManager.setCurrentSlot(slotIndex);

      } else {
        newScene.hide();
      }
    });
  }

  const transitionFolder = pane.addFolder({ title: 'Scene Transition' });
  transitionFolder.addBinding(params.transition, 'auto', { label: 'Auto Transition' });
  transitionFolder.addBinding(params.transition, 'interval', { label: 'Interval (sec)', min: 5, max: 180, step: 1 });
  transitionFolder.addBinding(params.transition, 'duration', { label: 'Duration (sec)', min: 0.1, max: 5, step: 0.1 });

  const systemFolder = pane.addFolder({ title: 'System' });
  systemFolder.addButton({ title: 'Toggle Fullscreen' }).on('click', toggleFullscreen);
};

const setupPostprocessing = () => {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const size = new THREE.Vector2();
  renderer.getSize(size);
  renderTargetA = new THREE.WebGLRenderTarget(size.width, size.height);
  renderTargetB = new THREE.WebGLRenderTarget(size.width, size.height);
  
  transitionPass = new ShaderPass(FadeShader);
  transitionPass.enabled = false;
  composer.addPass(transitionPass);

  strobePass = new ShaderPass(StrobeShader);
  composer.addPass(strobePass);

  const grainShader = {
    uniforms: { 'tDiffuse': { value: null }, 'amount': { value: 0.1 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; varying vec2 vUv; float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123); } void main() { vec4 color = texture2D(tDiffuse, vUv); float noise = random(vUv + fract(sin(gl_FragCoord.x * gl_FragCoord.y) * 1000.0)) * amount; gl_FragColor = vec4(color.rgb + noise, color.a); }`
  };
  grainPass = new ShaderPass(grainShader);
  composer.addPass(grainPass);
};

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
  } catch (err) { 
    console.log("Audio setup failed. This can happen if you don't grant microphone permissions.");
  }
};

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
  bass = Math.min(bass, 1.0); mid = Math.min(mid, 1.0); treble = Math.min(treble, 1.0);
};

const animate = () => {
  requestAnimationFrame(animate);
  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();
  time += 0.02;

  if (analyser) {
    updateAudio();
    const audioData = { bass, mid, treble };
    sceneManager.update(audioData, time);

    // --- Strobe Logic ---
    if (params.strobe.enable) {
        strobePass.enabled = true;
        // Trigger strobe on bass hit, with a shorter cooldown (strobeTime > 0.2s)
        if (bass > params.strobe.sensitivity && strobePass.uniforms.strobeTime.value > 0.2) {
            strobePass.uniforms.strobeTime.value = 0.0;
        }
        strobePass.uniforms.strobeAlpha.value = params.strobe.brightness;
        strobePass.uniforms.strobeTime.value += deltaTime;
    } else {
        strobePass.enabled = false;
    }
  }
  
  if (params.transition.auto && !transitioner.isActive) {
    if (elapsedTime - sceneManager.lastSwitchTime > params.transition.interval) {
      sceneManager.switchToNext();
    }
  }

  // Update grain amount regardless of transition state
  grainPass.uniforms.amount.value = params.visual.grain;

  if (transitioner.isActive) {
    composer.passes[0].enabled = false; // Disable base render pass
    transitionPass.enabled = true;
    
    transitioner.update(deltaTime, params.transition.duration);
    transitionPass.uniforms.mixRatio.value = transitioner.progress;

    // 1. Render fromScene to renderTargetA
    transitioner.toScene.hide();
    transitioner.fromScene.show();
    renderer.setRenderTarget(renderTargetA);
    renderer.render(scene, camera);
    transitionPass.uniforms.tDiffuse1.value = renderTargetA.texture;
    
    // 2. Render toScene to renderTargetB
    transitioner.fromScene.hide();
    transitioner.toScene.show();
    renderer.setRenderTarget(renderTargetB);
    renderer.render(scene, camera);
    transitionPass.uniforms.tDiffuse2.value = renderTargetB.texture;

    renderer.setRenderTarget(null);
    composer.render();
    
    if (transitioner.progress >= 1.0) {
      sceneManager.setCurrentSlot(transitioner.toSlotIndex);
      transitioner.fromScene.hide();
      transitioner.stop();
    }
  } else {
    composer.passes[0].enabled = true; // Enable base render pass
    transitionPass.enabled = false;
    composer.render();
  }
};

const onWindowResize = () => {
  setTimeout(() => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    renderTargetA.setSize(window.innerWidth, window.innerHeight);
    renderTargetB.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.render();
  }, 0);
};

const onKeyDown = (event) => {
  if (event.target.tagName === 'INPUT') return;
  if (event.key === 'f') toggleFullscreen();
  if (event.key === 'h') {
    if (pane) pane.hidden = !pane.hidden;
  }
  if (event.key >= '1' && event.key <= '5') {
    sceneManager.switchTo(parseInt(event.key) - 1);
  }
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else if (document.exitFullscreen) document.exitFullscreen();
};

init();
