import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useApp } from '../context/AppContext'
import { useToast } from '../hooks/useToast'
import { uid, today, money, REPS, REP_COLORS, LOGO_URL } from '../utils/helpers'
import { PageHeader, Pills, Panel, PanelHeader, PanelBody, Table, Badge, RepBadge, Button, Drawer, Field, Input, Select, KpiCard, EmptyState, ConfirmModal } from '../components/ui'

// ════════════════════════════════════════════════
// MARKETING
// ════════════════════════════════════════════════
export function Marketing() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const { db } = state
  const [tab, setTab] = useState('campaigns')
  const [campOpen, setCampOpen] = useState(false)
  const [leadOpen, setLeadOpen] = useState(false)
  const [delConfirm, setDelConfirm] = useState(null)

  const tb  = db.campaigns.reduce((s,c)=>s+Number(c.budget||0),0)
  const ts2 = db.campaigns.reduce((s,c)=>s+Number(c.spent||0),0)
  const pv  = db.leads.reduce((s,l)=>s+Number(l.value||0),0)
  const cb = s=>({Active:'success',Draft:'neutral',Completed:'info',Paused:'warning',Cancelled:'danger'}[s]||'neutral')
  const lb = s=>({New:'neutral',Contacted:'info',Qualified:'info',Proposal:'warning',Negotiation:'warning','Closed Won':'success','Closed Lost':'danger'}[s]||'neutral')

  function doDelete() { dispatch({type:'DB_DELETE',key:delConfirm.key,id:delConfirm.id}); toast('success','Deleted.'); setDelConfirm(null) }

  return (
    <div style={{animation:'fadein .3s cubic-bezier(.4,0,.2,1)'}}>
      <PageHeader title="Branding & Marketing" actions={<>
        {tab==='campaigns'&&<Button onClick={()=>setCampOpen(true)}>+ New Campaign</Button>}
        {tab==='leads'&&<Button onClick={()=>setLeadOpen(true)}>+ Add Lead</Button>}
      </>}/>
      <div className="krow">
        <KpiCard label="Total Budget"   value={tb?money(tb):'—'}   note="All campaigns"    valueStyle={{color:'var(--a)'}}/>
        <KpiCard label="Amount Spent"   value={ts2?money(ts2):'—'} note={tb?`${Math.round(ts2/tb*100)}% utilised`:'—'} valueStyle={{color:'var(--am)'}}/>
        <KpiCard label="Leads"          value={db.leads.length||'—'} note="In pipeline"    valueStyle={{color:'var(--g)'}}/>
        <KpiCard label="Pipeline Value" value={pv?money(pv):'—'}   note="Est. deal value"  valueStyle={{color:'var(--a)'}}/>
      </div>
      <Pills tabs={[{id:'campaigns',label:'Campaigns'},{id:'leads',label:'Leads'}]} active={tab} onChange={setTab}/>
      {tab==='campaigns'&&<Panel><PanelBody noPad>
        <Table columns={['ID','Campaign','Channel','Budget','Spent','Leads','Status','']}
          rows={db.campaigns.map(c=>[
            <span style={{fontSize:11,color:'var(--m)',fontFamily:'monospace'}}>{c.id}</span>,
            c.name||'—', c.channel||'—',
            c.budget?money(c.budget):'—', c.spent?money(c.spent):'—', c.leads??'—',
            <Badge variant={cb(c.status)}>{c.status||'Draft'}</Badge>,
            <Button variant="ghost" size="sm" onClick={()=>setDelConfirm({key:'campaigns',id:c.id})}>Del</Button>,
          ])}/>
      </PanelBody></Panel>}
      {tab==='leads'&&<Panel><PanelBody noPad>
        <Table columns={['ID','Company','Contact','Source','Est. Value','Stage','Date','']}
          rows={db.leads.map(l=>[
            <span style={{fontSize:11,color:'var(--m)',fontFamily:'monospace'}}>{l.id}</span>,
            l.name||'—', l.contact||'—', l.source||'—',
            l.value?money(l.value):'—',
            <Badge variant={lb(l.stage)}>{l.stage||'New'}</Badge>,
            l.date||'—',
            <Button variant="ghost" size="sm" onClick={()=>setDelConfirm({key:'leads',id:l.id})}>Del</Button>,
          ])}/>
      </PanelBody></Panel>}
      <CampaignDrawer open={campOpen} onClose={()=>setCampOpen(false)} dispatch={dispatch} toast={toast}/>
      <LeadDrawer open={leadOpen} onClose={()=>setLeadOpen(false)} dispatch={dispatch} toast={toast}/>
      <ConfirmModal open={!!delConfirm} onClose={()=>setDelConfirm(null)} onConfirm={doDelete} title="Confirm Delete" message="This record will be permanently deleted."/>
    </div>
  )
}
function CampaignDrawer({open,onClose,dispatch,toast}){
  const {register,handleSubmit,reset}=useForm()
  function onSubmit(d){
    dispatch({type:'DB_INSERT',key:'campaigns',record:{id:uid('MKT'),startDate:today(),name:d.name,channel:d.channel,budget:d.budget||null,spent:d.spent||null,leads:d.leads||null,status:d.status||'Draft'}})
    toast('success','Campaign saved.');reset();onClose()
  }
  return(<Drawer open={open} onClose={onClose} title="New Campaign" footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
    <Field label="Campaign Name"><Input {...register('name')} placeholder="e.g. Q2 Cylinder Drive"/></Field>
    <Field label="Channel"><Select {...register('channel')}><option value="">Select…</option>{['Digital','Outdoor','Radio','TV','Direct Sales','Social Media','Event'].map(v=><option key={v}>{v}</option>)}</Select></Field>
    <Field label="Budget (GH₵)"><Input {...register('budget')} type="number" placeholder="0.00"/></Field>
    <Field label="Amount Spent (GH₵)"><Input {...register('spent')} type="number" placeholder="0.00"/></Field>
    <Field label="Leads Generated"><Input {...register('leads')} type="number" placeholder="0"/></Field>
    <Field label="Status"><Select {...register('status')}><option>Draft</option><option>Active</option><option>Paused</option><option>Completed</option><option>Cancelled</option></Select></Field>
  </Drawer>)
}
function LeadDrawer({open,onClose,dispatch,toast}){
  const {register,handleSubmit,reset}=useForm()
  function onSubmit(d){
    dispatch({type:'DB_INSERT',key:'leads',record:{id:uid('L'),date:today(),name:d.name,contact:d.contact,source:d.source,value:d.value||null,stage:d.stage||'New'}})
    toast('success','Lead saved.');reset();onClose()
  }
  return(<Drawer open={open} onClose={onClose} title="Add Lead" footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
    <Field label="Company / Name"><Input {...register('name')} placeholder="e.g. Eko Hotels Group"/></Field>
    <Field label="Contact Person"><Input {...register('contact')} placeholder="Name & phone"/></Field>
    <Field label="Lead Source"><Select {...register('source')}><option value="">Select…</option>{['Campaign','Referral','Direct','Cold Call','Website','Event'].map(v=><option key={v}>{v}</option>)}</Select></Field>
    <Field label="Estimated Value (GH₵)"><Input {...register('value')} type="number" placeholder="0.00"/></Field>
    <Field label="Stage"><Select {...register('stage')}><option>New</option><option>Contacted</option><option>Qualified</option><option>Proposal</option><option>Negotiation</option><option>Closed Won</option><option>Closed Lost</option></Select></Field>
  </Drawer>)
}

