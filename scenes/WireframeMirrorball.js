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
   * @param {THREE.Camera} camera - レンダリングに使用するカメラ。
   */
  constructor(scene, params, camera) {
    this.threeScene = scene;
    this.params = params;
    this.camera = camera;
    this.originalFar = camera.far;

    this.mirrorballGroup = new THREE.Group();
    this.mirrorball = null;
    this.mirrorballWireframe = null;
    this.rays = [];
    this.MAX_RAYS = 50;
    this.raysGroup = new THREE.Group();

    this.init();
  }

  /**
   * シーンの初期化処理。
   */
  init() {
    this.mirrorballGroup.position.y = 4;

    // ミラーボール本体の作成
    const geometry = new THREE.IcosahedronGeometry(2, 1);
    const materials = [];
    const faceCount = geometry.attributes.position.count / 3;
    this.panelStates = [];

    for (let i = 0; i < faceCount; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(this.params.visual.foregroundColor),
        emissive: new THREE.Color(0x000000),
        metalness: 0.8,
        roughness: 0.2,
      });
      materials.push(material);
      geometry.addGroup(i * 3, 3, i);
      this.panelStates.push({ intensity: 0 });
    }

    this.mirrorball = new THREE.Mesh(geometry, materials);
    this.mirrorballGroup.add(this.mirrorball);

    // ワイヤーフレームの追加
    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(this.params.visual.foregroundColor).multiplyScalar(1.2),
      transparent: true,
      opacity: 0.8
    });
    this.mirrorballWireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
    this.mirrorballWireframe.scale.set(1.001, 1.001, 1.001); // Z-fighting対策
    this.mirrorballGroup.add(this.mirrorballWireframe);

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
        this.raysGroup.add(ray);
    }

    this.mirrorballGroup.add(this.raysGroup);
    this.threeScene.add(this.mirrorballGroup);
  }

  /**
   * シーンの更新処理。
   * @param {object} audioData - 解析されたオーディオデータ { bass, mid, treble }。
   */
  update(audioData) {
    const { bass, mid, treble, bassAttack, trebleAttack } = audioData;

    // 中域 (Mid): ミラーボール本体の回転速度が変化
    this.mirrorball.rotation.x += map(mid, 0, 1, 0, 0.01);
    this.mirrorball.rotation.y += map(mid, 0, 1, 0.005, 0.02);
    this.mirrorballWireframe.rotation.copy(this.mirrorball.rotation);

    // 放射状の直線グループをミラーボールの回転と同期させる
    this.raysGroup.rotation.copy(this.mirrorball.rotation);

    // --- パネルの発光処理 ---
    const attack = Math.max(bassAttack, trebleAttack);
    if (attack > 0.15) {
      const flashCount = Math.floor(this.panelStates.length * 0.3);
      for (let i = 0; i < flashCount; i++) {
        const randomIndex = Math.floor(Math.random() * this.panelStates.length);
        this.panelStates[randomIndex].intensity = 1.2; // 少し強めに光らせる
      }
    }

    const baseColor = new THREE.Color(this.params.visual.foregroundColor);
    this.panelStates.forEach((state, index) => {
      if (state.intensity > 0) {
        const emissiveColor = baseColor.clone().multiplyScalar(state.intensity);
        this.mirrorball.material[index].emissive.set(emissiveColor);
        
        state.intensity *= 0.92; // 減衰
        if (state.intensity < 0.01) {
          state.intensity = 0;
          this.mirrorball.material[index].emissive.set(0x000000);
        }
      }
    });
    // --- ここまでパネルの発光処理 ---

    this.rays.forEach(ray => {
        // 低域 (Bass): 放射される直線が一斉に長く、そして明るくなる
        const length = map(bass, 0, 1, 5, 50);
        ray.scale.y = length;

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
    this.mirrorball.material.forEach(material => material.color.set(color));
    if (this.mirrorballWireframe) {
      this.mirrorballWireframe.material.color.set(new THREE.Color(color).multiplyScalar(1.2));
    }
    this.rays.forEach(ray => ray.material.color.set(color));
  }

  show() {
    this.mirrorballGroup.visible = true;
    this.camera.far = 1000;
    this.camera.updateProjectionMatrix();
  }

  hide() {
    this.mirrorballGroup.visible = false;
    this.camera.far = this.originalFar;
    this.camera.updateProjectionMatrix();
  }

  /**
   * このシーンに関連するすべてのThree.jsオブジェクトを解放する。
   */
  dispose() {
    // メッシュの解放
    this.mirrorball.geometry.dispose();
    this.mirrorball.material.forEach(material => material.dispose());
    
    // ワイヤーフレームの解放
    if (this.mirrorballWireframe) {
      this.mirrorballWireframe.geometry.dispose();
      this.mirrorballWireframe.material.dispose();
    }

    // 光線の解放
    this.rays.forEach(ray => {
        ray.geometry.dispose();
        ray.material.dispose();
    });

    this.threeScene.remove(this.mirrorballGroup);

    // カメラの設定を元に戻す
    this.camera.far = this.originalFar;
    this.camera.updateProjectionMatrix();
  }
}
