export const FadeShader = {
  uniforms: {
    'tDiffuse1': { value: null },
    'tDiffuse2': { value: null },
    'mixRatio': { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse1;
    uniform sampler2D tDiffuse2;
    uniform float mixRatio;
    varying vec2 vUv;

    void main() {
      vec4 texel1 = texture2D(tDiffuse1, vUv);
      vec4 texel2 = texture2D(tDiffuse2, vUv);
      gl_FragColor = mix(texel1, texel2, mixRatio);
    }
  `
};