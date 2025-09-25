import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { Pane } from 'https://cdn.jsdelivr.net/npm/tweakpane@4.0.3/dist/tweakpane.min.js';

// --- モジュールとシェーダーをインポート ---
import { Transitioner } from './core/Transitioner.js';
import { FadeShader } from './shaders/FadeShader.js';
import { StrobeShader } from './shaders/StrobeShader.js';

let scene, camera, renderer, composer, pane;
let audioContext, analyser, dataArray;
let bass = 0, mid = 0, treble = 0;
let time = 0;
let lastBass = 0, lastMid = 0, lastTreble = 0;
let bassAttack = 0, midAttack = 0, trebleAttack = 0;
let clock = new THREE.Clock();

let worker;
let isPageActive = true;
let animationFrameId = null;

// --- レンダリングとトランジション用の変数 ---
let transitioner = new Transitioner();
let transitionPass, strobePass, grainPass;
let renderTargetA, renderTargetB;

// --- タッチ操作用の変数 ---
let touchStartX = 0;
let lastTap = 0;
const DOUBLE_TAP_DELAY = 300; // ダブルタップと判定する時間 (ms)
const SWIPE_THRESHOLD = 50;   // スワイプと判定する距離 (px)

const params = {
  audio: { bassSensitivity: 1.0, midSensitivity: 1.0, trebleSensitivity: 1.0 },
  visual: { grain: 0.1, backgroundColor: '#000000', foregroundColor: '#ffffff' },
  strobe: { enable: true, sensitivity: 0.4, brightness: 0.05 },
  transition: { auto: false, interval: 30, duration: 1.5, random: false },
  system: { backgroundFps: 60 }
};

