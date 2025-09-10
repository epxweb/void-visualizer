import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { map } from '../core/utils.js';

/**
 * ReactiveSmokeSceneクラス
 * シェーダーを用いて生成される、ノイズで構成された煙のような不定形なビジュアル。
 */
export class ReactiveSmokeScene {
    /**
     * @param {THREE.Scene} scene - レンダリング対象のメインシーン。
     * @param {object} params - Tweakpaneで操作するパラメータオブジェクト。
     * @param {THREE.Camera} camera - レンダリングに使用するカメラ。
     */
    constructor(scene, params, camera) {
        this.threeScene = scene;
        this.params = params;
        this.camera = camera;

        this.smokeGroup = new THREE.Group();
        this.shaderMaterial = null;
        this.plane = null;

        // アタックエフェクトの強度を保持するプロパティ
        this.bassAttackEffect = 0;
        this.trebleAttackEffect = 0;

        this.init();
    }

    /**
     * シーンの初期化処理。
     */
    init() {
        const geometry = new THREE.PlaneGeometry(2, 2); // 画面全体を覆うプレーン

        this.shaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_time: { value: 0.0 },
                u_bass: { value: 0.0 },
                u_mid: { value: 0.0 },
                u_treble: { value: 0.0 },
                u_bass_attack: { value: 0.0 },
                u_treble_attack: { value: 0.0 },
                u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                u_color: { value: new THREE.Color(this.params.visual.foregroundColor) },
            },
            vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
            fragmentShader: `
        uniform vec2 u_resolution;
        uniform float u_time;
        uniform float u_bass;
        uniform float u_mid;
        uniform float u_treble;
        uniform float u_bass_attack;
        uniform float u_treble_attack;
        uniform vec3 u_color;
        varying vec2 vUv;

        // 2D Random
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        // 2D Noise
        float noise(vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
        }

        // Fractal Brownian Motion
        float fbm(vec2 st) {
            float value = 0.0;
            float amplitude = .5;
            float frequency = 0.;
            for (int i = 0; i < 6; i++) {
                value += amplitude * noise(st);
                st *= 2.;
                amplitude *= .5;
            }
            return value;
        }

        void main() {
          vec2 st = (vUv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
          st *= 3.0;

          // カメラワーク風の移動を追加
          st.x += u_time * 0.08; // 横方向にゆっくり移動
          st.y += u_time * 0.03; // 縦方向にさらにゆっくり移動

          vec2 flow_direction = vec2(cos(u_time * 0.03), sin(u_time * 0.03)); // ゆっくり回転する方向ベクトル
          float flow_noise = fbm(st * 0.1 + flow_direction); // 非常に低周波（スケールが小さい）のノイズ
          st += flow_noise * 2.2; // 計算した風で座標全体を歪ませる

          float time_factor = u_time * (0.3 + u_mid * 0.5);
          float bass_factor = 1.0 + u_bass * 2.0;
          
          vec2 q = vec2(0.);
          // time_factor に加え、u_time を直接加算して常に動く要素を追加
          q.x = fbm(st + u_time * 0.01);
          q.y = fbm(st + vec2(1.0));

          vec2 r = vec2(0.);
          // time_factor に係数を掛けて、動きの移動量を調整
          r.x = fbm(st + q + time_factor * 0.5); 
          r.y = fbm(st + q + vec2(1.0));

          float treble_factor = 1.0 + u_treble * 3.0;
          float f = fbm((st + r * bass_factor) * treble_factor);
          
          // 煙を増やす:数値を両方とも小さく／煙を減らす:両方とも大きく／煙の輪郭をシャープに:数値の間隔を狭く／煙の輪郭をぼんやり:数値の間隔を広く
          float smoke_color = smoothstep(0.2, 0.7, f);
          smoke_color += u_treble_attack * (random(st) - 0.5) * 0.3;

          float final_alpha = smoke_color * (0.3 + u_bass * 0.3) + u_bass_attack * 0.25;
          
          gl_FragColor = vec4(u_color * final_alpha, final_alpha);
        }
      `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.plane = new THREE.Mesh(geometry, this.shaderMaterial);
        this.smokeGroup.add(this.plane);
        this.threeScene.add(this.smokeGroup);
    }

    /**
     * シーンの更新処理。
     * @param {object} audioData - 解析されたオーディオデータ
     * @param {number} time - 経過時間
     */
    update(audioData, time) {
        const { bass, mid, treble, bassAttack, trebleAttack } = audioData;

        // アタックを検出したらエフェクト値を加算・更新（最大値を設定）
        if (bassAttack > 0.1) this.bassAttackEffect = Math.min(1.0, this.bassAttackEffect + bassAttack * 2.0);
        if (trebleAttack > 0.1) this.trebleAttackEffect = Math.min(1.0, this.trebleAttackEffect + trebleAttack * 2.0);

        // シェーダーのuniform変数に値を渡す
        this.shaderMaterial.uniforms.u_time.value = time;
        this.shaderMaterial.uniforms.u_bass.value = bass;
        this.shaderMaterial.uniforms.u_mid.value = mid;
        this.shaderMaterial.uniforms.u_treble.value = treble;
        this.shaderMaterial.uniforms.u_bass_attack.value = this.bassAttackEffect;
        this.shaderMaterial.uniforms.u_treble_attack.value = this.trebleAttackEffect;
        this.shaderMaterial.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);

        // エフェクト値を時間経過で減衰させる（減衰率を調整）
        this.bassAttackEffect *= 0.99;
        this.trebleAttackEffect *= 0.98;
    }

    /**
     * UIから前景色が変更された際に呼び出されるメソッド。
     */
    updateForegroundColor(color) {
        this.shaderMaterial.uniforms.u_color.value.set(color);
    }

    show() {
        this.smokeGroup.visible = true;
    }

    hide() {
        this.smokeGroup.visible = false;
    }

    /**
     * このシーンに関連するすべてのThree.jsオブジェクトを解放する。
     */
    dispose() {
        this.plane.geometry.dispose();
        this.shaderMaterial.dispose();
        this.threeScene.remove(this.smokeGroup);
    }
}