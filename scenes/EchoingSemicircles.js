// scenes/EchoingSemicircles.js
import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { map } from '../core/utils.js';

/**
 * EchoingSemicirclesSceneクラス
 * 左右の半円が山びこのように応答しあうビジュアルシーン。
 */
export class EchoingSemicirclesScene {
  /**
   * @param {THREE.Scene} scene - レンダリング対象のメインシーン。
   * @param {object} params - Tweakpaneで操作するパラメータオブジェクト。
   */
  constructor(scene, params) {
    this.threeScene = scene;
    this.params = params;

    this.semicirclesGroup = new THREE.Group();
    this.leftSemicircle = null;
    this.rightSemicircle = null;
    this.bassHistory = []; // bassの値を記録する配列
    this.DELAY_FRAMES = 10; // 遅延させるフレーム数
    this.SEGMENTS = 64;

    this.init();
  }

  /**
   * 半円のジオメトリを生成するヘルパー関数。
   * @param {boolean} isLeft - 左側の半円かどうか。
   */
  createSemicircleGeometry(isLeft) {
    const points = [];
    const angleStart = isLeft ? -Math.PI / 2 : Math.PI / 2;
    const angleEnd = isLeft ? Math.PI / 2 : Math.PI * 1.5;

    for (let i = 0; i <= this.SEGMENTS; i++) {
        const angle = angleStart + (angleEnd - angleStart) * (i / this.SEGMENTS);
        points.push(new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }

  /**
   * シーンの初期化処理。
   */
  init() {
    const material = new THREE.LineBasicMaterial({ color: new THREE.Color(this.params.visual.foregroundColor) });

    // 左の半円
    const leftGeometry = this.createSemicircleGeometry(true);
    this.leftSemicircle = new THREE.Line(leftGeometry, material);
    this.leftSemicircle.position.x = -4;
    this.semicirclesGroup.add(this.leftSemicircle);

    // 右の半円
    const rightGeometry = this.createSemicircleGeometry(false);
    this.rightSemicircle = new THREE.Line(rightGeometry, material);
    this.rightSemicircle.position.x = 4;
    this.semicirclesGroup.add(this.rightSemicircle);
    
    // 歪み計算用に元の頂点情報を保持
    this.leftSemicircle.userData.basePositions = this.leftSemicircle.geometry.attributes.position.clone();
    this.rightSemicircle.userData.basePositions = this.rightSemicircle.geometry.attributes.position.clone();

    // bassの履歴を初期化
    for (let i = 0; i < this.DELAY_FRAMES; i++) {
        this.bassHistory.push(0);
    }

    this.threeScene.add(this.semicirclesGroup);
  }

  /**
   * 半円の頂点を更新する。
   * @param {THREE.Line} semicircle - 対象の半円。
   * @param {number} radius - 半径。
   * @param {number} distortion - 歪みの量。
   * @param {number} glitch - グリッチの量。
   */
  updateSemicircleVertices(semicircle, radius, distortion, glitch) {
    const positions = semicircle.geometry.attributes.position.array;
    const basePositions = semicircle.userData.basePositions.array;

    for (let i = 0; i <= this.SEGMENTS; i++) {
        const baseRadius = Math.sqrt(basePositions[i * 3]**2 + basePositions[i * 3 + 1]**2);
        const currentRadius = radius * baseRadius + Math.sin(i * 0.5) * distortion + (Math.random() - 0.5) * glitch;
        
        positions[i * 3] = basePositions[i * 3] / baseRadius * currentRadius;
        positions[i * 3 + 1] = basePositions[i * 3 + 1] / baseRadius * currentRadius;
    }
    semicircle.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * シーンの更新処理。
   * @param {object} audioData - 解析されたオーディオデータ { bass, mid, treble }。
   */
  update(audioData) {
    const { bass, mid, treble } = audioData;

    // bassの履歴を更新
    this.bassHistory.push(bass);
    if (this.bassHistory.length > this.DELAY_FRAMES) {
        this.bassHistory.shift();
    }
    const delayedBass = this.bassHistory[0];

    // 低域 (Bass): 半径が拡大
    const leftRadius = 3 + map(bass, 0, 1, 0, 4);
    const rightRadius = 3 + map(delayedBass, 0, 1, 0, 4);
    
    // 中域 (Mid): 頂点が歪む
    const distortion = map(mid, 0, 1, 0, 1.5);
    
    // 高域 (Treble): グリッチが加わる
    const glitch = map(treble, 0.5, 1, 0, 0.5);

    this.updateSemicircleVertices(this.leftSemicircle, leftRadius, distortion, glitch);
    this.updateSemicircleVertices(this.rightSemicircle, rightRadius, distortion, glitch);
  }

  /**
   * UIから前景色が変更された際に呼び出されるメソッド。
   */
  updateForegroundColor(color) {
    this.leftSemicircle.material.color.set(color);
    // マテリアルは共有しているので片方でOK
  }

  show() {
    this.semicirclesGroup.visible = true;
  }

  hide() {
    this.semicirclesGroup.visible = false;
  }

  /**
   * このシーンに関連するすべてのThree.jsオブジェクトを解放する。
   */
  dispose() {
    this.leftSemicircle.geometry.dispose();
    this.leftSemicircle.material.dispose(); // マテリアルは共有
    this.rightSemicircle.geometry.dispose();
    this.threeScene.remove(this.semicirclesGroup);
  }
}