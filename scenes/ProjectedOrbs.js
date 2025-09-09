// scenes/ProjectedOrbs.js
import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { map } from '../core/utils.js';

/**
 * ProjectedOrbsSceneクラス
 * 壁面に投影された多数の光のスポットが音楽に同期して動くビジュアルシーン。
 */
export class ProjectedOrbsScene {
  constructor(scene, params, camera) {
    this.threeScene = scene;
    this.params = params;
    this.camera = camera;
    this.sceneGroup = new THREE.Group();

    this.ORB_COUNT_PER_LAYER = 150;
    this.WALL_SIZE = 50;

    this.walls = [];
    this.orbs1 = null;
    this.orbs2 = null;
    this.orbMaterial = null;
    this.raycaster = new THREE.Raycaster();
    // --- 修正点: レイヤーごとに独立したemitters配列を用意 ---
    this.emitters1 = [];
    this.emitters2 = [];
    this.dummy = new THREE.Object3D();
    this.bassAttackEffect = 0;

    this.originalCameraPos = new THREE.Vector3();
    this.originalCameraQuaternion = new THREE.Quaternion();

    this.init();
  }

  init() {
    this.originalCameraPos.copy(this.camera.position);
    this.originalCameraQuaternion.copy(this.camera.quaternion);
    this.camera.position.set(15, 0, 15);
    // 注視点を少し下げて、カメラがわずかに下を向くように調整
    this.camera.lookAt(0, -5, 0);

    const wallGeometry = new THREE.PlaneGeometry(this.WALL_SIZE, this.WALL_SIZE);
    const wallMaterial = new THREE.MeshBasicMaterial({ visible: false });

    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.z = -this.WALL_SIZE / 2;
    this.walls.push(backWall);
    this.sceneGroup.add(backWall);

    const leftWall = new THREE.Mesh(wallGeometry.clone(), wallMaterial.clone());
    leftWall.position.x = -this.WALL_SIZE / 2;
    leftWall.rotation.y = Math.PI / 2;
    this.walls.push(leftWall);
    this.sceneGroup.add(leftWall);

    const orbGeometry = new THREE.CircleGeometry(0.5, 16);
    this.orbMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.params.visual.foregroundColor),
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.orbs1 = new THREE.InstancedMesh(orbGeometry, this.orbMaterial, this.ORB_COUNT_PER_LAYER);
    this.orbs1.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.ORB_COUNT_PER_LAYER * 3), 3);
    orbGeometry.setAttribute('instanceColor', this.orbs1.instanceColor);
    this.sceneGroup.add(this.orbs1);
    
    this.orbs2 = new THREE.InstancedMesh(orbGeometry, this.orbMaterial, this.ORB_COUNT_PER_LAYER);
    this.orbs2.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.ORB_COUNT_PER_LAYER * 3), 3);
    this.sceneGroup.add(this.orbs2);

    // エミッターをレイヤーごとに独立した初期位置と明るさで生成
    for (let i = 0; i < this.ORB_COUNT_PER_LAYER; i++) {
      // レイヤー1のエミッター (前景: わずかに見える程度)
      this.emitters1.push({
        phi: Math.acos(1 - 2 * Math.random()),
        theta: Math.random() * Math.PI * 2,
        baseBrightness: Math.random() * 0.15 + 0.4,
      });
      // レイヤー2のエミッター (背景: ほとんど見えない程度)
      this.emitters2.push({
        phi: Math.acos(1 - 2 * Math.random()),
        theta: Math.random() * Math.PI * 2,
        baseBrightness: Math.random() * 0.01,
      });
    }

    this.threeScene.add(this.sceneGroup);
  }

  // --- 修正点: emitters引数を追加 ---
  updateOrbsLayer(orbs, emitters, rotationSpeed, audioData, time, layerScale) {
    const { bass, treble } = audioData;
    const baseScale = layerScale * (1 + map(bass, 0, 1, 0, 1.5) + this.bassAttackEffect);
    const baseColor = new THREE.Color(this.params.visual.foregroundColor);
    const emitterDirection = new THREE.Vector3();

    for (let i = 0; i < this.ORB_COUNT_PER_LAYER; i++) {
      const emitter = emitters[i];
      emitter.theta = (emitter.theta + rotationSpeed) % (Math.PI * 2);
      emitterDirection.setFromSphericalCoords(1, emitter.phi, emitter.theta);
      
      this.raycaster.set(this.camera.position, emitterDirection);
      const intersects = this.raycaster.intersectObjects(this.walls);

      if (intersects.length > 0) {
        const intersect = intersects[0];
        const normal = intersect.face.normal.clone().applyQuaternion(intersect.object.quaternion);
        const cosAngle = Math.abs(this.raycaster.ray.direction.dot(normal));
        const stretch = THREE.MathUtils.clamp(1 / cosAngle, 1, 5);

        this.dummy.position.copy(intersect.point);
        this.dummy.lookAt(intersect.point.clone().add(normal));
        this.dummy.scale.set(baseScale, baseScale * stretch, baseScale);
        this.dummy.updateMatrix();
        orbs.setMatrixAt(i, this.dummy.matrix);
        
        // 高音域(treble)を2乗して弱い入力への反応を抑え、強い入力にシャープに反応させる
        const processedTreble = Math.pow(treble, 2);
        // 増幅した高音域を、きらめきの明るさとして使用
        const trebleBrightness = map(processedTreble, 0, 1, 0, 5.0);
        // 基本の明るさに、高音域のきらめきとランダム性を加算
        const dynamicBrightness = emitter.baseBrightness + trebleBrightness * Math.random();
        const finalBrightness = THREE.MathUtils.clamp(dynamicBrightness, 0.05, 3.0);

        // --- またたき効果 ---
        // 各オーブが固有のタイミングでまたたくように、インデックス `i` をオフセットに利用
        const flickerSpeed = 50; // またたきの速さ
        const flickerIntensity = 0.4; // またたきの強さ (0.0 -> またたかない, 1.0 -> 完全に消える)
        // sin波を使って 0.0 ~ 1.0 の範囲で揺らぎを生成
        const flickerValue = (Math.sin(time * flickerSpeed + i) + 1) / 2;
        // 揺らぎを適用するための係数を計算 (1.0-intensity ~ 1.0 の範囲)
        const flickerMultiplier = 1.0 - flickerIntensity + flickerValue * flickerIntensity;

        // --- trebleによる色の変化 ---
        const highlightColor = new THREE.Color(0xffffff); // 白く光る
        // trebleが強いほど白に近づける
        const trebleColorMix = THREE.MathUtils.clamp(processedTreble * 2.0, 0, 1);
        const trebleAppliedColor = baseColor.clone().lerp(highlightColor, trebleColorMix);

        // 最終的な色を計算 (trebleで変化した色に、明るさとまたたきを適用)
        const color = trebleAppliedColor.multiplyScalar(finalBrightness * flickerMultiplier);
        orbs.setColorAt(i, color);

      } else {
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        orbs.setMatrixAt(i, this.dummy.matrix);
      }
    }
    orbs.instanceMatrix.needsUpdate = true;
    if (orbs.instanceColor) orbs.instanceColor.needsUpdate = true;
  }

  update(audioData, time) {
    const { mid, bassAttack } = audioData;
    if (bassAttack > 0.1) this.bassAttackEffect = 1.0;

    const rotationSpeed1 = map(mid, 0, 1, 0.001, 0.02);
    // 背景レイヤーの速度を前景の30%に設定し、速度差を明確にする
    const rotationSpeed2 = rotationSpeed1 * 0.3; 

    // レイヤーごとのスケールを設定 (前景を1.2倍に)
    const foregroundScale = 1.2;
    const backgroundScale = 1.0;

    this.updateOrbsLayer(this.orbs1, this.emitters1, rotationSpeed1, audioData, time, foregroundScale);
    this.updateOrbsLayer(this.orbs2, this.emitters2, rotationSpeed2, audioData, time, backgroundScale);

    this.bassAttackEffect *= 0.90;
  }

  updateForegroundColor(color) {
    if (this.orbMaterial) this.orbMaterial.color.set(color);
  }

  show() {
    this.sceneGroup.visible = true;
    this.camera.position.set(15, 0, 15);
    // 注視点を少し下げて、カメラがわずかに下を向くように調整
    this.camera.lookAt(0, -5, 0);
  }

  hide() {
    this.sceneGroup.visible = false;
    this.camera.position.copy(this.originalCameraPos);
    this.camera.quaternion.copy(this.originalCameraQuaternion);
  }

  dispose() {
    if (this.orbs1) {
      if (this.orbs1.geometry) this.orbs1.geometry.dispose();
      if (this.orbs1.material) this.orbs1.material.dispose();
    }
    
    this.walls.forEach(wall => {
      if (wall.geometry) wall.geometry.dispose();
      if (wall.material) wall.material.dispose();
    });

    this.threeScene.remove(this.sceneGroup);

    // カメラの位置と向きを元の状態に戻す
    this.camera.position.copy(this.originalCameraPos);
    this.camera.quaternion.copy(this.originalCameraQuaternion);
  }
}