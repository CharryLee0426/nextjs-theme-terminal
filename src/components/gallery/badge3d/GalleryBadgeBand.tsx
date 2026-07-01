"use client";

import { extend, useFrame, useThree, type ThreeElement } from "@react-three/fiber";
import {
  BallCollider,
  CuboidCollider,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
  type RapierRigidBody,
} from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import { useRef, useState } from "react";
import * as THREE from "three";
import {
  CARD_HALF_HEIGHT,
  CARD_HALF_WIDTH,
  CARD_JOINT_OFFSET_Y,
  FIXED_ANCHOR_Y,
  ROPE_SEGMENT_LENGTH,
} from "./constants";
import { useBadgeFaceTexture } from "./useBadgeFaceTexture";

extend({ MeshLineGeometry, MeshLineMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    meshLineGeometry: ThreeElement<typeof MeshLineGeometry>;
    meshLineMaterial: ThreeElement<typeof MeshLineMaterial>;
  }
}

type Props = {
  title: string;
  coverUrl?: string;
  onCardClick: () => void;
};

/**
 * Physics-driven lanyard: a fixed anchor, three rope-jointed segments and a
 * spherically-jointed card, adapted from Vercel's Ship '24 badge writeup
 * (https://vercel.com/blog/building-an-interactive-3d-event-badge-with-react-three-fiber).
 * We swap the Blender card mesh for a plain textured plane carrying the
 * post's cover image + title.
 */
export function GalleryBadgeBand({ title, coverUrl, onCardClick }: Props) {
  const faceTexture = useBadgeFaceTexture(title, coverUrl);
  const band = useRef<THREE.Mesh>(null);
  const fixed = useRef<RapierRigidBody>(null!);
  const j1 = useRef<RapierRigidBody>(null!);
  const j2 = useRef<RapierRigidBody>(null!);
  const j3 = useRef<RapierRigidBody>(null!);
  const card = useRef<RapierRigidBody>(null!);

  const { width, height } = useThree((state) => state.size);
  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]),
  );

  const vec = useRef(new THREE.Vector3()).current;
  const ang = useRef(new THREE.Vector3()).current;
  const rot = useRef(new THREE.Vector3()).current;
  const dir = useRef(new THREE.Vector3()).current;
  const [dragged, drag] = useState<THREE.Vector3 | false>(false);
  const [hovered, setHovered] = useState(false);
  const movedRef = useRef(false);

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], ROPE_SEGMENT_LENGTH]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], ROPE_SEGMENT_LENGTH]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], ROPE_SEGMENT_LENGTH]);
  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, CARD_JOINT_OFFSET_Y, 0],
  ]);

  useFrame((state) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      });
    }
    if (fixed.current && j1.current && j2.current && j3.current) {
      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy(j2.current.translation());
      curve.points[2].copy(j1.current.translation());
      curve.points[3].copy(fixed.current.translation());
      (band.current?.geometry as MeshLineGeometry | undefined)?.setPoints(
        curve.getPoints(32),
      );
    }
    if (card.current) {
      ang.copy(card.current.angvel());
      rot.copy(card.current.rotation());
      card.current.setAngvel(
        { x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z },
        true,
      );
    }
  });

  return (
    <>
      <RigidBody ref={fixed} type="fixed" position={[0, FIXED_ANCHOR_Y, 0]} />
      <RigidBody
        position={[0, FIXED_ANCHOR_Y - ROPE_SEGMENT_LENGTH, 0]}
        ref={j1}
      >
        <BallCollider args={[0.06]} />
      </RigidBody>
      <RigidBody
        position={[0, FIXED_ANCHOR_Y - ROPE_SEGMENT_LENGTH * 2, 0]}
        ref={j2}
      >
        <BallCollider args={[0.06]} />
      </RigidBody>
      <RigidBody
        position={[0, FIXED_ANCHOR_Y - ROPE_SEGMENT_LENGTH * 3, 0]}
        ref={j3}
      >
        <BallCollider args={[0.06]} />
      </RigidBody>
      <RigidBody
        ref={card}
        type={dragged ? "kinematicPosition" : "dynamic"}
        angularDamping={2}
        linearDamping={2}
      >
        <CuboidCollider args={[CARD_HALF_WIDTH, CARD_HALF_HEIGHT, 0.02]} />
        <mesh
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          onPointerMove={() => {
            movedRef.current = true;
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            (e.target as Element | null)?.releasePointerCapture?.(
              e.pointerId,
            );
            drag(false);
            if (!movedRef.current) {
              onCardClick();
            }
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            (e.target as Element | null)?.setPointerCapture?.(e.pointerId);
            movedRef.current = false;
            drag(
              new THREE.Vector3()
                .copy(e.point)
                .sub(vec.copy(card.current!.translation())),
            );
          }}
        >
          <planeGeometry args={[CARD_HALF_WIDTH * 2, CARD_HALF_HEIGHT * 2]} />
          <meshPhysicalMaterial
            map={faceTexture}
            clearcoat={1}
            clearcoatRoughness={0.15}
            iridescence={0.4}
            iridescenceIOR={1}
            iridescenceThicknessRange={[0, 1400]}
            metalness={0.4}
            roughness={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
      </RigidBody>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          args={[{ resolution: new THREE.Vector2(width, height) }]}
          color={hovered ? "#00ff41" : "#8f948f"}
          resolution={[width, height]}
          lineWidth={0.02}
          transparent
          opacity={0.9}
        />
      </mesh>
    </>
  );
}
