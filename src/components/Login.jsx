import { useState } from 'react'
import { supabase } from '../lib/supabase'

const loginCss = `
  .auth-root{position:fixed;inset:0;background:#07080f;display:flex;align-items:center;justify-content:center;font-family:'Rajdhani',sans-serif;overflow:hidden}
  .auth-bg{position:absolute;inset:0;background:radial-gradient(ellipse at 30% 50%,#0d1535 0%,#07080f 65%)}
  .auth-particles{position:absolute;inset:0;pointer-events:none;overflow:hidden}
  .auth-particle{position:absolute;border-radius:50%;animation:authRise linear infinite}
  @keyframes authRise{0%{transform:translateY(110vh);opacity:0}10%{opacity:.6}90%{opacity:.6}100%{transform:translateY(-10vh);opacity:0}}
  .auth-card{position:relative;z-index:1;background:rgba(14,16,32,.97);border:1px solid #252850;border-radius:16px;padding:40px;width:420px;max-width:94vw;box-shadow:0 24px 64px rgba(0,0,0,.7)}
  .auth-logo{font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:6px;background:linear-gradient(135deg,#e8a020,#f0d060);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-align:center;margin-bottom:4px}
  .auth-tagline{font-size:11px;letter-spacing:4px;color:#6b6d90;text-align:center;text-transform:uppercase;margin-bottom:28px}
  .auth-tabs{display:flex;background:#161830;border-radius:8px;padding:3px;margin-bottom:24px;gap:3px}
  .auth-tab{flex:1;padding:8px;border:none;border-radius:6px;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:13px;letter-spacing:.5px;cursor:pointer;transition:all .2s;background:transparent;color:#6b6d90}
  .auth-tab.active{background:#e8a020;color:#000}
  .auth-field{margin-bottom:14px}
  .auth-label{display:block;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#6b6d90;margin-bottom:5px;font-weight:600}
  .auth-input{width:100%;padding:10px 13px;background:#07080f;border:1px solid #252850;border-radius:6px;color:#e8e8f0;font-family:'Rajdhani',sans-serif;font-size:15px;font-weight:500;outline:none;transition:border .15s}
  .auth-input:focus{border-color:#e8a020}
  .auth-btn{width:100%;padding:13px;background:linear-gradient(135deg,#e8a020,#c47010);border:none;border-radius:8px;font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:3px;color:#000;cursor:pointer;transition:all .2s;margin-top:6px}
  .auth-btn:hover:not(:disabled){opacity:.9;transform:translateY(-1px)}
  .auth-btn:disabled{opacity:.4;cursor:not-allowed}
  .auth-error{padding:10px 13px;background:rgba(255,68,68,.08);border:1px solid rgba(255,68,68,.25);border-radius:6px;color:#ff6666;font-size:13px;margin-bottom:14px;text-align:center}
  .auth-success{padding:10px 13px;background:rgba(68,170,68,.08);border:1px solid rgba(68,170,68,.25);border-radius:6px;color:#44aa44;font-size:13px;margin-bottom:14px;text-align:center}
  .auth-divider{text-align:center;font-size:12px;color:#6b6d90;margin:16px 0 0}
`

const particles = Array.from({length:20},()=>({
  l: Math.random()*100, dur: 7+Math.random()*10, del: Math.random()*10,
  s: 1.5+Math.random()*3, c: Math.random()<.6?'#e8a020':Math.random()<.5?'#44aaff':'#ff4488',
}))

export default function Login({ onAuth }) {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const reset = () => { setError(''); setSuccess('') }

  const handleLogin = async (e) => {
    e.preventDefault()
    reset()
    if (!email || !password) { setError('Completa todos los campos.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    onAuth()
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    reset()
    if (!email || !password || !name) { setError('Completa todos los campos.'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } }
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSuccess('¡Registro exitoso! Revisa tu correo para confirmar la cuenta, luego inicia sesión.')
    setTab('login')
    setPassword('')
  }

  return (
    <div className="auth-root">
      <style>{loginCss}</style>
      <div className="auth-bg"/>
      <div className="auth-particles">
        {particles.map((p,i)=>(
          <div key={i} className="auth-particle" style={{left:`${p.l}%`,width:p.s,height:p.s,background:p.c,animationDuration:`${p.dur}s`,animationDelay:`${p.del}s`}}/>
        ))}
      </div>
      <div className="auth-card">
        <div className="auth-logo">ANIME BOOTH</div>
        <div className="auth-tagline">Panel de Administración</div>
        <div className="auth-tabs">
          <button className={`auth-tab ${tab==='login'?'active':''}`} onClick={()=>{setTab('login');reset()}}>Iniciar Sesión</button>
          <button className={`auth-tab ${tab==='register'?'active':''}`} onClick={()=>{setTab('register');reset()}}>Registrarse</button>
        </div>
        {error && <div className="auth-error">⚠ {error}</div>}
        {success && <div className="auth-success">✓ {success}</div>}
        {tab === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="auth-field">
              <label className="auth-label">Correo Electrónico</label>
              <input className="auth-input" type="email" placeholder="admin@animebooth.com" value={email} onChange={e=>setEmail(e.target.value)} autoFocus/>
            </div>
            <div className="auth-field">
              <label className="auth-label">Contraseña</label>
              <input className="auth-input" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)}/>
            </div>
            <button className="auth-btn" type="submit" disabled={loading}>{loading ? 'INGRESANDO...' : 'INGRESAR →'}</button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="auth-field">
              <label className="auth-label">Nombre Completo</label>
              <input className="auth-input" type="text" placeholder="Tu nombre" value={name} onChange={e=>setName(e.target.value)} autoFocus/>
            </div>
            <div className="auth-field">
              <label className="auth-label">Correo Electrónico</label>
              <input className="auth-input" type="email" placeholder="tu@correo.com" value={email} onChange={e=>setEmail(e.target.value)}/>
            </div>
            <div className="auth-field">
              <label className="auth-label">Contraseña</label>
              <input className="auth-input" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e=>setPassword(e.target.value)}/>
            </div>
            <button className="auth-btn" type="submit" disabled={loading}>{loading ? 'REGISTRANDO...' : 'CREAR CUENTA →'}</button>
          </form>
        )}
        <div className="auth-divider">AnimeBooth · Fotocabina de Anime</div>
      </div>
    </div>
  )
}
