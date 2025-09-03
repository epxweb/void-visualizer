// scenes/RotatingRings.js

import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { map } from '../core/utils.js';

/**
 * RotatingRingsSceneクラス
 * レコード盤をイメージした、複数の同心円がそれぞれ回転するビジュアルシーン。
 */
export class RotatingRingsScene {
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
    this.NUM_RINGS = 10;
    this.RING_RESOLUTION = 64; // 円の滑らかさ

    this.ringsGroup = new THREE.Group();
    this.init();
  }

  /**
   * シーンの初期化処理。
   */
  init() {
    const material = new THREE.LineBasicMaterial({ color: new THREE.Color(this.params.visual.foregroundColor) });

    for (let i = 0; i < this.NUM_RINGS; i++) {
      const radius = 1 + i * 0.5;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array((this.RING_RESOLUTION + 1) * 3);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      // positionsを保持
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


      const ring = new THREE.Line(geometry, material); // LineLoopではなくLineを使う
      
      // 各リングに固有の回転速度と方向を持たせる
      ring.userData = {
        baseRotation: (Math.random() - 0.5) * 0.01,
        basePositions: basePositions // 歪みの計算用に元の頂点情報を保持
      };

      this.ringsGroup.add(ring);
    }
    this.threeScene.add(this.ringsGroup);
  }

  /**
   * シーンの更新処理。
   * @param {object} audioData - 解析されたオーディオデータ { bass, mid, treble }。
   */
  update(audioData) {
    const { bass, mid, treble } = audioData;

    // 低域: 円の線の太さが脈動するように変化 -> 全体のスケールで表現
    const scale = 1 + map(bass, 0, 1, -0.5, 0.5);
    this.ringsGroup.scale.set(scale, scale, scale);

    const midSpeedFactor = map(mid, 0, 1, -2, 2);
    const trebleNoiseAmount = map(treble, 0, 1, 0, 0.3);

    this.ringsGroup.children.forEach(ring => {
      // 中域: 各円の回転速度や回転方向が変化
      ring.rotation.z += ring.userData.baseRotation * midSpeedFactor;
      
      // 高域: 円周上にノイズやギザギザした乱れを加える
      const positions = ring.geometry.attributes.position.array;
      const basePositions = ring.userData.basePositions;

      for (let i = 0; i <= this.RING_RESOLUTION; i++) {
        const noise = (Math.random() - 0.5) * trebleNoiseAmount;
        positions[i * 3] = basePositions[i * 3] * (1 + noise);
        positions[i * 3 + 1] = basePositions[i * 3 + 1] * (1 + noise);
      }
      ring.geometry.attributes.position.needsUpdate = true;
    });
  }

  /**
   * UIから前景色が変更された際に呼び出されるメソッド。
   * @param {THREE.Color} color - 新しい前景色。
   */
  updateForegroundColor(color) {
    // 全てのリングのマテリアルは共通なので、一つだけ変更すればOK
    if (this.ringsGroup.children.length > 0) {
      this.ringsGroup.children[0].material.color.set(color);
    }
  }

  show() {
    this.ringsGroup.visible = true;
  }

  hide() {
    this.ringsGroup.visible = false;
  }

  /**
   * このシーンに関連するすべてのThree.jsオブジェクトを解放する。
   */
  dispose() {
    const firstRingMaterial = this.ringsGroup.children.length > 0 ? this.ringsGroup.children[0].material : null;
    
    this.ringsGroup.children.forEach(ring => {
      ring.geometry.dispose();
    });
    // マテリアルは全リングで共有しているので、一度だけ解放する
    if(firstRingMaterial) {
      firstRingMaterial.dispose();
    }
    this.threeScene.remove(this.ringsGroup);
  }
}