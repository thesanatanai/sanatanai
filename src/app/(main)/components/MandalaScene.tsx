"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { sceneState } from "../lib/constants";

/** sRGB hex -> vec3 without colour-space conversion (shaders output sRGB directly). */
const rgb = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

/** Outer petals are cool violet and blue, the core is warm saffron, echoing the logo. */
const RINGS = [
  { r: 0.94, n: 16, a: "#7b4fbf", b: "#3a6fb5", z: -0.55, spin: -0.02 },
  { r: 0.8, n: 12, a: "#3a6fb5", b: "#8f5fd0", z: -0.36, spin: 0.035 },
  { r: 0.66, n: 12, a: "#c4508f", b: "#8f5fd0", z: -0.2, spin: -0.05 },
  { r: 0.5, n: 8, a: "#f0703a", b: "#c4508f", z: -0.05, spin: 0.07 },
  { r: 0.34, n: 8, a: "#f59a3c", b: "#f0703a", z: 0.1, spin: -0.09 },
  { r: 0.19, n: 8, a: "#f6d58a", b: "#f59a3c", z: 0.25, spin: 0.12 },
];

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** One ring of lotus petals, drawn procedurally in polar coordinates. */
const RING_FRAG = /* glsl */ `
  precision highp float;
  uniform float uPetals, uRadius, uReveal, uAlpha, uPhase, uBoost;
  uniform vec3 uColA, uColB;
  varying vec2 vUv;

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    if (r > 1.0) discard;

    float ang = atan(p.y, p.x) + uPhase;
    float s = abs(sin(uPetals * 0.5 * ang));       // 0 at petal tips, 1 in the valleys
    float R = uRadius * uReveal;
    float edge = R * (1.0 - 0.30 * pow(s, 1.05));  // pointed tips, rounded valleys
    float d = r - edge;

    float line  = exp(-d * d * 2600.0);
    float halo  = exp(-max(d, 0.0) * 16.0) * step(0.0, d) * 0.14;
    float inside = smoothstep(0.03, -0.20, d);
    float t = clamp(r / max(R, 0.001), 0.0, 1.0);
    float fill  = inside * (0.035 + 0.10 * (1.0 - t));
    float vein  = pow(1.0 - s, 36.0) * inside * (1.0 - t) * 0.30;
    float inner = exp(-pow(r - edge * 0.62, 2.0) * 5200.0) * inside * 0.22;

    float k = (line * 0.85 + halo + fill + vein + inner) * (1.0 + uBoost * 0.5);
    gl_FragColor = vec4(mix(uColA, uColB, t), k * uAlpha * uReveal);
  }
`;

const CORE_FRAG = /* glsl */ `
  precision highp float;
  uniform float uReveal, uAlpha, uBoost;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r2 = dot(p, p);
    float g = exp(-r2 * 22.0) * 0.62 + exp(-r2 * 4.0) * 0.10;
    vec3 col = mix(vec3(0.96, 0.55, 0.20), vec3(1.0, 0.86, 0.62), exp(-r2 * 16.0));
    gl_FragColor = vec4(col, g * uAlpha * uReveal * (1.0 + uBoost * 0.6));
  }
`;

const DUST_VERT = /* glsl */ `
  attribute float aSeed;
  attribute vec3 aColor;
  uniform float uTime, uFly, uSize, uPixelRatio, uBoost;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 pos = position;
    float z = mod(pos.z + uTime * (0.25 + aSeed * 0.5) + uFly * (uBoost * 5.0 + 6.0) + 12.0, 16.0) - 12.0;
    pos.z = z;
    pos.xy += vec2(sin(uTime * 0.3 + aSeed * 20.0), cos(uTime * 0.25 + aSeed * 30.0)) * 0.08;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    float fade = smoothstep(-12.0, -8.0, z) * smoothstep(4.0, 1.5, z);
    vAlpha = fade * (0.35 + 0.65 * fract(aSeed * 7.0));
    vColor = aColor;
    gl_PointSize = min(uSize * uPixelRatio * (0.5 + aSeed) * (7.0 / -mv.z), 40.0);
  }
`;

const DUST_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, a * a * vAlpha * uAlpha);
  }
