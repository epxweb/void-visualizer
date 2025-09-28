// scenes/SolarSystem.js
import * as THREE from 'three';
import { map } from '../core/utils.js';

/**
 * SolarSystemSceneクラス
 * 太陽系の惑星のように、中心の恒星の周りを複数のオブジェクトが公転する3Dシーン。
 * [修正] 星々を円形で表現。
 */
export class SolarSystemScene {
  /**
   * @param {THREE.Scene} scene - レンダリング対象のメインシーン。
   * @param {object} params - Tweakpaneで操作するパラメータオブジェクト。
   * @param {THREE.Camera} camera - レンダリングに使用するカメラ。
   */
  constructor(scene, params, camera) {
    this.threeScene = scene;
    this.params = params;
    this.camera = camera;

    this.NUM_PLANETS = 5;
    this.STARFIELD_STARS = 500;

    this.systemGroup = new THREE.Group();
    this.sun = null;
    this.planets = [];
    this.starfield = null;

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

    // 恒星（太陽）の作成
    const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color(this.params.visual.foregroundColor),
        transparent: true,
        opacity: 0.5 
    });
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    this.systemGroup.add(this.sun);

    // 惑星と軌道の作成
    const orbitMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(this.params.visual.foregroundColor), side: THREE.DoubleSide });
    
    for (let i = 0; i < this.NUM_PLANETS; i++) {
      const orbitRadius = 3 + i * 2.5;
      
      const points = [];
      const divisions = 128;
      for (let j = 0; j <= divisions; j++) {
        const angle = (j / divisions) * Math.PI * 2;
        points.push(new THREE.Vector3(
          Math.cos(angle) * orbitRadius,
          0,
          Math.sin(angle) * orbitRadius
        ));
      }
      const orbitPath = new THREE.CatmullRomCurve3(points);
      const orbitGeometry = new THREE.TubeGeometry(orbitPath, 100, 0.01, 8, true);
      const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
      this.systemGroup.add(orbit);
      
      // 惑星
      const planetGeometry = new THREE.SphereGeometry(0.2, 16, 16);
      const planetMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(this.params.visual.foregroundColor) });
      const planet = new THREE.Mesh(planetGeometry, planetMaterial);
      planet.userData = {
          radius: orbitRadius,
          speed: (Math.random() * 0.5 + 0.2) * (i % 2 === 0 ? 1 : -1),
          angle: Math.random() * Math.PI * 2,
      };
      this.planets.push(planet);
      this.systemGroup.add(planet);
    }

    // ★背景の星を円形で表現するためのテクスチャを作成★
    const starCanvas = document.createElement('canvas');
    starCanvas.width = 16;
    starCanvas.height = 16;
    const starContext = starCanvas.getContext('2d');
    starContext.beginPath();
    starContext.arc(8, 8, 8, 0, Math.PI * 2, false);
    starContext.fillStyle = '#fff';
    starContext.fill();
    const starTexture = new THREE.CanvasTexture(starCanvas);

    const starGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    for (let i = 0; i < this.STARFIELD_STARS; i++) {
        starPositions.push(
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 100
        );
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ 
        color: new THREE.Color(this.params.visual.foregroundColor), 
        size: 0.2, 
        transparent: true,
        map: starTexture, // ★作成した円形テクスチャを適用★
        blending: THREE.AdditiveBlending, // 明るい星にする
        depthWrite: false // 奥の星も隠れないように
    });
    this.starfield = new THREE.Points(starGeometry, starMaterial);
    this.systemGroup.add(this.starfield);

    this.threeScene.add(this.systemGroup);
  }

  /**
   * シーンの更新処理。
   * @param {object} audioData - 解析されたオーディオデータ { bass, mid, treble }。
   * @param {number} time - 経過時間。
   */
  update(audioData, time) {
    const { bass, mid, treble } = audioData;

    const sunScale = 1 + map(bass, 0, 1, -0.8, 1.2);
    this.sun.scale.set(sunScale, sunScale, sunScale);

    const speedMultiplier = map(mid, 0, 1, 0.02, 6.0);
    this.planets.forEach(planet => {
        planet.userData.angle += planet.userData.speed * speedMultiplier * 0.01;
        planet.position.x = Math.cos(planet.userData.angle) * planet.userData.radius;
        planet.position.z = Math.sin(planet.userData.angle) * planet.userData.radius;
    });

    this.starfield.material.opacity = map(treble, 0, 1, 0.02, 3.0);

    this.camera.position.x = Math.sin(time * 0.1) * 15;
    this.camera.position.z = Math.cos(time * 0.1) * 15;
    this.camera.position.y = 5 + Math.sin(time * 0.07) * 4;
    this.camera.lookAt(this.systemGroup.position);
  }

  updateForegroundColor(color) {
    const newColor = new THREE.Color(color);
    this.sun.material.color.set(newColor);
    this.systemGroup.children.forEach(child => {
      if (child.isMesh && child.geometry.type === 'TubeGeometry') {
        child.material.color.set(newColor);
      }
    });
    this.planets.forEach(p => p.material.color.set(newColor));
    this.starfield.material.color.set(newColor);
  }

  show() {
    this.systemGroup.visible = true;
  }

  hide() {
    this.camera.position.copy(this.originalCameraPos);
    this.camera.quaternion.copy(this.originalCameraQuaternion);
    this.systemGroup.visible = false;
  }

  dispose() {
    this.camera.position.copy(this.originalCameraPos);
    this.camera.quaternion.copy(this.originalCameraQuaternion);

    // テクスチャもdisposeする
    if (this.starfield && this.starfield.material.map) {
      this.starfield.material.map.dispose();
    }
    
    this.systemGroup.children.forEach(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
    });
    this.threeScene.remove(this.systemGroup);
  }
}