import { useRef } from 'react'
import { useApp } from '../context/AppContext'

const VARIANT = { neutral:'bn', success:'bs', danger:'bd', warning:'bw', info:'bi', ops:'bo' }
export function Badge({ variant='neutral', children }) {
  return <span className={`bx ${VARIANT[variant]||'bn'}`}>{children}</span>
}
export function RepBadge({ name, colors }) {
  if (!name) return <span style={{color:'var(--m)',fontSize:11}}>—</span>
  const c = colors?.[name] || '#8A92A3'
  return <span className="rep" style={{background:c+'18',color:c,border:`1px solid ${c}33`}}>{name}</span>
}
export function Button({ variant='primary', size='md', className='', children, ...props }) {
  const v = {primary:'btnp',ghost:'btng',danger:'btnd',success:'btns',secondary:'btng'}[variant]||'btnp'
  const s = {sm:'btnsm',md:'btnmd'}[size]||'btnmd'
  return <button className={`btn ${v} ${s} ${className}`} {...props}>{children}</button>
}
export function KpiCard({ label, value, note, valueStyle={} }) {
  return (
    <div className="kc">
      <div className="kl">{label}</div>
      <div className="kv" style={valueStyle}>{value}</div>
      {note && <div className="kn">{note}</div>}
    </div>
  )
}
export function Panel({ children, style }) {
  return <div className="panel" style={style}>{children}</div>
}
export function PanelHeader({ title, actions }) {
  return (
    <div className="phd">
      <span className="ptl2">{title}</span>
      {actions && <div style={{display:'flex',gap:7,alignItems:'center',flexWrap:'wrap'}}>{actions}</div>}
    </div>
  )
}
export function PanelBody({ noPad, children }) {
  return <div className={`pb${noPad?' np':''}`}>{children}</div>
}
export function Table({ columns, rows, empty='No records yet' }) {
  if (!rows?.length) return (
    <div className="emp"><div className="eic">📂</div><div className="eti">{empty}</div><div className="esb">Use the button above to add your first entry.</div></div>
  )
  return (
    <div className="tw">
      <table><thead><tr>{columns.map((c,i)=><th key={i}>{c}</th>)}</tr></thead>
      <tbody>{rows.map((row,ri)=><tr key={ri}>{row.map((cell,ci)=><td key={ci}>{cell}</td>)}</tr>)}</tbody></table>
    </div>
  )
}
export function EmptyState({ icon='📂', message='No records yet', sub='Use the button above to add your first entry.' }) {
  return <div className="emp"><div className="eic">{icon}</div><div className="eti">{message}</div>{sub&&<div className="esb">{sub}</div>}</div>
}
export function InfoBar({ type='ib', children, onClick }) {
  return <div className={`ibar ${type}`} onClick={onClick}>{children}</div>
}
export function Pills({ tabs, active, onChange }) {
  return (
    <div className="pills">
      {tabs.map(t=>(
        <button key={t.id} className={`pill${active===t.id?' on':''}`} onClick={()=>onChange(t.id)} style={{position:'relative'}}>
          {t.label}
          {t.badge ? <span style={{position:'absolute',top:-5,right:-5,background:'var(--am)',color:'#fff',fontSize:9,fontWeight:700,borderRadius:8,padding:'0 4px'}}>{t.badge}</span> : null}
        </button>
      ))}
    </div>
  )
}
export function PageHeader({ title, actions }) {
  return (
    <div className="ph">
      <div className="ptl">{title}</div>
      {actions && <div style={{display:'flex',gap:7,alignItems:'center',flexWrap:'wrap'}}>{actions}</div>}
    </div>
  )
}
export function Field({ label, hint, error, children, required }) {
  return (
    <div className="fld">
      {label && <label>{label}{required&&<span style={{color:'var(--r)',marginLeft:2}}>*</span>}</label>}
      {children}
      {hint && !error && <div className="hint">{hint}</div>}
      {error && <div className="hint" style={{color:'var(--r)'}}>{error}</div>}
    </div>
  )
}
export function Input(props) { return <input {...props} /> }
export function Select({ children, ...props }) { return <select {...props}>{children}</select> }
export function Drawer({ open, onClose, title, children, footer }) {
  return (
    <>
      <div className={`dov${open?' on':''}`} onClick={onClose} />
      <div className={`drw${open?' on':''}`}>
        <div className="dh"><span className="dt">{title}</span><button className="dc" onClick={onClose}>×</button></div>
        <div className="db">{children}</div>
        {footer && <div className="df">{footer}</div>}
      </div>
    </>
  )
}
export function Modal({ open, onClose, children, className='', panelClassName='' }) {
  if (!open) return null
  return (
    <div className={`mov on ${className}`.trim()} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className={`mdl ${panelClassName}`.trim()}>{children}</div>
    </div>
  )
}
export function DetailModal({ open, onClose, title, subtitle, actions, children, size='lg' }) {
  if (!open) return null
  return (
    <Modal open={open} onClose={onClose} className="detail-modal-shell" panelClassName={`detail-modal detail-${size}`}>
      <div className="detail-head">
        <div>
          <div className="detail-kicker">Saved Record</div>
          <div className="detail-title">{title}</div>
          {subtitle && <div className="detail-sub">{subtitle}</div>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {actions}
          <button className="dc detail-close" onClick={onClose}>×</button>
        </div>
      </div>
      <div className="detail-body">{children}</div>
    </Modal>
  )
}
export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel='Delete', danger=true }) {
  if (!open) return null
  return (
    <Modal open={open} onClose={onClose}>
      <div style={{padding:22}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:8}}>{title}</div>
        <div style={{fontSize:12,color:'var(--m)',marginBottom:18}}>{message}</div>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button className="btn btng btnmd" onClick={onClose}>Cancel</button>
          <button className={`btn ${danger?'btnd':'btnp'} btnmd`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </Modal>
  )
}
export function ToastContainer() {
  const { state } = useApp()
  return (
    <div id="toasts">
      {state.toasts.map(t=>(
        <div key={t.id} className={`toast ${t.type==='success'?'ts':t.type==='info'?'ti':'te'}`}>
          {t.type==='success'?'✅ ':t.type==='info'?'ℹ️ ':'❌ '}{t.message}
        </div>
      ))}
    </div>
  )
}
export function NotifBell({ notifKey }) {
  const { state, dispatch } = useApp()
  const notifs = state.db[notifKey] || []
  const unread = notifs.filter(n=>!n.read).length
  const panelRef = useRef(null)
  function toggle() { panelRef.current?.classList.toggle('on') }
  function markAll() { dispatch({type:'NOTIF_READ_ALL',key:notifKey}); panelRef.current?.classList.remove('on') }
  function markOne(id) { dispatch({type:'NOTIF_READ_ONE',key:notifKey,id}) }
  const icon = {approved:'✅',rejected:'❌',invoice:'🧾',delivered:'📦'}
  const bg   = {approved:'ua',rejected:'ure',invoice:'ua',delivered:'ud'}
  return (
    <div className="nbell">
      <button className={`nbb${unread?' unr':''}`} onClick={toggle}>
        🔔{unread?<span className="nbc2">{unread}</span>:null}
      </button>
      <div className="npn" ref={panelRef}>
        <div className="nph2">
          <div style={{fontWeight:700,fontSize:15}}>🔔 Notifications{unread?<span style={{background:'var(--r)',color:'#fff',fontSize:10,fontWeight:700,borderRadius:8,padding:'1px 7px',marginLeft:8}}>{unread}</span>:null}</div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {unread>0&&<button className="nmar" onClick={markAll}>Mark all read</button>}
            <button onClick={toggle} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'var(--m)',lineHeight:1,padding:'0 4px'}}>×</button>
          </div>
        </div>
        <div className="nls">
          {notifs.length===0
            ? <div style={{padding:'32px 16px',textAlign:'center',color:'var(--m)',fontSize:13}}>No notifications yet.</div>
            : notifs.map(n=>(
              <div key={n.id} className={`nit${n.read?'':' '+(bg[n.type]||'ud')}`} onClick={()=>markOne(n.id)}>
                <span style={{fontSize:18,flexShrink:0,marginTop:2}}>{icon[n.type]||'📦'}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div className="nitt">{n.title}</div>
                  <div className="nitm">{n.message}</div>
                  <div className="ndt">{n.time||''}</div>
                </div>
                {!n.read&&<span style={{width:8,height:8,borderRadius:'50%',background:'var(--g)',flexShrink:0,marginTop:6,display:'block'}}/>}
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

// ── Aliases so all pages keep working ────────────────────────
export function Card({ children, style, className }) {
  return <div className={`panel${className?' '+className:''}`} style={style}>{children}</div>
}
export function CardHeader({ title, actions }) {
  return (
    <div className="phd">
      <span className="ptl2">{title}</span>
      {actions && <div style={{display:'flex',gap:7,alignItems:'center',flexWrap:'wrap'}}>{actions}</div>}
    </div>
  )
}
export function CardBody({ noPad, children }) {
  return <div className={`pb${noPad?' np':''}`}>{children}</div>
}
