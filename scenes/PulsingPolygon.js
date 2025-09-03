import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';

/**
 * PulsingPolygonSceneクラス
 * 画面中央で脈動・回転する多角形で構成されるビジュアルシーン。
 */
export class PulsingPolygonScene {
  /**
   * @param {THREE.Scene} scene - レンダリング対象のメインシーン。
   * @param {object} params - Tweakpaneで操作するパラメータオブジェクト。
   */
  constructor(scene, params) {
    this.threeScene = scene;
    this.params = params;

    // このシーン固有の定数
    this.POLYGON_SIDES = 6;

    this.polygon = null;
    this.init();
  }

  /**
   * シーンの初期化処理。
   */
  init() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array((this.POLYGON_SIDES + 1) * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color: new THREE.Color(this.params.visual.foregroundColor) });
    this.polygon = new THREE.LineLoop(geometry, material);
    this.threeScene.add(this.polygon);
  }

  /**
   * シーンの更新処理。
   * @param {object} audioData - 解析されたオーディオデータ { bass, mid, treble }。
   */
  update(audioData) {
    const { bass, mid, treble } = audioData;
    const map = (value, start1, stop1, start2, stop2) => {
        return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
    };

    this.polygon.rotation.z += map(mid, 0, 1, 0, 0.05);

    const scale = 1 + map(bass, 0, 1, 0, 1.5);
    this.polygon.scale.set(scale, scale, scale);

    const positions = this.polygon.geometry.attributes.position.array;
    const baseRadius = 3;
    const spikeAmount = map(treble, 0, 1, 0, 2);

    for (let i = 0; i <= this.POLYGON_SIDES; i++) {
      const angle = (i / this.POLYGON_SIDES) * Math.PI * 2;
      let r = baseRadius;
      if (i % 2 === 0) {
        r += spikeAmount;
      }
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = Math.sin(angle) * r;
    }
    this.polygon.geometry.attributes.position.needsUpdate = true;
  }
  
  /**
   * UIから前景色が変更された際に呼び出されるメソッド。
   * @param {THREE.Color} color - 新しい前景色。
   */
  updateForegroundColor(color) {
    this.polygon.material.color.set(color);
  }

  show() {
    this.polygon.visible = true;
  }

  hide() {
    this.polygon.visible = false;
  }
}