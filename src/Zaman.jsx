import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Labubu from './Labubu.jsx'
import { useTalkable } from './npc.js'

// Cartoon "Prof. Zaman (AI)": hoodie, jeans, sneakers, a Labubu clipped to his belt loop.
// Built from primitives like the other professors. Figure faces +z; his right side is -x.

const mats = new Map()
const m = (color, o = {}) => {
  const k = color + JSON.stringify(o)
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o }))
  return mats.get(k)
}
const SPH = new THREE.SphereGeometry(1, 24, 16)
const CYL = new THREE.CylinderGeometry(1, 1, 1, 20)
const BOX = new THREE.BoxGeometry(1, 1, 1)
const CAP = new THREE.CapsuleGeometry(1, 1, 6, 12)
const TORUS = new THREE.TorusGeometry(1, 0.18, 8, 20)
const B = ({ g = SPH, c, p, s, r = [0, 0, 0], o }) => <mesh geometry={g} material={m(c, o)} position={p} scale={s} rotation={r} />

const SKIN = '#c68e63' // light brown
const HAIR = '#16110e'
const HOODIE = '#2a2c33'
const HOODIE_DARK = '#1f2127'
const PINK = '#ff4fa3'
const JEANS = '#34507a'

function nameTag() {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 128
  const g = c.getContext('2d')
  g.fillStyle = 'rgba(11,11,13,0.85)'
  g.beginPath()
  g.roundRect(4, 4, 504, 120, 60)
  g.fill()
  g.strokeStyle = PINK
  g.lineWidth = 6
  g.stroke()
  g.fillStyle = '#ffd6ea'
  g.font = 'bold 50px system-ui, sans-serif'
  g.textAlign = 'center'
  g.fillText('Prof. Zaman · AI', 256, 82)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export default function Zaman({ position, rotation = 0 }) {
  const root = useRef()
  const mouth = useRef()
  const talkArm = useRef()
  const tag = useMemo(() => new THREE.SpriteMaterial({ map: nameTag(), depthWrite: false }), [])
  useTalkable('zaman', root, rotation, (t) => Math.sin(t * 0.5) * 0.4, mouth)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const wave = Math.max(0, Math.sin(t * 1.1)) // explains things with his hands every few seconds
    talkArm.current.rotation.x = -0.2 - wave * 1.1
    talkArm.current.rotation.z = -0.15 - wave * 0.25
  })

  return (
    <group ref={root} position={position} rotation={[0, rotation, 0]} scale={0.94}>
      {/* sneakers */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <B g={BOX} c="#f4f4f6" p={[0.1 * sx, 0.05, 0.04]} s={[0.12, 0.1, 0.28]} />
          <B g={BOX} c={PINK} p={[0.1 * sx, 0.02, 0.04]} s={[0.125, 0.04, 0.285]} />
        </group>
      ))}
      {/* jeans */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} geometry={CYL} material={m(JEANS)} position={[0.1 * sx, 0.5, 0]} scale={[0.085, 0.82, 0.085]} />
      ))}
      <B g={CYL} c={JEANS} p={[0, 0.9, 0]} s={[0.2, 0.16, 0.14]} />
      {/* belt + belt loop on his right hip, with a Labubu keychain hanging off it */}
      <B g={CYL} c="#3b2a1e" p={[0, 0.94, 0]} s={[0.205, 0.04, 0.145]} />
      <B g={BOX} c={JEANS} p={[-0.19, 0.94, 0.06]} s={[0.025, 0.07, 0.02]} />
      <B g={TORUS} c="#d8d8de" o={{ metalness: 0.9, roughness: 0.25 }} p={[-0.2, 0.89, 0.07]} r={[0, Math.PI / 2, 0]} s={[0.03, 0.03, 0.03]} />
      <group position={[-0.21, 0.66, 0.08]} rotation={[0, 0.4, 0]}>
        <Labubu height={0.2} fur="#ff8fc7" expression="mischief" anim="idle" phase={1.3} />
      </group>
      {/* hoodie body */}
      <mesh geometry={CYL} material={m(HOODIE)} position={[0, 1.22, 0]} scale={[0.25, 0.56, 0.17]} />
      <B c={HOODIE} p={[0, 1.48, 0]} s={[0.29, 0.1, 0.18]} />
      <B g={BOX} c={HOODIE_DARK} p={[0, 1.03, 0.165]} s={[0.3, 0.17, 0.02]} />
      <B g={BOX} c={PINK} p={[0, 1.31, 0.172]} s={[0.17, 0.05, 0.005]} o={{ emissive: PINK, emissiveIntensity: 0.25 }} />
      <B g={CYL} c={HOODIE_DARK} p={[0, 0.96, 0]} s={[0.255, 0.05, 0.175]} />
      {/* hood bunched behind the neck + pink drawstrings */}
      <B c={HOODIE} p={[0, 1.56, -0.1]} s={[0.17, 0.11, 0.1]} />
      {[-1, 1].map((sx) => (
        <B key={sx} g={CYL} c={PINK} p={[0.04 * sx, 1.43, 0.175]} s={[0.008, 0.16, 0.008]} />
      ))}
      <B g={CYL} c={SKIN} p={[0, 1.57, 0]} s={[0.055, 0.08, 0.055]} />
      {/* left arm relaxed */}
      <group position={[0.28, 1.46, 0]} rotation={[0.08, 0, 0.14]}>
        <mesh geometry={CAP} material={m(HOODIE)} position={[0, -0.25, 0]} scale={[0.07, 0.21, 0.07]} />
        <B c={HOODIE_DARK} p={[0, -0.47, 0]} s={[0.065, 0.03, 0.065]} />
        <B c={SKIN} p={[0, -0.52, 0.01]} s={[0.045, 0.055, 0.04]} />
      </group>
      {/* right arm gestures while explaining */}
      <group ref={talkArm} position={[-0.28, 1.46, 0]}>
        <mesh geometry={CAP} material={m(HOODIE)} position={[0, -0.25, 0]} scale={[0.07, 0.21, 0.07]} />
        <B c={HOODIE_DARK} p={[0, -0.47, 0]} s={[0.065, 0.03, 0.065]} />
        <B c={SKIN} p={[0, -0.52, 0.01]} s={[0.045, 0.055, 0.04]} />
      </group>
      {/* head */}
      <B c={SKIN} p={[0, 1.71, 0]} s={[0.115, 0.135, 0.125]} />
      {[-1, 1].map((sx) => (
        <B key={sx} c={SKIN} p={[0.117 * sx, 1.71, 0]} s={[0.02, 0.035, 0.02]} />
      ))}
      {/* short dark hair */}
      <B c={HAIR} p={[0, 1.79, -0.015]} s={[0.122, 0.075, 0.13]} />
      <B c={HAIR} p={[0, 1.76, -0.07]} s={[0.118, 0.09, 0.08]} />
      {/* eyes + brows */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <B c="#ffffff" p={[0.043 * sx, 1.73, 0.108]} s={[0.022, 0.018, 0.012]} />
          <B c="#1d1410" p={[0.043 * sx, 1.73, 0.118]} s={[0.011, 0.012, 0.008]} />
          <B g={BOX} c={HAIR} p={[0.045 * sx, 1.763, 0.112]} r={[0, 0, -0.08 * sx]} s={[0.045, 0.011, 0.01]} />
        </group>
      ))}
      <B c={SKIN} p={[0, 1.695, 0.125]} s={[0.02, 0.028, 0.022]} />
      {/* big grin; opens and closes while talking */}
      <mesh ref={mouth} userData={{ baseY: 0.014 }} geometry={BOX} material={m('#5a1f1f')} position={[0, 1.655, 0.115]} scale={[0.06, 0.014, 0.01]} />
      <sprite material={tag} position={[0, 2.12, 0]} scale={[0.75, 0.19, 1]} />
    </group>
  )
}