// ════════════════════════════════════════════════
// ESG
// ════════════════════════════════════════════════
export function ESG() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const { esg } = state
  const [logOpen, setLogOpen] = useState(false)
  const femPct = esg.totalStaff ? Math.round(esg.femaleStaff/esg.totalStaff*100) : 0
  const safeScore = Math.min(100,Math.round((esg.safetyTraining/Math.max(esg.totalStaff||1,1))*100))
  const envScore  = Math.min(100,esg.treesPlanted*5+Math.max(0,50-esg.wasteKg))
  const socScore  = Math.min(100,esg.communityEvents*10+femPct)
  const overall   = Math.round((safeScore+envScore+socScore)/3)
  return (
    <div style={{animation:'fadein .3s cubic-bezier(.4,0,.2,1)'}}>
      <PageHeader title="ESG Compliance" actions={<Button onClick={()=>setLogOpen(true)}>+ Log Activity</Button>}/>
      <div style={{background:'linear-gradient(135deg,#1A7A4A,#0f5c35)',borderRadius:12,padding:'20px 22px',marginBottom:20,color:'#fff',display:'flex',alignItems:'center',gap:18,flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:120}}>
          <div style={{fontSize:11,opacity:.8,letterSpacing:'.8px',textTransform:'uppercase',marginBottom:6}}>Overall ESG Score</div>
          <div style={{fontSize:42,fontWeight:700,lineHeight:1}}>{overall}<span style={{fontSize:18,opacity:.7}}>%</span></div>
          <div style={{fontSize:12,opacity:.7,marginTop:4}}>{overall>=70?'🟢 Good Standing':overall>=40?'🟡 Needs Improvement':'🔴 Action Required'}</div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:10,minWidth:180}}>
          {[{l:'Environmental',v:envScore,c:'#4ade80'},{l:'Social',v:socScore,c:'#60a5fa'},{l:'Governance',v:safeScore,c:'#f59e0b'}].map(s=>(
            <div key={s.l}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,opacity:.9,marginBottom:4}}><span>{s.l}</span><span>{s.v}%</span></div>
              <div style={{background:'rgba(255,255,255,.2)',borderRadius:4,height:6}}><div style={{background:s.c,height:6,borderRadius:4,width:`${s.v}%`}}/></div>
            </div>
          ))}
        </div>
      </div>
      <div className="krow">
        <KpiCard label="🔥 Cylinders Refilled" value={esg.cylRefill}       note="Clean cooking units" valueStyle={{color:'var(--a)'}}/>
        <KpiCard label="🌿 Trees Planted"       value={esg.treesPlanted}    note="Carbon offset"       valueStyle={{color:'var(--g)'}}/>
        <KpiCard label="♻️ Waste Managed"       value={`${esg.wasteKg} kg`} note="Disposed safely"    valueStyle={{color:'var(--am)'}}/>
        <KpiCard label="🎓 Safety Trained"      value={esg.safetyTraining}  note="Staff trained"       valueStyle={{color:'var(--bl)'}}/>
        <KpiCard label="👥 Community Events"    value={esg.communityEvents} note="Outreach"            valueStyle={{color:'var(--pu)'}}/>
        <KpiCard label="👩 Female Staff"        value={`${femPct}%`}        note={`${esg.femaleStaff} of ${esg.totalStaff}`} valueStyle={{color:'var(--g)'}}/>
      </div>
      <Panel>
        <div className="phd"><span className="ptl2">📋 ESG Activity Log</span></div>
        <PanelBody noPad>
          {esg.logs.length===0
            ? <EmptyState icon="🌿" message="No ESG activities logged yet" sub="Tap + Log Activity to record your first entry."/>
            : <Table columns={['Date','Category','Activity','Value','Logged By']}
                rows={esg.logs.map(l=>[l.date,
                  <Badge variant={{Environmental:'success',Social:'info',Governance:'warning',Safety:'ops'}[l.category]||'neutral'}>{l.category}</Badge>,
                  l.activity, l.value||'—', l.loggedBy||'—'])}/>
          }
        </PanelBody>
      </Panel>
      <ESGLogDrawer open={logOpen} onClose={()=>setLogOpen(false)} dispatch={dispatch} toast={toast} esg={esg}/>
    </div>
  )
}
function ESGLogDrawer({open,onClose,dispatch,toast,esg}){
  const {register,handleSubmit,reset}=useForm()
  function onSubmit(d){
    const val=Number(d.value||0), patch={}
    if(d.activity==='Cylinders Refilled') patch.cylRefill=esg.cylRefill+val
    else if(d.activity==='Trees Planted') patch.treesPlanted=esg.treesPlanted+val
    else if(d.activity==='Waste Managed (kg)') patch.wasteKg=esg.wasteKg+val
    else if(d.activity==='Safety Training Conducted') patch.safetyTraining=esg.safetyTraining+val
    else if(d.activity==='Community Event Held') patch.communityEvents=esg.communityEvents+val
    else if(d.activity==='Female Staff Count Updated') patch.femaleStaff=val
    else if(d.activity==='Total Staff Count Updated') patch.totalStaff=val
    dispatch({type:'ESG_UPDATE',patch})
    dispatch({type:'ESG_LOG_ADD',entry:{date:d.date||today(),category:d.category,activity:d.activity,value:d.value,loggedBy:d.loggedBy,notes:d.notes}})
    toast('success','ESG entry saved.');reset();onClose()
  }
  return(<Drawer open={open} onClose={onClose} title="Log ESG Activity" footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Entry</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
    <Field label="Category"><Select {...register('category')}><option value="">Select…</option><option>Environmental</option><option>Social</option><option>Governance</option><option>Safety</option></Select></Field>
    <Field label="Activity"><Select {...register('activity')}><option value="">Select…</option>{['Cylinders Refilled','Trees Planted','Waste Managed (kg)','Safety Training Conducted','Community Event Held','LTI-Free Days','Leak Reported & Fixed','Female Staff Count Updated','Total Staff Count Updated','Bulk Delivery (clean fuel)'].map(v=><option key={v}>{v}</option>)}</Select></Field>
    <Field label="Value / Quantity"><Input {...register('value')} type="number" placeholder="e.g. 50"/></Field>
    <Field label="Notes"><Input {...register('notes')} placeholder="Any additional notes…"/></Field>
    <Field label="Logged By"><Select {...register('loggedBy')}><option value="">Select rep…</option>{REPS.map(r=><option key={r}>{r}</option>)}</Select></Field>
    <Field label="Date"><Input {...register('date')} type="date" defaultValue={today()}/></Field>
  </Drawer>)
}