const sceneManager = {
  availableScenes: {},
  sceneCache: {},
  activeSlots: [],
  activeInstances: [],
  currentSlotIndex: 0,
  lastSwitchTime: 0,
  isSwitching: false, // 切り替え中の競合を防ぐためのフラグ

  async init(threeScene, params) {
    this.threeScene = threeScene;
    this.params = params;
    this.camera = camera;

    // クラス本体ではなく、ファイルパスとクラス名を保持
    this.availableScenes = {
      'Wavy Lines': { path: './scenes/WavyLines.js', className: 'WavyLinesScene' },
      'Pulsing Polygon': { path: './scenes/PulsingPolygon.js', className: 'PulsingPolygonScene' },
      'Infinite Tunnel': { path: './scenes/InfiniteTunnel.js', className: 'InfiniteTunnelScene' },
      'Rough Speakers': { path: './scenes/RoughSpeakers.js', className: 'RoughSpeakersScene' },
      'Wireframe Mirrorball': { path: './scenes/WireframeMirrorball.js', className: 'WireframeMirrorballScene' },
      'Warping Grid': { path: './scenes/WarpingGrid.js', className: 'WarpingGridScene' },
      'Pulsing 3D Grid': { path: './scenes/Pulsing3DGrid.js', className: 'Pulsing3DGridScene' },
      'Tri Tile': { path: './scenes/TriTile.js', className: 'TriTileScene' },
      'Solar System': { path: './scenes/SolarSystem.js', className: 'SolarSystemScene' },
      'Lunar Phases': { path: './scenes/LunarPhases.js', className: 'LunarPhasesScene' },
      'Elevator Shaft': { path: './scenes/ElevatorShaft.js', className: 'ElevatorShaftScene' },
      'ASCII Dance': { path: './scenes/ASCIIDance.js', className: 'ASCIIDanceScene' },
      'Projected Orbs': { path: './scenes/ProjectedOrbs.js', className: 'ProjectedOrbsScene' },
      'Reactive Smoke': { path: './scenes/ReactiveSmoke.js', className: 'ReactiveSmokeScene' },
      'Digital Curtain': { path: './scenes/DigitalCurtain.js', className: 'DigitalCurtainScene' },
      'Heavy Rain': { path: './scenes/HeavyRain.js', className: 'HeavyRainScene' },
      'Mirrored Lake': { path: './scenes/MirroredLake.js', className: 'MirroredLakeScene' },
      'Audio Graph': { path: './scenes/AudioGraph.js', className: 'AudioGraphScene' },
      'Empty': null
    };

    // 初期スロットのシーンを非同期でプリロード＆インスタンス化
    const sceneKeys = Object.keys(this.availableScenes).filter(k => k !== 'Empty');
    const initialSlotPromises = [];

    for (let i = 0; i < 5; i++) {
      const sceneName = sceneKeys[i % sceneKeys.length];
      this.activeSlots[i] = sceneName;
      // Promiseを作成し、配列に追加
      const instancePromise = this.createSceneInstance(sceneName).then(instance => {
        if (instance) instance.hide();
        return instance;
      });
      initialSlotPromises.push(instancePromise);
    }

    // すべてのインスタンス生成を並列で待つ
    this.activeInstances = await Promise.all(initialSlotPromises);
    
    this.setCurrentSlot(0);
    if (this.activeInstances[0]) this.activeInstances[0].show();
  },

  // シーンをプリロードしてキャッシュする関数
  async preloadScene(sceneName) {
    if (!sceneName || sceneName === 'Empty' || this.sceneCache[sceneName]) {
      return true; // プリロード不要または既にキャッシュ済み
    }
    const sceneInfo = this.availableScenes[sceneName];
    if (!sceneInfo) {
      console.error(`Scene info not found for: ${sceneName}`);
      return false;
    }
    try {
      const module = await import(sceneInfo.path);
      this.sceneCache[sceneName] = module[sceneInfo.className];
      console.log(`Scene preloaded: ${sceneName}`);
      return true;
    } catch (err) {
      console.error(`Failed to preload scene: ${sceneName}`, err);
      return false;
    }
  },

  // シーン名からインスタンスを生成する関数
  async createSceneInstance(sceneName) {
    if (!sceneName || sceneName === 'Empty') return null;

    if (!this.sceneCache[sceneName]) {
      const success = await this.preloadScene(sceneName);
      if (!success) return null;
    }

    const SceneClass = this.sceneCache[sceneName];
    return new SceneClass(this.threeScene, this.params, this.camera);
  },

  update(audioData, time) {
    const currentInstance = this.activeInstances[this.currentSlotIndex];
    if (transitioner.isActive) {
      if(transitioner.fromScene) transitioner.fromScene.update(audioData, time);
      if(transitioner.toScene) transitioner.toScene.update(audioData, time);
    } else if (currentInstance) {
      currentInstance.update(audioData, time);
    }
  },

  async switchTo(slotIndex) {
    if (this.isSwitching || slotIndex < 0 || slotIndex >= 5 || slotIndex === this.currentSlotIndex) return;
    
    this.isSwitching = true;

    const fromInstance = this.activeInstances[this.currentSlotIndex];
    let toInstance = this.activeInstances[slotIndex];

    // もしインスタンスがまだなければ非同期で生成
    if (!toInstance) {
      const sceneName = this.activeSlots[slotIndex];
      toInstance = await this.createSceneInstance(sceneName);
      this.activeInstances[slotIndex] = toInstance;
    }

    if (!toInstance) {
        console.error(`Failed to switch to slot ${slotIndex}. Instance creation failed.`);
        this.isSwitching = false;
        return;
    }

    const started = transitioner.start(fromInstance, toInstance, slotIndex);
    if (started) {
        this.lastSwitchTime = clock.getElapsedTime();
    } else {
        this.isSwitching = false;
    }
  },
  
  switchToNext() {
    const availableSlots = this.activeSlots.map((name, i) => name !== 'Empty' ? i : -1).filter(i => i !== -1);
    if (availableSlots.length < 2) return;

    let nextSlotIndex;
    const currentIndexInAvailable = availableSlots.indexOf(this.currentSlotIndex);

    if (params.transition.random) {
      const candidates = availableSlots.filter(index => index !== this.currentSlotIndex);
      nextSlotIndex = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : this.currentSlotIndex;
    } else {
      const nextIndexInAvailable = (currentIndexInAvailable + 1) % availableSlots.length;
      nextSlotIndex = availableSlots[nextIndexInAvailable];
    }
    this.switchTo(nextSlotIndex);
  },

  switchToNextSequential() {
    const nextSlotIndex = (this.currentSlotIndex + 1) % 5;
    this.switchTo(nextSlotIndex);
  },

  switchToPreviousSequential() {
    const prevSlotIndex = (this.currentSlotIndex - 1 + 5) % 5;
    this.switchTo(prevSlotIndex);
  },
  
  setCurrentSlot(slotIndex) {
      this.currentSlotIndex = slotIndex;
      this.lastSwitchTime = clock.getElapsedTime();
      updateCurrentSceneDisplay();
  },

  updateForegroundColor(color) {
    this.activeInstances.forEach(instance => {
        if (instance && instance.updateForegroundColor) {
            instance.updateForegroundColor(color);
        }
    });
  }
};

