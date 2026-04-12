import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useApp } from '../context/AppContext'
import { useToast } from '../hooks/useToast'
import { uid, today, EAZIGAS_CYLS, calcEpClosing, LOGO_URL } from '../utils/helpers'
import { PageHeader, Card, CardHeader, CardBody, Button, Field, Input, EmptyState, ConfirmModal } from '../components/ui'

// ── Table cell style helpers ──────────────────────────────────
const TH = (bg, color='#fff', extra={}) => ({
  padding:'8px 10px', border:'1px solid rgba(0,0,0,.08)',
  fontSize:10, fontWeight:800, textAlign:'center',
  textTransform:'uppercase', letterSpacing:'.5px',
  background:bg, color, ...extra
})
const TD = (color='#1e3a5f', bg='transparent', extra={}) => ({
  padding:'8px 10px', border:'1px solid rgba(0,0,0,.06)',
  fontSize:12, textAlign:'center', verticalAlign:'middle',
  color, background:bg, ...extra
})

export default function EaziGas() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const { exchangePoints } = state
  const [curEP, setCurEP]           = useState(null)
  const [addOpen, setAddOpen]       = useState(false)
  const [editEP, setEditEP]         = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  const totalAlerts = exchangePoints.reduce((s, ep) => s + getAlerts(ep).length, 0)

  function getAlerts(ep) {
    if (!ep.records.length) return []
    const latest = ep.records[0]
    return EAZIGAS_CYLS.flatMap((cyl, ci) => {
      const r = latest.rows[ci] || {}
      const { cf, ce } = calcEpClosing(r)
      const out = []
      if (cf < 10) out.push({ type:'low', cyl, val:cf })
      if (ce > 10) out.push({ type:'retrieve', cyl, val:ce })
      return out
    })
  }

  function handleSelect(id) {
    setCurEP(prev => prev === id ? null : id)
    setTimeout(() => document.getElementById(`ep-detail-${id}`)?.scrollIntoView({ behavior:'smooth', block:'start' }), 50)
  }

  function doDeleteEP() {
    if (curEP === confirmDel) setCurEP(null)
    dispatch({ type:'EP_DELETE', epId:confirmDel })
    toast('success','Exchange point removed.')
    setConfirmDel(null)
  }

  return (
    <div style={{animation:'fadein .3s cubic-bezier(.4,0,.2,1)'}}>
      <PageHeader title="EaziGas Exchange Points" actions={<Button onClick={()=>setAddOpen(true)}>+ Add Exchange Point</Button>} />

      {totalAlerts > 0 && (
        <div className="ibar ir">
          <span>⚠️</span><span><strong>{totalAlerts} alert{totalAlerts>1?'s':''}</strong> across exchange points — check closing stock below</span>
        </div>
      )}
      <div className="ibar ig" style={{marginBottom:20}}>
        <span>🔄</span><span><strong>EaziGas</strong> — Ghana Cylinder Recirculation Module. Click an exchange point to record daily stock.</span>
      </div>

      {/* EP Grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:14,marginBottom:24}}>
        {exchangePoints.map(ep => {
          const alerts   = getAlerts(ep)
          const lowCount = alerts.filter(a=>a.type==='low').length
          const retCount = alerts.filter(a=>a.type==='retrieve').length
          const latest   = ep.records.length ? ep.records[0].date : ''
          const selected = curEP === ep.id
          const borderColor = selected ? '#0d9488' : lowCount ? '#dc2626' : retCount ? '#d97706' : 'var(--b)'
          const bgColor     = selected ? '#f0fdfa' : '#fff'
          return (
            <div key={ep.id} onClick={()=>handleSelect(ep.id)}
              style={{background:bgColor,borderRadius:14,padding:'16px 18px',cursor:'pointer',
                border:`2px solid ${borderColor}`,transition:'all .18s',
                boxShadow:selected?'0 4px 20px rgba(13,148,136,.15)':'0 1px 4px rgba(0,0,0,.05)'}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:22,marginBottom:6}}>🔄</div>
                  <div style={{fontWeight:700,fontSize:14,color:selected?'#0d9488':'#0D0F14'}}>{ep.name}</div>
                  <div style={{fontSize:11,color:'var(--m)',marginTop:3}}>📍 {ep.location}</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:4,alignItems:'flex-end'}}>
                  {lowCount>0&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:10,fontWeight:700,borderRadius:8,padding:'2px 8px'}}>🚨 Low stock</span>}
                  {retCount>0&&!lowCount&&<span style={{background:'#fffbeb',color:'#d97706',fontSize:10,fontWeight:700,borderRadius:8,padding:'2px 8px'}}>⚠️ Empties</span>}
                </div>
              </div>
              <div style={{marginTop:12,padding:'8px 10px',borderRadius:8,background:selected?'rgba(13,148,136,.08)':'#f8faff',fontSize:11,color:'var(--m)'}}>
                {latest
                  ? <><strong style={{color:selected?'#0d9488':'var(--a)'}}>Last: {latest}</strong> · {ep.records.length} record{ep.records.length!==1?'s':''}</>
                  : <span style={{color:'var(--m)'}}>No entries yet</span>}
              </div>
              <div style={{display:'flex',gap:6,marginTop:10}} onClick={e=>e.stopPropagation()}>
                <Button variant="secondary" size="sm" onClick={()=>setEditEP(ep)}>✏️ Edit</Button>
                <Button variant="danger" size="sm" onClick={()=>setConfirmDel(ep.id)}>🗑 Remove</Button>
              </div>
            </div>
          )
        })}
        {/* Add card */}
        <div onClick={()=>setAddOpen(true)}
          style={{background:'#f9fafb',border:'2px dashed var(--b)',borderRadius:14,padding:16,cursor:'pointer',
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,minHeight:130,
            transition:'all .15s'}}
          onMouseOver={e=>{e.currentTarget.style.background='#f0fdfa';e.currentTarget.style.borderColor='#0d9488'}}
          onMouseOut={e=>{e.currentTarget.style.background='#f9fafb';e.currentTarget.style.borderColor='var(--b)'}}>
          <div style={{width:36,height:36,borderRadius:'50%',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,color:'var(--m)'}}>+</div>
          <div style={{fontSize:12,fontWeight:600,color:'var(--m)'}}>Add Exchange Point</div>
        </div>
      </div>

      {/* Detail panel */}
      {curEP && (() => {
        const ep = exchangePoints.find(e=>e.id===curEP)
        if (!ep) return null
        return <EPDetail key={ep.id} ep={ep} dispatch={dispatch} toast={toast} />
      })()}

      {addOpen && <EPFormModal title="+ Add Exchange Point" onClose={()=>setAddOpen(false)} onSave={data=>{
        const ep = { id:uid('EP'), name:data.name, location:data.location, records:[], viewDate:null }
        dispatch({ type:'EP_ADD', ep })
        setCurEP(ep.id)
        toast('success',`${data.name} added!`)
        setAddOpen(false)
      }} />}

      {editEP && <EPFormModal title="✏️ Edit Exchange Point" initial={editEP} onClose={()=>setEditEP(null)} onSave={data=>{
        dispatch({ type:'EP_EDIT', epId:editEP.id, patch:{ name:data.name, location:data.location } })
        toast('success','Updated.')
        setEditEP(null)
      }} />}

      <ConfirmModal open={!!confirmDel} onClose={()=>setConfirmDel(null)} onConfirm={doDeleteEP}
        title="Remove Exchange Point?" message="This will permanently delete this exchange point and all its records." confirmLabel="Remove" />
    </div>
  )
}