// ════════════════════════════════════════════════
// SETTINGS
// ════════════════════════════════════════════════
export function Settings() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const { cfg } = state
  const { register, handleSubmit } = useForm({ defaultValues: cfg })
  function onSubmit(data) { dispatch({type:'CFG_UPDATE',patch:data}); toast('success','Settings saved.') }
  return (
    <div style={{animation:'fadein .3s cubic-bezier(.4,0,.2,1)'}}>
      <PageHeader title="Settings"/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16}}>
        <Panel>
          <div className="phd"><span className="ptl2">🏢 Company Settings</span></div>
          <PanelBody>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <Field label="Company Name"><Input {...register('companyName')}/></Field>
              <Field label="Currency"><Input {...register('currency')}/></Field>
              <Field label="Region"><Input {...register('region')}/></Field>
              <Field label="Fiscal Year"><Input {...register('fiscalYear')}/></Field>
              <Field label="Credit Limit (GH₵)"><Input {...register('creditLimit')} type="number"/></Field>
              <Button onClick={handleSubmit(onSubmit)}>Save Settings</Button>
            </div>
          </PanelBody>
        </Panel>
        <Panel>
          <div className="phd"><span className="ptl2">⚙️ App Preferences</span></div>
          <PanelBody>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {[{key:'lowStockAlert',label:'Low Stock Alerts',desc:'Alerts when stock is low or critical'},{key:'autoInvoice',label:'Auto Invoice',desc:'Auto-create invoices on delivery'}].map(item=>(
                <div key={item.key} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'12px 14px',borderRadius:8,border:'1.5px solid var(--b)'}}>
                  <button onClick={()=>{dispatch({type:'CFG_UPDATE',patch:{[item.key]:!cfg[item.key]}});toast('success','Updated.')}}
                    style={{width:44,height:24,borderRadius:12,position:'relative',flexShrink:0,marginTop:2,border:'none',cursor:'pointer',background:cfg[item.key]?'var(--a)':'#d1d5db',transition:'background .2s'}}>
                    <span style={{position:'absolute',top:2,width:20,height:20,background:'#fff',borderRadius:'50%',boxShadow:'0 1px 3px rgba(0,0,0,.2)',transition:'left .2s',left:cfg[item.key]?22:2}}/>
                  </button>
                  <div><div style={{fontWeight:600,fontSize:13}}>{item.label}</div><div style={{fontSize:11,color:'var(--m)',marginTop:2}}>{item.desc}</div></div>
                </div>
              ))}
            </div>
          </PanelBody>
        </Panel>
        <Panel>
          <div className="phd"><span className="ptl2">👥 Team Members</span></div>
          <PanelBody>
            {REPS.map(r=>(
              <div key={r} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',borderRadius:8,background:'var(--bg)',marginBottom:8}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:'var(--a)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,flexShrink:0}}>{r[0]}</div>
                <div style={{fontWeight:600,fontSize:13}}>{r}</div>
              </div>
            ))}
          </PanelBody>
        </Panel>
        <Panel>
          <div className="phd"><span className="ptl2">📌 About</span></div>
          <PanelBody>
            <div style={{display:'flex',flexDirection:'column',gap:8,fontSize:13,color:'var(--m)'}}>
              {[['System','Henos Energy ERP'],['Version','v8.0 · 2025'],['Stack','React + Vite + Tailwind v4 + React Router 7'],['Company',cfg.companyName],['Region',cfg.region]].map(([l,v])=>(
                <div key={l}><strong style={{color:'#0D0F14'}}>{l}:</strong> {v}</div>
              ))}
            </div>
          </PanelBody>
        </Panel>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// STATIONS — with Roto Gauge readings
