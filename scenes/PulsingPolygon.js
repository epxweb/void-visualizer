import * as THREE from 'three';
import { map } from '../core/utils.js';

/**
 * PulsingPolygonSceneクラス
 * 画面中央で脈動・回転する多角形で構成されるビジュアルシーン。
 * [改善点]
 * - 複数のポリゴンを重ねて線の太さを表現。
 * - Bassのアタックを検知して、残響のように広がるエコーエフェクトを追加。
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
    this.MAIN_POLYGON_COUNT = 3; // メインポリゴンの数
    this.ECHO_POOL_SIZE = 10; // 生成するエコーの最大数

    this.polygonGroup = new THREE.Group();
    this.mainPolygons = [];
    this.echoPool = [];
    this.activeEchos = [];

    this.init();
  }

  /**
   * シーンの初期化処理。
   */
  init() {
    // メインポリゴンの作成
    for (let i = 0; i < this.MAIN_POLYGON_COUNT; i++) {
      const geometry = this.createPolygonGeometry();
      // 内側のポリゴンほど少し透明にする
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(this.params.visual.foregroundColor),
        transparent: true,
        opacity: 1.0 - i * 0.4
      });
      const polygon = new THREE.LineLoop(geometry, material);
      this.mainPolygons.push(polygon);
      this.polygonGroup.add(polygon);
    }

    // エコー用ポリゴンのオブジェクトプールを作成
    for (let i = 0; i < this.ECHO_POOL_SIZE; i++) {
        const geometry = this.createPolygonGeometry();
        const material = new THREE.LineBasicMaterial({
            color: new THREE.Color(this.params.visual.foregroundColor),
            transparent: true,
            opacity: 0
        });
        const echo = new THREE.LineLoop(geometry, material);
        echo.visible = false;
        this.echoPool.push(echo);
        this.polygonGroup.add(echo); // 最初からGroupに入れておく
    }

    this.threeScene.add(this.polygonGroup);
  }

  /**
   * ポリゴンのジオメトリを生成するヘルパー関数。
   */
  createPolygonGeometry() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array((this.POLYGON_SIDES + 1) * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }

  /**
   * シーンの更新処理。
   * @param {object} audioData - 解析されたオーディオデータ { bass, mid, treble }。
   */
  update(audioData) {
    const { bass, mid, treble, bassAttack } = audioData;

    // グループ全体を回転
    this.polygonGroup.rotation.z += map(mid, 0, 1, 0, 0.05);

    // メインポリゴンのアニメーション
    const baseScale = 1 + map(bass, 0, 1, 0, 1.5);
    this.mainPolygons.forEach((polygon, i) => {
        // 外側のポリゴンほど少し大きくして線を太く見せる
        polygon.scale.set(baseScale * (1 + i * 0.05), baseScale * (1 + i * 0.05), 1);
        this.updatePolygonVertices(polygon, treble);
    });

    // Bassのアタックを検知してエコーをトリガー
    if (bassAttack > 0.05) { // 0.15 is a threshold, can be adjusted
        this.triggerEcho();
    }

    // アクティブなエコーのアニメーション
    this.updateEchos();
  }

  /**
   * ポリゴンの頂点座標を更新する。
   * @param {THREE.LineLoop} polygon - 対象のポリゴン。
   * @param {number} treble - 高域のオーディオデータ。
   */
  updatePolygonVertices(polygon, treble) {
    const positions = polygon.geometry.attributes.position.array;
    const baseRadius = 3;
    const spikeAmount = map(treble, 0, 1, 0, 2);

    for (let i = 0; i <= this.POLYGON_SIDES; i++) {
      const angle = (i / this.POLYGON_SIDES) * Math.PI * 2;
      let r = baseRadius;
      // 偶数番目の頂点を歪ませる
      if (i % 2 === 0) {
        r += spikeAmount;
      }
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = Math.sin(angle) * r;
    }
    polygon.geometry.attributes.position.needsUpdate = true;
  }
  
  /**
   * エコーを発生させる。
   */
  triggerEcho() {
    // プールから利用可能なエコーを取得
    const echo = this.echoPool.pop();
    if (!echo) return; // プールが空なら何もしない

    // 現在のメインポリゴンの状態をコピー
    const sourcePolygon = this.mainPolygons[0];
    echo.geometry.copy(sourcePolygon.geometry);
    echo.scale.copy(sourcePolygon.scale);
    echo.rotation.copy(this.polygonGroup.rotation);
    
    // アニメーション用の初期値を設定
    echo.material.opacity = 0.3;
    echo.visible = true;
    echo.userData.life = 1.0; // 残り寿命

    this.activeEchos.push(echo);
  }

  /**
   * アクティブなエコーの状態を更新する。
   */
  updateEchos() {
    for (let i = this.activeEchos.length - 1; i >= 0; i--) {
        const echo = this.activeEchos[i];
        
        // 拡大とフェードアウト
        echo.userData.life -= 0.02; // 消えるまでの速さ
        echo.scale.multiplyScalar(1.02); // 広がる速さ
        echo.material.opacity = 0.7 * echo.userData.life;

        // 寿命が尽きたらプールに戻す
        if (echo.userData.life <= 0) {
            echo.visible = false;
            this.activeEchos.splice(i, 1);
            this.echoPool.push(echo);
        }
    }
  }

  /**
   * UIから前景色が変更された際に呼び出されるメソッド。
   */
  updateForegroundColor(color) {
    this.polygonGroup.children.forEach(child => {
        child.material.color.set(color);
    });
  }

  show() {
    this.polygonGroup.visible = true;
  }

  hide() {
    this.polygonGroup.visible = false;
  }

  /**
   * このシーンに関連するすべてのThree.jsオブジェクトを解放する。
   */
  dispose() {
    this.polygonGroup.children.forEach(child => {
      child.geometry.dispose();
      child.material.dispose();
    });
    this.threeScene.remove(this.polygonGroup);
  }
}