let currentSceneDisplay;

const updateCurrentSceneDisplay = () => {
    if (!currentSceneDisplay) return;
    const sceneName = sceneManager.activeSlots[sceneManager.currentSlotIndex] || 'Empty';
    currentSceneDisplay.textContent = `Now Playing: [${sceneManager.currentSlotIndex + 1}] ${sceneName}`;
};

const init = async () => {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 10;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  
  setupWorker();
  await sceneManager.init(scene, params);
  setupPostprocessing();
  setupUI();

  window.addEventListener('resize', onWindowResize, false);
  document.addEventListener('keydown', onKeyDown, false);
  document.addEventListener('visibilitychange', handleVisibilityChange, false);
  document.body.addEventListener('touchstart', onTouchStart, { passive: false });
  document.body.addEventListener('touchend', onTouchEnd, false);
  document.body.addEventListener('dblclick', onDoubleClick, false);

  const startText = document.createElement('div');
  startText.id = 'start-text';
  startText.innerHTML = 'Click to start audio';
  Object.assign(startText.style, { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', fontSize: '24px', fontFamily: 'sans-serif', cursor: 'pointer' });
  document.body.appendChild(startText);

  startText.addEventListener('click', startAudio);
  startText.addEventListener('touchend', startAudio);

  const fileLoader = document.createElement('input');
  fileLoader.type = 'file';
  fileLoader.id = 'setting-file-loader';
  fileLoader.accept = '.json';
  fileLoader.style.display = 'none';
  fileLoader.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target.result);
        applySettings(settings);
      } catch (error) {
        console.error("Failed to parse settings file:", error);
        alert("Error: Could not load settings file. It may be corrupted.");
      }
    };
    reader.readAsText(file);
    
    event.target.value = '';
  });
  document.body.appendChild(fileLoader);

  startAnimationLoop();
};

const setupWorker = () => {
    worker = new Worker('worker.js');
    worker.onmessage = (e) => {
        if (e.data === 'tick' && !isPageActive) {
            renderFrame();
        }
    };
    worker.postMessage({ type: 'update-fps', payload: { fps: params.system.backgroundFps } });
};

let slotParams = {};