// ════════════════════════════════════════════════
export function Stations() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const { stations } = state
  const [addOpen, setAddOpen] = useState(false)
  const [curStation, setCurStation] = useState(null)

  function docStatus(expiry) {
    if (!expiry) return 'none'
    const diff = (new Date(expiry) - new Date()) / (1000*60*60*24)
    if (diff < 0) return 'expired'
    if (diff <= 30) return 'critical'
    if (diff <= 90) return 'warning'
    return 'ok'
  }

  const totalAlerts = stations.reduce((s,st)=>s+(st.docs||[]).filter(d=>['expired','critical'].includes(docStatus(d.expiry))).length,0)

  return (
    <div style={{animation:'fadein .3s cubic-bezier(.4,0,.2,1)'}}>
      <PageHeader title="LPG Stations" actions={<Button onClick={()=>setAddOpen(true)}>+ Add Outlet</Button>}/>
      {totalAlerts>0&&<div className="ibar ir">⚠️ <strong>{totalAlerts} document{totalAlerts>1?'s':''}</strong> expiring soon across all stations</div>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12,marginBottom:24}}>
        {stations.map(st=>{
          const alerts=(st.docs||[]).filter(d=>['expired','critical'].includes(docStatus(d.expiry))).length
          const warns=(st.docs||[]).filter(d=>docStatus(d.expiry)==='warning').length
          const isSelected=curStation===st.id
          const latestStock=st.stock?.length?st.stock[0]:null
          return(
            <div key={st.id} onClick={()=>setCurStation(p=>p===st.id?null:st.id)}
              style={{background:isSelected?'var(--as)':'#fff',borderRadius:12,padding:16,cursor:'pointer',border:`2px solid ${isSelected?'var(--a)':alerts?'var(--r)':warns?'var(--am)':'var(--b)'}`,transition:'all .15s'}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:15,marginBottom:3}}>⛽</div>
                  <div style={{fontWeight:700,fontSize:13,color:isSelected?'var(--a)':'#0D0F14'}}>{st.name}</div>
                  <div style={{fontSize:11,color:'var(--m)',marginTop:2}}>{st.location}</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:4,alignItems:'flex-end'}}>
                  {alerts>0&&<span style={{background:'var(--rs)',color:'var(--r)',fontSize:10,fontWeight:700,borderRadius:6,padding:'2px 7px'}}>⚠️ {alerts} doc{alerts>1?'s':''} expiring</span>}
                  {warns>0&&!alerts&&<span style={{background:'var(--ams)',color:'var(--am)',fontSize:10,fontWeight:700,borderRadius:6,padding:'2px 7px'}}>📅 {warns} expiring soon</span>}
                </div>
              </div>
              {latestStock&&(st.tanks||[]).map((t,ti)=>{
                const pct=latestStock.tanks?.[ti]?.pct??0
                const kgVal=t.cap?Math.round(pct/100*t.cap):null
                const color=pct>=70?'var(--g)':pct>=30?'var(--am)':'var(--r)'
                return(
                  <div key={ti} style={{marginTop:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--m)',marginBottom:4}}>
                      <span>{t.name}</span>
                      <span style={{fontWeight:600}}>{pct}%{kgVal?` · ${kgVal.toLocaleString()} KG`:''}</span>
                    </div>
                    <div style={{height:6,borderRadius:3,background:'#e5e7eb',overflow:'hidden'}}><div style={{height:6,borderRadius:3,background:color,width:`${pct}%`,transition:'width .6s'}}/></div>
                  </div>
                )
              })}
              {!latestStock&&<div style={{fontSize:11,color:'var(--m)',background:'#f3f4f6',borderRadius:6,padding:'6px 10px',marginTop:10,textAlign:'center'}}>No stock recorded yet</div>}
            </div>
          )
        })}
        <div onClick={()=>setAddOpen(true)}
          style={{background:'#f9fafb',border:'2px dashed var(--b)',borderRadius:12,padding:16,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,minHeight:120}}
          onMouseOver={e=>e.currentTarget.style.background='#f0fdf4'} onMouseOut={e=>e.currentTarget.style.background='#f9fafb'}>
          <div style={{fontSize:24}}>+</div>
          <div style={{fontSize:12,fontWeight:600,color:'var(--m)'}}>Add New Outlet</div>
        </div>
      </div>
      {curStation&&(()=>{const st=stations.find(s=>s.id===curStation);if(!st)return null;return <StationDetail st={st} dispatch={dispatch} toast={toast}/>})()}
      {addOpen&&<AddStationModal onClose={()=>setAddOpen(false)} dispatch={dispatch} toast={toast}/>}
    </div>
  )
}

