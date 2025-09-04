// scenes/ArticulatedArm.js
import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { map } from '../core/utils.js';

/**
 * ArticulatedArmSceneクラス
 * ロボットアームのような多関節構造が動くメカニカルなビジュアルシーン。
 */
export class ArticulatedArmScene {
  /**
   * @param {THREE.Scene} scene - レンダリング対象のメインシーン。
   * @param {object} params - Tweakpaneで操作するパラメータオブジェクト。
   */
  constructor(scene, params) {
    this.threeScene = scene;
    this.params = params;

    this.armGroup = new THREE.Group();
    this.joints = [];
    this.NUM_JOINTS = 4;

    this.init();
  }

  /**
   * シーンの初期化処理。
   */
  init() {
    const material = new THREE.LineBasicMaterial({ color: new THREE.Color(this.params.visual.foregroundColor) });

    let parent = this.armGroup;

    for (let i = 0; i < this.NUM_JOINTS; i++) {
      const armLength = 2.5 - i * 0.4;
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, armLength, 0)
      ]);
      const armSegment = new THREE.Line(geometry, material);

      const joint = new THREE.Group();
      joint.add(armSegment);
      joint.position.y = i === 0 ? 0 : this.joints[i - 1].children[0].geometry.attributes.position.array[4];

      this.joints.push(joint);
      parent.add(joint);
      parent = joint;
    }

    this.threeScene.add(this.armGroup);
  }

  /**
   * シーンの更新処理。
   * @param {object} audioData - 解析されたオーディオデータ { bass, mid, treble }。
   * @param {number} time - 経過時間。
   */
  update(audioData, time) {
    const { bass, mid, treble } = audioData;

    // 中域 (Mid): アームの根本部分の全体的な回転速度が変化
    this.armGroup.rotation.z += map(mid, 0, 1, 0, 0.01);

    this.joints.forEach((joint, i) => {
        // 低域 (Bass): ビートに合わせて関節がリズミカルに動く
        const rotationAmount = Math.sin(time * 2 + i) * map(bass, 0, 1, 0, 0.8);
        joint.rotation.z = rotationAmount;
    });

    // 高域 (Treble): アームの先端部分が細かく震える
    const tip = this.joints[this.NUM_JOINTS - 1];
    const shakeAmount = map(treble, 0.6, 1, 0, 0.1);
    if (shakeAmount > 0) {
        tip.position.x = (Math.random() - 0.5) * shakeAmount;
        tip.position.y = this.joints[this.NUM_JOINTS - 2].children[0].geometry.attributes.position.array[4] + (Math.random() - 0.5) * shakeAmount;
    }
  }

  /**
   * UIから前景色が変更された際に呼び出されるメソッド。
   */
  updateForegroundColor(color) {
    // 全てのセグメントでマテリアルを共有しているので、一つだけ変更すればOK
    if (this.joints.length > 0 && this.joints[0].children.length > 0) {
        this.joints[0].children[0].material.color.set(color);
    }
  }

  show() {
    this.armGroup.visible = true;
  }

  hide() {
    this.armGroup.visible = false;
  }

  /**
   * このシーンに関連するすべてのThree.jsオブジェクトを解放する。
   */
  dispose() {
    const firstSegmentMaterial = this.joints.length > 0 ? this.joints[0].children[0].material : null;
    
    this.joints.forEach(joint => {
      joint.children.forEach(segment => {
        segment.geometry.dispose();
      });
    });
    
    if(firstSegmentMaterial) {
        firstSegmentMaterial.dispose();
    }

    this.threeScene.remove(this.armGroup);
  }
}