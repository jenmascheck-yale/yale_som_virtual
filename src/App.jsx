import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import World from './World.jsx'
import Player from './Player.jsx'
import Minimap from './Minimap.jsx'
import TouchControls from './TouchControls.jsx'
import { EYE, SPAWN } from './layout.js'
import Interact from './Interact.jsx'
import ChatPanel, { API } from './ChatPanel.jsx'
import { PROFESSORS } from './Professor.jsx'
import { talk } from './npc.js'

// names to show before (or without) the back end; the API adds room, course, greeting and voice
const FALLBACK = { zaman: { id: 'zaman', name: 'Prof. Zaman (AI)', room_id: '2400' } }
for (const [id, p] of Object.entries(PROFESSORS)) FALLBACK[id] = { id, name: p.name, room_id: '' }

export default function App() {
  const [locked, setLocked] = useState(false)
  const [where, setWhere] = useState('')
  const [showMap, setShowMap] = useState(true)
  const lockRef = useRef()
  const mapRef = useRef()
  const onLock = useCallback((v) => setLocked(v), [])
  const onWhere = useCallback((w) => setWhere(w), [])
  // phones have no pointer lock, so they get a joystick + drag-to-look instead
  const [isTouch] = useState(() => matchMedia('(pointer: coarse)').matches) // phones + tablets; touchscreen laptops still get mouse mode
  const [touchOn, setTouchOn] = useState(false)
  const touchRef = useRef({ active: false, move: [0, 0], look: [0, 0], jump: false })
  const setTouch = (on) => {
    touchRef.current.active = on
    touchRef.current.move = [0, 0]
    setTouchOn(on)
  }
  const playing = locked || touchOn

  // ---------- AI professors
  const [profs, setProfs] = useState(FALLBACK)
  const [apiOk, setApiOk] = useState(true)
  const [aimId, setAimId] = useState(null)
  const [talkId, setTalkId] = useState(null)
  const [chats, setChats] = useState({}) // professor id -> messages, kept while the page is open
  const wasTouch = useRef(false)
  useEffect(() => {
    fetch(`${API}/api/professors`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((list) => setProfs((p) => ({ ...p, ...Object.fromEntries(list.map((x) => [x.id, x])) })))
      .catch(() => setApiOk(false))
  }, [])
  const onAim = useCallback((id) => setAimId(id), [])
  const startTalk = useCallback(
    (id) => {
      talk.id = id
      setTalkId(id)
      wasTouch.current = touchRef.current.active
      if (document.pointerLockElement) document.exitPointerLock()
      if (touchRef.current.active) {
        touchRef.current.active = false
        touchRef.current.move = [0, 0]
        setTouchOn(false)
      }
    },
    [],
  )
  const endTalk = useCallback(() => {
    talk.id = null
    talk.speaking = false
    setTalkId(null)
    if (wasTouch.current) setTouch(true)
    else lockRef.current?.() // may be refused right after unlocking; the overlay is the fallback
  }, [])
  const setChat = useCallback((id) => (upd) => setChats((c) => ({ ...c, [id]: typeof upd === 'function' ? upd(c[id] ?? []) : upd })), [])

  useEffect(() => {
    const k = (e) => e.code === 'KeyM' && !e.target.closest?.('input, textarea') && setShowMap((v) => !v)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  return (
    <>
      <Canvas
        camera={{ fov: 72, near: 0.05, far: 800, position: [SPAWN.x, EYE, SPAWN.z] }}
        dpr={[1, 1.75]}
      >
        <World />
        <Player lockRef={lockRef} mapRef={mapRef} touchRef={touchRef} onLock={onLock} onWhere={onWhere} />
        <Interact enabled={playing && !talkId} onAim={onAim} onTalk={startTalk} />
      </Canvas>

      <div className="where">
        <span className="dot" />
        {where}
      </div>
      <div className={showMap ? 'mapwrap' : 'mapwrap hidden'}>
        <Minimap drawRef={mapRef} />
      </div>
      <button className="maptoggle" onClick={() => setShowMap((s) => !s)}>
        {showMap ? 'hide map' : 'map'}
      </button>
      {playing && <div className={aimId ? 'crosshair aim' : 'crosshair'} />}
      {touchOn && <TouchControls touchRef={touchRef} onPause={() => setTouch(false)} />}
      {playing && aimId && !talkId &&
        (touchOn ? (
          <button className="talkbtn" onClick={() => startTalk(aimId)}>
            Talk to {profs[aimId]?.name ?? aimId}
          </button>
        ) : (
          <div className="talkhint">
            Click to talk to <b>{profs[aimId]?.name ?? aimId}</b>
          </div>
        ))}
      {talkId && <ChatPanel key={talkId} prof={profs[talkId]} apiOk={apiOk} messages={chats[talkId] ?? []} setMessages={setChat(talkId)} onClose={endTalk} />}

      {!playing && !talkId && (
        <div className="overlay" onClick={() => (isTouch ? setTouch(true) : lockRef.current?.())}>
          <div className="card">
            <div className="kicker">Yale SOM · Evans Hall</div>
            <h1>Floor 2</h1>
            <p className="sub">Classroom drums, the cloister, Ross Library, the Beinecke Terrace Room, and the courtyard.</p>
            <button className="go">{isTouch ? 'Tap to walk in' : 'Click to walk in'}</button>
            {!isTouch && (
              <button
                className="go alt"
                onClick={(e) => {
                  e.stopPropagation()
                  setTouch(true)
                }}
              >
                Use on-screen joystick
              </button>
            )}
            {isTouch ? (
              <div className="keys">
                <span><b>Left thumb</b> joystick to walk (push all the way to hurry)</span>
                <span><b>Right thumb</b> drag to look</span>
              </div>
            ) : (
              <div className="keys">
                <span><b>W A S D</b> walk</span>
                <span><b>Mouse</b> look</span>
                <span><b>Shift</b> sprint</span>
                <span><b>Space</b> jump</span>
                <span><b>C</b> crouch</span>
                <span><b>M</b> map</span>
                <span><b>Esc</b> pause</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