`;

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

export default function MandalaScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    } catch {
      return; // No WebGL: the page still works, the backdrop is simply plain.
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.innerWidth < 768;

    renderer.setClearColor(0x0d0b1e, 1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
    camera.position.set(0, 0, 5);

    // ----- mandala -----
    const group = new THREE.Group();
    scene.add(group);
    const planeGeo = new THREE.PlaneGeometry(2, 2);
    const materials: THREE.ShaderMaterial[] = [];
    const meshes: { mesh: THREE.Mesh; spin: number }[] = [];

    for (const [i, ring] of RINGS.entries()) {
      const material = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: RING_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uPetals: { value: ring.n },
          uRadius: { value: ring.r },
          uReveal: { value: 0 },
          uAlpha: { value: 1 },
          uPhase: { value: i % 2 ? Math.PI / ring.n : 0 },
          uBoost: { value: 0 },
          uColA: { value: rgb(ring.a) },
          uColB: { value: rgb(ring.b) },
        },
      });
      const mesh = new THREE.Mesh(planeGeo, material);
      mesh.position.z = ring.z;
      group.add(mesh);
      materials.push(material);
      meshes.push({ mesh, spin: ring.spin });
    }

    const coreMaterial = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: CORE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uReveal: { value: 0 }, uAlpha: { value: 1 }, uBoost: { value: 0 } },
    });
    const core = new THREE.Mesh(planeGeo, coreMaterial);
    core.position.z = 0.3;
    core.scale.setScalar(0.9);
    group.add(core);

    // ----- drifting embers -----
    const count = small ? 650 : 1500;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const palette = ["#f59a3c", "#f6d58a", "#c4508f", "#8f5fd0", "#3a6fb5"].map(rgb);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.4 + Math.pow(Math.random(), 0.7) * 5.5;
      positions.set([Math.cos(angle) * radius, Math.sin(angle) * radius, -12 + Math.random() * 16], i * 3);
      seeds[i] = Math.random();
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors.set([c.x, c.y, c.z], i * 3);
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    dustGeo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    dustGeo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    const dustMaterial = new THREE.ShaderMaterial({
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uFly: { value: 0 },
        uSize: { value: 5 },
        uPixelRatio: { value: 1 },
        uAlpha: { value: 1 },
        uBoost: { value: 0 }
      },
    });
    const dust = new THREE.Points(dustGeo, dustMaterial);
    dust.frustumCulled = false;
    scene.add(dust);

    let baseScale = 1;
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, w < 768 ? 1.25 : 1.5);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      dustMaterial.uniforms.uPixelRatio.value = dpr;

      const worldHeight = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const portalPx = Math.min(h * 0.44, w * 0.66); // keep in sync with Hero.tsx
      const outerRadiusWorld = (portalPx / 2) * 0.92 * (worldHeight / h);
      baseScale = outerRadiusWorld / RINGS[0].r;
    };
    resize();
    window.addEventListener("resize", resize);

    // ----- loop -----
    let last = performance.now();
    let elapsed = 0;
    let raf = 0;
    let reveal = reduceMotion ? 1 : 0;
    let boost = 0;
    let camX = 0;
    let camY = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;
      const t = reduceMotion ? 0 : elapsed;

      if (reveal < 1) reveal = Math.min(1, reveal + dt / 2.6);
      const rv = easeOutCubic(reveal);
      boost += (sceneState.boost - boost) * Math.min(1, dt * 3);

      group.scale.setScalar(baseScale * sceneState.zoom);
      meshes.forEach(({ mesh, spin }, i) => {
        mesh.rotation.z = t * spin + sceneState.page * (i % 2 ? -1 : 1) * 2.4;
      });
      for (const m of materials) {
        m.uniforms.uReveal.value = rv;
        m.uniforms.uAlpha.value = sceneState.dim;
        m.uniforms.uBoost.value = boost;
      }
      coreMaterial.uniforms.uReveal.value = rv;
      coreMaterial.uniforms.uAlpha.value = sceneState.dim;
      coreMaterial.uniforms.uBoost.value = boost;

      dustMaterial.uniforms.uTime.value = t;
      dustMaterial.uniforms.uFly.value = sceneState.page * 3 + Math.log(sceneState.zoom) * 0.6;
      dustMaterial.uniforms.uAlpha.value = 0.55 + 0.45 * sceneState.dim;
      dustMaterial.uniforms.uBoost.value = boost;

      // gentle pointer parallax
      camX += (sceneState.px * 0.35 - camX) * Math.min(1, dt * 2.5);
      camY += (-sceneState.py * 0.22 - camY) * Math.min(1, dt * 2.5);
      camera.position.set(camX, camY, 5 - sceneState.page * 0.8);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    frame();

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        frame();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      planeGeo.dispose();
      dustGeo.dispose();
      materials.forEach((m) => m.dispose());
      coreMaterial.dispose();
      dustMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 z-0 h-full w-full" />;
}
