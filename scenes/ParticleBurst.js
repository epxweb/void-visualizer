import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { map } from '../core/utils.js';

/**
 * ParticleBurstSceneクラス
 * 画面中央からパーティクルが爆発するように広がるビジュアルシーン。
 */
export class ParticleBurstScene {
  /**
   * @param {THREE.Scene} scene - レンダリング対象のメインシーン。
   * @param {object} params - Tweakpaneで操作するパラメータオブジェクト。
   */
  constructor(scene, params) {
    this.threeScene = scene;
    this.params = params;

    // このシーン固有の定数と変数
    this.MAX_PARTICLES = 1000;
    this.particleNextIndex = 0;
    this.prevBass = 0;

    this.particleSystem = null;
    this.init();
  }

  /**
   * シーンの初期化処理。
   */
  init() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.MAX_PARTICLES * 3);
    const velocities = new Float32Array(this.MAX_PARTICLES * 3);
    const lifespans = new Float32Array(this.MAX_PARTICLES);

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      lifespans[i] = 0; // Initially dead
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('lifespan', new THREE.BufferAttribute(lifespans, 1));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(this.params.visual.foregroundColor),
      size: 0.1,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.threeScene.add(this.particleSystem);
  }

  /**
   * シーンの更新処理。
   * @param {object} audioData - 解析されたオーディオデータ { bass, mid, treble }。
   */
  update(audioData) {
    const { bass, treble } = audioData;

    const beatThreshold = 0.3;
    if (bass > this.prevBass + beatThreshold && bass > 0.6) {
      const count = Math.floor(map(bass, 0.6, 1, 10, 50));
      this.emitParticles(count);
    }
    this.prevBass = bass;

    const positions = this.particleSystem.geometry.attributes.position.array;
    const velocities = this.particleSystem.geometry.attributes.velocity.array;
    const lifespans = this.particleSystem.geometry.attributes.lifespan.array;

    const speedFactor = 0.995;
    this.particleSystem.material.size = map(treble, 0, 1, 0.05, 0.25);

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      if (lifespans[i] > 0) {
        positions[i * 3] += velocities[i * 3];
        positions[i * 3 + 1] += velocities[i * 3 + 1];
        
        velocities[i*3] *= speedFactor;
        velocities[i*3+1] *= speedFactor;

        lifespans[i] -= 0.015;
      }
    }
    this.particleSystem.geometry.attributes.position.needsUpdate = true;
    this.particleSystem.geometry.attributes.lifespan.needsUpdate = true; // Make sure this is updated
  }
  
  /**
   * 指定された数のパーティクルを放出する。
   * @param {number} count - 放出するパーティクルの数。
   */
  emitParticles(count) {
    const positions = this.particleSystem.geometry.attributes.position.array;
    const velocities = this.particleSystem.geometry.attributes.velocity.array;
    const lifespans = this.particleSystem.geometry.attributes.lifespan.array;

    for (let i = 0; i < count; i++) {
      const pIndex = this.particleNextIndex;
      
      positions[pIndex * 3] = 0;
      positions[pIndex * 3 + 1] = 0;
      positions[pIndex * 3 + 2] = 0;

      const angle = Math.random() * 2 * Math.PI;
      const power = Math.random() * 0.25 + 0.1;
      velocities[pIndex * 3] = Math.cos(angle) * power;
      velocities[pIndex * 3 + 1] = Math.sin(angle) * power;

      lifespans[pIndex] = 1.0;
      this.particleNextIndex = (this.particleNextIndex + 1) % this.MAX_PARTICLES;
    }
  }

  /**
   * UIから前景色が変更された際に呼び出されるメソッド。
   * @param {THREE.Color} color - 新しい前景色。
   */
  updateForegroundColor(color) {
    this.particleSystem.material.color.set(color);
  }

  show() {
    this.particleSystem.visible = true;
  }

  hide() {
    this.particleSystem.visible = false;
  }

  /**
   * このシーンに関連するすべてのThree.jsオブジェクトを解放する。
   */
  dispose() {
    this.particleSystem.geometry.dispose();
    this.particleSystem.material.dispose();
    this.threeScene.remove(this.particleSystem);
  }
}