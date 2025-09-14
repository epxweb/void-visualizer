// scenes/Pulsing3DGrid.js
import * as THREE from 'three';
import { map } from '../core/utils.js';

/**
 * Pulsing3DGridSceneクラス
 * 3Dグリッド上に配置された点がビートに合わせて脈動するビジュアルシーン。
 */
export class Pulsing3DGridScene {
  /**
   * @param {THREE.Scene} scene - レンダリング対象のメインシーン。
   * @param {object} params - Tweakpaneで操作するパラメータオブジェクト。
   */
  constructor(scene, params) {
    this.threeScene = scene;
    this.params = params;

    // このシーン固有の定数
    this.GRID_SIZE = 10;
    this.GRID_DIVISIONS = 10;

    this.pointsGroup = new THREE.Group();
    this.points = null;
    this.baseColors = []; // 各点の元の色を保持
    this.circleTexture = null; // 円形テクスチャを保持するプロパティ

    this.init();
  }

  /**
   * シーンの初期化処理。
   */
  init() {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const step = this.GRID_SIZE / this.GRID_DIVISIONS;
    const halfSize = this.GRID_SIZE / 2;
    const baseColor = new THREE.Color(this.params.visual.foregroundColor);

    for (let x = 0; x <= this.GRID_DIVISIONS; x++) {
      for (let y = 0; y <= this.GRID_DIVISIONS; y++) {
        for (let z = 0; z <= this.GRID_DIVISIONS; z++) {
          positions.push(
            x * step - halfSize,
            y * step - halfSize,
            z * step - halfSize
          );
          colors.push(baseColor.r, baseColor.g, baseColor.b);
          this.baseColors.push(baseColor.clone());
        }
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    // ★ここから修正点★
    // 円形のテクスチャを作成
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const context = canvas.getContext('2d');
    context.beginPath();
    context.arc(8, 8, 8, 0, Math.PI * 2);
    context.fillStyle = '#ffffff';
    context.fill();
    this.circleTexture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      map: this.circleTexture, // 円形テクスチャを適用
      alphaTest: 0.1 // 背景の透過処理を改善
    });
    // ★ここまで修正点★

    this.points = new THREE.Points(geometry, material);
    this.pointsGroup.add(this.points);
    this.threeScene.add(this.pointsGroup);
  }

  /**
   * シーンの更新処理。
   * @param {object} audioData - 解析されたオーディオデータ { bass, mid, treble }。
   */
  update(audioData) {
    const { bass, mid, treble } = audioData;

    // 低域 (Bass): 全ての点のサイズが一斉に拡大・縮小
    const scale = 1 + map(bass, 0, 1, 0, 1.5);
    this.points.scale.set(scale, scale, scale);
    this.points.material.size = map(bass, 0, 1, 0.05, 0.15);


    // 中域 (Mid): グリッド全体がZ軸周りをゆっくりと回転
    this.pointsGroup.rotation.y += map(mid, 0, 1, 0, 0.01);
    this.pointsGroup.rotation.x += map(mid, 0, 1, 0, 0.005);


    // 高域 (Treble): 各点の色や不透明度がランダムに明滅
    this.points.material.opacity = map(treble, 0, 1, 0.6, 1.0);
    const colors = this.points.geometry.attributes.color.array;
    const trebleEffect = map(treble, 0.5, 1.0, 0, 1); // 高域が一定以上の場合に効果を発揮

    if (trebleEffect > 0) {
        for (let i = 0; i < this.baseColors.length; i++) {
            if (Math.random() < trebleEffect * 0.1) { // 一部の点をランダムに選択
                colors[i * 3] = Math.random();
                colors[i * 3 + 1] = Math.random();
                colors[i * 3 + 2] = Math.random();
            } else {
                colors[i * 3] = this.baseColors[i].r;
                colors[i * 3 + 1] = this.baseColors[i].g;
                colors[i * 3 + 2] = this.baseColors[i].b;
            }
        }
        this.points.geometry.attributes.color.needsUpdate = true;
    }
  }

  /**
   * UIから前景色が変更された際に呼び出されるメソッド。
   */
  updateForegroundColor(color) {
    const newColor = new THREE.Color(color);
    const colors = this.points.geometry.attributes.color.array;
    for (let i = 0; i < this.baseColors.length; i++) {
        this.baseColors[i].set(newColor);
        colors[i * 3] = newColor.r;
        colors[i * 3 + 1] = newColor.g;
        colors[i * 3 + 2] = newColor.b;
    }
    this.points.geometry.attributes.color.needsUpdate = true;
  }

  show() {
    this.pointsGroup.visible = true;
  }

  hide() {
    this.pointsGroup.visible = false;
  }

  /**
   * このシーンに関連するすべてのThree.jsオブジェクトを解放する。
   */
  dispose() {
    this.points.geometry.dispose();
    this.points.material.dispose();
    // ★ここから修正点★
    if (this.circleTexture) {
      this.circleTexture.dispose();
    }
    // ★ここまで修正点★
    this.threeScene.remove(this.pointsGroup);
  }
}