// ── EP Form Modal ─────────────────────────────────────────────
function EPFormModal({ title, initial, onClose, onSave }) {
  const { register, handleSubmit, formState:{ errors } } = useForm({ defaultValues: initial })
  return (
    <div className="mov on" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="mdl" style={{borderRadius:16}}>
        <div className="dh"><span className="dt">{title}</span><button className="dc" onClick={onClose}>×</button></div>
        <div className="db">
          <Field label="Exchange Point Name" error={errors.name?.message}>
            <Input {...register('name',{required:'Name required'})} placeholder="e.g. Madina Exchange" />
          </Field>
          <Field label="Location">
            <Input {...register('location')} placeholder="e.g. Madina, Greater Accra" />
          </Field>
        </div>
        <div className="df">
          <Button className="btnfw" onClick={handleSubmit(onSave)}>Save Exchange Point</Button>
          <Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ── EP Detail Panel ───────────────────────────────────────────
function EPDetail({ ep, dispatch, toast }) {
  const [inputs, setInputs] = useState({})
  const setInput = (ci,f,v) => setInputs(p=>({...p,[`${ci}-${f}`]:v}))
  const getInput = (ci,f) => inputs[`${ci}-${f}`] ?? ''

  const alerts = (() => {
    if (!ep.records.length) return []
    const latest = ep.records[0]
    return EAZIGAS_CYLS.flatMap((cyl,ci)=>{
      const r = latest.rows[ci]||{}
      const {cf,ce} = calcEpClosing(r)
      const out=[]
      if(cf<10) out.push({type:'low',cyl,val:cf})
      if(ce>10) out.push({type:'retrieve',cyl,val:ce})
      return out
    })
  })()

  const viewDate = ep.viewDate || (ep.records.length ? ep.records[0].date : null)

  function save() {
    const dateEl = document.getElementById(`ep-date-${ep.id}`)
    const date = dateEl?.value || today()
    const rows = EAZIGAS_CYLS.map((cyl,ci)=>({
      cyl,
      ob:Number(getInput(ci,'ob')||0), oe:Number(getInput(ci,'oe')||0),
      ts:Number(getInput(ci,'ts')||0),
      fr:Number(getInput(ci,'fr')||0), er:Number(getInput(ci,'er')||0), ed:Number(getInput(ci,'ed')||0),
    }))
    dispatch({ type:'EP_SAVE', epId:ep.id, record:{ date, rows } })
    setInputs({})
    toast('success',`Entry saved for ${ep.name} — ${date}.`)
  }

  function doPrint() {
    if (!viewDate) { toast('error','Select a date to print.'); return }
    const rec = ep.records.find(r=>r.date===viewDate)
    if (!rec) return
    printEPReport(ep, rec)
  }

  // Column section colors
  const COLS = {
    open:   { bg:'#2563eb', sub:'#dbeafe', subText:'#1d4ed8' },
    sales:  { bg:'#dc2626', sub:'#fee2e2', subText:'#991b1b' },
    recv:   { bg:'#16a34a', sub:'#dcfce7', subText:'#166534' },
    disp:   { bg:'#7c3aed', sub:'#ede9fe', subText:'#5b21b6' },
    close:  { bg:'#1e3a5f', sub:'#dbeafe', subText:'#1e3a5f' },
  }

  return (
    <div id={`ep-detail-${ep.id}`} style={{animation:'fadein .3s cubic-bezier(.4,0,.2,1)'}}>
      {/* Header banner */}
      <div style={{background:'linear-gradient(135deg,#0f172a,#1e3a5f)',borderRadius:14,padding:'20px 24px',marginBottom:16,display:'flex',alignItems:'center',gap:16,flexWrap:'wrap',boxShadow:'0 4px 20px rgba(15,23,42,.25)'}}>
        <div style={{width:48,height:48,borderRadius:12,background:'rgba(255,255,255,.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>🔄</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:20,fontWeight:800,color:'#fff',letterSpacing:'-.3px'}}>{ep.name}</div>
          <div style={{fontSize:12,color:'#94a3b8',marginTop:3}}>📍 {ep.location} &nbsp;·&nbsp; {ep.records.length} record{ep.records.length!==1?'s':''}</div>
        </div>
        <Button onClick={save}>💾 Save Entry</Button>
      </div>

      {/* Alerts */}
      {alerts.map((a,i)=>(
        <div key={i} className={`ibar ${a.type==='low'?'ir':'iw'}`} style={{marginBottom:8}}>
          <span>{a.type==='low'?'🚨':'⚠️'}</span>
          <span><strong>{a.type==='low'?`LOW STOCK: ${a.cyl}`:`RETRIEVE EMPTIES: ${a.cyl}`}</strong> — {a.val} {a.type==='low'?'filled cylinders remaining':'empty cylinders pending dispatch'}</span>
        </div>
      ))}

      {/* Saved entry viewer */}
      {ep.records.length > 0 && (
        <Card style={{marginBottom:16,borderRadius:14,overflow:'hidden'}}>
          <CardHeader title="📅 View Saved Entry"
            actions={<div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              <select value={viewDate||''} onChange={e=>dispatch({type:'EP_SET_VIEW',epId:ep.id,date:e.target.value})}
                style={{border:'1.5px solid var(--b)',borderRadius:8,padding:'5px 10px',fontSize:13,outline:'none',background:'var(--w)',fontFamily:'inherit',color:'var(--t)'}}>
                <option value="">— Select a date —</option>
                {ep.records.map(r=><option key={r.date} value={r.date}>{r.date}</option>)}
              </select>
              {viewDate&&<Button variant="danger" size="sm" onClick={()=>dispatch({type:'EP_DEL_ENTRY',epId:ep.id,date:viewDate})}>Delete</Button>}
              <Button variant="success" size="sm" onClick={doPrint}>🖨 Print</Button>
              <Button variant="ghost" size="sm" onClick={()=>dispatch({type:'EP_CLEAR',epId:ep.id})}>Clear All</Button>
            </div>}
          />
          {viewDate && (()=>{
            const rec = ep.records.find(r=>r.date===viewDate)
            if (!rec) return null
            return (
              <CardBody noPad>
                <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
                    <thead>
                      <EPHeaderRow COLS={COLS} />
                    </thead>
                    <tbody>
                      {EAZIGAS_CYLS.map((cyl,ci)=>{
                        const r=rec.rows[ci]||{}
                        const {cf,ce}=calcEpClosing(r)
                        return (
                          <tr key={cyl} style={{background:ci%2===0?'#fff':'#f8faff'}}>
                            {ci===0&&<td style={TD('#1e3a5f','#dbeafe',{fontWeight:700,borderRadius:0})} rowSpan={EAZIGAS_CYLS.length}>{rec.date}</td>}
                            <td style={TD('#0D0F14','transparent',{fontWeight:700,textAlign:'left',paddingLeft:14})}>{cyl}</td>
                            <td style={TD('#1d4ed8')}>{r.ob||0}</td>
                            <td style={TD('#1d4ed8')}>{r.oe||0}</td>
                            <td style={TD('#991b1b')}>{r.ts||0}</td>
                            <td style={TD('#166534')}>{r.fr||0}</td>
                            <td style={TD('#166534')}>{r.er||0}</td>
                            <td style={TD('#5b21b6')}>{r.ed||0}</td>
                            <td style={TD(cf<10?'#dc2626':'#1e3a5f','#dbeafe',{fontWeight:800,fontSize:13})}>{cf<10?`⚠️ ${cf}`:cf}</td>
                            <td style={TD(ce>10?'#d97706':'#1e3a5f','#dbeafe',{fontWeight:800,fontSize:13})}>{ce>10?`⚠️ ${ce}`:ce}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            )
          })()}
        </Card>
      )}

      {/* New entry form */}
      <Card style={{borderRadius:14,overflow:'hidden'}}>
        <CardHeader title="🔄 New Daily Entry"
          actions={<span style={{fontSize:11,color:'var(--m)'}}>CF = OB − Sales + Filled Recv &nbsp;|&nbsp; CE = OE + Empties Recv − Dispatched</span>}
        />
        <CardBody noPad>
          <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
              <thead>
                <EPHeaderRow COLS={COLS} />
              </thead>
              <tbody>
                <tr>
                  <td colSpan={10} style={{padding:'8px 14px',background:'#eff6ff',fontSize:11,fontWeight:600,color:'#1e3a5f',borderBottom:'1px solid #dbeafe'}}>
                    📝 Enter today's figures and click Save Entry above
                  </td>
                </tr>
                {EAZIGAS_CYLS.map((cyl,ci)=>{
                  const g = f => Number(getInput(ci,f)||0)
                  const cf = Math.max(0, g('ob')-g('ts')+g('fr'))
                  const ce = Math.max(0, g('oe')+g('er')-g('ed'))
                  return (
                    <tr key={cyl} style={{background:ci%2===0?'#f8fbff':'#fff'}}>
                      {ci===0&&(
                        <td style={{border:'1px solid #dbeafe',background:'#dbeafe',fontWeight:700,textAlign:'center',verticalAlign:'middle'}} rowSpan={EAZIGAS_CYLS.length}>
                          <input id={`ep-date-${ep.id}`} type="date" defaultValue={today()}
                            style={{border:'1.5px solid var(--b)',borderRadius:7,padding:'6px 8px',fontSize:12,outline:'none',width:118,fontFamily:'inherit',color:'#0D0F14',background:'#fff'}} />
                        </td>
                      )}
                      <td style={TD('#0D0F14','#eff6ff',{fontWeight:700,textAlign:'left',paddingLeft:14})}>{cyl}</td>
                      {['ob','oe','ts','fr','er','ed'].map(f=>(
                        <td key={f} style={{border:'1px solid #e8f0fe',padding:3,background:'#fff'}}>
                          <input type="number" min="0" placeholder="0" value={getInput(ci,f)}
                            onChange={e=>setInput(ci,f,e.target.value)}
                            style={{width:58,border:'none',outline:'none',fontSize:13,textAlign:'center',padding:'5px 4px',fontFamily:'inherit',background:'transparent',color:'#0D0F14'}} />
                        </td>
                      ))}
                      <td style={TD(cf<10?'#dc2626':'#1e3a5f',cf<10?'#fef2f2':'#dbeafe',{fontWeight:800,fontSize:13})}>{cf}{cf<10?' ⚠️':''}</td>
                      <td style={TD(ce>10?'#d97706':'#1e3a5f',ce>10?'#fffbeb':'#dbeafe',{fontWeight:800,fontSize:13})}>{ce}{ce>10?' ⚠️':''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
      <div className="ibar ib" style={{marginTop:10}}>
        💡 <strong>Key:</strong> 🚨 Closing Filled below 10 = restock urgently &nbsp;|&nbsp; ⚠️ Closing Empty above 10 = send cylinders for refill
      </div>
    </div>
  )
}

function EPHeaderRow({ COLS }) {
  return (
    <>
      <tr>
        <th style={TH('#1e3a5f','#fff',{borderRadius:'8px 0 0 0'})} rowSpan={2}>Date</th>
        <th style={TH('#1e3a5f')} rowSpan={2}>Cylinder</th>
        <th style={TH(COLS.open.bg)} colSpan={2}>Opening Balance</th>
        <th style={TH(COLS.sales.bg)} colSpan={1}>Total Sales</th>
        <th style={TH(COLS.recv.bg)} colSpan={2}>Received</th>
        <th style={TH(COLS.disp.bg)} colSpan={1}>Dispatched</th>
        <th style={TH(COLS.close.bg,'#fff',{borderRadius:'0 8px 0 0'})} colSpan={2}>Closing Balance</th>
      </tr>
      <tr>
        <th style={TH(COLS.open.sub, COLS.open.subText)}>Filled</th>
        <th style={TH(COLS.open.sub, COLS.open.subText)}>Empty</th>
        <th style={TH(COLS.sales.sub, COLS.sales.subText)}>Filled Swapped</th>
        <th style={TH(COLS.recv.sub, COLS.recv.subText)}>Filled</th>
        <th style={TH(COLS.recv.sub, COLS.recv.subText)}>Empties</th>
        <th style={TH(COLS.disp.sub, COLS.disp.subText)}>Empties</th>
        <th style={TH(COLS.close.sub, COLS.close.subText)}>Filled</th>
        <th style={TH(COLS.close.sub, COLS.close.subText)}>Empty</th>
      </tr>
    </>
  )
}

// ── Print ─────────────────────────────────────────────────────
function printEPReport(ep, rec) {
  const rows = EAZIGAS_CYLS.map((cyl,ci)=>{
    const r=rec.rows[ci]||{}
    const {cf,ce}=calcEpClosing(r)
    return `<tr>
      <td style="padding:9px 12px;font-weight:700;border:1px solid #e2e8f0">${cyl}</td>
      <td style="padding:9px 12px;text-align:center;border:1px solid #e2e8f0">${r.ob||0}</td>
      <td style="padding:9px 12px;text-align:center;border:1px solid #e2e8f0">${r.oe||0}</td>
      <td style="padding:9px 12px;text-align:center;border:1px solid #e2e8f0">${r.ts||0}</td>
      <td style="padding:9px 12px;text-align:center;border:1px solid #e2e8f0">${r.fr||0}</td>
      <td style="padding:9px 12px;text-align:center;border:1px solid #e2e8f0">${r.er||0}</td>
      <td style="padding:9px 12px;text-align:center;border:1px solid #e2e8f0">${r.ed||0}</td>
      <td style="padding:9px 12px;text-align:center;font-weight:800;background:#dbeafe;color:${cf<10?'#dc2626':'#1e3a5f'};border:1px solid #e2e8f0">${cf}${cf<10?' ⚠️':''}</td>
      <td style="padding:9px 12px;text-align:center;font-weight:800;background:#dbeafe;color:${ce>10?'#d97706':'#1e3a5f'};border:1px solid #e2e8f0">${ce}${ce>10?' ⚠️':''}</td>
    </tr>`
  }).join('')
  const win = window.open('','_blank','width=820,height=720')
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>EaziGas Daily Report — ${ep.name}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:28px 32px;color:#0f172a;font-size:12px;background:#fff}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;padding-bottom:14px;border-bottom:3px solid #1e3a5f}
  table{width:100%;border-collapse:collapse}th{font-size:9px;font-weight:800;text-align:center;letter-spacing:.5px;text-transform:uppercase;padding:7px 10px;border:1px solid #bfdbfe}
  tbody tr:nth-child(even){background:#f8faff}.footer-note{margin-top:14px;font-size:10px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:10px}
  .sig-row{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:36px}.sig-line{border-top:1.5px solid #1e3a5f;padding-top:5px;font-size:11px;color:#64748b;text-align:center}
  @media print{button{display:none}body{padding:18px}}</style></head><body>
  <div class="header">
    <div><div style="background:#1e3a5f;border-radius:10px;padding:6px 16px;display:inline-flex;align-items:center;margin-bottom:8px"><img src="${LOGO_URL}" style="height:38px"/></div>
    <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.6px">Energizing Progress · Ghana</div></div>
    <div style="text-align:right"><div style="font-size:18px;font-weight:900;color:#1e3a5f">EaziGas Daily Report</div>
    <div style="font-size:13px;font-weight:700;color:#2563eb;margin-top:3px">${ep.name}</div>
    <div style="font-size:11px;color:#64748b;margin-top:2px">📍 ${ep.location}</div>
    <div style="font-size:11px;color:#64748b;margin-top:2px">Date: <strong>${rec.date}</strong></div></div>
  </div>
  <table><thead>
    <tr><th style="background:#1e3a5f;color:#fff;text-align:left;min-width:90px" rowspan="2">Cylinder</th>
    <th style="background:#2563eb;color:#fff" colspan="2">Opening Balance</th>
    <th style="background:#dc2626;color:#fff" colspan="1">Total Sales</th>
    <th style="background:#16a34a;color:#fff" colspan="2">Received</th>
    <th style="background:#7c3aed;color:#fff" colspan="1">Dispatched</th>
    <th style="background:#1e3a5f;color:#fff" colspan="2">Closing Balance</th></tr>
    <tr><th style="background:#dbeafe;color:#1d4ed8">Filled</th><th style="background:#dbeafe;color:#1d4ed8">Empty</th>
    <th style="background:#fee2e2;color:#991b1b">Filled Swapped</th>
    <th style="background:#dcfce7;color:#166534">Filled</th><th style="background:#dcfce7;color:#166534">Empties</th>
    <th style="background:#ede9fe;color:#5b21b6">Empties</th>
    <th style="background:#1e3a5f;color:#fff">Filled</th><th style="background:#1e3a5f;color:#fff">Empty</th></tr>
  </thead><tbody>${rows}</tbody></table>
  <div class="footer-note"><strong>Formulas:</strong> Closing Filled = Opening Filled − Sales + Filled Received &nbsp;|&nbsp; Closing Empty = Opening Empty + Empties Received − Dispatched</div>
  <div class="sig-row"><div class="sig-line">Prepared By &amp; Date</div><div class="sig-line">Authorised By &amp; Date</div></div>
  <div style="margin-top:28px;text-align:center"><button onclick="window.print()" style="background:#1e3a5f;color:#fff;border:none;border-radius:8px;padding:10px 32px;font-size:14px;font-weight:700;cursor:pointer">🖨️ Print Report</button></div>
  </body></html>`)
  win.document.close()
}
