// scenes/DeepSea.js
import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { map } from '../core/utils.js';

/**
 * DeepSeaSceneクラス
 * 深海から水面を見上げ、音に合わせて水面がゆらめいたり、泡が昇っていくビジュアルシーン。
 */
export class DeepSeaScene {
  /**
   * @param {THREE.Scene} scene - レンダリング対象のメインシーン。
   * @param {object} params - Tweakpaneで操作するパラメータオブジェクト。
   * @param {THREE.Camera} camera - レンダリングに使用するカメラ。
   */
  constructor(scene, params, camera) {
    this.threeScene = scene;
    this.params = params;
    this.camera = camera;

    // このシーン固有の定数
    this.NUM_BUBBLES = 200;

    this.deepSeaGroup = new THREE.Group();
    this.waterSurface = null;
    this.bubbles = null;
    this.bubbleStates = [];

    this.originalCameraPos = new THREE.Vector3().copy(camera.position);

    this.init();
  }

  /**
   * シーンの初期化処理。
   */
  init() {
    // 水面の作成
    const surfaceGeometry = new THREE.PlaneGeometry(50, 50, 100, 100); // 細かい頂点で滑らかな変形を表現
    this.waterSurfaceMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        mid: { value: 0.0 },
        treble: { value: 0.0 },
        color: { value: new THREE.Color(this.params.visual.foregroundColor) }
      },
      vertexShader: `
        uniform float time;
        uniform float mid;
        varying vec3 vNormal;
        
        // Simple noise function
        float noise(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        void main() {
          vNormal = normal;
          vec3 pos = position;
          float waveSpeed = time * (1.0 + mid * 2.0);
          float waveHeight = 1.0 + mid * 5.0;
          pos.z += sin(pos.x * 0.2 + waveSpeed) * cos(pos.y * 0.2 + waveSpeed) * waveHeight;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float treble;
        uniform vec3 color;
        varying vec3 vNormal;

        void main() {
            float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            intensity += treble * 0.5; // 高域でキラキラさせる
            gl_FragColor = vec4(color * intensity, 1.0);
        }
      `,
      wireframe: true
    });
    this.waterSurface = new THREE.Mesh(surfaceGeometry, this.waterSurfaceMaterial);
    this.waterSurface.position.z = -10; // カメラより奥に配置
    this.deepSeaGroup.add(this.waterSurface);

    // 泡の作成
    const bubbleTexture = this.createBubbleTexture();
    const bubbleGeometry = new THREE.BufferGeometry();
    const bubblePositions = new Float32Array(this.NUM_BUBBLES * 3);
    bubbleGeometry.setAttribute('position', new THREE.BufferAttribute(bubblePositions, 3));
    
    const bubbleMaterial = new THREE.PointsMaterial({
      map: bubbleTexture,
      size: 0.5,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.bubbles = new THREE.Points(bubbleGeometry, bubbleMaterial);
    this.deepSeaGroup.add(this.bubbles);

    // 各泡の初期状態を設定
    for (let i = 0; i < this.NUM_BUBBLES; i++) {
        this.resetBubble(i);
    }

    this.threeScene.add(this.deepSeaGroup);
  }

  createBubbleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
  }

  resetBubble(index) {
    const positions = this.bubbles.geometry.attributes.position.array;
    positions[index * 3 + 0] = (Math.random() - 0.5) * 30; // x
    positions[index * 3 + 1] = (Math.random() - 0.5) * 30; // y
    positions[index * 3 + 2] = this.camera.position.z + Math.random() * -30; // z (start from below camera)
    
    this.bubbleStates[index] = {
        speed: Math.random() * 0.05 + 0.02,
        life: 1.0
    };
  }

  /**
   * シーンの更新処理。
   * @param {object} audioData - 解析されたオーディオデータ { bass, mid, treble }。
   * @param {number} time - 経過時間。
   */
  update(audioData, time) {
    const { bass, mid, treble } = audioData;

    // 水面のシェーダーに値を渡す
    this.waterSurfaceMaterial.uniforms.time.value = time;
    this.waterSurfaceMaterial.uniforms.mid.value = mid;
    this.waterSurfaceMaterial.uniforms.treble.value = treble;
    
    // カメラをゆっくりと揺らす
    this.camera.position.x = Math.sin(time * 0.05) * 2;
    this.camera.position.y = Math.cos(time * 0.05) * 2;
    this.camera.lookAt(this.waterSurface.position);

    // 泡の更新
    const positions = this.bubbles.geometry.attributes.position.array;
    for(let i = 0; i < this.NUM_BUBBLES; i++) {
        positions[i * 3 + 2] += this.bubbleStates[i].speed; // 泡を水面に向かって移動
        
        // 泡が水面に達したらリセット
        if (positions[i * 3 + 2] > this.waterSurface.position.z) {
            // 低域が強いほど、新しい泡が発生しやすくなる
            if (Math.random() < bass * 0.5) {
                this.resetBubble(i);
            } else {
                // 隠しておく
                positions[i * 3 + 2] = -1000;
            }
        }
    }
    this.bubbles.geometry.attributes.position.needsUpdate = true;
  }
  
  updateForegroundColor(color) {
    this.waterSurfaceMaterial.uniforms.color.value.set(color);
  }

  show() {
    this.deepSeaGroup.visible = true;
  }

  hide() {
    this.camera.position.copy(this.originalCameraPos);
    this.camera.lookAt(0,0,0);
    this.deepSeaGroup.visible = false;
  }

  dispose() {
    this.camera.position.copy(this.originalCameraPos);
    this.camera.lookAt(0,0,0);

    this.waterSurface.geometry.dispose();
    this.waterSurface.material.dispose();
    this.bubbles.geometry.dispose();
    if(this.bubbles.material.map) this.bubbles.material.map.dispose();
    this.bubbles.material.dispose();
    
    this.threeScene.remove(this.deepSeaGroup);
  }
}