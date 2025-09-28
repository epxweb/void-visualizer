// scenes/ProjectedOrbs.js
import * as THREE from 'three';
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

    const wallGeometry = new THREE.PlaneGeometry(this.WALL_SIZE, this.WALL_SIZE * 2);
    const wallMaterial = new THREE.MeshBasicMaterial({ visible: false });

    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.z = -this.WALL_SIZE / 2;
    backWall.position.y = -this.WALL_SIZE / 2;
    this.walls.push(backWall);
    this.sceneGroup.add(backWall);

    const leftWall = new THREE.Mesh(wallGeometry.clone(), wallMaterial.clone());
    leftWall.position.x = -this.WALL_SIZE / 2;
    leftWall.position.y = -this.WALL_SIZE / 2;
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
    
    const orbGeometry2 = orbGeometry.clone();
    this.orbs2 = new THREE.InstancedMesh(orbGeometry2, this.orbMaterial, this.ORB_COUNT_PER_LAYER);
    this.orbs2.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.ORB_COUNT_PER_LAYER * 3), 3);
    orbGeometry2.setAttribute('instanceColor', this.orbs2.instanceColor);
    this.sceneGroup.add(this.orbs2);

    for (let i = 0; i < this.ORB_COUNT_PER_LAYER; i++) {
      this.emitters1.push({
        phi: Math.acos(1 - 2 * Math.random()),
        theta: Math.random() * Math.PI * 2,
        baseBrightness: Math.random() * 0.15 + 0.4,
      });
      this.emitters2.push({
        phi: Math.acos(1 - 2 * Math.random()),
        theta: Math.random() * Math.PI * 2,
        baseBrightness: Math.random() * 0.01,
      });
    }

    this.threeScene.add(this.sceneGroup);
  }

  // ★ここから修正: `swayOffset`引数を追加
  updateOrbsLayer(orbs, emitters, rotationSpeed, audioData, time, layerScale, layerBrightness, swayOffset) {
    const { bass, treble } = audioData;
    const baseScale = layerScale * (1 + map(bass, 0, 1, 0, 1.5) + this.bassAttackEffect);
    const baseColor = new THREE.Color(this.params.visual.foregroundColor);
    const emitterDirection = new THREE.Vector3();

    // ★ここから修正: 光線の起点となるカメラ位置に揺れを加える
    const rayOrigin = this.camera.position.clone();
    rayOrigin.x += swayOffset;
    // ★ここまで修正

    for (let i = 0; i < this.ORB_COUNT_PER_LAYER; i++) {
      const emitter = emitters[i];
      emitter.theta = (emitter.theta + rotationSpeed) % (Math.PI * 2);
      emitterDirection.setFromSphericalCoords(1, emitter.phi, emitter.theta);
      
      this.raycaster.set(rayOrigin, emitterDirection); // ★修正: 揺れが適用された位置を起点にする
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
        
        const processedTreble = treble;
        const trebleBrightness = map(processedTreble, 0, 1, 0, 2.0);
        const dynamicBrightness = emitter.baseBrightness + trebleBrightness * Math.random();
        const finalBrightness = THREE.MathUtils.clamp(dynamicBrightness, 0.05, 3.0);

        const flickerSpeed = 50;
        const flickerIntensity = 0.4;
        const flickerValue = (Math.sin(time * flickerSpeed + i) + 1) / 2;
        const flickerMultiplier = 1.0 - flickerIntensity + flickerValue * flickerIntensity;

        const highlightColor = new THREE.Color(0xffffff);
        const trebleColorMix = THREE.MathUtils.clamp(processedTreble * 2.0, 0, 1);
        const trebleAppliedColor = baseColor.clone().lerp(highlightColor, trebleColorMix);

        const color = trebleAppliedColor.multiplyScalar(finalBrightness * flickerMultiplier * layerBrightness);
        orbs.setColorAt(i, color);

      } else {
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        orbs.setMatrixAt(i, this.dummy.matrix);
        orbs.setColorAt(i, new THREE.Color(0x000000));
      }
    }
    orbs.instanceMatrix.needsUpdate = true;
    if (orbs.instanceColor) orbs.instanceColor.needsUpdate = true;
  }

  update(audioData, time) {
    const { mid, bassAttack } = audioData;
    if (bassAttack > 0.1) this.bassAttackEffect = 1.0;

    const rotationSpeed1 = map(mid, 0, 1, 0.001, 0.03);
    const rotationSpeed2 = rotationSpeed1 * 0.3; 

    const foregroundScale = 1.2;
    const backgroundScale = 1.0;

    const foregroundBrightness = 1.0;
    const backgroundBrightness = 0.9;

    // ★ここから修正: 各レイヤーの揺れを計算
    // 前景レイヤー：周期が速く、揺れの幅が大きい
    const sway1 = Math.sin(time * 0.2) * 5.0; 
    // 背景レイヤー：周期が遅く、揺れの幅が小さい
    const sway2 = Math.sin(time * 0.1) * 20.0;
    // ★ここまで修正

    this.updateOrbsLayer(this.orbs1, this.emitters1, rotationSpeed1, audioData, time, foregroundScale, foregroundBrightness, sway1);
    this.updateOrbsLayer(this.orbs2, this.emitters2, rotationSpeed2, audioData, time, backgroundScale, backgroundBrightness, sway2);

    this.bassAttackEffect *= 0.90;
  }

  updateForegroundColor(color) {
    if (this.orbMaterial) this.orbMaterial.color.set(color);
  }

  show() {
    this.sceneGroup.visible = true;
    this.camera.position.set(15, 0, 15);
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

    this.camera.position.copy(this.originalCameraPos);
    this.camera.quaternion.copy(this.originalCameraQuaternion);
  }
}
