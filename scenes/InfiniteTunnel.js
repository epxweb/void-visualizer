// scenes/InfiniteTunnel.js

import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { map } from '../core/utils.js';

/**
 * InfiniteTunnelSceneクラス
 * 画面奥に向かって無限に続くワイヤーフレームのトンネルを表現するビジュアルシーン。
 */
export class InfiniteTunnelScene {
  /**
   * @param {THREE.Scene} scene - レンダリング対象のメインシーン。
   * @param {object} params - Tweakpaneで操作するパラメータオブジェクト。
   * @param {THREE.Camera} camera - レンダリングに使用するカメラ。
   */
  constructor(scene, params, camera) { // camera引数を追加
    this.threeScene = scene;
    this.params = params;
    this.camera = camera; // cameraをクラスのプロパティとして保持

    // このシーン固有の定数
    this.NUM_RINGS = 20;
    this.RING_SEGMENTS = 32;
    this.TUNNEL_DEPTH = 100;

    this.tunnelGroup = new THREE.Group();
    this.speed = 0;

    this.init();
  }

  /**
   * シーンの初期化処理。
   */
  init() {
    const ringGeometry = new THREE.RingGeometry(4, 4.1, this.RING_SEGMENTS);
    const edges = new THREE.EdgesGeometry(ringGeometry);
    const material = new THREE.LineBasicMaterial({ color: new THREE.Color(this.params.visual.foregroundColor) });

    for (let i = 0; i < this.NUM_RINGS; i++) {
      const line = new THREE.LineSegments(edges, material);
      line.position.z = (i / this.NUM_RINGS) * -this.TUNNEL_DEPTH;
      this.tunnelGroup.add(line);
    }
    this.threeScene.add(this.tunnelGroup);
  }

  /**
   * シーンの更新処理。
   * @param {object} audioData - 解析されたオーディオデータ { bass, mid, treble }。
   * @param {number} time - 経過時間。
   */
  update(audioData, time) {
    const { bass, mid, treble } = audioData;

    this.speed = map(mid, 0, 1, 0.1, 0.8);
    const scale = 1 + map(bass, 0, 1, 0, 0.8);
    this.tunnelGroup.scale.set(scale, scale, 1);

    this.tunnelGroup.children.forEach(line => {
      line.position.z += this.speed;
      line.rotation.z += map(treble, 0, 1, 0, 0.3);

      // ▼▼▼ エラー箇所を修正 ▼▼▼
      if (line.position.z > this.camera.position.z) {
        line.position.z -= this.TUNNEL_DEPTH;
      }
    });
  }
  
  /**
   * UIから前景色が変更された際に呼び出されるメソッド。
   * @param {THREE.Color} color - 新しい前景色。
   */
  updateForegroundColor(color) {
    this.tunnelGroup.children.forEach(line => {
      line.material.color.set(color);
    });
  }

  show() {
    this.tunnelGroup.visible = true;
  }

  hide() {
    this.tunnelGroup.visible = false;
  }

  /**
   * このシーンに関連するすべてのThree.jsオブジェクトを解放する。
   */
  dispose() {
    this.tunnelGroup.children.forEach(line => {
      line.geometry.dispose();
      line.material.dispose();
    });
    this.threeScene.remove(this.tunnelGroup);
  }
}