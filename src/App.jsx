import { useState, useEffect, useRef } from 'react'
import {
  collection, doc, getDoc, setDoc, getDocs,
  addDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot
} from 'firebase/firestore'
import { db } from './firebase.js'

const LOCAL_SESSION_KEY = 'facul_session'

const COLORS = {
  bg: '#0f0e17', surface: '#1a1926', card: '#201f2e', border: '#2d2b40',
  accent: '#7c6aff', accentLight: '#a594ff',
  yellow: '#fbbf24', red: '#f87171', text: '#e8e6f0', muted: '#7a7890',
}

const SUBJECT_COLORS = ['#7c6aff','#4ade80','#fbbf24','#f87171','#38bdf8','#fb923c','#e879f9','#34d399']

const formatDate = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
const generateId = () => Math.random().toString(36).slice(2, 10)

async function hashPassword(password) {
  const buf = new TextEncoder().encode(password)
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── Netlify AI proxy ──────────────────────────────────────────────────────────
async function callAI(system, userMessage) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, userMessage }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.text
}

// ── Auth Screen ───────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  const showError = (msg) => {
    setError(msg); setShake(true); setTimeout(() => setShake(false), 500)
  }

  const handleSubmit = async () => {
    setError('')
    if (!username.trim() || !password.trim()) return showError('Preencha todos os campos.')
    if (username.trim().length < 3) return showError('Usuário muito curto (mín. 3 caracteres).')
    if (password.length < 4) return showError('Senha deve ter pelo menos 4 caracteres.')

    setLoading(true)
    const key = username.trim().toLowerCase()
    const hash = await hashPassword(password)

    try {
      const userRef = doc(db, 'users', key)
      const userSnap = await getDoc(userRef)

      if (mode === 'register') {
        if (password !== confirmPassword) { setLoading(false); return showError('As senhas não coincidem.') }
        if (userSnap.exists()) { setLoading(false); return showError('Usuário já existe. Faça login.') }
        await setDoc(userRef, { username: username.trim(), hash, createdAt: new Date().toISOString() })
        const session = { username: username.trim(), key }
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session))
        onLogin(session)
      } else {
        if (!userSnap.exists()) { setLoading(false); return showError('Usuário não encontrado. Crie uma conta.') }
        if (userSnap.data().hash !== hash) { setLoading(false); return showError('Senha incorreta.') }
        const session = { username: userSnap.data().username, key }
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session))
        onLogin(session)
      }
    } catch (e) {
      showError('Erro de conexão. Tente novamente.')
    }
    setLoading(false)
  }

  return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
        .auth-card { animation: fadeIn .4s ease; }
        .shake { animation: shake .4s ease !important; }
        .auth-input { width:100%; background:${COLORS.card}; border:1px solid ${COLORS.border}; border-radius:10px; padding:11px 14px; color:${COLORS.text}; font-size:14px; outline:none; transition:border-color .2s; font-family:inherit; }
        .auth-input:focus { border-color:${COLORS.accent}; }
        .auth-btn { width:100%; background:${COLORS.accent}; color:#fff; border:none; border-radius:10px; padding:13px; font-size:15px; font-weight:700; cursor:pointer; transition:opacity .15s,transform .1s; font-family:inherit; }
        .auth-btn:hover { opacity:.88; }
        .auth-btn:active { transform:scale(.97); }
        .auth-btn:disabled { opacity:.5; cursor:not-allowed; }
        .tab { cursor:pointer; padding:8px 20px; border-radius:8px; font-size:14px; font-weight:600; transition:background .15s,color .15s; }
        .tab.active { background:${COLORS.accent}; color:#fff; }
        .tab:not(.active) { color:${COLORS.muted}; }
        .tab:not(.active):hover { background:${COLORS.border}; color:${COLORS.text}; }
      `}</style>
      <div className={'auth-card' + (shake ? ' shake' : '')}
        style={{ background: COLORS.surface, border: '1px solid ' + COLORS.border, borderRadius: 22, padding: '44px 40px', width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 28, fontWeight: 700, color: COLORS.accentLight }}>✦ facul.notes</div>
          <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>colaborativo • compartilhado</div>
        </div>
        <div style={{ display: 'flex', gap: 4, background: COLORS.card, borderRadius: 10, padding: 4, marginBottom: 24 }}>
          <div className={'tab' + (mode === 'login' ? ' active' : '')} style={{ flex: 1, textAlign: 'center' }} onClick={() => { setMode('login'); setError('') }}>Entrar</div>
          <div className={'tab' + (mode === 'register' ? ' active' : '')} style={{ flex: 1, textAlign: 'center' }} onClick={() => { setMode('register'); setError('') }}>Criar conta</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, letterSpacing: '.07em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Usuário</label>
            <input className="auth-input" placeholder="ex: joao123" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, letterSpacing: '.07em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Senha</label>
            <input className="auth-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          {mode === 'register' && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, letterSpacing: '.07em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Confirmar senha</label>
              <input className="auth-input" type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
          )}
        </div>
        {error && (
          <div style={{ marginTop: 12, background: COLORS.red + '18', border: '1px solid ' + COLORS.red + '44', borderRadius: 8, padding: '9px 14px', fontSize: 13, color: COLORS.red }}>
            ⚠ {error}
          </div>
        )}
        <button className="auth-btn" onClick={handleSubmit} disabled={loading} style={{ marginTop: 20 }}>
          {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar →' : 'Criar conta →'}
        </button>
        {mode === 'login' && (
          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: COLORS.muted }}>
            Primeira vez? <span style={{ color: COLORS.accentLight, cursor: 'pointer' }} onClick={() => { setMode('register'); setError('') }}>Crie sua conta</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LOCAL_SESSION_KEY)) || null } catch { return null }
  })
  const [subjects, setSubjects] = useState([])
  const [notes, setNotes] = useState([])
  const [activeSubject, setActiveSubject] = useState(null)
  const [view, setView] = useState('notes')
  const [editingNote, setEditingNote] = useState(null)
  const [search, setSearch] = useState('')
  const [aiMessages, setAiMessages] = useState([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [showNewSubject, setShowNewSubject] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectEmoji, setNewSubjectEmoji] = useState('📚')
  const [colorIdx, setColorIdx] = useState(3)
  const [showArchived, setShowArchived] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const aiEndRef = useRef(null)

  // Load subjects + notes from Firestore in real time
  useEffect(() => {
    if (!session) return

    // Subjects
    const unsubSubjects = onSnapshot(collection(db, 'subjects'), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      if (data.length === 0) {
        // Seed default subjects for first user
        const defaults = [
          { name: 'Cálculo', color: SUBJECT_COLORS[0], emoji: '📐' },
          { name: 'Programação', color: SUBJECT_COLORS[1], emoji: '💻' },
          { name: 'Física', color: SUBJECT_COLORS[2], emoji: '⚛️' },
        ]
        defaults.forEach(s => addDoc(collection(db, 'subjects'), s))
      } else {
        setSubjects(data)
      }
    })

    // Notes — ordered by createdAt desc
    const notesQuery = query(collection(db, 'notes'), orderBy('createdAt', 'desc'))
    const unsubNotes = onSnapshot(notesQuery, snap => {
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoaded(true)
    })

    return () => { unsubSubjects(); unsubNotes() }
  }, [session])

  useEffect(() => { if (aiEndRef.current) aiEndRef.current.scrollIntoView({ behavior: 'smooth' }) }, [aiMessages])

  if (!session) return <AuthScreen onLogin={setSession} />

  const logout = () => { localStorage.removeItem(LOCAL_SESSION_KEY); setSession(null); setLoaded(false); setNotes([]); setSubjects([]) }
  const toast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 2500) }

  const filteredNotes = notes.filter(n => {
    const matchSubject = !activeSubject || n.subjectId === activeSubject
    const q = search.toLowerCase()
    return matchSubject && (!q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
  }).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))

  const subjectOf = (id) => subjects.find(s => s.id === id)

  const activeSubjects = subjects.filter(s => !s.archived)
  const archivedSubjects = subjects.filter(s => s.archived)

  const openNewNote = () => {
    setEditingNote({ subjectId: activeSubject || subjects[0]?.id || '', title: '', content: '', author: session.username, createdAt: new Date().toISOString(), pinned: false, tags: [], isNew: true })
    setView('note-editor')
  }

  const saveNote = async () => {
    if (!editingNote.title.trim()) { toast('Adicione um título!'); return }
    try {
      if (editingNote.isNew) {
        const { isNew, ...note } = editingNote
        await addDoc(collection(db, 'notes'), note)
      } else {
        const { id, isNew, ...note } = editingNote
        await updateDoc(doc(db, 'notes', editingNote.id), note)
      }
      setView('notes'); toast('Nota salva! 🎉')
    } catch { toast('Erro ao salvar. Tente novamente.') }
  }

  const deleteNote = async (id) => {
    await deleteDoc(doc(db, 'notes', id))
    setView('notes'); toast('Nota removida.')
  }

  const togglePin = async (id, current) => {
    await updateDoc(doc(db, 'notes', id), { pinned: !current })
  }

  const archiveSubject = async (id, current) => {
  await updateDoc(doc(db, 'subjects', id), { archived: !current })
  toast(current ? 'Matéria restaurada!' : 'Matéria arquivada!')
}

  const addSubject = async () => {
    if (!newSubjectName.trim()) return
    await addDoc(collection(db, 'subjects'), { name: newSubjectName, color: SUBJECT_COLORS[colorIdx], emoji: newSubjectEmoji })
    setNewSubjectName(''); setShowNewSubject(false); toast('Matéria criada! 📚')
  }

  const sendAiMessage = async () => {
    if (!aiInput.trim() || aiLoading) return
    const userMsg = aiInput.trim(); setAiInput('')
    setAiMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setAiLoading(true)
    const notesCtx = filteredNotes.slice(0, 8).map(n => '[' + (subjectOf(n.subjectId)?.name || '?') + '] ' + n.title + ':\n' + n.content.slice(0, 300)).join('\n\n---\n\n')
    const system = 'Você é um assistente de estudos universitários. Responda em português, de forma clara e didática.\n\nNOTAS DO GRUPO:\n' + (notesCtx || 'Nenhuma nota ainda.')
    try {
      const reply = await callAI(system, userMsg)
      setAiMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch { setAiMessages(prev => [...prev, { role: 'assistant', content: 'Erro ao conectar com a IA. Verifique a configuração.' }]) }
    setAiLoading(false)
  }

  const summarizeNote = async () => {
    if (!editingNote?.content) return
    setAiLoading(true); toast('Gerando resumo...')
    try {
      const reply = await callAI('Resuma em tópicos organizados, em português.', editingNote.content)
      setEditingNote(prev => ({ ...prev, content: prev.content + '\n\n---\n📝 Resumo IA:\n' + reply }))
      toast('Resumo adicionado!')
    } catch { toast('Erro ao gerar resumo.') }
    setAiLoading(false)
  }

  if (!loaded) return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ color: COLORS.accent, fontSize: 28 }}>✦ carregando...</div>
    </div>
  )

  return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', fontFamily: "'DM Sans','Segoe UI',sans-serif", color: COLORS.text, display: 'flex' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:${COLORS.border}; border-radius:99px; }
        textarea,input,select { font-family:inherit; }
        .note-card { transition:transform .15s,box-shadow .15s; cursor:pointer; }
        .note-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(124,106,255,.15); }
        .sidebar-item { transition:background .15s,color .15s; cursor:pointer; border-radius:10px; }
        .sidebar-item:hover { background:${COLORS.border}; }
        .sidebar-item.active { background:${COLORS.accent}22; color:${COLORS.accentLight}; }
        .btn { border:none; cursor:pointer; font-family:inherit; font-size:14px; font-weight:600; transition:opacity .15s,transform .1s; }
        .btn:hover { opacity:.85; }
        .btn:active { transform:scale(.97); }
        .toast { position:fixed; bottom:32px; left:50%; transform:translateX(-50%); background:${COLORS.accent}; color:#fff; padding:10px 22px; border-radius:99px; font-size:14px; font-weight:600; z-index:999; animation:fadeUp .3s ease; pointer-events:none; }
        @keyframes fadeUp { from{opacity:0;transform:translate(-50%,12px)} to{opacity:1;transform:translate(-50%,0)} }
        .tag { display:inline-block; background:${COLORS.accent}22; color:${COLORS.accentLight}; padding:2px 10px; border-radius:99px; font-size:12px; margin:2px; }
        .ai-bubble-user { background:${COLORS.accent}33; border-radius:16px 16px 4px 16px; padding:12px 16px; max-width:80%; align-self:flex-end; white-space:pre-wrap; font-size:14px; }
        .ai-bubble-ai { background:${COLORS.card}; border:1px solid ${COLORS.border}; border-radius:16px 16px 16px 4px; padding:12px 16px; max-width:85%; align-self:flex-start; white-space:pre-wrap; font-size:14px; line-height:1.6; }
        .pulse { animation:pulse 1.5s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>

      {/* SIDEBAR */}
      <aside style={{ width: 240, background: COLORS.surface, borderRight: '1px solid ' + COLORS.border, display: 'flex', flexDirection: 'column', padding: '20px 12px', gap: 4, flexShrink: 0, position: 'fixed', top: 0, left: sidebarOpen ? 0 : -240, height: '100vh', zIndex: 100, transition: 'left .25s ease' }}>
        <div style={{ padding: '0 8px 16px', borderBottom: '1px solid ' + COLORS.border, marginBottom: 8 }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 18, fontWeight: 700, color: COLORS.accentLight }}>✦ facul.notes</div>
          <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>colaborativo • compartilhado</div>
        </div>

        <div style={{ padding: '6px 10px 10px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid ' + COLORS.border, marginBottom: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {session.username[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.username}</div>
            <button onClick={logout} style={{ background: 'none', border: 'none', color: COLORS.muted, fontSize: 11, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>sair</button>
          </div>
        </div>

        <div className={'sidebar-item' + (view === 'notes' && !activeSubject ? ' active' : '')}
          style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
          onClick={() => { setActiveSubject(null); setView('notes'); setSidebarOpen(false) }}>
          <span>🏠</span> Todas as notas
          <span style={{ marginLeft: 'auto', background: COLORS.border, borderRadius: 99, padding: '1px 8px', fontSize: 12 }}>{notes.length}</span>
        </div>

        <div className={'sidebar-item' + (view === 'ai-chat' ? ' active' : '')}
          style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
         onClick={() => { setView('ai-chat'); setSidebarOpen(false) }}>
          <span>🤖</span> Assistente IA
        </div>

        <div style={{ margin: '12px 0 6px', padding: '0 12px', fontSize: 11, fontWeight: 700, color: COLORS.muted, letterSpacing: '.08em', textTransform: 'uppercase' }}>Matérias</div>

        {activeSubjects.map(sub => (
          <div key={sub.id}
            className={'sidebar-item' + (activeSubject === sub.id ? ' active' : '')}
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
            onClick={() => { setActiveSubject(sub.id); setView('notes'); setSidebarOpen(false) }}>
            <span>{sub.emoji}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</span>
           <span style={{ background: sub.color + '33', color: sub.color, borderRadius: 99, padding: '1px 8px', fontSize: 12 }}>
          {notes.filter(n => n.subjectId === sub.id).length}
          </span>
          <span onClick={e => { e.stopPropagation(); archiveSubject(sub.id, sub.archived) }}
          style={{ marginLeft: 4, fontSize: 12, opacity: 0.5, cursor: 'pointer' }}
          title="Arquivar matéria">
  🗄
</span>
          </div>
        ))}

        {archivedSubjects.length > 0 && (
  <div>
    <div onClick={() => setShowArchived(!showArchived)}
      style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: COLORS.muted, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
      {showArchived ? '▾' : '▸'} Arquivadas ({archivedSubjects.length})
    </div>
    {showArchived && archivedSubjects.map(sub => (
      <div key={sub.id}
        style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, opacity: 0.5, borderRadius: 10 }}>
        <span>{sub.emoji}</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</span>
        <span onClick={() => archiveSubject(sub.id, sub.archived)}
          style={{ fontSize: 12, cursor: 'pointer', color: COLORS.accentLight }}
          title="Restaurar matéria">
          ↩
        </span>
      </div>
    ))}
  </div>
)} 

        {showNewSubject ? (
          <div style={{ padding: 8, background: COLORS.card, borderRadius: 10, marginTop: 4 }}>
            <input value={newSubjectEmoji} onChange={e => setNewSubjectEmoji(e.target.value)}
              style={{ width: 36, background: 'transparent', border: 'none', color: COLORS.text, fontSize: 20, marginBottom: 6, outline: 'none' }} />
            <input placeholder="Nome da matéria" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSubject()}
              style={{ width: '100%', background: COLORS.border, border: 'none', borderRadius: 6, padding: '6px 10px', color: COLORS.text, fontSize: 13, outline: 'none', marginBottom: 6 }} />
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
              {SUBJECT_COLORS.map((c, i) => (
                <div key={c} onClick={() => setColorIdx(i)}
                  style={{ width: 18, height: 18, borderRadius: '50%', background: c, cursor: 'pointer', border: colorIdx === i ? '2px solid white' : '2px solid transparent' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn" onClick={addSubject} style={{ flex: 1, background: COLORS.accent, color: '#fff', padding: '6px', borderRadius: 6 }}>OK</button>
              <button className="btn" onClick={() => setShowNewSubject(false)} style={{ flex: 1, background: COLORS.border, color: COLORS.muted, padding: '6px', borderRadius: 6 }}>✕</button>
            </div>
          </div>
        ) : (
          <button className="btn sidebar-item" onClick={() => setShowNewSubject(true)}
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: COLORS.muted, width: '100%', background: 'transparent', textAlign: 'left' }}>
            ＋ Nova matéria
          </button>
        )}
      </aside>
      {sidebarOpen && (
    <div onClick={() => setSidebarOpen(false)}
     style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} />
)}

      {/* MAIN */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {view === 'notes' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '20px 28px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setSidebarOpen(true)}
              style={{ background: 'none', border: 'none', color: COLORS.text, fontSize: 22, cursor: 'pointer', padding: '0 8px 0 0', display: 'flex', alignItems: 'center' }}>
    ☰
              </button>
           <div>
                <h1 style={{ fontSize: 22, fontWeight: 700 }}>
                  {activeSubject ? (subjectOf(activeSubject)?.emoji + ' ' + subjectOf(activeSubject)?.name) : '📋 Todas as notas'}
                </h1>
                <div style={{ color: COLORS.muted, fontSize: 13 }}>{filteredNotes.length} nota{filteredNotes.length !== 1 ? 's' : ''}</div>
              </div>
              <input placeholder="🔍 Buscar notas..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ marginLeft: 'auto', background: COLORS.card, border: '1px solid ' + COLORS.border, borderRadius: 10, padding: '8px 14px', color: COLORS.text, fontSize: 13, outline: 'none', width: 220 }} />
              <button className="btn" onClick={openNewNote}
                style={{ background: COLORS.accent, color: '#fff', padding: '8px 18px', borderRadius: 10 }}>+ Nova nota</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, alignContent: 'start' }}>
              {filteredNotes.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', color: COLORS.muted, paddingTop: 60 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
                  <div>Nenhuma nota aqui ainda.</div>
                  <button className="btn" onClick={openNewNote} style={{ marginTop: 16, background: COLORS.accent, color: '#fff', padding: '10px 22px', borderRadius: 10 }}>Criar primeira nota</button>
                </div>
              )}
              {filteredNotes.map(note => {
                const sub = subjectOf(note.subjectId)
                const isOwn = note.author === session.username
                return (
                  <div key={note.id} className="note-card"
                    style={{ background: COLORS.card, border: '1px solid ' + (isOwn ? COLORS.accent + '55' : COLORS.border), borderRadius: 14, padding: '18px', position: 'relative' }}
                    onClick={() => { setEditingNote({ ...note }); setView('note-editor') }}>
                    {note.pinned && <span style={{ position: 'absolute', top: 14, right: 14, fontSize: 14 }}>📌</span>}
                    {sub && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: sub.color + '22', color: sub.color, borderRadius: 99, padding: '2px 10px', fontSize: 12, marginBottom: 10, fontWeight: 600 }}>
                        {sub.emoji} {sub.name}
                      </div>
                    )}
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{note.title}</h3>
                    <p style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{note.content}</p>
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: COLORS.muted }}>
                      <span style={{ color: isOwn ? COLORS.accentLight : COLORS.muted }}>{isOwn ? '✦ você' : '👤 ' + note.author}</span>
                      <span>{formatDate(note.createdAt)}</span>
                    </div>
                    {note.tags?.length > 0 && (
                      <div style={{ marginTop: 8 }}>{note.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {view === 'note-editor' && editingNote && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 28px', borderBottom: '1px solid ' + COLORS.border, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn" onClick={() => setView('notes')} style={{ background: COLORS.border, color: COLORS.muted, padding: '6px 14px', borderRadius: 8 }}>← Voltar</button>
              <select value={editingNote.subjectId} onChange={e => setEditingNote(p => ({ ...p, subjectId: e.target.value }))}
                style={{ background: COLORS.card, border: '1px solid ' + COLORS.border, borderRadius: 8, padding: '6px 12px', color: COLORS.text, fontSize: 13, outline: 'none' }}>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
              </select>
              <button className="btn" onClick={summarizeNote} disabled={aiLoading}
                style={{ background: COLORS.accentLight + '22', color: COLORS.accentLight, padding: '6px 14px', borderRadius: 8, marginLeft: 'auto' }}>
                {aiLoading ? '⏳ aguarde...' : '✨ Resumir com IA'}
              </button>
              <button className="btn" onClick={() => { togglePin(editingNote.id, editingNote.pinned); setEditingNote(p => ({ ...p, pinned: !p.pinned })) }}
                style={{ background: COLORS.border, color: editingNote.pinned ? COLORS.yellow : COLORS.muted, padding: '6px 14px', borderRadius: 8 }}>
                {editingNote.pinned ? '📌 Fixado' : '📍 Fixar'}
              </button>
              {!editingNote.isNew && editingNote.author === session.username && (
                <button className="btn" onClick={() => deleteNote(editingNote.id)}
                  style={{ background: COLORS.red + '22', color: COLORS.red, padding: '6px 14px', borderRadius: 8 }}>🗑 Deletar</button>
              )}
              <button className="btn" onClick={saveNote} style={{ background: COLORS.accent, color: '#fff', padding: '6px 18px', borderRadius: 8 }}>💾 Salvar</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '28px 40px' }}>
              <input placeholder="Título da aula..." value={editingNote.title}
                onChange={e => setEditingNote(p => ({ ...p, title: e.target.value }))}
                style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 28, fontWeight: 700, color: COLORS.text, outline: 'none', marginBottom: 8 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {editingNote.tags?.map(t => (
                  <span key={t} className="tag" style={{ cursor: 'pointer' }}
                    onClick={() => setEditingNote(p => ({ ...p, tags: p.tags.filter(x => x !== t) }))}>
                    {t} ✕
                  </span>
                ))}
                <input placeholder="+ tag (enter)"
                  style={{ background: 'transparent', border: 'none', color: COLORS.muted, fontSize: 13, outline: 'none', width: 130 }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      setEditingNote(p => ({ ...p, tags: [...(p.tags || []), e.target.value.trim()] }))
                      e.target.value = ''
                    }
                  }} />
              </div>
              <textarea placeholder="Comece a escrever sua anotação aqui... ✍️"
                value={editingNote.content}
                onChange={e => setEditingNote(p => ({ ...p, content: e.target.value }))}
                style={{ width: '100%', minHeight: 400, background: 'transparent', border: 'none', color: COLORS.text, fontSize: 15, lineHeight: 1.8, outline: 'none', resize: 'none' }} />
            </div>
          </div>
        )}

        {view === 'ai-chat' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid ' + COLORS.border }}>
              <h1 style={{ fontSize: 22, fontWeight: 700 }}>🤖 Assistente de Estudos</h1>
              <div style={{ color: COLORS.muted, fontSize: 13 }}>IA com contexto das notas do grupo — tire dúvidas, peça resumos e mais</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {aiMessages.length === 0 && (
                <div style={{ textAlign: 'center', color: COLORS.muted, paddingTop: 40 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
                  <div style={{ marginBottom: 8 }}>Olá, {session.username}! Pergunte qualquer coisa sobre suas aulas.</div>
                  <div style={{ fontSize: 13 }}>Ex: "Explica limites", "Resumo de Física", "O que cai na prova de Cálculo?"</div>
                </div>
              )}
              {aiMessages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'ai-bubble-user' : 'ai-bubble-ai'}>{m.content}</div>
              ))}
              {aiLoading && <div className="ai-bubble-ai pulse" style={{ color: COLORS.muted }}>✦ digitando...</div>}
              <div ref={aiEndRef} />
            </div>
            <div style={{ padding: '16px 28px', borderTop: '1px solid ' + COLORS.border, display: 'flex', gap: 10 }}>
              <input placeholder="Pergunte sobre suas notas e aulas..."
                value={aiInput} onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendAiMessage()}
                style={{ flex: 1, background: COLORS.card, border: '1px solid ' + COLORS.border, borderRadius: 10, padding: '10px 16px', color: COLORS.text, fontSize: 14, outline: 'none' }} />
              <button className="btn" onClick={sendAiMessage} disabled={aiLoading}
                style={{ background: COLORS.accent, color: '#fff', padding: '10px 20px', borderRadius: 10, opacity: aiLoading ? .5 : 1 }}>
                Enviar ↑
              </button>
            </div>
          </div>
        )}
      </main>

      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  )
}
