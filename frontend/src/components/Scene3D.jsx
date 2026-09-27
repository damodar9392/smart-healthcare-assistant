import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const PALETTE = ['#22d3ee', '#a78bfa', '#f472b6', '#60a5fa', '#5eead4'];

const Scene3D = () => {
  const wrapRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    wrap.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.z = 16;

    const disposables = [];

    // ---------- Ambient soft aurora blobs ----------
    const buildBlob = (color, scale, position, opacity, intensity) => {
      const geo = new THREE.SphereGeometry(1, 18, 18);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.setScalar(scale);
      mesh.position.copy(position);
      mesh.userData.opacity = opacity;
      mesh.userData.intensity = intensity;
      mesh.userData.baseY = position.y;
      scene.add(mesh);
      disposables.push(geo, mat);
      return mesh;
    };

    const blobA = buildBlob(0x06b6d4, 9, new THREE.Vector3(-7, 3, -12), 0.12, 0.15);
    const blobB = buildBlob(0xa855f7, 11, new THREE.Vector3(8, -2, -14), 0.1, 0.12);

    // ---------- Particle field ----------
    const COUNT = Math.min(150, Math.max(60, Math.round((window.innerWidth * window.innerHeight) / 22000)));
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    const color = new THREE.Color();

    for (let i = 0; i < COUNT; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 44;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      speeds[i] = 0.12 + Math.random() * 0.5;
      color.set(PALETTE[i % PALETTE.length]);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const pointMat = new THREE.PointsMaterial({
      size: 0.075,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(pointGeo, pointMat);
    scene.add(points);
    disposables.push(pointGeo, pointMat);

    // Constellations / links between close particles
    const MAX_EDGES = 140;
    const MAX_DIST = 3.2;
    const edgePositions = new Float32Array(MAX_EDGES * 2 * 3);
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
    edgeGeo.setDrawRange(0, 0);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0xa78bfa,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    scene.add(edges);
    disposables.push(edgeGeo, edgeMat);

    const updateEdges = () => {
      const px = pointGeo.attributes.position.array;
      let edgeCount = 0;
      for (let i = 0; i < COUNT && edgeCount < MAX_EDGES; i += 1) {
        for (let j = i + 1; j < COUNT && edgeCount < MAX_EDGES; j += 1) {
          const dx = px[i * 3] - px[j * 3];
          const dy = px[i * 3 + 1] - px[j * 3 + 1];
          const dz = px[i * 3 + 2] - px[j * 3 + 2];
          if (dx * dx + dy * dy + dz * dz < MAX_DIST * MAX_DIST) {
            edgePositions[edgeCount * 6] = px[i * 3];
            edgePositions[edgeCount * 6 + 1] = px[i * 3 + 1];
            edgePositions[edgeCount * 6 + 2] = px[i * 3 + 2];
            edgePositions[edgeCount * 6 + 3] = px[j * 3];
            edgePositions[edgeCount * 6 + 4] = px[j * 3 + 1];
            edgePositions[edgeCount * 6 + 5] = px[j * 3 + 2];
            edgeCount += 1;
          }
        }
      }
      edgeGeo.setDrawRange(0, edgeCount * 2);
      edgeGeo.attributes.position.needsUpdate = true;
    };

    // ---------- DNA helix group ----------
    const dnaGroup = new THREE.Group();
    const RUNG_POINTS = 42;
    const HELIX_R = 1.5;
    const HELIX_H = 6.4;
    const TURNS = 3;

    const sphereGeo = new THREE.SphereGeometry(0.15, 12, 12);
    const colA = new THREE.Color(PALETTE[1]);
    const colB = new THREE.Color(PALETTE[2]);

    const rungPositions = new Float32Array(RUNG_POINTS * 2 * 3);
    for (let i = 0; i < RUNG_POINTS; i += 1) {
      const t = i / (RUNG_POINTS - 1);
      const y = -HELIX_H / 2 + t * HELIX_H;
      const angle = t * Math.PI * 2 * TURNS;
      rungPositions[i * 6] = Math.cos(angle) * HELIX_R;
      rungPositions[i * 6 + 1] = y;
      rungPositions[i * 6 + 2] = Math.sin(angle) * HELIX_R;
      rungPositions[i * 6 + 3] = Math.cos(angle + Math.PI) * HELIX_R;
      rungPositions[i * 6 + 4] = y;
      rungPositions[i * 6 + 5] = Math.sin(angle + Math.PI) * HELIX_R;
    }
    const rungGeo = new THREE.BufferGeometry();
    rungGeo.setAttribute('position', new THREE.BufferAttribute(rungPositions, 3));
    const rungMat = new THREE.LineBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const rungs = new THREE.LineSegments(rungGeo, rungMat);
    dnaGroup.add(rungs);
    disposables.push(rungGeo, rungMat);

    for (let i = 0; i < RUNG_POINTS; i += 1) {
      const t = i / (RUNG_POINTS - 1);
      const y = -HELIX_H / 2 + t * HELIX_H;
      const angle = t * Math.PI * 2 * TURNS;
      for (let side = 0; side < 2; side += 1) {
        const a = angle + side * Math.PI;
        const mat = new THREE.MeshBasicMaterial({
          color: side === 0 ? colA : colB,
          transparent: true,
          opacity: 0.85,
        });
        const mesh = new THREE.Mesh(sphereGeo, mat);
        mesh.position.set(Math.cos(a) * HELIX_R, y, Math.sin(a) * HELIX_R);
        dnaGroup.add(mesh);
        disposables.push(mat);
      }
    }

    dnaGroup.position.set(7.5, 0.5, -3);
    dnaGroup.rotation.y = -0.4;
    dnaGroup.rotation.z = 0.06;
    scene.add(dnaGroup);
    disposables.push(sphereGeo);

    // ---------- Wireframe core + glow ----------
    const core = new THREE.Group();
    const icoGeo = new THREE.IcosahedronGeometry(3.4, 1);
    const icoMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      wireframe: true,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ico = new THREE.Mesh(icoGeo, icoMat);
    core.add(ico);
    disposables.push(icoGeo, icoMat);

    const innerGeo = new THREE.SphereGeometry(0.85, 24, 24);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    core.add(inner);
    disposables.push(innerGeo, innerMat);

    // Orbiting particle ring around the core
    const RING_N = 60;
    const ringPositions = new Float32Array(RING_N * 3);
    for (let i = 0; i < RING_N; i += 1) {
      const angle = (i / RING_N) * Math.PI * 2;
      ringPositions[i * 3] = Math.cos(angle) * 4.6;
      ringPositions[i * 3 + 1] = Math.sin(angle) * 4.6;
      ringPositions[i * 3 + 2] = 0;
    }
    const ringGeo = new THREE.BufferGeometry();
    ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
    const ringMat = new THREE.PointsMaterial({
      color: 0xa78bfa,
      size: 0.12,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const ring = new THREE.Points(ringGeo, ringMat);
    core.add(ring);
    disposables.push(ringGeo, ringMat);

    // ECG heartbeat line through the core
    const ECG_N = 120;
    const ecgPositions = new Float32Array(ECG_N * 3);
    const SPAN = 10;
    for (let i = 0; i < ECG_N; i += 1) {
      const x = (i / (ECG_N - 1)) * SPAN - SPAN / 2;
      let y = 0;
      if (x > -1.6 && x < -1.35) y = 0.35 * Math.sin(((x + 1.6) / 0.25) * Math.PI); // P wave
      else if (x > 0.05 && x < 0.12) y = -1.0; // Q
      else if (x >= 0.12 && x < 0.24) y = 3.1; // R
      else if (x >= 0.24 && x < 0.3) y = -1.2; // S
      else if (x > 0.85 && x < 1.25) y = 0.7 * Math.sin(((x - 0.85) / 0.4) * Math.PI); // T wave
      ecgPositions[i * 3] = x;
      ecgPositions[i * 3 + 1] = y * 0.62;
      ecgPositions[i * 3 + 2] = 0;
    }
    const ecgGeo = new THREE.BufferGeometry();
    ecgGeo.setAttribute('position', new THREE.BufferAttribute(ecgPositions, 3));
    const ecgMat = new THREE.LineBasicMaterial({
      color: 0x5eead4,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ecg = new THREE.Line(ecgGeo, ecgMat);
    ecg.position.set(0, -0.4, 1.6);
    core.add(ecg);
    disposables.push(ecgGeo, ecgMat);

    core.position.set(-6.5, 1, -4);
    scene.add(core);

    camera.position.z = 15;

    let mouseX = 0;
    let mouseY = 0;
    const onPointer = (e) => {
      mouseX = e.clientX / window.innerWidth - 0.5;
      mouseY = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    const onVisibility = () => {
      if (document.hidden) {
        if (!reduced) renderer.setAnimationLoop(null);
      } else if (!reduced) {
        renderer.setAnimationLoop(tick);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const clock = new THREE.Clock();

    const animate = () => {
      const t = clock.getElapsedTime();
      const arr = pointGeo.attributes.position.array;

      for (let i = 0; i < COUNT; i += 1) {
        arr[i * 3 + 1] += Math.sin(t * speeds[i] + i) * 0.0015;
        arr[i * 3] += Math.cos(t * speeds[i] * 0.6 + i) * 0.0012;
      }
      pointGeo.attributes.position.needsUpdate = true;
      updateEdges();

      points.rotation.y += 0.00012;
      points.rotation.x = Math.sin(t * 0.1) * 0.02;
      points.rotation.z = Math.cos(t * 0.08) * 0.015;

      const breathe = 1 + Math.sin(t * 0.8) * 0.12;
      inner.scale.setScalar(breathe);
      inner.material.opacity = 0.3 + (Math.sin(t * 0.8) * 0.5 + 0.5) * 0.25;

      core.rotation.y = Math.sin(t * 0.18) * 0.8;
      core.rotation.x = Math.sin(t * 0.12) * 0.2;
      ring.rotation.z += 0.004;

      dnaGroup.rotation.y += 0.003;

      blobA.position.y = blobA.userData.baseY + Math.sin(t * 0.25) * 0.8;
      blobB.position.y = blobB.userData.baseY + Math.cos(t * 0.2) * 0.9;

      camera.position.x += (mouseX * 1.6 - camera.position.x) * 0.04;
      camera.position.y += (-mouseY * 1.1 - camera.position.y) * 0.04;
      camera.lookAt(scene.position);
    };

    const tick = () => {
      animate();
      renderer.render(scene, camera);
    };

    if (reduced) {
      animate();
      renderer.render(scene, camera);
    } else {
      renderer.setAnimationLoop(tick);
    }

    return () => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.setAnimationLoop(null);
      disposables.forEach((disposable) => disposable.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === wrap) {
        wrap.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={wrapRef} className="scene3d" aria-hidden="true" />;
};

export default Scene3D;