const setupUI = () => {
  pane = new Pane();

  currentSceneDisplay = document.createElement('div');
  Object.assign(currentSceneDisplay.style, {
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      padding: '8px 12px',
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
      borderBottom: '1px solid #444'
  });
  pane.element.insertBefore(currentSceneDisplay, pane.element.firstChild);
  updateCurrentSceneDisplay();

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
  visualFolder.addBinding(params.strobe, 'brightness', { label: 'Strobe Brightness', min: 0, max: 0.5, step: 0.05 });
  
  const sceneFolder = pane.addFolder({ title: 'Scene Slots' });
  const sceneOptions = Object.keys(sceneManager.availableScenes).map(name => ({ text: name, value: name }));

  for (let i = 0; i < 5; i++) {
    slotParams[`Slot ${i + 1}`] = sceneManager.activeSlots[i];
  }

  // UIでのシーン変更時の処理
  for (let i = 1; i <= 5; i++) {
    sceneFolder.addBinding(slotParams, `Slot ${i}`, { options: sceneOptions }).on('change', async (ev) => {
      if (sceneManager.isSwitching) {
        console.warn("Cannot change scene while a transition is active.");
        // UIの値をプログラム的に元に戻す
        ev.target.binding.value.write(sceneManager.activeSlots[i - 1]);
        return;
      }

      const slotIndex = i - 1;
      const newSceneName = ev.value;

      // 古いインスタンスを破棄
      const oldInstance = sceneManager.activeInstances[slotIndex];
      if (oldInstance && oldInstance.dispose) oldInstance.dispose();
      sceneManager.activeInstances[slotIndex] = null;

      // 新しいシーン名を設定し、プリロードを開始
      sceneManager.activeSlots[slotIndex] = newSceneName;
      sceneManager.preloadScene(newSceneName);
      
      // もし現在アクティブなスロットを変更した場合は、即座にインスタンスを生成して表示
      if (slotIndex === sceneManager.currentSlotIndex) {
        sceneManager.isSwitching = true;
        const newInstance = await sceneManager.createSceneInstance(newSceneName);
        sceneManager.activeInstances[slotIndex] = newInstance;
        if (newInstance) newInstance.show();
        updateCurrentSceneDisplay();
        sceneManager.isSwitching = false;
      }
    });
  }

  const transitionFolder = pane.addFolder({ title: 'Scene Transition' });
  transitionFolder.addBinding(params.transition, 'auto', { label: 'Auto Transition' });
  transitionFolder.addBinding(params.transition, 'random', { label: 'Random Order' });
  transitionFolder.addBinding(params.transition, 'interval', { label: 'Interval (sec)', min: 5, max: 180, step: 1 });
  transitionFolder.addBinding(params.transition, 'duration', { label: 'Duration (sec)', min: 0.1, max: 5, step: 0.1 });

  const systemFolder = pane.addFolder({ title: 'System' });
  systemFolder.addBinding(params.system, 'backgroundFps', { label: 'Background FPS', options: [{ text: '15', value: 15 }, { text: '30', value: 30 }, { text: '60', value: 60 }] }).on('change', (ev) => {
      worker.postMessage({ type: 'update-fps', payload: { fps: ev.value } });
  });
  systemFolder.addButton({ title: 'Toggle Fullscreen' }).on('click', toggleFullscreen);

  const settingsFolder = pane.addFolder({ title: 'Settings' });
  settingsFolder.addButton({ title: 'Save Settings' }).on('click', saveSettings);
  settingsFolder.addButton({ title: 'Load Settings' }).on('click', () => {
    document.getElementById('setting-file-loader').click();
  });
};

const setupPostprocessing = () => {
  const size = new THREE.Vector2();
  renderer.getSize(size);
  
  // 深度バッファを持つレンダーターゲットを明示的に作成
  const renderTarget = new THREE.WebGLRenderTarget(size.width, size.height, {
    depthBuffer: true,
    stencilBuffer: false
  });

  // 作成したレンダーターゲットを使ってcomposerを初期化
  composer = new EffectComposer(renderer, renderTarget);
  composer.addPass(new RenderPass(scene, camera));

  // シーン切り替え（トランジション）用に、レンダーターゲットを別途用意
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

const startAudio = async (event) => {
  event.preventDefault();
  event.stopPropagation();
  if (analyser) return;

  const startText = document.getElementById('start-text');
  if (startText) {
    startText.removeEventListener('click', startAudio);
    startText.removeEventListener('touchend', startAudio);
    startText.innerHTML = 'Starting...';
  }

  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    if (startText) startText.remove();
  } catch (err) {
    console.log("Audio setup failed. This can happen if you don't grant microphone permissions.");
    if (startText) startText.innerHTML = 'Audio permission denied. Please refresh and try again.';
  }
};

