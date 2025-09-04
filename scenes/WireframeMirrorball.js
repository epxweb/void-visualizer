// scenes/WireframeMirrorball.js
import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { map } from '../core/utils.js';

/**
 * WireframeMirrorballSceneクラス
 * ワイヤーフレームのミラーボールから直線が放射されるビジュアルシーン。
 */
export class WireframeMirrorballScene {
  /**
   * @param {THREE.Scene} scene - レンダリング対象のメインシーン。
   * @param {object} params - Tweakpaneで操作するパラメータオブジェクト。
   */
  constructor(scene, params) {
    this.threeScene = scene;
    this.params = params;

    this.mirrorballGroup = new THREE.Group();
    this.mirrorball = null;
    this.rays = [];
    this.MAX_RAYS = 50;

    this.init();
  }

  /**
   * シーンの初期化処理。
   */
  init() {
    this.mirrorballGroup.position.y = 4;

    // ミラーボール本体の作成
    const geometry = new THREE.IcosahedronGeometry(2, 1);
    const wireframe = new THREE.WireframeGeometry(geometry);
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(this.params.visual.foregroundColor),
      transparent: true,
      opacity: 0.8
    });
    this.mirrorball = new THREE.LineSegments(wireframe, material);
    this.mirrorballGroup.add(this.mirrorball);

    // 放射状の直線の作成
    const rayMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(this.params.visual.foregroundColor)
    });
    
    const initialRayDirection = new THREE.Vector3(0, -1, 0);

    for (let i = 0; i < this.MAX_RAYS; i++) {
        const rayGeometry = new THREE.BufferGeometry();
        rayGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, -1, 0], 3));
        const ray = new THREE.Line(rayGeometry, rayMaterial);
        
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.acos(Math.random() - 1);
        const targetDirection = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

        ray.position.copy(targetDirection).multiplyScalar(2);

        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(initialRayDirection, targetDirection);
        ray.quaternion.copy(quaternion);

        this.rays.push(ray);
        this.mirrorballGroup.add(ray);
    }


    this.threeScene.add(this.mirrorballGroup);
  }

  /**
   * シーンの更新処理。
   * @param {object} audioData - 解析されたオーディオデータ { bass, mid, treble }。
   */
  update(audioData) {
    const { bass, mid, treble } = audioData;

    // 中域 (Mid): ミラーボール本体の回転速度が変化
    this.mirrorball.rotation.x += map(mid, 0, 1, 0, 0.01);
    this.mirrorball.rotation.y += map(mid, 0, 1, 0.005, 0.02);

    this.rays.forEach(ray => {
        // ★ここから修正点★
        // 低域 (Bass): 放射される直線が一斉に長く、そして明るくなる
        // 最大値を50に増やして、画面外まで伸びるように調整
        const length = map(bass, 0, 1, 5, 50);
        ray.scale.y = length;
        // ★ここまで修正点★

        // 高域 (Treble): 放射される直線の本数や角度がランダムに変化
        // ここでは表示/非表示を切り替える
        ray.visible = Math.random() < map(treble, 0, 1, 0.1, 1.0);
    });

    const brightness = map(bass, 0.7, 1.0, 1.0, 2.0);
    const brightColor = new THREE.Color(this.params.visual.foregroundColor).multiplyScalar(brightness);
    this.rays.forEach(ray => {
        ray.material.color.set(brightColor);
    });

  }

  /**
   * UIから前景色が変更された際に呼び出されるメソッド。
   */
  updateForegroundColor(color) {
    this.mirrorball.material.color.set(color);
    this.rays.forEach(ray => ray.material.color.set(color));
  }

  show() {
    this.mirrorballGroup.visible = true;
  }

  hide() {
    this.mirrorballGroup.visible = false;
  }

  /**
   * このシーンに関連するすべてのThree.jsオブジェクトを解放する。
   */
  dispose() {
    this.mirrorball.geometry.dispose();
    this.mirrorball.material.dispose();
    this.rays.forEach(ray => {
        ray.geometry.dispose();
        ray.material.dispose();
    });
    this.threeScene.remove(this.mirrorballGroup);
  }
}