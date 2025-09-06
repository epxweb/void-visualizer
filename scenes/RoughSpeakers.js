// scenes/RoughSpeakers.js

import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
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

    // このシーン固有の定数
    this.NUM_RINGS = 10;
    this.RING_RESOLUTION = 64; // 円の滑らかさ

    // ★ここから修正点★
    this.mainGroup = new THREE.Group(); // 全体をまとめる親グループ
    this.leftRingsGroup = new THREE.Group();
    this.rightRingsGroup = new THREE.Group();
    // ★ここまで修正点★
    this.init();
  }

  /**
   * シーンの初期化処理。
   */
  init() {
    // ★ここから修正点★
    this.leftRingsGroup.position.x = -4; // 左側に配置
    this.rightRingsGroup.position.x = 4;  // 右側に配置
    this.mainGroup.add(this.leftRingsGroup);
    this.mainGroup.add(this.rightRingsGroup);
    // ★ここまで修正点★

    const material = new THREE.LineBasicMaterial({ color: new THREE.Color(this.params.visual.foregroundColor) });

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

      // ★ここから修正点★
      // 左側のリングを作成
      const leftRing = new THREE.Line(geometry, material);
      leftRing.userData = {
        baseRotation: (Math.random() - 0.5) * 0.01,
        basePositions: basePositions
      };
      this.leftRingsGroup.add(leftRing);

      // 右側のリングを作成（ジオメトリとマテリアルは共有）
      const rightRing = new THREE.Line(geometry, material);
      rightRing.userData = leftRing.userData; // 動きを同じにするためにuserDataを共有
      this.rightRingsGroup.add(rightRing);
      // ★ここまで修正点★
    }
    this.threeScene.add(this.mainGroup);
  }

  /**
   * シーンの更新処理。
   * @param {object} audioData - 解析されたオーディオデータ { bass, mid, treble }。
   */
  update(audioData) {
    const { bass, mid, treble } = audioData;

    // 低域: 円の線の太さが脈動するように変化 -> 全体のスケールで表現
    const scale = 1 + map(bass, 0, 1, -0.5, 0.5);
    // ★ここから修正点★
    this.leftRingsGroup.scale.set(scale, scale, scale);
    this.rightRingsGroup.scale.set(scale, scale, scale);
    // ★ここまで修正点★

    const midSpeedFactor = map(mid, 0, 1, -2, 2);
    const trebleNoiseAmount = map(treble, 0, 1, 0, 0.3);

    // ★ここから修正点★
    // 両方のグループのリングを更新
    [this.leftRingsGroup, this.rightRingsGroup].forEach(group => {
        group.children.forEach(ring => {
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
    });
    // ★ここまで修正点★
  }

  /**
   * UIから前景色が変更された際に呼び出されるメソッド。
   * @param {THREE.Color} color - 新しい前景色。
   */
  updateForegroundColor(color) {
    // 全てのリングのマテリアルは共通なので、一つだけ変更すればOK
    if (this.leftRingsGroup.children.length > 0) {
      this.leftRingsGroup.children[0].material.color.set(color);
    }
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
    const firstRingMaterial = this.leftRingsGroup.children.length > 0 ? this.leftRingsGroup.children[0].material : null;
    
    // ジオメトリは共有されているので、片方のグループのリングだけ解放すればOK
    this.leftRingsGroup.children.forEach(ring => {
      ring.geometry.dispose();
    });

    // マテリアルは全リングで共有しているので、一度だけ解放する
    if(firstRingMaterial) {
      firstRingMaterial.dispose();
    }
    this.threeScene.remove(this.mainGroup);
  }
}