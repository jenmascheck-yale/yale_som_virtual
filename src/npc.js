import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'

// Talkable characters. Each one registers its root group here so the player can aim at it,
// and reads `talk` every frame to turn toward the player and move its mouth while speaking.
export const NPCS = new Map() // id -> THREE.Object3D
export const talk = { id: null, speaking: false }

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))

// idle(t) returns the yaw offset the character uses while nobody is talking to it
export function useTalkable(id, root, baseRotation, idle, mouth) {
  useEffect(() => {
    if (!id || !root.current) return
    const g = root.current
    g.userData.npc = id
    NPCS.set(id, g)
    return () => NPCS.delete(id)
  }, [id, root])

  useFrame(({ camera, clock }, dt) => {
    const g = root.current
    if (!g) return
    const t = clock.elapsedTime
    const target =
      talk.id === id
        ? Math.atan2(camera.position.x - g.position.x, camera.position.z - g.position.z) // figures face +z
        : baseRotation + idle(t)
    g.rotation.y += wrap(target - g.rotation.y) * Math.min(1, dt * (talk.id === id ? 6 : 3))
    if (mouth?.current) {
      const open = talk.id === id && talk.speaking ? 0.5 + Math.abs(Math.sin(t * 14)) * 2.2 : 1
      mouth.current.scale.y = mouth.current.userData.baseY * open
    }
  })
}
