import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../auth/AuthContext'
import { LOGO_URL } from '../utils/helpers'

export default function Login() {
  const { login, loginError } = useAuth()
  const [splashDone, setSplashDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, formState:{ errors } } = useForm()

  useEffect(() => {
    // Particles
    const container = document.getElementById('login-particles')
    if (container) {
      for (let i=0; i<20; i++) {
        setTimeout(() => {
          const el = document.createElement('div')
          el.className = 'lp'
          const size = Math.random()*5+2
          el.style.cssText = `left:${Math.random()*100}%;width:${size}px;height:${size}px;animation-duration:${Math.random()*14+10}s;animation-delay:${Math.random()*8}s;border-radius:${Math.random()*50}%`
          container.appendChild(el)
        }, i * 150)
      }
    }
    const t = setTimeout(() => {
      const splash = document.getElementById('login-splash')
      if (splash) {
        splash.style.transition = 'opacity .5s ease'
        splash.style.opacity = '0'
        setTimeout(() => { splash.style.display='none'; setSplashDone(true) }, 500)
      }
    }, 1600)
    return () => clearTimeout(t)
  }, [])

  async function onSubmit(data) {
    setLoading(true)
    await login(data.employeeId, data.password)
    setLoading(false)
  }

  return (
    <div id="login-screen">
      {/* Splash */}
      <div id="login-splash">
        <div id="splash-ripple"/>
        <img id="splash-logo" src={LOGO_URL} alt="Henos Energy" onError={e=>e.target.style.display='none'} />
      </div>

      {/* Background */}
      <div id="login-bg">
        <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)'}} />
        <div id="login-bg-overlay"/>
      </div>
      <div id="login-particles"/>

      {/* Form */}
      <div id="login-form-wrap">
        <div className="login-card">
          <img className="login-logo" src={LOGO_URL} alt="Henos Energy" onError={e=>e.target.style.display='none'} />
          <div className="login-title">Welcome Back</div>
          <div className="login-sub">Henos Energy ERP — Secure Access</div>
          <hr className="login-divider"/>

          {loginError && (
            <div className="login-error" style={{display:'flex',alignItems:'center',gap:8}}>
              <span>⚠️</span><span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="login-field">
              <label>Employee ID</label>
              <input className="login-input"
                {...register('employeeId',{required:true})}
                type="text" placeholder="e.g. HN-JKA-1234"
                autoComplete="username" spellCheck="false" autoCapitalize="characters" />
              <div className="login-input-bar"/>
              {errors.employeeId && <div style={{color:'#fca5a5',fontSize:11,marginTop:4}}>Employee ID is required</div>}
            </div>
            <div className="login-field">
              <label>Password</label>
              <div style={{position:'relative'}}>
                <input className="login-input"
                  {...register('password',{required:true})}
                  type={showPassword ? 'text' : 'password'} placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{paddingRight:90}} />
                <button
                  type="button"
                  onClick={()=>setShowPassword(v=>!v)}
                  style={{
                    position:'absolute',
                    right:10,
                    top:'50%',
                    transform:'translateY(-50%)',
                    background:'transparent',
                    border:'none',
                    color:'#93c5fd',
                    fontSize:12,
                    fontWeight:700,
                    cursor:'pointer',
                    padding:'4px 6px'
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="login-input-bar"/>
              {errors.password && <div style={{color:'#fca5a5',fontSize:11,marginTop:4}}>Password is required</div>}
            </div>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  <span style={{width:16,height:16,border:'2px solid rgba(255,255,255,.4)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin .7s linear infinite'}}/>
                  Verifying…
                </span>
              ) : 'Sign In to ERP →'}
            </button>
          </form>

          <div className="login-divider"/>
          <div style={{background:'rgba(26,86,219,.08)',border:'1px solid rgba(26,86,219,.2)',borderRadius:10,padding:'10px 14px',fontSize:11,color:'#93c5fd',marginBottom:16}}>
            <div style={{fontWeight:700,marginBottom:4}}>🔒 Secure Access</div>
            <div style={{opacity:.8}}>Contact your Administrator for login credentials.<br/>Employee IDs are in format: HN-XXX-0000</div>
          </div>
          <div className="login-footer">Henos Energy Company Ltd. &nbsp;·&nbsp; Ghana &nbsp;·&nbsp; ERP v8.0</div>
        </div>
      </div>
    </div>
  )
}