const updateAudio = () => {
  if (!analyser) return;
  analyser.getByteFrequencyData(dataArray);
  const freqBinCount = analyser.frequencyBinCount;
  const bassEndIndex = Math.floor(freqBinCount * 0.1);
  const midEndIndex = Math.floor(freqBinCount * 0.3);
  let bassSum = 0, midSum = 0, trebleSum = 0;
  for (let i = 0; i < freqBinCount; i++) {
    if (i <= bassEndIndex) bassSum += dataArray[i];
    else if (i <= midEndIndex) midSum += dataArray[i];
    else trebleSum += dataArray[i];
  }
  bass = ((bassSum / (bassEndIndex + 1)) / 255) * params.audio.bassSensitivity;
  mid = ((midSum / (midEndIndex - bassEndIndex)) / 255) * params.audio.midSensitivity;
  treble = ((trebleSum / (freqBinCount - midEndIndex)) / 255) * params.audio.trebleSensitivity;
  bass = Math.min(bass, 1.0); mid = Math.min(mid, 1.0); treble = Math.min(treble, 1.0);
  // Attack detection
  bassAttack = Math.max(0, bass - lastBass);
  midAttack = Math.max(0, mid - lastMid);
  trebleAttack = Math.max(0, treble - lastTreble);

  lastBass = bass;
  lastMid = mid;
  lastTreble = treble;
};

const startAnimationLoop = () => {
    if (isPageActive) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(animate);
    } else {
        worker.postMessage({ type: 'start' });
    }
};

const stopAnimationLoop = () => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    worker.postMessage({ type: 'stop' });
};

const animate = () => {
  renderFrame();
  if (isPageActive) {
    animationFrameId = requestAnimationFrame(animate);
  }
};

