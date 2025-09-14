import * as THREE from 'three';
import { map } from '../core/utils.js';

/**
 * HeavyRainSceneクラス
 * 地面に叩きつける雨と、それによって生まれる波紋を表現するビジュアルシーン。
 */
export class HeavyRainScene {
  /**
   * @param {THREE.Scene} scene - レンダリング対象のメインシーン。
   * @param {object} params - Tweakpaneで操作するパラメータオブジェクト。
   * @param {THREE.Camera} camera - レンダリングに使用するカメラ。
   */
  constructor(scene, params, camera) {
    this.threeScene = scene;
    this.params = params;
    this.camera = camera;

    // --- シーン固有の定数 ---
    // オブジェクトプール
    this.RAIN_COUNT = 200;
    this.RIPPLE_COUNT = 50;
    // 雨の見た目に関する設定
    this.RAIN_DEFAULT_OPACITY = 0.5;
    this.RAIN_FLASH_OPACITY = 0.9;
    this.RAIN_FLASH_THRESHOLD = 0.15; // このtrebleAttack値以上でフラッシュ
    this.RAIN_FLASH_CHANCE = 0.4;     // フラッシュする雨の割合
    // 波紋の見た目に関する設定
    this.RIPPLE_SPAWN_THRESHOLD = 0.08; // このbassAttack値以上で波紋が発生

    this.sceneGroup = new THREE.Group();
    this.rainPool = [];
    this.ripplePool = [];
    this.activeRain = [];
    this.activeRipples = [];

    this.originalCameraPos = new THREE.Vector3();
    this.originalCameraQuaternion = new THREE.Quaternion();

    this.init();
  }

  /**
   * シーンの初期化処理。
   */
  init() {
    this.originalCameraPos.copy(this.camera.position);
    this.originalCameraQuaternion.copy(this.camera.quaternion);

    const rainMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(this.params.visual.foregroundColor),
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: this.RAIN_DEFAULT_OPACITY
    });
    for (let i = 0; i < this.RAIN_COUNT; i++) {
      const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -2)]);
      const line = new THREE.Line(geometry, rainMaterial.clone());
      line.visible = false;
      this.rainPool.push(line);
      this.sceneGroup.add(line);
    }

    const rippleMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(this.params.visual.foregroundColor),
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    for (let i = 0; i < this.RIPPLE_COUNT; i++) {
        const points = [];
        for (let j = 0; j <= 32; j++) {
            const angle = (j / 32) * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const ripple = new THREE.LineLoop(geometry, rippleMaterial.clone());
        ripple.visible = false;
        this.ripplePool.push(ripple);
        this.sceneGroup.add(ripple);
    }

    this.threeScene.add(this.sceneGroup);
  }

  /**
   * シーンの更新処理。
   */
  update(audioData) {
    const { bass, mid, treble, bassAttack, trebleAttack } = audioData;
    const foregroundColor = new THREE.Color(this.params.visual.foregroundColor);

    // --- 雨の生成と更新 (Trebleに連動) ---
    const baseRainCount = 2; 
    const rainSpawnCount = baseRainCount + Math.floor((treble + trebleAttack) * 50);

    for (let i = 0; i < rainSpawnCount; i++) {
        const rain = this.rainPool.pop();
        if (!rain) break;

        const radius = Math.random() * 15 + 3;
        const angle = Math.random() * Math.PI * 2;
        rain.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 10);
        rain.scale.z = 1 + treble * 5;
        rain.lookAt(new THREE.Vector3((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, 0));
        rain.visible = true;
        rain.userData = { speed: map(mid, 0, 1, 0.2, 0.8) + Math.random() * 0.2 };
        
        if (trebleAttack > this.RAIN_FLASH_THRESHOLD) {
          if (Math.random() < this.RAIN_FLASH_CHANCE) { 
            rain.material.color.set(0xffffff);
          } else {
            rain.material.color.set(foregroundColor);
          }
          rain.material.opacity = this.RAIN_FLASH_OPACITY;
        } else {
          rain.material.color.set(foregroundColor);
          rain.material.opacity = this.RAIN_DEFAULT_OPACITY;
        }
        this.activeRain.push(rain);
    }

    // アクティブな雨の更新
    for (let i = this.activeRain.length - 1; i >= 0; i--) {
        const rain = this.activeRain[i];
        rain.position.z -= rain.userData.speed;
        
        if (rain.material.opacity > this.RAIN_DEFAULT_OPACITY) {
          rain.material.opacity -= 0.05;
          rain.material.color.lerp(foregroundColor, 0.1);
        }

        if (rain.position.z < 0) {
            rain.visible = false;
            this.rainPool.push(rain);
            this.activeRain.splice(i, 1);
        }
    }

    // --- 波紋の生成と更新 (Bassに連動) ---
    if (bassAttack > this.RIPPLE_SPAWN_THRESHOLD || bass > 0.5) {
      const rippleSpawnCount = 1 + Math.floor(bass * 10);
      for (let j = 0; j < rippleSpawnCount; j++) {
        const ripple = this.ripplePool.pop();
        if (ripple) {
          ripple.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, 0);
          ripple.scale.set(0.5, 0.5, 0.5);
          ripple.material.opacity = map(bass, 0, 1, 0.7, 1.0);
          ripple.visible = true;
          ripple.userData = { life: 1.0, speed: map(mid, 0, 1, 1.02, 1.05) };
          this.activeRipples.push(ripple);
        }
      }
    }

    // アクティブな波紋の更新
    for (let i = this.activeRipples.length - 1; i >= 0; i--) {
        const ripple = this.activeRipples[i];
        ripple.userData.life -= 0.04;
        ripple.scale.multiplyScalar(ripple.userData.speed);
        ripple.material.opacity = ripple.userData.life;
        if (ripple.userData.life <= 0) {
            ripple.visible = false;
            this.ripplePool.push(ripple);
            this.activeRipples.splice(i, 1);
        }
    }
  }

  /**
   * UIから前景色が変更された際に呼び出されるメソッド。
   */
  updateForegroundColor(color) {
    const newColor = new THREE.Color(color);
    this.sceneGroup.children.forEach(child => {
      if (child.material) {
        child.material.color.set(newColor);
      }
    });
  }

  /**
   * このシーンを表示状態にする。
   */
  show() {
    this.sceneGroup.visible = true;
    this.camera.position.set(0, 0, 5);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * このシーンを非表示状態にする。
   */
  hide() {
    this.sceneGroup.visible = false;
    this.camera.position.copy(this.originalCameraPos);
    this.camera.quaternion.copy(this.originalCameraQuaternion);
  }

  /**
   * このシーンに関連するすべてのThree.jsオブジェクトを解放する。
   */
  dispose() {
    this.camera.position.copy(this.originalCameraPos);
    this.camera.quaternion.copy(this.originalCameraQuaternion);

    this.sceneGroup.children.forEach(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    
    this.threeScene.remove(this.sceneGroup);
  }
}