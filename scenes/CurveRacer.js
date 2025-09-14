// scenes/CurveRacer.js
import * as THREE from 'three';
import { map } from '../core/utils.js';

/**
 * CurveRacerSceneクラス
 * 閉じた曲線上を光る円が滑走するビジュアルシーン。
 */
export class CurveRacerScene {
  /**
   * @param {THREE.Scene} scene - レンダリング対象のメインシーン。
   * @param {object} params - Tweakpaneで操作するパラメータオブジェクト。
   */
  constructor(scene, params) {
    this.threeScene = scene;
    this.params = params;

    this.racerGroup = new THREE.Group();
    this.curve = null;
    this.courseLine = null;
    this.racer = null;
    this.progress = 0;

    this.init();
  }

  /**
   * シーンの初期化処理。
   */
  init() {
    // ★ここから修正点★
    // コースの生成（より滑らかな無限ループの形状）
    this.curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),      // 中心の交差点
      new THREE.Vector3(-5, 4, 0),    // 左上のカーブの制御点
      new THREE.Vector3(-7, 0, 0),      // 左端
      new THREE.Vector3(-5, -4, 0),   // 左下のカーブの制御点
      new THREE.Vector3(0, 0, 0),       // 中心の交差点
      new THREE.Vector3(5, 4, 0),     // 右上のカーブの制御点
      new THREE.Vector3(7, 0, 0),       // 右端
      new THREE.Vector3(5, -4, 0)     // 右下のカーブの制御点
    ], true, 'catmullrom', 0.5); // trueで曲線を閉じる
    // ★ここまで修正点★

    const points = this.curve.getPoints(200);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: new THREE.Color(this.params.visual.foregroundColor), transparent: true, opacity: 0.5 });
    this.courseLine = new THREE.Line(geometry, material);
    this.racerGroup.add(this.courseLine);
    
    // 歪み計算用に元の頂点情報を保持
    this.courseLine.userData.basePositions = this.courseLine.geometry.attributes.position.clone();

    // 光る円（レーサー）の生成
    const racerGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const racerMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(this.params.visual.foregroundColor) });
    this.racer = new THREE.Mesh(racerGeometry, racerMaterial);
    this.racerGroup.add(this.racer);

    this.threeScene.add(this.racerGroup);
  }

  /**
   * シーンの更新処理。
   * @param {object} audioData - 解析されたオーディオデータ { bass, mid, treble }。
   */
  update(audioData) {
    const { bass, mid, treble } = audioData;

    // 中域 (Mid): 円がコースを滑走する速度が変化
    this.progress += map(mid, 0, 1, 0.001, 0.01);
    if (this.progress > 1) {
      this.progress -= 1;
    }
    const newPosition = this.curve.getPointAt(this.progress);
    this.racer.position.copy(newPosition);
    
    // 低域 (Bass): 滑走する円のサイズや輝度が変化
    const scale = 1 + map(bass, 0, 1, 0, 2.5);
    this.racer.scale.set(scale, scale, scale);

    // 高域 (Treble): コース自体の形状が、ノイズによって細かく歪む
    const positions = this.courseLine.geometry.attributes.position.array;
    const basePositions = this.courseLine.userData.basePositions.array;
    const noiseAmount = map(treble, 0.3, 1, 0, 0.5);

    if (noiseAmount > 0) {
        for (let i = 0; i < positions.length; i += 3) {
            const noiseX = (Math.random() - 0.5) * noiseAmount;
            const noiseY = (Math.random() - 0.5) * noiseAmount;
            positions[i] = basePositions[i] + noiseX;
            positions[i + 1] = basePositions[i + 1] + noiseY;
        }
        this.courseLine.geometry.attributes.position.needsUpdate = true;
    }
  }

  /**
   * UIから前景色が変更された際に呼び出されるメソッド。
   */
  updateForegroundColor(color) {
    this.courseLine.material.color.set(color);
    this.racer.material.color.set(color);
  }

  show() {
    this.racerGroup.visible = true;
  }

  hide() {
    this.racerGroup.visible = false;
  }

  /**
   * このシーンに関連するすべてのThree.jsオブジェクトを解放する。
   */
  dispose() {
    this.courseLine.geometry.dispose();
    this.courseLine.material.dispose();
    this.racer.geometry.dispose();
    this.racer.material.dispose();
    this.threeScene.remove(this.racerGroup);
  }
}