function StationDetail({st,dispatch,toast}){
  const [readingOpen,setReadingOpen]=useState(false)
  const latestStock=st.stock?.length?st.stock[0]:null
  return(
    <Panel>
      <div style={{background:'linear-gradient(135deg,#0f172a,#1e3a5f)',padding:'18px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontWeight:700,fontSize:18,color:'#fff'}}>⛽ {st.name}</div>
          <div style={{fontSize:12,color:'#9ca3af',marginTop:2}}>📍 {st.location}</div>
        </div>
        <Button onClick={()=>setReadingOpen(true)}>📊 Record Stock Reading</Button>
      </div>
      <PanelBody>
        {latestStock?(
          <div>
            <div style={{fontSize:11,fontWeight:700,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:12}}>
              Latest Reading — {latestStock.date} {latestStock.by && `· Recorded by ${latestStock.by}`}
            </div>
            <div style={{display:'flex',gap:20,flexWrap:'wrap',marginBottom:16}}>
              {(st.tanks||[]).map((t,ti)=>{
                const tankData=latestStock.tanks?.[ti]||{}
                const pct=tankData.pct??0
                const r1=tankData.r1??null
                const r2=tankData.r2??null
                const kgVal=t.cap?Math.round(pct/100*t.cap):null
                const color=pct>=70?'var(--g)':pct>=30?'var(--am)':'var(--r)'
                return(
                  <div key={ti} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,minWidth:100}}>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--m)',textAlign:'center'}}>{t.name}</div>
                    {/* Tank gauge */}
                    <div style={{position:'relative',width:70,height:110,border:'2.5px solid #d1d5db',borderRadius:10,overflow:'hidden',background:'linear-gradient(to bottom,#f3f4f6,#e9e9e9)'}}>
                      <div style={{position:'absolute',bottom:0,left:0,right:0,height:`${pct}%`,background:color,transition:'height .6s'}}/>
                      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2}}>
                        <span style={{fontSize:15,fontWeight:800,color:pct>45?'#fff':'#374151'}}>{pct}%</span>
                        {kgVal&&<span style={{fontSize:10,fontWeight:600,color:pct>45?'rgba(255,255,255,.85)':'#6b7280'}}>{kgVal.toLocaleString()} KG</span>}
                      </div>
                    </div>
                    {/* Roto gauge readings */}
                    {(r1!==null||r2!==null)&&(
                      <div style={{fontSize:10,color:'var(--m)',textAlign:'center',lineHeight:1.6}}>
                        {r1!==null&&<div>R1: <strong>{r1}%</strong></div>}
                        {r2!==null&&<div>R2: <strong>{r2}%</strong></div>}
                        <div style={{color:'var(--a)',fontWeight:700}}>Avg: {pct}%</div>
                      </div>
                    )}
                    {t.cap&&<div style={{fontSize:10,color:'var(--m)'}}>Cap: {Number(t.cap).toLocaleString()} KG</div>}
                  </div>
                )
              })}
            </div>
            {/* Stock history table */}
            {st.stock.length>1&&(
              <div style={{marginTop:4}}>
                <div style={{fontSize:10,fontWeight:700,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:8}}>Recent Readings</div>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                    <thead>
                      <tr style={{background:'var(--bg)'}}>
                        <th style={{padding:'7px 10px',textAlign:'left',borderBottom:'1.5px solid var(--b)',fontSize:10,color:'var(--m)',textTransform:'uppercase'}}>Date</th>
                        {(st.tanks||[]).map((t,i)=>(
                          <th key={i} style={{padding:'7px 10px',textAlign:'center',borderBottom:'1.5px solid var(--b)',fontSize:10,color:'var(--m)',textTransform:'uppercase'}}>{t.name} (%)</th>
                        ))}
                        {(st.tanks||[]).map((t,i)=>(
                          <th key={`kg-${i}`} style={{padding:'7px 10px',textAlign:'center',borderBottom:'1.5px solid var(--b)',fontSize:10,color:'var(--m)',textTransform:'uppercase'}}>{t.name} (KG)</th>
                        ))}
                        <th style={{padding:'7px 10px',textAlign:'left',borderBottom:'1.5px solid var(--b)',fontSize:10,color:'var(--m)',textTransform:'uppercase'}}>By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {st.stock.slice(0,8).map((rec,ri)=>(
                        <tr key={ri} style={{borderBottom:'1px solid var(--b)',background:ri%2===0?'#fff':'#fafafa'}}>
                          <td style={{padding:'7px 10px',fontWeight:600}}>{rec.date}</td>
                          {(st.tanks||[]).map((t,ti)=>{
                            const pct=rec.tanks?.[ti]?.pct??0
                            const color=pct>=70?'var(--g)':pct>=30?'var(--am)':'var(--r)'
                            return <td key={ti} style={{padding:'7px 10px',textAlign:'center',fontWeight:700,color}}>{pct}%</td>
                          })}
                          {(st.tanks||[]).map((t,ti)=>{
                            const pct=rec.tanks?.[ti]?.pct??0
                            const kg=t.cap?Math.round(pct/100*t.cap):null
                            return <td key={`kg-${ti}`} style={{padding:'7px 10px',textAlign:'center',fontSize:11,color:'var(--m)'}}>{kg?kg.toLocaleString()+'KG':'—'}</td>
                          })}
                          <td style={{padding:'7px 10px',fontSize:11,color:'var(--m)'}}>{rec.by||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ):<EmptyState icon="⛽" message="No stock readings yet" sub="Click '+ Record Stock Reading' to log the first reading."/>}
      </PanelBody>
      {readingOpen&&<StockReadingModal st={st} onClose={()=>setReadingOpen(false)} dispatch={dispatch} toast={toast}/>}
    </Panel>
  )
}

// ── Roto Gauge Stock Reading Modal ────────────────────────────
function StockReadingModal({st,onClose,dispatch,toast}){
  // Track roto gauge readings per tank: {r1, r2} both in %
  const [gauges, setGauges] = useState(
    (st.tanks||[]).map(t=>({r1:'', r2:'', cap:t.cap||0}))
  )
  const [date, setDate] = useState(today())
  const [by, setBy] = useState('')
  const [notes, setNotes] = useState('')
  const [byError, setByError] = useState(false)

  function updateGauge(i, field, val) {
    setGauges(p=>p.map((g,gi)=>gi===i?{...g,[field]:val}:g))
  }
  function updateCap(i, val) {
    setGauges(p=>p.map((g,gi)=>gi===i?{...g,cap:val}:g))
  }

  function getAvg(r1, r2) {
    const n1=Number(r1), n2=Number(r2)
    if (r1!==''&&r2!=='') return Math.round((n1+n2)/2)
    if (r1!=='') return n1
    if (r2!=='') return n2
    return 0
  }

  function getKg(pct, cap) {
    if (!cap) return null
    return Math.round(pct/100 * Number(cap))
  }

  async function save() {
    if (!by.trim()) { setByError(true); return }
    setByError(false)
    const tanks = gauges.map(g=>{
      const pct = getAvg(g.r1, g.r2)
      return { pct, r1: g.r1!==''?Number(g.r1):null, r2: g.r2!==''?Number(g.r2):null, cap: Number(g.cap||0) }
    })
    const updTanks = (st.tanks||[]).map((t,i)=>({...t, cap: Number(gauges[i]?.cap||t.cap||0)}))
    try {
      await dispatch({type:'STATION_UPDATE', id:st.id, patch:{ tanks:updTanks, capacity:updTanks.reduce((s,t)=>s+t.cap,0) }})
      await dispatch({type:'STATION_STOCK_ADD', stId:st.id, record:{ date, tanks, by, notes }})
      toast('success', `Stock reading saved for ${date}.`)
      onClose()
    } catch (error) {
      toast('error', error.message || 'Could not save stock reading.')
    }
  }

  return(
    <div className="mov on" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="mdl" style={{maxHeight:'90vh',overflowY:'auto',width:'min(520px,96vw)'}}>
        <div className="dh">
          <span className="dt">📊 Roto Gauge Reading — {st.name}</span>
          <button className="dc" onClick={onClose}>×</button>
        </div>
        <div className="db">
          {/* Info bar */}
          <div className="ibar ib">
            <span>ℹ️</span><span>Enter both roto gauge readings per tank. The system will calculate the average percentage and convert to KG automatically.</span>
          </div>

          {/* Date & Recorded by */}
          <div className="frow">
            <div className="fld">
              <label>Date</label>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
            </div>
            <div className="fld">
              <label>Recorded By <span style={{color:'var(--r)'}}>*</span></label>
              <input value={by} onChange={e=>{setBy(e.target.value);setByError(false)}} placeholder="Your name"
                style={{border:`1.5px solid ${byError?'var(--r)':'var(--b)'}`,borderRadius:7,padding:'9px 11px',fontSize:13,outline:'none',fontFamily:'inherit'}} />
              {byError&&<div style={{fontSize:11,color:'var(--r)',marginTop:2}}>Required</div>}
            </div>
          </div>

          {/* Per-tank roto gauge inputs */}
          {(st.tanks||[]).map((t,i)=>{
            const g = gauges[i]||{r1:'',r2:'',cap:t.cap||0}
            const avg = getAvg(g.r1, g.r2)
            const kg  = getKg(avg, g.cap)
            const color = avg>=70?'var(--g)':avg>=30?'var(--am)':'var(--r)'
            return (
              <div key={i} style={{background:'var(--bg)',border:'1.5px solid var(--b)',borderRadius:10,padding:'14px 16px'}}>
                {/* Tank header */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14}}>⛽ {t.name}</div>
                    <div style={{fontSize:11,color:'var(--m)',marginTop:2}}>Roto Gauge — enter both readings in %</div>
                  </div>
                  {avg > 0 && (
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:22,fontWeight:800,color,lineHeight:1}}>{avg}%</div>
                      {kg&&<div style={{fontSize:12,fontWeight:600,color:'var(--a)',marginTop:2}}>{kg.toLocaleString()} KG</div>}
                    </div>
                  )}
                </div>

                {/* Two readings side by side */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:10}}>
                  <div className="fld">
                    <label>Reading 1 (%)</label>
                    <input type="number" min="0" max="100" value={g.r1} onChange={e=>updateGauge(i,'r1',e.target.value)}
                      placeholder="e.g. 68"
                      style={{border:'1.5px solid var(--b)',borderRadius:7,padding:'9px 11px',fontSize:18,fontWeight:700,outline:'none',textAlign:'center',fontFamily:'inherit',color:'var(--a)'}} />
                  </div>
                  <div className="fld">
                    <label>Reading 2 (%)</label>
                    <input type="number" min="0" max="100" value={g.r2} onChange={e=>updateGauge(i,'r2',e.target.value)}
                      placeholder="e.g. 72"
                      style={{border:'1.5px solid var(--b)',borderRadius:7,padding:'9px 11px',fontSize:18,fontWeight:700,outline:'none',textAlign:'center',fontFamily:'inherit',color:'var(--a)'}} />
                  </div>
                  <div className="fld">
                    <label>Average (%)</label>
                    <div style={{border:'1.5px solid var(--b)',borderRadius:7,padding:'9px 11px',fontSize:18,fontWeight:800,textAlign:'center',background:'#f8f9fa',color:avg>0?color:'var(--m)',minHeight:42,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {avg > 0 ? `${avg}%` : '—'}
                    </div>
                  </div>
                </div>

                {/* Visual progress bar */}
                {avg > 0 && (
                  <div style={{marginBottom:10}}>
                    <div style={{height:10,borderRadius:5,background:'#e5e7eb',overflow:'hidden'}}>
                      <div style={{height:10,borderRadius:5,background:color,width:`${avg}%`,transition:'width .5s'}}/>
                    </div>
                  </div>
                )}

                {/* Tank capacity */}
                <div className="fld">
                  <label>Tank Capacity (KG)</label>
                  <input type="number" min="0" value={g.cap} onChange={e=>updateCap(i,e.target.value)} placeholder="e.g. 20000"
                    style={{border:'1.5px solid var(--b)',borderRadius:7,padding:'9px 11px',fontSize:13,outline:'none',fontFamily:'inherit'}} />
                  {avg>0&&kg&&<div style={{fontSize:11,color:'var(--g)',fontWeight:600,marginTop:4}}>
                    📦 Estimated stock: <strong>{kg.toLocaleString()} KG</strong> ({avg}% of {Number(g.cap||0).toLocaleString()} KG)
                  </div>}
                </div>
              </div>
            )
          })}

          <div className="fld">
            <label>Notes / Observations</label>
            <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any observations…"
              style={{border:'1.5px solid var(--b)',borderRadius:7,padding:'9px 11px',fontSize:13,outline:'none',fontFamily:'inherit'}} />
          </div>
        </div>
        <div className="df">
          <Button className="btnfw" onClick={save}>💾 Save Reading</Button>
          <Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

function AddStationModal({onClose,dispatch,toast}){
  const {register,handleSubmit,watch,formState:{errors}}=useForm({defaultValues:{tankCount:1}})
  const tankCount=Number(watch('tankCount')||1)
  function onSubmit(d){
    const tanks=Array.from({length:tankCount},(_,i)=>({name:d[`tank-name-${i}`]||`Tank ${i+1}`,cap:Number(d[`tank-cap-${i}`]||0)}))
    dispatch({type:'STATION_ADD',station:{id:uid('ST'),name:d.name,location:d.location,tanks,stock:[],docs:[]}})
    toast('success',`${d.name} added!`);onClose()
  }
  return(
    <div className="mov on" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="mdl" style={{maxHeight:'90vh',overflowY:'auto'}}>
        <div className="dh"><span className="dt">+ Add LPG Outlet</span><button className="dc" onClick={onClose}>×</button></div>
        <div className="db">
          <Field label="Station Name" error={errors.name?.message}><Input {...register('name',{required:'Required'})} placeholder="e.g. Legon Shell"/></Field>
          <Field label="Location"><Input {...register('location')} placeholder="e.g. Legon, Greater Accra"/></Field>
          <Field label="Number of Tanks"><Select {...register('tankCount')}>{[1,2,3,4].map(n=><option key={n} value={n}>{n}</option>)}</Select></Field>
          {Array.from({length:tankCount},(_,i)=>(
            <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,padding:'12px 14px',background:'var(--bg)',borderRadius:8}}>
              <Field label={`Tank ${i+1} Name`}><Input {...register(`tank-name-${i}`)} placeholder={`Tank ${i+1}`}/></Field>
              <Field label="Capacity (KG)"><Input {...register(`tank-cap-${i}`)} type="number" placeholder="20000"/></Field>
            </div>
          ))}
        </div>
        <div className="df">
          <Button className="btnfw" onClick={handleSubmit(onSubmit)}>Add Outlet</Button>
          <Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
