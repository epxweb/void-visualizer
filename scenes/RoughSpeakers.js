// scenes/RoughSpeakers.js

import * as THREE from 'three';
import { map } from '../core/utils.js';

/**
 * RoughSpeakersSceneクラス
 * ステレオスピーカーをイメージした、複数の同心円がそれぞれ振動するビジュアルシーン。
 */
export class RoughSpeakersScene {
  /**
   * @param {THREE.Scene} scene - レンダリング対象のメインシーン。
   * @param {object} params - Tweakpaneで操作するパラメータオブジェクト。
   * @param {THREE.Camera} camera - レンダリングに使用するカメラ。
   */
  constructor(scene, params, camera) {
    this.threeScene = scene;
    this.params = params;
    this.camera = camera;

    this.NUM_RINGS = 10;
    this.RING_RESOLUTION = 64;

    this.mainGroup = new THREE.Group();
    this.leftRingsGroup = new THREE.Group();
    this.rightRingsGroup = new THREE.Group();
    
    this.baseColor = new THREE.Color(this.params.visual.foregroundColor);
    this.material = new THREE.LineBasicMaterial({ color: this.baseColor });

    this.init();
  }

  /**
   * シーンの初期化処理。
   */
  init() {
    this.leftRingsGroup.position.x = -4;
    this.rightRingsGroup.position.x = 4;
    this.mainGroup.add(this.leftRingsGroup);
    this.mainGroup.add(this.rightRingsGroup);

    for (let i = 0; i < this.NUM_RINGS; i++) {
      const radius = 1 + i * 0.5;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array((this.RING_RESOLUTION + 1) * 3);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const basePositions = new Float32Array((this.RING_RESOLUTION + 1) * 3);

      for (let j = 0; j <= this.RING_RESOLUTION; j++) {
        const angle = (j / this.RING_RESOLUTION) * Math.PI * 2;
        basePositions[j * 3] = Math.cos(angle) * radius;
        basePositions[j * 3 + 1] = Math.sin(angle) * radius;
        basePositions[j * 3 + 2] = 0;
      }
      geometry.attributes.position.copyArray(basePositions);
      geometry.attributes.position.needsUpdate = true;
      geometry.setDrawRange(0, this.RING_RESOLUTION + 1);

      const leftRing = new THREE.Line(geometry, this.material);
      leftRing.userData = {
        basePositions: basePositions
      };
      this.leftRingsGroup.add(leftRing);

      const rightRing = new THREE.Line(geometry, this.material);
      rightRing.userData = leftRing.userData;
      this.rightRingsGroup.add(rightRing);
    }
    this.threeScene.add(this.mainGroup);
  }

  /**
   * シーンの更新処理。
   * @param {object} audioData - 解析されたオーディオデータ { bass, mid, treble }。
   */
  update(audioData) {
    const { bass, mid, treble } = audioData;

    // 低域: 全体のスケールで表現
    const scale = 1 + map(bass, 0, 1, -0.5, 0.5);
    this.leftRingsGroup.scale.set(scale, scale, scale);
    this.rightRingsGroup.scale.set(scale, scale, scale);

    // 中域: 円の明るさを変更
    const hsl = {};
    this.baseColor.getHSL(hsl);
    // midの値を輝度の範囲(20%〜100%)に直接マッピングすることで、元の色の輝度に依存せず、常に期待通りの明るさの変化を得る
    const lightness = map(mid, 0, 1, 0.2, 1.0);
    this.material.color.setHSL(hsl.h, hsl.s, lightness);

    // 高域: 円周上にノイズを加える
    const trebleNoiseAmount = map(treble, 0, 1, 0, 0.3);

    [this.leftRingsGroup, this.rightRingsGroup].forEach(group => {
        group.children.forEach(ring => {
            const positions = ring.geometry.attributes.position.array;
            const basePositions = ring.userData.basePositions;

            for (let i = 0; i <= this.RING_RESOLUTION; i++) {
                const noise = (Math.random() - 0.5) * trebleNoiseAmount;
                positions[i * 3] = basePositions[i * 3] * (1 + noise);
                positions[i * 3 + 1] = basePositions[i * 3 + 1] * (1 + noise);
            }
            ring.geometry.attributes.position.needsUpdate = true;
        });
    });
  }

  /**
   * UIから前景色が変更された際に呼び出されるメソッド。
   * @param {THREE.Color} color - 新しい前景色。
   */
  updateForegroundColor(color) {
    this.baseColor.set(color);
  }

  show() {
    this.mainGroup.visible = true;
  }

  hide() {
    this.mainGroup.visible = false;
  }

  /**
   * このシーンに関連するすべてのThree.jsオブジェクトを解放する。
   */
  dispose() {
    // ジオメトリは左右で共有されているので、片方のグループからのみ解放する
    if (this.leftRingsGroup) {
        this.leftRingsGroup.children.forEach(ring => {
            if (ring.geometry) {
                ring.geometry.dispose();
            }
        });
    }

    // マテリアルは全リングで共有
    if (this.material) {
        this.material.dispose();
    }
    
    // シーンからグループを削除
    if (this.threeScene && this.mainGroup) {
        this.threeScene.remove(this.mainGroup);
    }
  }
}
