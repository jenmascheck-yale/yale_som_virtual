import { useEffect, useRef, useState } from 'react'
import { canSpeak, speak, stopSpeaking } from './speech.js'
import { talk } from './npc.js'

export const API = import.meta.env.VITE_API_URL ?? '' // dev: Vite proxies /api to the FastAPI back end
const SESSION = globalThis.crypto?.randomUUID?.() ?? String(Math.random()).slice(2)

const readVoicePref = () => {
  try {
    return localStorage.getItem('profVoice') !== 'off'
  } catch {
    return true
  }
}

// [text](https://...) citations become links; everything else is plain text
function Rich({ text }) {
  const out = []
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g
  let last = 0
  for (let mt; (mt = re.exec(text)); ) {
    out.push(text.slice(last, mt.index))
    out.push(
      <a key={mt.index} href={mt[2]} target="_blank" rel="noreferrer">
        {mt[1]}
      </a>,
    )
    last = mt.index + mt[0].length
  }
  out.push(text.slice(last))
  return out
}

export default function ChatPanel({ prof, apiOk, messages, setMessages, onClose }) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [voiceOn, setVoiceOn] = useState(readVoicePref)
  const listRef = useRef()
  const inputRef = useRef()
  const voice = { pitch: prof.voice_pitch ?? 1, rate: prof.voice_rate ?? 1, prefs: prof.voice_prefs ?? '' }

  const say = (text) => {
    if (!voiceOn || !canSpeak) return
    speak(
      text,
      voice,
      () => (talk.speaking = true),
      () => (talk.speaking = false),
    )
  }

  // first visit: the professor greets you
  useEffect(() => {
    if (!messages.length && prof.greeting) {
      setMessages([{ role: 'prof', text: prof.greeting }])
      say(prof.greeting)
    }
    inputRef.current?.focus()
    return () => {
      stopSpeaking()
      talk.speaking = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prof.id])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const toggleVoice = () => {
    const on = !voiceOn
    setVoiceOn(on)
    if (!on) stopSpeaking()
    try {
      localStorage.setItem('profVoice', on ? 'on' : 'off')
    } catch {
      // storage blocked; the toggle still works for this visit
    }
  }

  const send = async (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || busy) return
    setDraft('')
    setError('')
    setMessages((m) => [...m, { role: 'you', text }])
    setBusy(true)
    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professor_id: prof.id, message: text, session_id: SESSION }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `Server error ${res.status}`)
      setMessages((m) => [...m, { role: 'prof', text: data.reply }])
      say(data.reply)
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? "Can't reach the back end. Is it running on port 8000?" : err.message)
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  const short = prof.name.replace(' (AI)', '')
  return (
    <aside className="chat" role="dialog" aria-label={`Conversation with ${prof.name}`}>
      <header className="chat-head">
        <div>
          <div className="kicker">AI character · {prof.room_id === 'courtyard' ? 'Courtyard' : `Room ${prof.room_id}`}{prof.course_number ? ` · ${prof.course_number}` : ''}</div>
          <h2>{prof.name}</h2>
        </div>
        <div className="chat-actions">
          {canSpeak && (
            <button className="chip" onClick={toggleVoice} aria-pressed={voiceOn} aria-label={voiceOn ? 'Mute voice' : 'Turn voice on'}>
              {voiceOn ? '🔊 Voice on' : '🔇 Voice off'}
            </button>
          )}
          <button className="chip strong" onClick={onClose} aria-label="Close conversation and keep walking">
            Back to walking
          </button>
        </div>
      </header>

      <div className="chat-list" ref={listRef} aria-live="polite">
        {!apiOk && (
          <div className="chat-note">
            The AI professors run on the FastAPI back end in <code>backend/</code>, which isn't reachable right now. Start it to chat.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <span className="who">{m.role === 'you' ? 'You' : short}</span>
            <p>
              <Rich text={m.text} />
            </p>
          </div>
        ))}
        {busy && (
          <div className="msg prof thinking">
            <span className="who">{short}</span>
            <p>
              thinking<span className="dots" aria-hidden="true" />
            </p>
          </div>
        )}
        {error && (
          <div className="chat-error" role="alert">
            {error}
          </div>
        )}
      </div>

      <form className="chat-form" onSubmit={send}>
        <label htmlFor="chat-input" className="sr-only">
          Message {prof.name}
        </label>
        <input
          id="chat-input"
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Ask ${short} anything…`}
          maxLength={2000}
          autoComplete="off"
        />
        <button className="go send" disabled={busy || !draft.trim()}>
          {busy ? '…' : 'Send'}
        </button>
      </form>
    </aside>
  )
}
