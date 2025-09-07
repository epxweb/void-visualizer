// scenes/LunarPhases.js
import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { map } from '../core/utils.js';

/**
 * LunarPhasesSceneクラス
 * 月の満ち欠けをテーマにした、3x3のグリッドに配置された月が音に反応するビジュアルシーン。
 */
export class LunarPhasesScene {
  /**
   * @param {THREE.Scene} scene - レンダリング対象のメインシーン。
   * @param {object} params - Tweakpaneで操作するパラメータオブジェクト。
   */
  constructor(scene, params) {
    this.threeScene = scene;
    this.params = params;

    this.sceneGroup = new THREE.Group();
    this.moons = []; // 9つの月オブジェクトを保持する配列
    this.attackEffects = [0, 0, 0]; // [bass, mid, treble] のアタックエフェクト強度

    this.init();
  }

  /**
   * シーンの初期化処理。
   */
  init() {
    const moonSize = 2.0;
    const padding = 1.5;
    const gridSize = 3;
    const totalWidth = gridSize * moonSize + (gridSize - 1) * padding;
    const totalHeight = totalWidth;
    const startX = -totalWidth / 2 + moonSize / 2;
    const startY = totalHeight / 2 - moonSize / 2;

    const geometry = new THREE.PlaneGeometry(moonSize, moonSize);

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const material = new THREE.ShaderMaterial({
          uniforms: {
            u_color: { value: new THREE.Color(this.params.visual.foregroundColor) },
            u_phase: { value: 0.0 }, // 0.0 (新月) to 1.0 (満月)
            u_flash: { value: 0.0 }, // 0.0 to 1.0
          },
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 u_color;
            uniform float u_phase;
            uniform float u_flash;
            varying vec2 vUv;

            // Simple noise function
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }

            void main() {
              vec2 centeredUv = vUv - 0.5;
              float dist = length(centeredUv) * 2.0;

              if (dist > 1.0) {
                discard;
              }

              // 擬似的な3D法線と光源方向を計算
              vec3 normal = vec3(centeredUv.x, centeredUv.y, sqrt(1.0 - dist * dist));
              float lightAngle = (u_phase - 0.5) * 3.14159; // -PI/2 to PI/2
              vec3 lightDir = normalize(vec3(sin(lightAngle), 0.0, cos(lightAngle)));
              
              float rawBrightness = max(dot(normal, lightDir), 0.0);
              float brightness = pow(rawBrightness, 0.5); // 指数（3.0）でカーブを急峻にする
              
              // フラッシュエフェクト
              brightness = max(brightness, u_flash);

              gl_FragColor = vec4(u_color * brightness, brightness);
            }
          `,
          transparent: true,
        });

        const moon = new THREE.Mesh(geometry, material);
        moon.position.set(
          startX + x * (moonSize + padding),
          startY - y * (moonSize + padding),
          0
        );
        this.moons.push(moon);
        this.sceneGroup.add(moon);
      }
    }

    this.threeScene.add(this.sceneGroup);
  }

  /**
   * シーンの更新処理。
   * @param {object} audioData - 解析されたオーディオデータ。
   */
  update(audioData) {
    const { bass, mid, treble, bassAttack, midAttack, trebleAttack } = audioData;

    // アタックを検出したらエフェクト値をセット
    if (bassAttack > 0.1) this.attackEffects[0] = 0.8;
    if (midAttack > 0.1) this.attackEffects[1] = 0.8;
    if (trebleAttack > 0.1) this.attackEffects[2] = 0.8;

    // 各行の月を満ち欠け、閃光、ノイズで更新
    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3; // 列インデックス (0, 1, 2) を取得
      const moonMaterial = this.moons[i].material;

      let phase = 0;
      
      // 列の位置に応じて位相オフセットを設定
      const phaseOffset = (col / 3.0) * Math.PI * 2; // 0%, 33%, 66% のオフセット

      switch(row) {
        case 0: // 上段: Treble
          phase = (Math.sin(map(treble, 0, 1, 0, Math.PI * 2) + phaseOffset) + 1) / 2;
          moonMaterial.uniforms.u_flash.value = this.attackEffects[2];
          break;
        case 1: // 中段: Mid
          phase = (Math.sin(map(mid, 0, 1, 0, Math.PI * 2) + phaseOffset) + 1) / 2;
          moonMaterial.uniforms.u_flash.value = this.attackEffects[1];
          break;
        case 2: // 下段: Bass
          phase = (Math.sin(map(bass, 0, 1, 0, Math.PI * 2) + phaseOffset) + 1) / 2;
          moonMaterial.uniforms.u_flash.value = this.attackEffects[0];
          break;
      }
      
      moonMaterial.uniforms.u_phase.value = phase;
    }

    // アタックエフェクトを減衰させる
    this.attackEffects[0] *= 0.90;
    this.attackEffects[1] *= 0.90;
    this.attackEffects[2] *= 0.90;
  }

  updateForegroundColor(color) {
    const newColor = new THREE.Color(color);
    this.moons.forEach(moon => {
      moon.material.uniforms.u_color.value.set(newColor);
    });
  }

  show() {
    this.sceneGroup.visible = true;
  }

  hide() {
    this.sceneGroup.visible = false;
  }

  dispose() {
    this.sceneGroup.children.forEach(moon => {
      moon.geometry.dispose();
      moon.material.dispose();
    });
    this.threeScene.remove(this.sceneGroup);
  }
}