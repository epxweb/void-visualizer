
import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';

export const StrobeShader = {
  uniforms: {
    'tDiffuse': { value: null },
    'strobeColor': { value: new THREE.Color(0xffffff) },
    'strobeAlpha': { value: 0.5 }, // The maximum brightness/opacity of the strobe
    'strobeTime': { value: 100.0 }, // A time counter, high value means inactive
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec3 strobeColor;
    uniform float strobeAlpha;
    uniform float strobeTime;
    varying vec2 vUv;

    void main() {
      vec4 originalColor = texture2D(tDiffuse, vUv);
      
      // Fade out the strobe effect over a short period.
      // The effect is fully visible at strobeTime = 0 and fades out much faster.
      float currentStrobe = max(0.0, (1.0 - strobeTime * 6.0)) * strobeAlpha;
      
      // Mix the original color with the strobe color
      vec3 finalColor = mix(originalColor.rgb, strobeColor, currentStrobe);
      
      gl_FragColor = vec4(finalColor, originalColor.a);
    }
  `
};
