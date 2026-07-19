/**
 * Overworld — prototype game-style 3D desktop background.
 *
 * Renders a low-poly horizon (terrain, soft sky, floating markers) with R3F.
 * Kept light for always-on desktop use: capped DPR, no shadows, and a static
 * camera when the user prefers reduced motion.
 */
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Theme } from "../osStore";

interface Palette {
  clear: string;
  fog: string;
  terrain: string;
  terrainDark: string;
  accent: string;
  accentSoft: string;
  sun: string;
  hemiSky: string;
  hemiGround: string;
}

function paletteFor(theme: Theme): Palette {
  if (theme === "light") {
    return {
      clear: "#c8d9ef",
      fog: "#d7e4f5",
      terrain: "#6f9b6a",
      terrainDark: "#4f7a52",
      accent: "#e8c27a",
      accentSoft: "#f0d9a8",
      sun: "#fff4d6",
      hemiSky: "#b7cdf0",
      hemiGround: "#8aab7a",
    };
  }
  return {
    clear: "#0c1220",
    fog: "#141c2e",
    terrain: "#2f4a3a",
    terrainDark: "#1c2e26",
    accent: "#7aa2ff",
    accentSoft: "#4d6db3",
    sun: "#ffe2a8",
    hemiSky: "#1a2744",
    hemiGround: "#1a2a22",
  };
}

/** Sine-ridged plane so the horizon reads as a game map, not a flat card. */
function buildTerrainGeometry(width: number, depth: number, segments: number) {
  const geo = new THREE.PlaneGeometry(width, depth, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const ridge =
      Math.sin(x * 0.22) * 0.55 +
      Math.cos(z * 0.18) * 0.45 +
      Math.sin((x + z) * 0.12) * 0.35;
    const bowl = -Math.hypot(x * 0.04, z * 0.05) * 0.8;
    pos.setY(i, ridge + bowl);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function Terrain({ colors }: { colors: Palette }) {
  const geometry = useMemo(() => buildTerrainGeometry(48, 36, 48), []);
  return (
    <mesh geometry={geometry} position={[0, -1.6, -6]} receiveShadow={false}>
      <meshStandardMaterial
        color={colors.terrain}
        roughness={0.92}
        metalness={0.05}
        flatShading
      />
    </mesh>
  );
}

/** Low-poly trees — cone canopy + trunk cylinder, scattered for depth. */
function Tree({
  position,
  scale = 1,
  colors,
}: {
  position: [number, number, number];
  scale?: number;
  colors: Palette;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.08, 0.11, 0.7, 5]} />
        <meshStandardMaterial color={colors.terrainDark} flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <coneGeometry args={[0.55, 1.2, 6]} />
        <meshStandardMaterial color={colors.terrain} flatShading roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <coneGeometry args={[0.38, 0.85, 6]} />
        <meshStandardMaterial color={colors.terrainDark} flatShading roughness={0.95} />
      </mesh>
    </group>
  );
}

/** Soft floating crystals — a game-HUD accent without competing with windows. */
function Crystal({
  position,
  color,
  speed,
}: {
  position: [number, number, number];
  color: string;
  speed: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(t * speed + position[0]) * 0.18;
    ref.current.rotation.y = t * speed * 0.35;
  });

  return (
    <group ref={ref} position={position}>
      <mesh>
        <octahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.35}
          roughness={0.25}
          metalness={0.4}
          flatShading
        />
      </mesh>
    </group>
  );
}

function Scene({ theme, reducedMotion }: { theme: Theme; reducedMotion: boolean }) {
  const colors = useMemo(() => paletteFor(theme), [theme]);
  const cameraRig = useRef<THREE.Group>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame((state) => {
    const rig = cameraRig.current;
    if (!rig) return;
    if (reducedMotion) {
      rig.rotation.set(0, 0, 0);
      return;
    }
    const t = state.clock.elapsedTime;
    const swayX = Math.sin(t * 0.12) * 0.04 + mouse.current.y * -0.03;
    const swayY = Math.cos(t * 0.09) * 0.06 + mouse.current.x * 0.05;
    rig.rotation.x = THREE.MathUtils.lerp(rig.rotation.x, swayX, 0.04);
    rig.rotation.y = THREE.MathUtils.lerp(rig.rotation.y, swayY, 0.04);
  });

  const trees = useMemo(
    () =>
      [
        [-10, -1.2, -14, 1.1],
        [-7.5, -1.35, -11, 0.85],
        [-4, -1.1, -16, 1.35],
        [3.5, -1.25, -13, 1],
        [7, -1.15, -15.5, 1.2],
        [10.5, -1.3, -12, 0.9],
        [-1.5, -1.4, -9.5, 0.7],
        [5.2, -1.2, -10, 0.75],
      ] as const,
    [],
  );

  return (
    <>
      <color attach="background" args={[colors.clear]} />
      <fog attach="fog" args={[colors.fog, 12, 42]} />

      <hemisphereLight args={[colors.hemiSky, colors.hemiGround, 0.85]} />
      <directionalLight position={[8, 14, 4]} intensity={1.15} color={colors.sun} />
      <ambientLight intensity={0.28} />

      <group ref={cameraRig}>
        <Terrain colors={colors} />

        {/* Far ridge silhouette — cheap depth cue behind the main plane. */}
        <mesh position={[0, -0.4, -22]} rotation={[-0.08, 0, 0]}>
          <cylinderGeometry args={[18, 22, 4.5, 8, 1, true]} />
          <meshStandardMaterial
            color={colors.terrainDark}
            side={THREE.BackSide}
            flatShading
            roughness={1}
          />
        </mesh>

        {trees.map(([x, y, z, s], i) => (
          <Tree key={i} position={[x, y, z]} scale={s} colors={colors} />
        ))}

        {!reducedMotion && (
          <>
            <Crystal position={[-3.2, 0.9, -7]} color={colors.accent} speed={0.9} />
            <Crystal position={[2.4, 1.2, -8.5]} color={colors.accentSoft} speed={1.15} />
            <Crystal position={[0.2, 1.6, -6]} color={colors.accent} speed={0.75} />
          </>
        )}

        {/* Ground disk under the camera so the near clip never shows void. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.85, -2]}>
          <circleGeometry args={[16, 32]} />
          <meshStandardMaterial color={colors.terrainDark} roughness={1} />
        </mesh>
      </group>
    </>
  );
}

export function GameWorldWallpaper({ theme }: { theme: Theme }) {
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  return (
    <div className="arco-wallpaper__effect arco-wallpaper__effect--overworld" aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
        camera={{ position: [0, 2.2, 6.5], fov: 48, near: 0.1, far: 80 }}
        style={{ pointerEvents: "none", width: "100%", height: "100%" }}
        frameloop="always"
      >
        <Scene theme={theme} reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}

export default GameWorldWallpaper;
