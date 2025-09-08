import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { map } from '../core/utils.js';

/**
 * ASCIIDanceSceneクラス
 * 画面全体を埋め尽くすASCII文字が、音に反応して雲のようにうごめくビジュアルシーン。
 */
export class ASCIIDanceScene {
  /**
   * @param {THREE.Scene} scene - レンダリング対象のメインシーン。
   * @param {object} params - Tweakpaneで操作するパラメータオブジェクト。
   */
  constructor(scene, params) { // ★camera引数を削除
    this.threeScene = scene;
    this.params = params;

    this.sceneGroup = new THREE.Group();
    this.plane = null;
    this.fontAtlasTexture = null;

    this.init();
  }

  /**
   * シーンの初期化処理。
   */
  init() {
    this.fontAtlasTexture = this.createFontAtlas();

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        // ★ここから修正: カメラの位置に関わらず、常に画面全体を覆うようにする
        gl_Position = vec4(position, 1.0);
        // ★ここまで修正
      }
    `;

    const fragmentShader = `
      uniform float time;
      uniform vec2 resolution;
      uniform sampler2D fontAtlas;
      uniform vec3 color;
      uniform float bass;
      uniform float mid;
      uniform float treble;
      varying vec2 vUv;

      float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }
      
      // シンプルなノイズ関数
      float simpleNoise(vec2 p, float speed) {
        float t = time * speed;
        float noise = sin(p.x * 3.0 + t) + sin(p.y * 4.0 + t * 0.5);
        noise += sin(p.x * 5.0 - t * 0.2) + sin(p.y * 7.0 - t * 0.8);
        return (noise / 4.0) + 0.5; // 0.0 - 1.0の範囲に正規化
      }

      void main() {
          float zoom = 1.0 + sin(time * 0.2) * 0.1; // 非常にゆっくりした周期で0.95から1.05の間を変動
          float aspectRatio = resolution.x / resolution.y;
          vec2 p = vUv * 2.0 - 1.0;
          p *= zoom;
          p.x *= aspectRatio;
          
          float charGridSize = 16.0;
          float noiseScale = 0.3;
          
          float noiseSpeed = mid * 1.0 + 0.1;
          float noiseVal = simpleNoise(p * noiseScale, noiseSpeed);
          
          vec2 gridUv = floor(p * charGridSize) / charGridSize;

          // 文字の選択
          float slowTime = floor(time * 10.0); // 1秒間に約10回変化
          float randomIndex = random(gridUv + slowTime) * 64.0;
          float charIndex = floor(mod(noiseVal * 64.0 + randomIndex, 64.0));
          
          // グリッチエフェクト
          if (random(gridUv + slowTime * 0.99) < treble * 0.3) { // 判定をコマ送りし、閾値を少し調整
              // グリッチで上書きされる文字も、slowTime に基づいて決定する
              charIndex = floor(random(vUv + slowTime * 1.01) * 64.0);
          }

          float charX = mod(charIndex, 8.0);
          float charY = floor(charIndex / 8.0);
          
          vec2 letterUv = fract(p * charGridSize);
          
          vec2 sampleUv = vec2(charX / 8.0, charY / 8.0) + letterUv / 8.0;
          
          float char = texture2D(fontAtlas, sampleUv).r;

          // 明るさ
          float brightness = (noiseVal * 0.8) + (bass * 1.0) + 0.01; 
          brightness = clamp(brightness, 0.0, 1.0);

          gl_FragColor = vec4(color * char * brightness, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        fontAtlas: { value: this.fontAtlasTexture },
        color: { value: new THREE.Color(this.params.visual.foregroundColor) },
        bass: { value: 0.0 },
        mid: { value: 0.0 },
        treble: { value: 0.0 },
      },
      vertexShader,
      fragmentShader
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.plane = new THREE.Mesh(geometry, material);
    this.sceneGroup.add(this.plane);
    this.threeScene.add(this.sceneGroup);
  }

  /**
   * フォントアトラス（文字を並べたテクスチャ）を生成する。
   */
  createFontAtlas() {
    const canvas = document.createElement('canvas');
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.font = '24px monospace';
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const chars = 'ABCDEF0123456789!?#$%&<>*+=-_[]{}()';
    const cellSize = size / 8; // 8x8 grid

    for (let i = 0; i < 64; i++) {
        const char = chars[i % chars.length];
        const x = (i % 8) * cellSize + cellSize / 2;
        const y = Math.floor(i / 8) * cellSize + cellSize / 2;
        ctx.fillText(char, x, y);
    }
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * シーンの更新処理。
   * @param {object} audioData - 解析されたオーディオデータ { bass, mid, treble }。
   * @param {number} time - 経過時間。
   */
  update(audioData, time) {
    if (!this.plane) return;
    const { bass, mid, treble } = audioData;
    this.plane.material.uniforms.time.value = time;
    this.plane.material.uniforms.bass.value = bass;
    this.plane.material.uniforms.mid.value = mid;
    this.plane.material.uniforms.treble.value = treble;

    // ウィンドウサイズが変更された場合に対応
    const currentResolution = this.plane.material.uniforms.resolution.value;
    if (currentResolution.x !== window.innerWidth || currentResolution.y !== window.innerHeight) {
        currentResolution.set(window.innerWidth, window.innerHeight);
    }
  }

  /**
   * UIから前景色が変更された際に呼び出されるメソッド。
   */
  updateForegroundColor(color) {
    if (this.plane) {
      this.plane.material.uniforms.color.value.set(color);
    }
  }

  show() {
    this.sceneGroup.visible = true;
  }

  hide() {
    this.sceneGroup.visible = false;
  }

  /**
   * このシーンに関連するすべてのThree.jsオブジェクトを解放する。
   */
  dispose() {
    if (this.plane) {
      this.plane.geometry.dispose();
      if (this.plane.material) {
        this.plane.material.dispose();
      }
    }
    if (this.fontAtlasTexture) {
      this.fontAtlasTexture.dispose();
    }
    this.threeScene.remove(this.sceneGroup);
  }
}