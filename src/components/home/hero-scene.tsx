"use client";

/**
 * Procedural 3D hero. No external model or HDRI files: everything is generated in code.
 * The scene is a stack of brownie slabs wrapped in a champagne-gold band carrying the DGAP medallion,
 * lit by a soft studio rig. Loaded lazily by <Hero3D>, which keeps a static photo as the fallback.
 */
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Lightformer, RoundedBox, useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/** Small deterministic PRNG so the texture looks the same on every visit. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function useBrownieTextures() {
  return useMemo(() => {
    const size = 512;
    const rand = mulberry32(7);
    const make = (draw: (g: CanvasRenderingContext2D) => void) => {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      draw(c.getContext("2d")!);
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      return t;
    };

    const color = make((g) => {
      g.fillStyle = "#4a2a1d";
      g.fillRect(0, 0, size, size);
      for (let i = 0; i < 1100; i++) {
        const r = 3 + rand() * 16;
        const l = 22 + rand() * 20;
        g.fillStyle = `hsla(${14 + rand() * 8}, ${40 + rand() * 20}%, ${l}%, ${0.06 + rand() * 0.14})`;
        g.beginPath();
        g.arc(rand() * size, rand() * size, r, 0, Math.PI * 2);
        g.fill();
      }
      // The glossy, crackled "meringue" top: thin pale veins.
      g.lineWidth = 1.4;
      for (let i = 0; i < 46; i++) {
        g.strokeStyle = `rgba(${150 + rand() * 40}, ${100 + rand() * 30}, ${70 + rand() * 20}, ${0.18 + rand() * 0.2})`;
        g.beginPath();
        let x = rand() * size, y = rand() * size;
        g.moveTo(x, y);
        for (let s = 0; s < 7; s++) {
          x += (rand() - 0.5) * 90;
          y += (rand() - 0.5) * 90;
          g.lineTo(x, y);
        }
        g.stroke();
      }
    });
    color.colorSpace = THREE.SRGBColorSpace;

    const bump = make((g) => {
      g.fillStyle = "#808080";
      g.fillRect(0, 0, size, size);
      for (let i = 0; i < 1400; i++) {
        const v = 90 + rand() * 90;
        g.fillStyle = `rgba(${v},${v},${v},${0.25 + rand() * 0.4})`;
        g.beginPath();
        g.arc(rand() * size, rand() * size, 2 + rand() * 9, 0, Math.PI * 2);
        g.fill();
      }
      g.lineWidth = 2;
      for (let i = 0; i < 36; i++) {
        g.strokeStyle = `rgba(30,30,30,${0.35 + rand() * 0.3})`;
        g.beginPath();
        let x = rand() * size, y = rand() * size;
        g.moveTo(x, y);
        for (let s = 0; s < 6; s++) {
          x += (rand() - 0.5) * 100;
          y += (rand() - 0.5) * 100;
          g.lineTo(x, y);
        }
        g.stroke();
      }
    });
    return { color, bump };
  }, []);
}

const SLAB = 2.3;
const SLAB_H = 0.62;

function BrownieStack() {
  const { color, bump } = useBrownieTextures();
  const logo = useTexture("/images/logo-192.png", (t) => {
    (Array.isArray(t) ? t : [t]).forEach((x) => { x.colorSpace = THREE.SRGBColorSpace; });
  });

  const slabs = [
    { y: -0.62, rot: 0.02, dx: 0.02, dz: 0 },
    { y: 0, rot: -0.035, dx: -0.03, dz: 0.02 },
    { y: 0.62, rot: 0.05, dx: 0.04, dz: -0.02 },
  ];
  // Walnut pieces on the top slab (positions in the slab's local space).
  const walnuts = useMemo(
    () => [
      { p: [0.55, 0.36, 0.4], s: 0.95, r: [0.3, 0.8, 0.1] },
      { p: [-0.5, 0.35, -0.25], s: 0.8, r: [0.1, 2.1, 0.4] },
      { p: [0.05, 0.34, -0.7], s: 0.7, r: [0.6, 1.2, 0.2] },
      { p: [-0.7, 0.34, 0.6], s: 0.65, r: [0.2, 0.4, 0.5] },
    ] as const,
    [],
  );

  const gold = { color: "#d5b477", metalness: 0.9, roughness: 0.32, envMapIntensity: 1.8, emissive: "#4a3512", emissiveIntensity: 0.45 } as const;
  const wall = 1.2;

  return (
    <group>
      {slabs.map((s, i) => (
        <group key={i} position={[s.dx, s.y, s.dz]} rotation={[0, s.rot, 0]}>
          <RoundedBox args={[SLAB, SLAB_H, SLAB]} radius={0.09} smoothness={5}>
            <meshPhysicalMaterial map={color} bumpMap={bump} bumpScale={0.7} roughness={0.5} clearcoat={0.32} clearcoatRoughness={0.4} />
          </RoundedBox>
          {i === 2 &&
            walnuts.map((w, n) => (
              <mesh key={n} position={[w.p[0], w.p[1], w.p[2]]} rotation={[w.r[0], w.r[1], w.r[2]]} scale={[w.s, w.s * 0.62, w.s]}>
                <dodecahedronGeometry args={[0.19, 0]} />
                <meshStandardMaterial color="#a9784b" roughness={0.85} flatShading />
              </mesh>
            ))}
        </group>
      ))}

      {/* Belly band: four thin gold walls, so the slabs stay visible above and below. */}
      <group position={[0, -0.05, 0]}>
        <mesh position={[0, 0, wall]}><boxGeometry args={[2.46, 0.34, 0.035]} /><meshStandardMaterial {...gold} /></mesh>
        <mesh position={[0, 0, -wall]}><boxGeometry args={[2.46, 0.34, 0.035]} /><meshStandardMaterial {...gold} /></mesh>
        <mesh position={[wall, 0, 0]}><boxGeometry args={[0.035, 0.34, 2.46]} /><meshStandardMaterial {...gold} /></mesh>
        <mesh position={[-wall, 0, 0]}><boxGeometry args={[0.035, 0.34, 2.46]} /><meshStandardMaterial {...gold} /></mesh>
        {/* Medallion with the real DGAP logo. */}
        <group position={[0, 0, wall + 0.03]}>
          <mesh><circleGeometry args={[0.36, 48]} /><meshStandardMaterial map={logo} roughness={0.5} /></mesh>
          <mesh><torusGeometry args={[0.37, 0.028, 14, 56]} /><meshStandardMaterial {...gold} /></mesh>
        </group>
      </group>
    </group>
  );
}

