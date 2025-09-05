// scenes/WarpingGrid.js

import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { map } from '../core/utils.js';

/**
 * WarpingGridSceneクラス
 * 回転しながら拡大・縮小し、交点が明滅するグリッドで構成されるビジュアルシーン。
 */
export class WarpingGridScene {
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
    this.GRID_SIZE = 20;
    this.GRID_DIVISIONS = 20;

    this.gridGroup = new THREE.Group();
    this.grid = null;
    this.points = null;
    
    this.init();
  }

  /**
   * シーンの初期化処理。
   */
  init() {
    // グリッドの作成
    const gridColor = new THREE.Color(this.params.visual.foregroundColor);
    this.grid = new THREE.GridHelper(this.GRID_SIZE, this.GRID_DIVISIONS, gridColor, gridColor);
    this.grid.material.transparent = true;
    this.grid.material.opacity = 0.5; // 少し薄めにしておく
    this.grid.rotation.x = Math.PI / 2; // X軸で90度回転させて正面を向かせる
    this.gridGroup.add(this.grid);

    // 格子の交点に配置する点のジオメトリを作成
    const pointsGeometry = new THREE.BufferGeometry();
    const positions = [];
    const step = this.GRID_SIZE / this.GRID_DIVISIONS;
    const halfSize = this.GRID_SIZE / 2;

    for (let i = 0; i <= this.GRID_DIVISIONS; i++) {
      for (let j = 0; j <= this.GRID_DIVISIONS; j++) {
        const x = i * step - halfSize;
        const y = j * step - halfSize;
        positions.push(x, y, 0);
      }
    }
    pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    // 点のマテリアルとオブジェクトを作成
    const pointsMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(this.params.visual.foregroundColor),
      size: 0.1,
      transparent: true,
      opacity: 0 // 初期状態では非表示
    });
    this.points = new THREE.Points(pointsGeometry, pointsMaterial);
    this.gridGroup.add(this.points);

    this.threeScene.add(this.gridGroup);
  }

  /**
   * シーンの更新処理。
   * @param {object} audioData - 解析されたオーディオデータ { bass, mid, treble }。
   */
  update(audioData) {
    const { bass, mid, treble } = audioData;

    // 低域: グリッド全体が拡大・縮小
    const scale = 1 + map(bass, 0, 1, 0, 1);
    this.gridGroup.scale.set(scale, scale, scale);

    // 中域: グリッドの回転速度が変化
    this.gridGroup.rotation.z += map(mid, 0, 1, 0, 0.02);

    // 高域: 格子の交点がランダムに明滅
    // トレブルが強いほど、点が明るく（不透明に）なる
    if (this.points) {
        this.points.material.opacity = map(treble, 0, 1, 0, 2.0);
        this.points.material.size = map(treble, 0.2, 1, 0.1, 1); // サイズも少し変化させる
    }
  }
  
  /**
   * UIから前景色が変更された際に呼び出されるメソッド。
   * @param {THREE.Color} color - 新しい前景色。
   */
  updateForegroundColor(color) {
    this.grid.material.color.set(color);
    this.points.material.color.set(color);
  }

  show() {
    this.gridGroup.visible = true;
  }

  hide() {
    this.gridGroup.visible = false;
  }

  /**
   * このシーンに関連するすべてのThree.jsオブジェクトを解放する。
   */
  dispose() {
    this.grid.geometry.dispose();
    this.grid.material.dispose();
    this.points.geometry.dispose();
    this.points.material.dispose();
    this.threeScene.remove(this.gridGroup);
  }
}