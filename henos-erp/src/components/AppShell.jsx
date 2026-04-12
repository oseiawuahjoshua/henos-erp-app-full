import { useState } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router'
import { useApp } from '../context/AppContext'
import { useAuth } from '../auth/AuthContext'
import { ToastContainer } from './ui'
import { LOGO_URL } from '../utils/helpers'
import Dashboard  from '../pages/Dashboard'
import Commercial from '../pages/Commercial'
import Accounts   from '../pages/Accounts'
import Operations from '../pages/Operations'
import Marketing  from '../pages/Marketing'
import Stations   from '../pages/Stations'
import EaziGas    from '../pages/EaziGas'
import ESG        from '../pages/ESG'
import Settings   from '../pages/Settings'
import Users      from '../pages/Users'

const NAV = [
  {id:'dashboard', l:'Dashboard',      i:'⬡', path:'/'},
  {id:'commercial',l:'Commercial',     i:'◈', path:'/commercial'},
  {id:'accounts',  l:'Accounts',       i:'◎', path:'/accounts'},
  {id:'operations',l:'Operations',     i:'⬢', path:'/operations'},
  {id:'marketing', l:'Branding',       i:'◆', path:'/marketing'},
  {id:'stations',  l:'LPG Stations',   i:'⛽', path:'/stations'},
  {id:'eazigas',   l:'EaziGas',        i:'🔄', path:'/eazigas'},
  {id:'esg',       l:'ESG Compliance', i:'🌿', path:'/esg'},
  {id:'users',     l:'Users',          i:'👥', path:'/users'},
  {id:'settings',  l:'Settings',       i:'⚙️', path:'/settings'},
]
const PRIMARY_IDS = ['dashboard','commercial','accounts','operations','stations']

// Restricted route wrapper
function Protected({ moduleId, children }) {
  const { canAccess } = useAuth()
  if (!canAccess(moduleId)) {
    return (
      <div style={{padding:'40px 24px',textAlign:'center'}}>
        <div style={{fontSize:36,marginBottom:12}}>🔒</div>
        <div style={{fontSize:18,fontWeight:700,color:'var(--r)',marginBottom:8}}>Access Restricted</div>
        <div style={{fontSize:13,color:'var(--m)'}}>You don't have permission to access this module.<br/>Contact your Administrator.</div>
      </div>
    )
  }
  return children
}