function Rig({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (reduced) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      pointer.current = { x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    if (reduced) {
      g.rotation.set(0.28, -0.55, 0);
      state.camera.position.set(0, 1.9, 9.6);
      state.camera.lookAt(0, 0.1, 0);
      return;
    }
    // Scroll-linked: as the hero leaves the viewport the stack turns and the camera eases back.
    const progress = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.9)));
    const t = state.clock.elapsedTime;
    const ease = 1 - Math.pow(1 - Math.min(1, dt * 3), 3);

    const targetRotY = -0.55 + t * 0.12 + pointer.current.x * 0.5 + progress * 1.4;
    const targetRotX = 0.28 + pointer.current.y * 0.14 - progress * 0.18;
    g.rotation.y += (targetRotY - g.rotation.y) * ease;
    g.rotation.x += (targetRotX - g.rotation.x) * ease;
    g.position.y += (progress * 0.9 - g.position.y) * ease;

    const cam = state.camera;
    cam.position.x += (pointer.current.x * 0.5 - cam.position.x) * ease * 0.6;
    cam.position.y += (1.9 - pointer.current.y * 0.35 - cam.position.y) * ease * 0.6;
    cam.position.z += (9.6 + progress * 2.4 - cam.position.z) * ease;
    cam.lookAt(0, 0.1 + progress * 0.5, 0);
  });

  return (
    <group ref={group}>
      <BrownieStack />
    </group>
  );
}

export default function HeroScene({ reduced, onReady }: { reduced: boolean; onReady: () => void }) {
  return (
    <Canvas
      dpr={[1, 1.6]}
      frameloop={reduced ? "demand" : "always"}
      camera={{ position: [0, 1.9, 9.6], fov: 30, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        requestAnimationFrame(onReady);
      }}
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[3.5, 5, 4]} intensity={2.3} color="#fff1dc" />
      <pointLight position={[-4.5, 1.5, -2.5]} intensity={26} color="#d5b477" />
      <spotLight position={[0, 6, -4]} intensity={40} angle={0.5} penumbra={1} color="#ffffff" />

      <Environment resolution={256} frames={1}>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer form="rect" intensity={3.2} position={[0, 5, -9]} scale={[10, 10, 1]} color="#fff4e0" />
          <Lightformer form="ring" intensity={2.2} position={[-5, 1, -1]} scale={4} color="#d5b477" />
          <Lightformer form="rect" intensity={2.4} position={[5, 2, 3]} scale={[6, 3, 1]} color="#ffffff" />
          <Lightformer form="rect" intensity={2} position={[-4, 3, 4]} scale={[5, 2.5, 1]} color="#fff0d2" />
        </group>
      </Environment>

      {reduced ? (
        <Rig reduced />
      ) : (
        <Float speed={1.3} rotationIntensity={0.12} floatIntensity={0.45} floatingRange={[-0.07, 0.07]}>
          <Rig reduced={false} />
        </Float>
      )}
      <ContactShadows position={[0, -1.52, 0]} opacity={0.6} scale={10} blur={2.6} far={3.2} color="#06120d" />
    </Canvas>
  );
}
