import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { map } from '../core/utils.js';

/**
 * WavyLinesSceneクラス
 * 画面を横切る複数の波打つ線で構成されるビジュアルシーン。
 * [改善点]
 * - 画面幅いっぱいに線が描画されるように動的に幅を計算。
 * - 各線のZ位置をずらし、波のアニメーションに時間差を設けることで奥行き感を表現。
 * - 描画エリアの縦幅を画面の高さに連動させ、よりダイナミックな表現に。
 */
export class WavyLinesScene {
  /**
   * @param {THREE.Scene} scene - レンダリング対象のメインシーン。
   * @param {object} params - Tweakpaneで操作するパラメータオブジェクト。
   * @param {THREE.Camera} camera - レンダリングに使用するカメラ。
   */
  constructor(scene, params, camera) {
    this.threeScene = scene;
    this.params = params;
    this.camera = camera; // カメラオブジェクトを保持

    // このシーン固有の定数
    this.MAX_LINES = 20;
    this.LINE_SEGMENTS = 120;

    // シーンのルートとなるThree.jsオブジェクトを作成
    this.linesGroup = new THREE.Group();
    this.init();
  }

  /**
   * シーンの初期化処理。
   */
  init() {
    for (let i = 0; i < this.MAX_LINES; i++) {
      const positions = new Float32Array((this.LINE_SEGMENTS + 1) * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.LineBasicMaterial({ color: new THREE.Color(this.params.visual.foregroundColor) });
      const line = new THREE.Line(geometry, material);
      
      line.position.z = map(i, 0, this.MAX_LINES, 0, -5);
      this.linesGroup.add(line);
    }
    this.threeScene.add(this.linesGroup);
  }

  /**
   * シーンの更新処理。
   */
  update(audioData, time) {
    const { bass, mid, treble } = audioData;

    const numLines = Math.floor(map(bass, 0, 1, 1, this.MAX_LINES));
    const waveAmplitude = map(mid, 0, 1, 0.1, 2);
    const noiseAmount = map(treble, 0, 1, 0, 0.5);

    // カメラのZ位置におけるビューポートのサイズを計算
    const distance = this.camera.position.z;
    const vFov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(vFov / 2) * distance;
    const width = height * this.camera.aspect;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    // ▼▼▼ ここからが変更箇所 ▼▼▼

    // 1. 描画の縦幅を画面の高さに合わせて動的に決定
    //    最大の振れ幅(2.0)と少しのマージン(0.5)を考慮して、画面内に収まるように範囲を計算
    const verticalRange = halfHeight - 2.5;

    this.linesGroup.children.forEach((line, i) => {
      if (i < numLines) {
        line.visible = true;
        const positions = line.geometry.attributes.position.array;
        
        // 2. 各波の中心Y座標を、計算した縦幅いっぱいに広がるように配置
        const yOffset = map(i, 0, this.MAX_LINES, -verticalRange, verticalRange);

        // ▲▲▲ ここまでが変更箇所 ▲▲▲

        for (let j = 0; j <= this.LINE_SEGMENTS; j++) {
          const x = map(j, 0, this.LINE_SEGMENTS, -halfWidth, halfWidth);
          const wave = Math.sin((time - line.position.z * 0.2) * 2.0 + x * 0.5 + i * 0.3) * waveAmplitude;
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