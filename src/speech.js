// Professor voices use the browser's built-in speech synthesis (free, no API key, works offline).
const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
let voices = []
const load = () => (voices = synth.getVoices())
if (synth) {
  load()
  synth.addEventListener?.('voiceschanged', load)
}

export const canSpeak = !!synth

// prefs: comma-separated name fragments, best first (e.g. "Guy,Andrew,David,Male")
function pickVoice(prefs = '') {
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'))
  for (const p of prefs.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)) {
    const v = en.find((v) => v.name.toLowerCase().includes(p))
    if (v) return v
  }
  return en[0] ?? null
}

// drop citation links and markdown so the voice doesn't read URLs out loud
export const forSpeech = (t) =>
  t
    .replace(/\(\[[^\]]+\]\([^)]+\)\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*_`#>]/g, '')

export function stopSpeaking() {
  synth?.cancel()
}

// Speaks sentence by sentence (long single utterances get cut off in some browsers).
export function speak(text, { pitch = 1, rate = 1, prefs = '' } = {}, onStart, onEnd) {
  if (!synth) return onEnd?.()
  const id = ++current // events from a cancelled, older reply are ignored
  synth.cancel()
  const parts = (forSpeech(text).match(/[^.!?]+[.!?]*/g) ?? []).map((s) => s.trim()).filter(Boolean)
  if (!parts.length) return onEnd?.()
  const voice = pickVoice(prefs)
  parts.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p)
    if (voice) u.voice = voice
    u.pitch = pitch
    u.rate = rate
    if (i === 0) u.onstart = () => id === current && onStart?.()
    if (i === parts.length - 1) u.onend = u.onerror = () => id === current && onEnd?.()
    synth.speak(u)
  })
}
let current = 0
