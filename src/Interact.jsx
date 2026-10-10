import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { NPCS } from './npc.js'

const RANGE = 9 // meters you can talk from
const CENTER = new THREE.Vector2(0, 0)

// Casts a ray through the crosshair to find which professor you're looking at.
// Mouse mode: left-click while aiming starts the conversation. Touch mode uses the on-screen Talk button.
export default function Interact({ enabled, onAim, onTalk }) {
  const { camera } = useThree()
  const ray = useMemo(() => {
    const r = new THREE.Raycaster()
    r.far = RANGE
    return r
  }, [])
  const aim = useRef(null)
  const frame = useRef(0)

  useFrame(() => {
    if (++frame.current % 6) return // ~10 checks a second is plenty
    let hit = null
    if (enabled) {
      ray.setFromCamera(CENTER, camera)
      const first = ray.intersectObjects([...NPCS.values()], true)[0]
      for (let o = first?.object; o; o = o.parent) {
        if (o.userData.npc) {
          hit = o.userData.npc
          break
        }
      }
    }
    if (hit !== aim.current) {
      aim.current = hit
      onAim(hit)
    }
  })

  useEffect(() => {
    const down = (e) => {
      if (document.pointerLockElement && e.button === 0 && aim.current) onTalk(aim.current)
    }
    document.addEventListener('mousedown', down)
    return () => document.removeEventListener('mousedown', down)
  }, [onTalk])

  return null
}