const renderFrame = () => {
  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();
  time += deltaTime;

  if (analyser) {
    updateAudio();
    const audioData = { bass, mid, treble, bassAttack, midAttack, trebleAttack, frequencyData: dataArray };
    sceneManager.update(audioData, time);

    if (params.strobe.enable) {
        strobePass.enabled = true;
        const threshold = 1.0 - params.strobe.sensitivity;
        if (bass > threshold && strobePass.uniforms.strobeTime.value > 0.2) {
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

  grainPass.uniforms.amount.value = params.visual.grain;

  if (transitioner.isActive) {
    composer.passes[0].enabled = false;
    transitionPass.enabled = true;
    
    transitioner.update(deltaTime, params.transition.duration);
    transitionPass.uniforms.mixRatio.value = transitioner.progress;

    if(transitioner.fromScene) transitioner.fromScene.show();
    if(transitioner.toScene) transitioner.toScene.hide();
    renderer.setRenderTarget(renderTargetA);
    renderer.render(scene, camera);
    transitionPass.uniforms.tDiffuse1.value = renderTargetA.texture;
    
    if(transitioner.fromScene) transitioner.fromScene.hide();
    if(transitioner.toScene) transitioner.toScene.show();
    renderer.setRenderTarget(renderTargetB);
    renderer.render(scene, camera);
    transitionPass.uniforms.tDiffuse2.value = renderTargetB.texture;

    renderer.setRenderTarget(null);
    composer.render();
    
    if (transitioner.progress >= 1.0) {
      sceneManager.setCurrentSlot(transitioner.toSlotIndex);
      if(transitioner.fromScene) transitioner.fromScene.hide();
      if(transitioner.toScene) transitioner.toScene.show(); // 遷移先を表示
      transitioner.stop();
      sceneManager.isSwitching = false;
    }
  } else {
    composer.passes[0].enabled = true;
    transitionPass.enabled = false;
    composer.render();
  }
};

const handleVisibilityChange = () => {
    if (document.hidden) {
        isPageActive = false;
        // アクティブ時の描画ループ(rAF)のみを停止
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        // Web Workerによるバックグラウンド描画を開始
        worker.postMessage({ type: 'start' });
    } else {
        isPageActive = true;
        // stopAnimationLoop()は呼ばず、Workerだけを直接停止する
        worker.postMessage({ type: 'stop' });
        // アクティブ時の描画ループを再開
        startAnimationLoop();
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

const onTouchStart = (event) => {
    if (document.getElementById('start-text') || event.target.closest('.tp-dfwv')) return;
    event.preventDefault();
    
    const currentTime = new Date().getTime();
    const timeSinceLastTap = currentTime - lastTap;

    if (timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 0) {
        if (pane) pane.hidden = !pane.hidden;
        lastTap = 0;
    } else {
        touchStartX = event.touches[0].clientX;
    }
    lastTap = currentTime;
};

const onTouchEnd = (event) => {
    if (document.getElementById('start-text') || touchStartX === 0) return;

    const touchEndX = event.changedTouches[0].clientX;
    const swipeDistance = touchEndX - touchStartX;

    if (Math.abs(swipeDistance) > SWIPE_THRESHOLD) {
        if (swipeDistance < 0) {
            sceneManager.switchToNextSequential();
        } else {
            sceneManager.switchToPreviousSequential();
        }
    }
    touchStartX = 0;
};

const onDoubleClick = (event) => {
  if (event.target.closest('.tp-dfwv')) return;
  
  if (pane) {
    pane.hidden = !pane.hidden;
  }
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else if (document.exitFullscreen) document.exitFullscreen();
};

const saveSettings = () => {
  const settings = {
    params: params,
    slots: sceneManager.activeSlots, // インスタンスではなくシーン名を保存
    currentSlotIndex: sceneManager.currentSlotIndex
  };

  const jsonString = JSON.stringify(settings, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'void_settings.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const applySettings = async (settings) => {
  console.log("Applying settings...");
  stopAnimationLoop();

  Object.assign(params.audio, settings.params.audio);
  Object.assign(params.visual, settings.params.visual);
  Object.assign(params.strobe, settings.params.strobe);
  Object.assign(params.transition, settings.params.transition);
  Object.assign(params.system, settings.params.system);

  // 新しいスロット設定のシーンをすべてプリロード
  const preloadPromises = settings.slots.map(sceneName => sceneManager.preloadScene(sceneName));
  await Promise.all(preloadPromises);
  console.log("All scenes from settings are preloaded.");

  // 古いインスタンスをすべて破棄
  sceneManager.activeInstances.forEach(instance => {
    if (instance && instance.dispose) instance.dispose();
  });
  sceneManager.activeInstances = [];

  // プリロード済みのキャッシュから新しいインスタンスを生成
  const newInstancesPromises = settings.slots.map(sceneName => sceneManager.createSceneInstance(sceneName));
  const newInstances = await Promise.all(newInstancesPromises);

  sceneManager.activeSlots = settings.slots;
  sceneManager.activeInstances = newInstances;
  
  for (let i = 0; i < 5; i++) {
    slotParams[`Slot ${i + 1}`] = settings.slots[i] || 'Empty';
  }
  
  const newIndex = settings.currentSlotIndex || 0;
  
  sceneManager.activeInstances.forEach((instance, index) => {
    if (instance) {
      if (index === newIndex) {
        instance.show();
      } else {
        instance.hide();
      }
    }
  });
  sceneManager.setCurrentSlot(newIndex);

  renderer.setClearColor(new THREE.Color(params.visual.backgroundColor));
  sceneManager.updateForegroundColor(new THREE.Color(params.visual.foregroundColor));
  worker.postMessage({ type: 'update-fps', payload: { fps: params.system.backgroundFps } });

  pane.refresh();

  console.log("Settings applied. Resuming animation.");
  startAnimationLoop();
};

init();