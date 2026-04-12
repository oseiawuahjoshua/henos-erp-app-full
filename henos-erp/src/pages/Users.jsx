import { useState } from 'react'
import { useAuth, ALL_MODULES, ROLES, ROLE_DEFAULTS } from '../auth/AuthContext'
import { useToast } from '../hooks/useToast'
import { PageHeader, Button, Field, Input, Select, Badge, ConfirmModal } from '../components/ui'
import { today } from '../utils/helpers'

const ROLE_COLOR = { admin:'#dc2626',manager:'#7c3aed',sales_rep:'#1a56db',accountant:'#16a34a',operations:'#d97706',viewer:'#6b7280' }
const DEPT_OPTIONS = ['Management','Sales','Accounts','Operations','IT','Field','Other']

export default function Users() {
  const { session, users, createUser, updateUser, deleteUser } = useAuth()
  const toast = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser]     = useState(null)
  const [viewUser, setViewUser]     = useState(null)
  const [delConfirm, setDelConfirm] = useState(null)
  const [lastCreated, setLastCreated] = useState(null) // {id, password, name}

  async function handleCreate(data) {
    try {
      const result = await createUser(data)
      setLastCreated({ id:result.id, password:result.password, name:data.name, phone:data.phone||'', email:data.email||'' })
      setCreateOpen(false)
      toast('success', `${data.name} registered successfully!`)
    } catch (error) {
      toast('error', error.message || 'Could not register user.')
    }
  }

  async function handleEdit(id, data) {
    try {
      await updateUser(id, data)
      setEditUser(null)
      toast('success', 'User updated.')
    } catch (error) {
      toast('error', error.message || 'Could not update user.')
    }
  }

  async function handleDelete() {
    try {
      await deleteUser(delConfirm)
      setDelConfirm(null)
      toast('success', 'User removed.')
    } catch (error) {
      toast('error', error.message || 'Could not remove user.')
    }
  }

  const isAdmin = session?.role === 'admin'

  return (
    <div style={{animation:'fadein .3s cubic-bezier(.4,0,.2,1)'}}>
      <PageHeader title="User Management" actions={
        isAdmin && <Button onClick={()=>setCreateOpen(true)}>+ Register Employee</Button>
      } />

      {/* Stats strip */}
      <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
        {[
          {l:'Total Users',v:users.length,c:'var(--a)'},
          {l:'Active',v:users.filter(u=>u.active!==false).length,c:'var(--g)'},
          {l:'Inactive',v:users.filter(u=>u.active===false).length,c:'var(--m)'},
          {l:'Admins',v:users.filter(u=>u.role==='admin').length,c:'#dc2626'},
        ].map(s=>(
          <div key={s.l} className="kc" style={{flex:'1 1 100px'}}>
            <div className="kl">{s.l}</div>
            <div className="kv" style={{color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* User cards grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
        {users.map(u => {
          const role = ROLES.find(r=>r.id===u.role)
          const isMe = session?.id === u.id
          const roleColor = ROLE_COLOR[u.role] || '#6b7280'
          return (
            <div key={u.id}
              style={{background:'var(--w)',border:`1.5px solid ${isMe?'var(--a)':'var(--b)'}`,borderRadius:14,overflow:'hidden',
                boxShadow:isMe?'0 0 0 3px rgba(26,86,219,.12)':'none',transition:'box-shadow .2s'}}>
              {/* Card header */}
              <div style={{background:u.active===false?'#f3f4f6':'linear-gradient(135deg,#0f172a,#1e3a5f)',padding:'16px 18px',display:'flex',alignItems:'center',gap:12}}>
                {/* Avatar */}
                <div style={{width:46,height:46,borderRadius:12,background:u.active===false?'#d1d5db':roleColor,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:16,fontWeight:800,color:'#fff',flexShrink:0,letterSpacing:'-.5px'}}>
                  {u.avatar||u.name?.slice(0,2).toUpperCase()||'?'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,color:u.active===false?'#6b7280':'#fff',
                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {u.name} {isMe&&<span style={{fontSize:10,background:'rgba(255,255,255,.15)',color:'rgba(255,255,255,.9)',borderRadius:6,padding:'1px 6px',marginLeft:4}}>You</span>}
                  </div>
                  <div style={{fontSize:11,color:u.active===false?'#9ca3af':'#94a3b8',marginTop:2,fontFamily:'monospace'}}>{u.id}</div>
                </div>
                <span style={{background:u.active===false?'#e5e7eb':'rgba(255,255,255,.12)',color:u.active===false?'#6b7280':'rgba(255,255,255,.85)',
                  fontSize:10,fontWeight:700,borderRadius:8,padding:'2px 8px',flexShrink:0}}>
                  {u.active===false?'Inactive':'Active'}
                </span>
              </div>

              {/* Card body */}
              <div style={{padding:'14px 18px'}}>
                {/* Role badge */}
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                  <span style={{background:roleColor+'18',color:roleColor,fontSize:11,fontWeight:700,borderRadius:8,padding:'3px 10px'}}>
                    {role?.label||u.role}
                  </span>
                  {u.department&&<span style={{fontSize:11,color:'var(--m)'}}>· {u.department}</span>}
                </div>

                {/* Details */}
                <div style={{display:'flex',flexDirection:'column',gap:5,marginBottom:12}}>
                  {u.email&&<div style={{fontSize:12,color:'var(--m)'}}>✉️ {u.email}</div>}
                  {u.phone&&<div style={{fontSize:12,color:'var(--m)'}}>📞 {u.phone}</div>}
                  <div style={{fontSize:11,color:'var(--m)'}}>📅 Registered: {u.createdAt}</div>
                  {u.lastLogin&&<div style={{fontSize:11,color:'var(--m)'}}>🕐 Last login: {new Date(u.lastLogin).toLocaleDateString('en-GH')}</div>}
                </div>

                {/* Module count */}
                <div style={{background:'var(--bg)',borderRadius:8,padding:'7px 10px',marginBottom:12,fontSize:11,color:'var(--m)',display:'flex',justifyContent:'space-between'}}>
                  <span>Module access</span>
                  <strong style={{color:'var(--a)'}}>{(u.modules||[]).length} / {ALL_MODULES.length}</strong>
                </div>

                {/* Actions */}
                {isAdmin && (
                  <div style={{display:'flex',gap:6}}>
                    <button className="btn btng btnsm" onClick={()=>setViewUser(u)} style={{flex:1,justifyContent:'center'}}>👁 View</button>
                    <button className="btn btng btnsm" onClick={()=>setEditUser(u)} style={{flex:1,justifyContent:'center'}}>✏️ Edit</button>
                    {!u.isDefault&&<button className="btn btnd btnsm" onClick={()=>setDelConfirm(u.id)}>🗑</button>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Create user modal */}
      {createOpen && <UserModal mode="create" onClose={()=>setCreateOpen(false)} onSave={handleCreate} />}

      {/* Edit user modal */}
      {editUser && <UserModal mode="edit" user={editUser} onClose={()=>setEditUser(null)} onSave={d=>handleEdit(editUser.id,d)} />}

      {/* View / Credentials modal */}
      {viewUser && <ViewUserModal user={viewUser} onClose={()=>setViewUser(null)} toast={toast} />}

      {/* Last created — show credentials */}
      {lastCreated && <CredentialsModal cred={lastCreated} onClose={()=>setLastCreated(null)} />}

      <ConfirmModal open={!!delConfirm} onClose={()=>setDelConfirm(null)} onConfirm={handleDelete}
        title="Remove User?" message="This will permanently remove the user's access. This action cannot be undone." confirmLabel="Remove User" />
    </div>
  )
}

// ── User Create / Edit Modal ──────────────────────────────────
function UserModal({ mode, user, onClose, onSave }) {
  const isEdit = mode==='edit'
  const [form, setForm] = useState({
    name:        user?.name||'',
    role:        user?.role||'sales_rep',
    email:       user?.email||'',
    phone:       user?.phone||'',
    department:  user?.department||'',
    password:    isEdit ? '' : '',
    modules:     user?.modules||ROLE_DEFAULTS['sales_rep'],
    active:      user?.active!==false,
  })
  const [errors, setErrors] = useState({})

  function setField(k,v) { setForm(p=>({...p,[k]:v})); setErrors(p=>({...p,[k]:''})) }

  function handleRoleChange(role) {
    setForm(p=>({...p, role, modules: ROLE_DEFAULTS[role]||['dashboard']}))
  }

  function toggleModule(modId) {
    setForm(p=>({...p, modules: p.modules.includes(modId) ? p.modules.filter(m=>m!==modId) : [...p.modules, modId]}))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name='Name is required'
    if (!isEdit && !form.password) e.password='Password is required'
    return e
  }

  function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    const data = { ...form }
    if (isEdit && !data.password) delete data.password
    onSave(data)
  }

  return (
    <div className="mov on" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="mdl" style={{width:'min(580px,96vw)',maxHeight:'90vh',overflowY:'auto',borderRadius:16}}>
        {/* Header */}
        <div style={{background:'linear-gradient(135deg,#0f172a,#1e3a5f)',padding:'20px 24px'}}>
          <div style={{fontWeight:800,fontSize:17,color:'#fff'}}>{isEdit?'✏️ Edit User':'👤 Register New Employee'}</div>
          <div style={{fontSize:12,color:'#94a3b8',marginTop:4}}>
            {isEdit?'Update employee details and access permissions':'Fill in all details to create the employee account'}
          </div>
        </div>

        <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:16}}>
          {/* Name + Department */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Field label="Full Name" required error={errors.name}>
              <Input value={form.name} onChange={e=>setField('name',e.target.value)} placeholder="e.g. Joseph Mensah" />
            </Field>
            <Field label="Department">
              <select value={form.department} onChange={e=>setField('department',e.target.value)}
                style={{border:'1.5px solid var(--b)',borderRadius:7,padding:'9px 11px',fontSize:13,outline:'none',fontFamily:'inherit',width:'100%',background:'var(--w)',color:'var(--t)'}}>
                <option value="">Select…</option>
                {DEPT_OPTIONS.map(d=><option key={d}>{d}</option>)}
              </select>
            </Field>
          </div>

          {/* Contact */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Field label="Email Address">
              <Input type="email" value={form.email} onChange={e=>setField('email',e.target.value)} placeholder="name@henosenergy.com" />
            </Field>
            <Field label="Phone Number" hint="For SMS credentials delivery">
              <Input type="tel" value={form.phone} onChange={e=>setField('phone',e.target.value)} placeholder="e.g. 0244123456" />
            </Field>
          </div>

          {/* Password */}
          <Field label={isEdit?"New Password (leave blank to keep current)":"Password"} error={errors.password}
            hint={!isEdit?"Min 8 characters. Share securely with the employee.":""}>
            <Input type="text" value={form.password} onChange={e=>setField('password',e.target.value)}
              placeholder={isEdit?"Leave blank to keep current password":"Set a secure password"} />
          </Field>

          {/* Role */}
          <div>
            <label style={{fontSize:10,fontWeight:600,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:8}}>Role</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:8}}>
              {ROLES.map(r=>(
                <button key={r.id} type="button" onClick={()=>handleRoleChange(r.id)}
                  style={{border:`2px solid ${form.role===r.id?r.color:'var(--b)'}`,borderRadius:10,padding:'10px 12px',
                    background:form.role===r.id?r.color+'12':'var(--w)',cursor:'pointer',textAlign:'left',transition:'all .15s'}}>
                  <div style={{fontWeight:700,fontSize:12,color:form.role===r.id?r.color:'var(--t)'}}>{r.label}</div>
                  <div style={{fontSize:10,color:'var(--m)',marginTop:2}}>{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Module access */}
          <div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <label style={{fontSize:10,fontWeight:600,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.5px'}}>
                Module Access — {form.modules.length} selected
              </label>
              <div style={{display:'flex',gap:6}}>
                <button type="button" className="btn btng btnsm"
                  onClick={()=>setForm(p=>({...p,modules:ALL_MODULES.map(m=>m.id)}))}>All</button>
                <button type="button" className="btn btng btnsm"
                  onClick={()=>setForm(p=>({...p,modules:['dashboard']}))}>Reset</button>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:7}}>
              {ALL_MODULES.map(m=>{
                const on = form.modules.includes(m.id)
                return (
                  <button key={m.id} type="button" onClick={()=>toggleModule(m.id)}
                    style={{border:`1.5px solid ${on?'var(--a)':'var(--b)'}`,borderRadius:8,padding:'8px 10px',
                      background:on?'var(--as)':'var(--w)',cursor:'pointer',
                      display:'flex',alignItems:'center',gap:7,transition:'all .15s'}}>
                    <span style={{fontSize:14}}>{m.icon}</span>
                    <span style={{fontSize:11,fontWeight:on?700:500,color:on?'var(--a)':'var(--m)'}}>{m.label}</span>
                    {on&&<span style={{marginLeft:'auto',fontSize:14,color:'var(--g)'}}>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Active toggle (edit only) */}
          {isEdit&&(
            <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:10,background:'var(--bg)'}}>
              <button type="button" onClick={()=>setField('active',!form.active)}
                style={{width:44,height:24,borderRadius:12,position:'relative',border:'none',cursor:'pointer',
                  background:form.active?'var(--g)':'#d1d5db',transition:'background .2s',flexShrink:0}}>
                <span style={{position:'absolute',top:2,width:20,height:20,background:'#fff',borderRadius:'50%',
                  boxShadow:'0 1px 3px rgba(0,0,0,.2)',transition:'left .2s',left:form.active?22:2}}/>
              </button>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>Account {form.active?'Active':'Inactive'}</div>
                <div style={{fontSize:11,color:'var(--m)'}}>Inactive users cannot log in</div>
              </div>
            </div>
          )}
        </div>

        <div style={{padding:'12px 24px',borderTop:'1.5px solid var(--b)',display:'flex',gap:8}}>
          <button className="btn btnp btnmd btnfw" onClick={handleSubmit}>
            {isEdit?'💾 Save Changes':'✅ Register Employee'}
          </button>
          <button className="btn btng btnmd" onClick={onClose} style={{flexShrink:0}}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── View User + Credentials Modal ─────────────────────────────
function ViewUserModal({ user, onClose, toast }) {
  const roleColor = ROLE_COLOR[user.role]||'#6b7280'
  const role = ROLES.find(r=>r.id===user.role)

  function copyToClipboard(text, label) {
    navigator.clipboard?.writeText(text).then(()=>toast('success',`${label} copied!`)).catch(()=>{})
  }

  return (
    <div className="mov on" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="mdl" style={{width:'min(460px,96vw)',borderRadius:16,overflow:'hidden'}}>
        {/* Header */}
        <div style={{background:'linear-gradient(135deg,#0f172a,#1e3a5f)',padding:'20px 24px',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:52,height:52,borderRadius:14,background:roleColor,
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800,color:'#fff',flexShrink:0}}>
            {user.avatar||user.name?.slice(0,2).toUpperCase()}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:800,fontSize:16,color:'#fff'}}>{user.name}</div>
            <div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>{role?.label||user.role} · {user.department||'—'}</div>
          </div>
          <button className="dc" onClick={onClose}>×</button>
        </div>

        <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:12}}>
          {/* Credentials box */}
          <div style={{background:'#0f172a',borderRadius:12,padding:'16px 18px',border:'1px solid rgba(26,86,219,.3)'}}>
            <div style={{fontSize:10,color:'#64748b',textTransform:'uppercase',letterSpacing:'.8px',marginBottom:12,fontWeight:700}}>
              🔐 Login Access
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[['Employee ID',user.id]].map(([l,v])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                  background:'rgba(255,255,255,.04)',borderRadius:8,padding:'8px 12px'}}>
                  <div>
                    <div style={{fontSize:10,color:'#64748b',marginBottom:2}}>{l}</div>
                    <div style={{fontSize:14,fontWeight:700,color:'#e2e8f0',fontFamily:'monospace'}}>{v}</div>
                  </div>
                  <button onClick={()=>copyToClipboard(user.id,l)}
                    style={{background:'rgba(26,86,219,.2)',border:'none',borderRadius:6,padding:'5px 10px',
                      fontSize:11,color:'#93c5fd',cursor:'pointer'}}>
                    Copy
                  </button>
                </div>
              ))}
            </div>
            <div style={{marginTop:12,fontSize:11,color:'#94a3b8',lineHeight:1.6}}>
              Passwords are stored securely in the backend and can’t be viewed again here.
              Reset the password from Edit User if this employee needs a new one.
            </div>
          </div>

          {/* Module access */}
          <div>
            <div style={{fontSize:10,fontWeight:600,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8}}>
              Module Access ({(user.modules||[]).length})
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {ALL_MODULES.map(m=>{
                const on=(user.modules||[]).includes(m.id)
                return (
                  <span key={m.id} style={{fontSize:11,fontWeight:on?600:400,
                    background:on?'var(--as)':'var(--bg)',color:on?'var(--a)':'var(--m)',
                    border:`1px solid ${on?'var(--b)':'transparent'}`,
                    borderRadius:7,padding:'3px 9px',opacity:on?1:.5}}>
                    {m.icon} {m.label}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Info */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {[['Email',user.email||'—'],['Phone',user.phone||'—'],['Registered',user.createdAt],
              ['Last Login',user.lastLogin?new Date(user.lastLogin).toLocaleDateString('en-GH'):'Never']
            ].map(([l,v])=>(
              <div key={l} style={{background:'var(--bg)',borderRadius:8,padding:'9px 12px'}}>
                <div style={{fontSize:10,color:'var(--m)',marginBottom:2}}>{l}</div>
                <div style={{fontSize:12,fontWeight:600,wordBreak:'break-all'}}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{padding:'12px 24px',borderTop:'1.5px solid var(--b)'}}>
          <button className="btn btng btnmd btnfw" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Credentials display after creation ────────────────────────
function CredentialsModal({ cred, onClose }) {
  const [copied, setCopied] = useState(false)

  function copyAll() {
    const text = `Henos Energy ERP — Login Credentials\nName: ${cred.name}\nEmployee ID: ${cred.id}\nPassword: ${cred.password}\nLogin URL: https://henosenergy.com/erp`
    navigator.clipboard?.writeText(text).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000) })
  }

  function sendWhatsApp() {
    const msg = `*Henos Energy ERP Access*\n\nDear ${cred.name},\n\nYour login credentials:\n*Employee ID:* ${cred.id}\n*Password:* ${cred.password}\n\nLogin at: henosenergy.com/erp\n\n_Please change your password after first login and keep these credentials confidential._`
    const tel = cred.phone?.replace(/\s+/g,'')
    if (!tel) { window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,'_blank'); return }
    window.open(`https://wa.me/233${tel.replace(/^0/,'')}?text=${encodeURIComponent(msg)}`,'_blank')
  }

  return (
    <div className="mov on">
      <div className="mdl" style={{width:'min(440px,96vw)',borderRadius:16,overflow:'hidden'}}>
        {/* Header */}
        <div style={{background:'linear-gradient(135deg,#1A7A4A,#16a34a)',padding:'20px 24px',textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:8}}>🎉</div>
          <div style={{fontSize:18,fontWeight:800,color:'#fff'}}>{cred.name}</div>
          <div style={{fontSize:12,color:'rgba(255,255,255,.8)',marginTop:4}}>Employee registered successfully!</div>
        </div>

        <div style={{padding:'20px 24px'}}>
          <div style={{background:'#0f172a',borderRadius:12,padding:'18px 20px',marginBottom:16}}>
            <div style={{fontSize:10,color:'#64748b',textTransform:'uppercase',letterSpacing:'.8px',marginBottom:14,fontWeight:700}}>
              🔐 Login Credentials — Share with Employee
            </div>
            {[['Employee ID',cred.id,'monospace','#93c5fd'],['Password',cred.password,'monospace','#4ade80']].map(([l,v,ff,col])=>(
              <div key={l} style={{marginBottom:12}}>
                <div style={{fontSize:10,color:'#64748b',marginBottom:4}}>{l}</div>
                <div style={{fontSize:17,fontWeight:800,color:col,fontFamily:ff,
                  background:'rgba(255,255,255,.05)',borderRadius:8,padding:'10px 14px',letterSpacing:'.5px'}}>
                  {v}
                </div>
              </div>
            ))}
          </div>

          <div className="ibar iw" style={{marginBottom:16}}>
            <span>⚠️</span>
            <span>Share these credentials securely. The employee should change their password after first login. <strong>These will not be shown again.</strong></span>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <button onClick={copyAll} className="btn btnp btnmd btnfw">
              {copied?'✅ Copied!':'📋 Copy Credentials to Clipboard'}
            </button>
            <button onClick={sendWhatsApp}
              style={{background:'#25d366',border:'none',borderRadius:8,padding:'11px',
                fontSize:13,fontWeight:700,color:'#fff',cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              📱 Send via WhatsApp
            </button>
            <button className="btn btng btnmd btnfw" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  )
}