export default function AppShell() {
  const { state } = useApp()
  const { session, logout, canAccess } = useAuth()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [moreOpen,   setMoreOpen]   = useState(false)

  const pendingOrders = state.db.orders.filter(o=>o.status==='Awaiting Ops Review').length
  const unreadC = state.db.cnotifs.filter(n=>!n.read).length
  const unreadA = state.db.anotifs.filter(n=>!n.read).length
  const totalAlerts = pendingOrders + unreadC + unreadA

  function alertCount(id) {
    if(id==='operations') return pendingOrders
    if(id==='commercial') return unreadC
    if(id==='accounts')   return unreadA
    return 0
  }

  function toggleDark() { document.body.classList.toggle('dark') }
  function toggleSb()   { document.getElementById('sb')?.classList.toggle('on');  document.getElementById('sbov')?.classList.toggle('on') }
  function closeSb()    { document.getElementById('sb')?.classList.remove('on');  document.getElementById('sbov')?.classList.remove('on') }
  function toggleMore() { document.getElementById('mob-more')?.classList.toggle('open'); document.getElementById('mob-more-ov')?.classList.toggle('open'); setMoreOpen(p=>!p) }
  function closeMore()  { document.getElementById('mob-more')?.classList.remove('open'); document.getElementById('mob-more-ov')?.classList.remove('open'); setMoreOpen(false) }

  // Only show nav items user can access
  const visibleNav = NAV.filter(n => canAccess(n.id))
  const primary    = visibleNav.filter(n => PRIMARY_IDS.includes(n.id))
  const more       = visibleNav.filter(n => !PRIMARY_IDS.includes(n.id))

  const roleLabel = { admin:'Administrator',manager:'Manager',sales_rep:'Sales Rep',accountant:'Accounts',operations:'Operations',viewer:'Viewer' }

  return (
    <>
      <div id="shell">
        <div id="sbov" onClick={closeSb} />
        {/* SIDEBAR */}
        <div id="sb">
          <div className="sbl">
            <button id="sbcl" onClick={closeSb}>×</button>
            <img src={LOGO_URL} alt="Henos Energy" onError={e=>e.target.style.display='none'} />
            <div className="sberp">ERP System</div>
          </div>

          {/* User pill */}
          <div style={{padding:'10px 12px',borderBottom:'1px solid #2a2a2a'}}>
            <div style={{display:'flex',alignItems:'center',gap:9,padding:'8px 10px',borderRadius:10,background:'rgba(255,255,255,.05)'}}>
              <div style={{width:32,height:32,borderRadius:9,background:'var(--a)',
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#fff',flexShrink:0}}>
                {session?.avatar||'?'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:'#e2e8f0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{session?.name||'User'}</div>
                <div style={{fontSize:10,color:'#64748b'}}>{roleLabel[session?.role]||session?.role}</div>
              </div>
            </div>
          </div>

          <nav id="sbnav">
            {visibleNav.map(n=>{
              const count = alertCount(n.id)
              return (
                <NavLink key={n.id} to={n.path} end={n.path==='/'} onClick={closeSb}
                  className={({isActive})=>`nb${isActive?' on':count>0?' al':''}`}>
                  <span style={{fontSize:14}}>{n.i}</span>
                  <span style={{flex:1}}>{n.l}</span>
                  {count>0&&<span style={{background:'var(--am)',color:'#fff',fontSize:10,fontWeight:700,borderRadius:8,padding:'1px 6px'}}>{count}</span>}
                </NavLink>
              )
            })}
          </nav>
          <div className="sbft">
            <div>v8.0 · 2025</div>
            <div style={{marginTop:2,color:'#333'}}>Henos Energy Ltd.</div>
            <button onClick={()=>setLogoutOpen(true)}
              style={{marginTop:10,width:'100%',display:'flex',alignItems:'center',gap:7,padding:'9px 11px',
                borderRadius:8,border:'1px solid #333',background:'transparent',color:'#888',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
              <span>🚪</span><span>Log Out</span>
            </button>
          </div>
        </div>

        {/* MAIN */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
          {/* TOPBAR */}
          <div id="topbar">
            <button className="hbg" onClick={toggleSb}>☰</button>
            <img className="tlo" src={LOGO_URL} alt="Henos" onError={e=>e.target.style.display='none'} />
            <div style={{flex:1}} />
            {/* User chip on mobile */}
            <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(255,255,255,.08)',borderRadius:8,padding:'4px 8px'}}>
              <div style={{width:22,height:22,borderRadius:6,background:'var(--a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'#fff'}}>
                {session?.avatar||'?'}
              </div>
              <span style={{fontSize:11,color:'#e2e8f0',fontWeight:600}}>{session?.name?.split(' ')[0]}</span>
            </div>
            {totalAlerts>0&&<span className="tac">{totalAlerts}</span>}
          </div>

          <div id="main">
            <Routes>
              <Route path="/"           element={<Protected moduleId="dashboard"><Dashboard /></Protected>} />
              <Route path="/commercial" element={<Protected moduleId="commercial"><Commercial /></Protected>} />
              <Route path="/accounts"   element={<Protected moduleId="accounts"><Accounts /></Protected>} />
              <Route path="/operations" element={<Protected moduleId="operations"><Operations /></Protected>} />
              <Route path="/marketing"  element={<Protected moduleId="marketing"><Marketing /></Protected>} />
              <Route path="/stations"   element={<Protected moduleId="stations"><Stations /></Protected>} />
              <Route path="/eazigas"    element={<Protected moduleId="eazigas"><EaziGas /></Protected>} />
              <Route path="/esg"        element={<Protected moduleId="esg"><ESG /></Protected>} />
              <Route path="/users"      element={<Protected moduleId="users"><Users /></Protected>} />
              <Route path="/settings"   element={<Protected moduleId="settings"><Settings /></Protected>} />
              <Route path="*"           element={<Navigate to="/" replace />} />
            </Routes>
          </div>

          {/* BOTTOM NAV */}
          <div id="btmnav" style={{display:'flex',borderTop:'1px solid var(--b)',background:'#fff',flexShrink:0}}>
            {primary.map(n=>{
              const count=alertCount(n.id)
              return (
                <NavLink key={n.id} to={n.path} end={n.path==='/'} className={({isActive})=>`mnb${isActive?' on':count>0?' al':''}`}>
                  {({isActive})=><>
                    {count>0&&!isActive&&<span className="mnal">{count}</span>}
                    <span className="mni">{n.i}</span>
                    <span className="mnl">{n.l.split(' ')[0]}</span>
                    {isActive&&<span className="mnbar"/>}
                  </>}
                </NavLink>
              )
            })}
            {more.length>0&&<button className={`mnb${moreOpen?' on':''}`} onClick={toggleMore}>
              <span className="mni">⋯</span><span className="mnl">More</span>{moreOpen&&<span className="mnbar"/>}
            </button>}
          </div>
        </div>
      </div>

      <button id="dm-toggle" onClick={toggleDark}>🌙</button>
      <div id="mob-more-ov" onClick={closeMore} />
      <div id="mob-more">
        {more.map(n=>(
          <NavLink key={n.id} to={n.path} className={({isActive})=>`mob-more-item${isActive?' on':''}`} onClick={closeMore}>
            <span className="mob-more-icon">{n.i}</span>
            <span className="mob-more-label">{n.l}</span>
          </NavLink>
        ))}
      </div>

      {logoutOpen&&(
        <div className="mov on" onClick={e=>{if(e.target===e.currentTarget)setLogoutOpen(false)}}>
          <div className="mdl" style={{borderRadius:16,overflow:'hidden'}}>
            {/* Logout header */}
            <div style={{background:'linear-gradient(135deg,#0f172a,#1e3a5f)',padding:'20px 24px',display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:44,height:44,borderRadius:12,background:'var(--a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:'#fff',flexShrink:0}}>
                {session?.avatar||'?'}
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:15,color:'#fff'}}>{session?.name}</div>
                <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{session?.id}</div>
              </div>
            </div>
            <div style={{padding:22}}>
              <div style={{fontSize:13,color:'var(--m)',marginBottom:20}}>Are you sure you want to log out? Your session will end.</div>
              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button className="btn btng btnmd" onClick={()=>setLogoutOpen(false)}>Stay Logged In</button>
                <button className="btn btnd btnmd" onClick={logout}>Log Out</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ToastContainer />
    </>
  )
}
