import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { map } from '../core/utils.js';

/**
 * WavyLinesSceneクラス
 * 画面を横切る複数の波打つ線で構成されるビジュアルシーン。
 */
export class WavyLinesScene {
  /**
   * @param {THREE.Scene} scene - レンダリング対象のメインシーン。
   * @param {object} params - Tweakpaneで操作するパラメータオブジェクト。
   */
  constructor(scene, params) {
    this.threeScene = scene;
    this.params = params;

    // このシーン固有の定数
    this.MAX_LINES = 20;
    this.LINE_SEGMENTS = 120;

    // シーンのルートとなるThree.jsオブジェクトを作成
    this.linesGroup = new THREE.Group();
    this.init();
  }

  /**
   * シーンの初期化処理。
   * ジオメトリやマテリアルを作成し、メインシーンにオブジェクトを追加する。
   */
  init() {
    for (let i = 0; i < this.MAX_LINES; i++) {
      const positions = new Float32Array((this.LINE_SEGMENTS + 1) * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      // 初期の前景色をマテリアルに設定
      const material = new THREE.LineBasicMaterial({ color: new THREE.Color(this.params.visual.foregroundColor) });
      const line = new THREE.Line(geometry, material);
      this.linesGroup.add(line);
    }
    this.threeScene.add(this.linesGroup);
  }

  /**
   * シーンの更新処理。
   * 毎フレーム呼び出され、オーディオデータに応じてビジュアルを変化させる。
   * @param {object} audioData - 解析されたオーディオデータ { bass, mid, treble }。
   * @param {number} time - 経過時間。
   */
  update(audioData, time) {
    const { bass, mid, treble } = audioData;

    const numLines = Math.floor(map(bass, 0, 1, 1, this.MAX_LINES));
    const waveAmplitude = map(mid, 0, 1, 0.1, 2);
    const noiseAmount = map(treble, 0, 1, 0, 0.5);

    this.linesGroup.children.forEach((line, i) => {
      if (i < numLines) {
        line.visible = true;
        const positions = line.geometry.attributes.position.array;
        const yOffset = map(i, 0, this.MAX_LINES, -5, 5);

        for (let j = 0; j <= this.LINE_SEGMENTS; j++) {
          const x = map(j, 0, this.LINE_SEGMENTS, -10, 10);
          const wave = Math.sin(time * 0.2 + x * 1.0 + i * 0.3) * waveAmplitude;
          const glitch = (Math.random() - 0.5) * noiseAmount;
          const y = yOffset + wave + glitch;
          positions[j * 3] = x;
          positions[j * 3 + 1] = y;
          positions[j * 3 + 2] = 0;
        }
        line.geometry.attributes.position.needsUpdate = true;
      } else {
        line.visible = false;
      }
    });
  }
  
  /**
   * UIから前景色が変更された際に呼び出されるメソッド。
   * @param {THREE.Color} color - 新しい前景色。
   */
  updateForegroundColor(color) {
    this.linesGroup.children.forEach(line => {
      line.material.color.set(color);
    });
  }

  /**
   * このシーンを表示状態にする。
   */
  show() {
    this.linesGroup.visible = true;
  }

  /**
   * このシーンを非表示状態にする。
   */
  hide() {
    this.linesGroup.visible = false;
  }

  /**
   * このシーンに関連するすべてのThree.jsオブジェクトを解放する。
   */
  dispose() {
    this.linesGroup.children.forEach(line => {
      line.geometry.dispose();
      line.material.dispose();
    });
    this.threeScene.remove(this.linesGroup);
  }
}