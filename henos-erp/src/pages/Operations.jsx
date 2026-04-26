import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useApp } from '../context/AppContext'
import { useToast } from '../hooks/useToast'
import { exportRowsAsCsv } from '../utils/csv'
import { uid, today, ts, money, statusVariant, REPS, REP_COLORS, owedBalance, HOLDING_CYLS, WINNEBA_CYLS, calcHoldingClosing, calcWcdClosing, calcEpClosing } from '../utils/helpers'
import { PageHeader, Pills, Card, CardBody, CardHeader, Table, Badge, RepBadge, Button, Drawer, Field, Input, Select, EmptyState, ConfirmModal, KpiCard } from '../components/ui'

const CYL_ITEMS = ['50KG Cylinder','14.5KG Cylinder','12.5KG Cylinder','6KG Cylinder','3KG Cylinder','Bulk LPG','Autogas','Other']

// ── Shared inline style helpers ───────────────────────────────
const th = (bg, color='#fff', extra={}) => ({
  padding:'7px 8px', border:'1px solid #d0d0d0', fontSize:10,
  fontWeight:700, textAlign:'center', whiteSpace:'nowrap',
  textTransform:'uppercase', letterSpacing:'.4px',
  background:bg, color, ...extra
})
const td = (color='#111', extra={}) => ({
  padding:'6px 8px', border:'1px solid #e0e0e0', fontSize:12,
  textAlign:'center', verticalAlign:'middle', color, ...extra
})

export default function Operations() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const { db, holding, holdingView, deliveredLog } = state
  const [tab, setTab]             = useState('review')
  const [delFilterDate, setDelFilterDate] = useState('')
  const [deliveredSearch, setDeliveredSearch] = useState('')
  const [delConfirm, setDelConfirm]       = useState(null)
  const [stockOpen, setStockOpen]         = useState(false)
  const [delOpen, setDelOpen]             = useState(false)
  const [supOpen, setSupOpen]             = useState(false)

  const pend = db.orders.filter(o => o.status === 'Awaiting Ops Review')
  const act  = db.orders.filter(o => ['Processing','In Transit'].includes(o.status))

  const tabs = [
    { id:'review',        label: pend.length ? `Review (${pend.length})` : 'Order Review', badge: pend.length||null },
    { id:'deliver',       label: act.length  ? `Deliver (${act.length})`  : 'Mark Delivered' },
    { id:'delivered-log', label: '📋 Delivered Log' },
    { id:'stock',         label: 'Stock' },
    { id:'deliveries',    label: 'Deliveries' },
    { id:'suppliers',     label: 'Suppliers' },
    { id:'elh',           label: '🏭 ELH Holding' },
    { id:'kum',           label: '🏭 Kumasi Holding' },
    { id:'wcd',           label: '🏭 Winneba CDO' },
  ]

  function markDelivered(orderId) {
    const o = db.orders.find(x => x.id === orderId)
    if (!o) return
    const ot = o.qty && o.unitPrice ? o.qty * o.unitPrice : 0
    const due = new Date(Date.now()+14*86400000).toISOString().slice(0,10)
    const repShort = (o.placedBy||'OPS').toUpperCase().replace(/\s+/g,'').slice(0,8)
    const inv = `INV-${repShort}-${Date.now().toString().slice(-6)}`
    const delivDate = today()
    dispatch({ type:'DB_UPDATE', key:'orders', id:orderId, patch:{ status:'Delivered', deliveredAt:delivDate } })
    dispatch({ type:'DB_INSERT', key:'invoices', record:{ id:inv, customer:o.customer, amount:ot, amountPaid:0, dueDate:due, status:'Unpaid', date:delivDate, source:'Auto (Delivery)', orderId, repName:o.placedBy||'' } })
    dispatch({ type:'DELIVERED_LOG_ADD', entry:{ orderId:o.id, customer:o.customer, product:o.product, qty:o.qty, value:ot, placedBy:o.placedBy||'—', deliveredAt:delivDate, invoiceId:inv } })
    dispatch({ type:'DB_INSERT', key:'anotifs', record:{ id:uid('N'), type:'invoice', read:false, time:ts(), title:`Auto Invoice — ${inv}`, message:`Order ${orderId} delivered. Invoice ${money(ot)} created. Due: ${due}.` } })
    dispatch({ type:'DB_INSERT', key:'cnotifs', record:{ id:uid('N'), type:'delivered', read:false, time:ts(), title:`Order ${orderId} Delivered 📦`, message:`"${o.product}" to ${o.customer} delivered. Invoice ${inv} in Accounts.` } })
    toast('success', 'Delivered! Invoice auto-created in Accounts.')
  }

  function doDelete() {
    dispatch({ type:'DB_DELETE', key:delConfirm.key, id:delConfirm.id })
    toast('success','Deleted.')
    setDelConfirm(null)
  }

  const allDates = [...new Set(deliveredLog.map(e=>e.deliveredAt))].sort((a,b)=>b.localeCompare(a))
  const filteredLog = deliveredLog.filter(entry => {
    const dateMatches = !delFilterDate || entry.deliveredAt === delFilterDate
    const searchMatches = !deliveredSearch || [entry.orderId, entry.customer, entry.product, entry.placedBy, entry.invoiceId]
      .some(value => String(value || '').toLowerCase().includes(deliveredSearch.toLowerCase()))
    return dateMatches && searchMatches
  })
  const logTotal = filteredLog.reduce((s,e)=>s+Number(e.value||0),0)

  const sbv = s => ({OK:'success',Low:'warning',Critical:'danger',Out:'danger'}[s]||'neutral')
  const dbv = s => ({Scheduled:'neutral',Loaded:'warning','En Route':'info',Delivered:'success',Failed:'danger'}[s]||'neutral')

  return (
    <div style={{animation:'fadein .3s cubic-bezier(.4,0,.2,1)'}}>
      <PageHeader title="Operations" actions={<>
        {tab==='stock'      && <Button onClick={()=>setStockOpen(true)}>+ Stock</Button>}
        {tab==='deliveries' && <Button onClick={()=>setDelOpen(true)}>+ Delivery</Button>}
        {tab==='suppliers'  && <Button onClick={()=>setSupOpen(true)}>+ Supplier</Button>}
      </>} />

      <div className="krow">
        <KpiCard label="Pending Review" value={pend.length||'—'} note="From Commercial" valueStyle={{color:pend.length?'var(--am)':'var(--m)'}} />
        <KpiCard label="Active Orders"  value={act.length||'—'}  note="Processing / In Transit" valueStyle={{color:'var(--a)'}} />
        <KpiCard label="Delivered"      value={deliveredLog.length||'—'} note="All time" valueStyle={{color:'var(--g)'}} />
        <KpiCard label="Deliveries"     value={db.deliveries.filter(d=>d.status!=='Delivered').length||'—'} note="Active" />
      </div>

      <Pills tabs={tabs} active={tab} onChange={setTab} />

      {/* ── ORDER REVIEW ── */}
      {tab==='review' && (
        pend.length === 0
          ? <Card><CardBody><EmptyState icon="✅" message="No orders pending review" sub="Orders from Commercial appear here." /></CardBody></Card>
          : <div>
              {pend.map(o => {
                const ot = o.qty && o.unitPrice ? o.qty * o.unitPrice : 0
                const custOwed = owedBalance(o.customer, db.invoices)
                const riskHigh = custOwed > 0 && custOwed >= ot * 2
                const riskMed  = custOwed > 0 && !riskHigh
                return (
                  <Card key={o.id} style={{marginBottom:14}}>
                    {/* Card header */}
                    <div style={{background:riskHigh?'#FEF2F2':riskMed?'#FFFBEB':'#EDFAF4', padding:'12px 16px', borderBottom:'1.5px solid var(--b)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                        <span style={{fontSize:11,color:'var(--a)',fontFamily:'monospace',fontWeight:700}}>{o.id}</span>
                        <span style={{fontWeight:700,fontSize:14}}>{o.customer||'—'}</span>
                        <RepBadge name={o.placedBy} colors={REP_COLORS} />
                        <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
                      </div>
                      <div style={{display:'flex',gap:6}}>
                        <Button variant="success" size="sm" onClick={()=>{
                          dispatch({type:'DB_UPDATE',key:'orders',id:o.id,patch:{status:'Processing',approvedAt:today()}})
                          dispatch({type:'DB_INSERT',key:'cnotifs',record:{id:uid('N'),type:'approved',read:false,time:ts(),title:`Order ${o.id} Approved ✅`,message:`Order for "${o.product}" for ${o.customer} is now Processing.`}})
                          toast('success','Order approved.')
                        }}>✓ Approve</Button>
                        <Button variant="danger" size="sm" onClick={()=>{
                          dispatch({type:'DB_UPDATE',key:'orders',id:o.id,patch:{status:'Cancelled',cancelledAt:today()}})
                          dispatch({type:'DB_INSERT',key:'cnotifs',record:{id:uid('N'),type:'rejected',read:false,time:ts(),title:`Order ${o.id} Rejected ❌`,message:`Order for "${o.product}" for ${o.customer} was rejected by Operations.`}})
                          toast('success','Order rejected.')
                        }}>✕ Reject</Button>
                      </div>
                    </div>
                    <CardBody>
                      {/* Credit risk banner */}
                      {custOwed > 0 ? (
                        <div className={`ibar ${riskHigh?'ir':'iw'}`} style={{marginBottom:12}}>
                          <span>{riskHigh?'🔴':'🟡'}</span>
                          <span>
                            {riskHigh ? <strong>HIGH CREDIT RISK — </strong> : <strong>CAUTION — </strong>}
                            {o.customer} has an outstanding balance of <strong>{money(custOwed)}</strong>.
                            {riskHigh && ' Balance exceeds order value twice — proceed with caution.'}
                          </span>
                        </div>
                      ) : (
                        <div className="ibar ig" style={{marginBottom:12}}>
                          <span>🟢</span><span><strong>Clear</strong> — No outstanding balance for {o.customer}.</span>
                        </div>
                      )}
                      {/* Order details */}
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
                        {[
                          ['Product',             o.product||'—'],
                          ['Quantity',            o.qty||'—'],
                          ['Unit Price',          o.unitPrice ? money(o.unitPrice) : '—'],
                          ['Order Total',         ot ? money(ot) : '—'],
                          ['Date Placed',         o.date||'—'],
                          ['Outstanding Balance', custOwed ? money(custOwed) : 'GH₵ 0'],
                        ].map(([l,v])=>(
                          <div key={l} style={{background:'var(--bg)',borderRadius:8,padding:'10px 12px'}}>
                            <div style={{fontSize:10,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:4}}>{l}</div>
                            <div style={{fontSize:13,fontWeight:700,color:l==='Outstanding Balance'&&custOwed>0?'var(--r)':'#0D0F14'}}>{v}</div>
                          </div>
                        ))}
                      </div>
                      {o.notes && (
                        <div className="ibar ib" style={{marginTop:12,marginBottom:0}}>
                          <span>📝</span><span><strong>Notes:</strong> {o.notes}</span>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                )
              })}
            </div>
      )}

      {/* ── MARK DELIVERED ── */}
      {tab==='deliver' && (
        act.length === 0
          ? <Card><CardBody><EmptyState icon="📦" message="No active orders to deliver" sub="Approved/Processing orders appear here." /></CardBody></Card>
          : <Card>
              <CardHeader title="Mark Orders as Delivered" actions={<span style={{fontSize:11,color:'var(--m)'}}>Auto-creates invoice in Accounts</span>} />
              <CardBody noPad>
                <Table
                  columns={['Order ID','Customer','Product','Qty','Value','Placed By','Status','Action']}
                  rows={act.map(o=>{
                    const ot=o.qty&&o.unitPrice?o.qty*o.unitPrice:0
                    return [
                      <span style={{fontSize:11,color:'var(--a)',fontFamily:'monospace'}}>{o.id}</span>,
                      o.customer||'—', o.product||'—', o.qty||'—', ot?money(ot):'—',
                      <RepBadge name={o.placedBy} colors={REP_COLORS} />,
                      <Badge variant={statusVariant(o.status)}>{o.status}</Badge>,
                      <Button variant="success" size="sm" onClick={()=>markDelivered(o.id)}>✓ Delivered</Button>,
                    ]
                  })}
                />
              </CardBody>
            </Card>
      )}

      {/* ── DELIVERED LOG ── */}
      {tab==='delivered-log' && (
        <Card>
          <CardHeader title="📋 Delivered Orders Log"
            actions={<div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              <label style={{fontSize:11,color:'var(--m)'}}>Filter by date:</label>
              <select value={delFilterDate} onChange={e=>setDelFilterDate(e.target.value)}
                style={{border:'1.5px solid var(--b)',borderRadius:7,padding:'5px 10px',fontSize:13,outline:'none',background:'#fff'}}>
                <option value="">— All dates —</option>
                {allDates.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
              <input value={deliveredSearch} onChange={e=>setDeliveredSearch(e.target.value)} placeholder="Search customer, order, invoice..." style={{minWidth:200,border:'1.5px solid var(--b)',borderRadius:7,padding:'5px 10px',fontSize:13,outline:'none'}} />
              {(delFilterDate || deliveredSearch)&&<Button variant="ghost" size="sm" onClick={()=>{setDelFilterDate(''); setDeliveredSearch('')}}>✕ Clear</Button>}
              <Button variant="secondary" size="sm" onClick={()=>exportRowsAsCsv('operations-delivered-log', ['Order ID','Customer','Product','Qty','Value','Placed By','Invoice','Delivered'], filteredLog.map(e => [e.orderId, e.customer || '', e.product || '', e.qty || '', e.value || '', e.placedBy || '', e.invoiceId || '', e.deliveredAt || '']))}>Export CSV</Button>
              <Button variant="secondary" size="sm" onClick={()=>printDeliveredLog(filteredLog,delFilterDate)}>🖨 Print</Button>
              {delFilterDate&&<span style={{background:'var(--bls)',color:'var(--bl)',fontSize:12,fontWeight:700,borderRadius:8,padding:'4px 12px'}}>📅 {delFilterDate} — {filteredLog.length} order{filteredLog.length!==1?'s':''}{logTotal?` · ${money(logTotal)}`:''}</span>}
            </div>}
          />
          <CardBody noPad>
            {deliveredLog.length===0
              ? <EmptyState icon="📦" message="No delivered orders yet" sub="Orders marked as Delivered will appear here." />
              : filteredLog.length===0
                ? <EmptyState icon="🔍" message="No orders on this date" sub="Try a different date or clear the filter." />
                : <>
                    <Table
                      columns={['Order ID','Customer','Product','Qty','Value','Placed By','Invoice','Delivered']}
                      rows={filteredLog.map(e=>[
                        <span style={{fontSize:11,color:'var(--a)',fontFamily:'monospace',fontWeight:600}}>{e.orderId}</span>,
                        <span style={{fontWeight:600}}>{e.customer}</span>,
                        e.product||'—', e.qty||'—',
                        <span style={{fontWeight:700,color:'var(--g)'}}>{e.value?money(e.value):'—'}</span>,
                        <RepBadge name={e.placedBy} colors={REP_COLORS} />,
                        <span style={{fontSize:11,color:'var(--a)',fontFamily:'monospace'}}>{e.invoiceId||'—'}</span>,
                        <span style={{background:'var(--gs)',color:'var(--g)',fontSize:11,fontWeight:700,borderRadius:5,padding:'2px 8px'}}>✅ {e.deliveredAt}</span>,
                      ])}
                    />
                    <div style={{padding:'10px 14px',borderTop:'1px solid var(--b)',display:'flex',gap:20,flexWrap:'wrap',fontSize:12,color:'var(--m)'}}>
                      <span>Total Orders: <strong style={{color:'#0D0F14'}}>{filteredLog.length}</strong></span>
                      {logTotal>0&&<span>Total Value: <strong style={{color:'var(--g)'}}>{money(logTotal)}</strong></span>}
                    </div>
                  </>
            }
          </CardBody>
        </Card>
      )}

      {/* ── STOCK DASHBOARD ── */}
      {tab==='stock' && <StockDashboard state={state} />}

      {/* ── DELIVERIES ── */}
      {tab==='deliveries' && (
        <Card><CardBody noPad>
          <div className="phd" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
            <span className="ptl2">Deliveries</span>
            <Button variant="secondary" size="sm" onClick={()=>exportRowsAsCsv('operations-deliveries', ['ID','Order Ref','Driver','Truck','Destination','Exchange Points','ETA','Status'], db.deliveries.map(d => [d.id, d.orderRef || '', d.driver || '', d.truck || '', d.destination || '', (d.exchangePoints || []).join(' | '), d.eta || '', d.status || '']))}>Export CSV</Button>
          </div>
          <Table
            columns={['ID','Order Ref','Driver','Truck','Destination','ETA','Status','']}
            rows={db.deliveries.map(d=>[
              <span style={{fontSize:11,color:'var(--a)',fontFamily:'monospace'}}>{d.id}</span>,
              d.orderRef||'—', d.driver||'—', d.truck||'—', d.destination||'—', d.eta||'—',
              <Badge variant={dbv(d.status)}>{d.status||'Scheduled'}</Badge>,
              <div style={{display:'flex',gap:4}}>
                <Button variant="secondary" size="sm" onClick={()=>printDelivery(d)}>🖨</Button>
                <Button variant="ghost" size="sm" onClick={()=>setDelConfirm({key:'deliveries',id:d.id})}>Del</Button>
              </div>,
            ])}
          />
        </CardBody></Card>
      )}

      {/* ── SUPPLIERS ── */}
      {tab==='suppliers' && (
        <Card><CardBody noPad>
          <Table
            columns={['ID','Name','Product','Contact','Location','Status','']}
            rows={db.suppliers.map(s=>[
              <span style={{fontSize:11,color:'var(--m)',fontFamily:'monospace'}}>{s.id}</span>,
              s.name||'—', s.product||'—', s.contact||'—', s.location||'—',
              <Badge variant={s.status==='Active'?'success':'neutral'}>{s.status||'Active'}</Badge>,
              <Button variant="ghost" size="sm" onClick={()=>setDelConfirm({key:'suppliers',id:s.id})}>Del</Button>,
            ])}
          />
        </CardBody></Card>
      )}

      {(tab==='elh'||tab==='kum') && <HoldingArea area={tab} />}
      {tab==='wcd' && <WinnebaArea />}

      <StockDrawer  open={stockOpen} onClose={()=>setStockOpen(false)} dispatch={dispatch} toast={toast} />
      <DelivDrawer  open={delOpen}   onClose={()=>setDelOpen(false)}   dispatch={dispatch} toast={toast} />
      <SupDrawer    open={supOpen}   onClose={()=>setSupOpen(false)}   dispatch={dispatch} toast={toast} />
      <ConfirmModal open={!!delConfirm} onClose={()=>setDelConfirm(null)} onConfirm={doDelete} title="Confirm Delete" message="This record will be permanently deleted." />
    </div>
  )
}

// ── Delivery Item Builder ─────────────────────────────────────
function DelivItemBuilder({ items, setItems }) {
  function addItem() { setItems(p=>[...p,{id:uid('DI'),type:'',isBulk:false,bulkDesc:'',qty:1}]) }
  function remove(id) { setItems(p=>p.filter(it=>it.id!==id)) }
  function update(id,patch) { setItems(p=>p.map(it=>it.id===id?{...it,...patch}:it)) }
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
        <label style={{fontSize:10,fontWeight:600,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.5px'}}>Items / Load</label>
        <button type="button" className="btn btng btnsm" onClick={addItem}>+ Add Item</button>
      </div>
      {items.length===0 && (
        <div style={{background:'var(--bg)',borderRadius:8,padding:'12px 14px',fontSize:12,color:'var(--m)',textAlign:'center'}}>No items yet — click "+ Add Item"</div>
      )}
      {items.map(it=>(
        <div key={it.id} style={{background:'var(--bg)',border:'1.5px solid var(--b)',borderRadius:8,padding:'10px 12px',marginBottom:8}}>
          <div style={{display:'flex',gap:6,alignItems:'flex-end'}}>
            <div style={{flex:2}}>
              <label style={{fontSize:10,fontWeight:600,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:4}}>Item</label>
              <select value={it.type} onChange={e=>update(it.id,{type:e.target.value,isBulk:e.target.value==='Bulk LPG'})}
                style={{width:'100%',border:'1.5px solid var(--b)',borderRadius:7,padding:'7px 9px',fontSize:13,outline:'none',background:'#fff',fontFamily:'inherit'}}>
                <option value="">Select…</option>
                {CYL_ITEMS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{flex:1}}>
              <label style={{fontSize:10,fontWeight:600,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:4}}>Qty</label>
              <input type="number" min="1" value={it.qty} onChange={e=>update(it.id,{qty:e.target.value})}
                style={{width:'100%',border:'1.5px solid var(--b)',borderRadius:7,padding:'7px 9px',fontSize:13,outline:'none',textAlign:'center',fontFamily:'inherit'}} />
            </div>
            <button type="button" onClick={()=>remove(it.id)}
              style={{background:'none',border:'none',color:'var(--r)',fontSize:20,cursor:'pointer',lineHeight:1,padding:'4px 6px',marginBottom:2,flexShrink:0}}>×</button>
          </div>
          {it.isBulk && (
            <div style={{marginTop:8}}>
              <label style={{fontSize:10,fontWeight:600,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:4}}>Bulk Description (e.g. weight in KG)</label>
              <input value={it.bulkDesc||''} onChange={e=>update(it.id,{bulkDesc:e.target.value})} placeholder="e.g. 5000 KG"
                style={{width:'100%',border:'1.5px solid var(--b)',borderRadius:7,padding:'7px 9px',fontSize:13,outline:'none',fontFamily:'inherit'}} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}


// ── Company-wide Stock Dashboard ─────────────────────────────
function StockDashboard({ state }) {
  const { holding, exchangePoints, stations, db } = state

  // ── Aggregate ELH & Kumasi holding ─────────────────────────
  function sumHolding(area) {
    const records = holding[area] || []
    if (!records.length) return { filled:0, empty:0, total:0, hasData:false }
    const latest = records[0]
    let filled=0, empty=0
    ;(latest.rows||[]).forEach(r=>{
      const { cf, ce } = calcHoldingClosing(r)
      filled += cf; empty += ce
    })
    return { filled, empty, total:filled+empty, hasData:true, date:latest.date }
  }
  function sumWinneba() {
    const records = holding.wcd || []
    if (!records.length) return { filled:0, empty:0, total:0, hasData:false }
    const latest = records[0]
    let filled=0, empty=0
    ;(latest.rows||[]).forEach(r=>{
      const { cf, ce } = calcWcdClosing(r)
      filled += cf; empty += ce
    })
    return { filled, empty, total:filled+empty, hasData:true, date:latest.date }
  }

  // ── Aggregate EaziGas exchange points ──────────────────────
  function sumEaziGas() {
    if (!exchangePoints.length) return { filled:0, empty:0, total:0, hasData:false, eps:[] }
    let totalFilled=0, totalEmpty=0
    const eps = exchangePoints.map(ep=>{
      if (!ep.records.length) return { name:ep.name, location:ep.location, filled:0, empty:0, hasData:false }
      const latest = ep.records[0]
      let filled=0, empty=0
      ;(latest.rows||[]).forEach(r=>{
        const { cf, ce } = calcEpClosing(r)
        filled += cf; empty += ce
      })
      totalFilled += filled; totalEmpty += empty
      return { name:ep.name, location:ep.location, filled, empty, total:filled+empty, hasData:true, date:latest.date }
    })
    return { filled:totalFilled, empty:totalEmpty, total:totalFilled+totalEmpty, hasData:true, eps }
  }

  // ── Aggregate LPG Stations ─────────────────────────────────
  function sumStations() {
    if (!stations.length) return { totalKg:0, hasData:false, list:[] }
    let totalKg=0
    const list = stations.map(st=>{
      if (!st.stock?.length) return { name:st.name, location:st.location, totalKg:0, pct:0, hasData:false }
      const latest = st.stock[0]
      let kg=0
      ;(st.tanks||[]).forEach((t,ti)=>{
        const pct = latest.tanks?.[ti]?.pct??0
        kg += t.cap ? Math.round(pct/100*t.cap) : 0
      })
      totalKg += kg
      // Overall pct = weighted avg
      const totalCap = (st.tanks||[]).reduce((s,t)=>s+Number(t.cap||0),0)
      const pct = totalCap ? Math.round(kg/totalCap*100) : 0
      return { name:st.name, location:st.location, totalKg:kg, totalCap, pct, hasData:true, date:latest.date }
    })
    return { totalKg, hasData:stations.some(s=>s.stock?.length), list }
  }

  const elh    = sumHolding('elh')
  const kum    = sumHolding('kum')
  const wcd    = sumWinneba()
  const eg     = sumEaziGas()
  const lpg    = sumStations()

  // Grand totals
  const grandFilled = elh.filled + kum.filled + wcd.filled + eg.filled
  const grandEmpty  = elh.empty  + kum.empty  + wcd.empty  + eg.empty
  const grandTotal  = grandFilled + grandEmpty

  // ── Mini area summary card ─────────────────────────────────
  function AreaCard({ icon, label, filled, empty, total, date, hasData, sub }) {
    const fillPct = total>0 ? Math.round(filled/total*100) : 0
    const fillColor = fillPct>=60?'var(--g)':fillPct>=30?'var(--am)':'var(--r)'
    return (
      <div style={{background:'var(--w)',border:'1.5px solid var(--b)',borderRadius:12,padding:'14px 16px',transition:'box-shadow .2s'}}
        onMouseOver={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.08)'}
        onMouseOut={e=>e.currentTarget.style.boxShadow='none'}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
          <div style={{width:38,height:38,borderRadius:10,background:'var(--as)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{icon}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:13}}>{label}</div>
            {sub&&<div style={{fontSize:10,color:'var(--m)',marginTop:1}}>{sub}</div>}
          </div>
          {date&&<span style={{fontSize:10,color:'var(--m)',flexShrink:0}}>📅 {date}</span>}
        </div>
        {hasData ? (
          <>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10}}>
              {[['Filled',filled,'var(--g)'],['Empty',empty,'var(--am)'],['Total',total,'var(--a)']].map(([l,v,col])=>(
                <div key={l} style={{textAlign:'center',padding:'7px 4px',borderRadius:8,background:'var(--bg)'}}>
                  <div style={{fontSize:18,fontWeight:800,color:col,lineHeight:1}}>{v}</div>
                  <div style={{fontSize:10,color:'var(--m)',marginTop:2}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{height:6,borderRadius:3,background:'#e5e7eb',overflow:'hidden'}}>
              <div style={{height:6,borderRadius:3,background:fillColor,width:`${fillPct}%`,transition:'width .6s'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--m)',marginTop:3}}>
              <span>{fillPct}% filled</span>
              <span>{100-fillPct}% empty</span>
            </div>
          </>
        ) : (
          <div style={{textAlign:'center',padding:'12px 0',color:'var(--m)',fontSize:12}}>No data recorded yet</div>
        )}
      </div>
    )
  }

  const CALC_EP = typeof calcEpClosing === 'function' ? calcEpClosing : r=>({cf:0,ce:0})

  return (
    <div>
      {/* ── Grand Summary Banner ────────────────────────────── */}
      <div style={{background:'linear-gradient(135deg,#0f172a,#1e3a5f)',borderRadius:16,padding:'22px 28px',marginBottom:22,boxShadow:'0 8px 32px rgba(15,23,42,.25)'}}>
        <div style={{fontSize:11,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.8px',fontWeight:600,marginBottom:16}}>
          Company-Wide Cylinder Stock Position
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:20}}>
          {[
            {l:'Total Filled',v:grandFilled,c:'#4ade80',icon:'🟢'},
            {l:'Total Empty',v:grandEmpty,c:'#fbbf24',icon:'🟡'},
            {l:'Total Cylinders',v:grandTotal,c:'#93c5fd',icon:'⬡'},
          ].map(item=>(
            <div key={item.l} style={{textAlign:'center',padding:'14px 10px',borderRadius:12,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)'}}>
              <div style={{fontSize:9,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:6}}>{item.icon} {item.l}</div>
              <div style={{fontSize:32,fontWeight:900,color:item.c,lineHeight:1}}>{item.v}</div>
            </div>
          ))}
        </div>
        {/* Grand fill ratio bar */}
        <div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#94a3b8',marginBottom:6}}>
            <span>Filled: {grandTotal>0?Math.round(grandFilled/grandTotal*100):0}%</span>
            <span>Empty: {grandTotal>0?Math.round(grandEmpty/grandTotal*100):0}%</span>
          </div>
          <div style={{height:10,borderRadius:5,background:'rgba(255,255,255,.1)',overflow:'hidden',display:'flex'}}>
            <div style={{height:10,background:'#4ade80',width:grandTotal>0?`${Math.round(grandFilled/grandTotal*100)}%`:'0%',transition:'width .8s',borderRadius:'5px 0 0 5px'}}/>
            <div style={{height:10,background:'#fbbf24',flex:1}}/>
          </div>
        </div>
        {grandTotal===0&&(
          <div style={{marginTop:16,textAlign:'center',fontSize:12,color:'#64748b'}}>
            No stock data yet — record entries in ELH Holding, Kumasi, Winneba CDO and EaziGas tabs
          </div>
        )}
      </div>

      {/* ── Cylinder Holdings Grid ──────────────────────────── */}
      <div style={{fontWeight:700,fontSize:13,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.7px',marginBottom:10}}>
        Cylinder Holdings (Filled & Empty)
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12,marginBottom:22}}>
        <AreaCard icon="🏭" label="ELH Holding" sub="Accra / Main Hub"
          filled={elh.filled} empty={elh.empty} total={elh.total} date={elh.date} hasData={elh.hasData} />
        <AreaCard icon="🏭" label="Kumasi Holding" sub="Kumasi Depot"
          filled={kum.filled} empty={kum.empty} total={kum.total} date={kum.date} hasData={kum.hasData} />
        <AreaCard icon="🏭" label="Winneba CDO" sub="Winneba Depot"
          filled={wcd.filled} empty={wcd.empty} total={wcd.total} date={wcd.date} hasData={wcd.hasData} />
      </div>

      {/* ── EaziGas Exchange Points ─────────────────────────── */}
      <div style={{fontWeight:700,fontSize:13,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.7px',marginBottom:10}}>
        EaziGas Exchange Points
      </div>
      {eg.eps.length===0 ? (
        <div className="panel" style={{padding:'20px 24px',marginBottom:22,textAlign:'center',color:'var(--m)',fontSize:13}}>No exchange points configured</div>
      ) : (
        <div style={{marginBottom:22}}>
          {/* Per-EP row */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:10,marginBottom:12}}>
            {eg.eps.map((ep,i)=>{
              const fillPct = ep.total>0?Math.round(ep.filled/ep.total*100):0
              const col = fillPct>=60?'var(--g)':fillPct>=30?'var(--am)':'var(--r)'
              return (
                <div key={i} style={{background:'var(--w)',border:'1.5px solid var(--b)',borderRadius:10,padding:'12px 14px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                    <span style={{fontSize:16}}>🔄</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ep.name}</div>
                      <div style={{fontSize:10,color:'var(--m)'}}>{ep.location}</div>
                    </div>
                  </div>
                  {ep.hasData ? (
                    <>
                      <div style={{display:'flex',gap:6,marginBottom:7}}>
                        {[['F',ep.filled,'var(--g)'],['E',ep.empty,'var(--am)']].map(([l,v,col])=>(
                          <div key={l} style={{flex:1,textAlign:'center',padding:'5px 4px',borderRadius:6,background:'var(--bg)'}}>
                            <div style={{fontSize:16,fontWeight:800,color:col,lineHeight:1}}>{v}</div>
                            <div style={{fontSize:9,color:'var(--m)',marginTop:1}}>{l==='F'?'Filled':'Empty'}</div>
                          </div>
                        ))}
                        <div style={{flex:1,textAlign:'center',padding:'5px 4px',borderRadius:6,background:'var(--bg)'}}>
                          <div style={{fontSize:16,fontWeight:800,color:'var(--a)',lineHeight:1}}>{ep.total}</div>
                          <div style={{fontSize:9,color:'var(--m)',marginTop:1}}>Total</div>
                        </div>
                      </div>
                      <div style={{height:4,borderRadius:2,background:'#e5e7eb',overflow:'hidden'}}>
                        <div style={{height:4,borderRadius:2,background:col,width:`${fillPct}%`}}/>
                      </div>
                    </>
                  ) : <div style={{fontSize:11,color:'var(--m)',textAlign:'center',padding:'8px 0'}}>No data</div>}
                </div>
              )
            })}
          </div>
          {/* EaziGas totals bar */}
          <div style={{background:'var(--w)',border:'1.5px solid var(--b)',borderRadius:10,padding:'12px 16px',display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
            <span style={{fontSize:12,fontWeight:700,color:'var(--m)'}}>All EaziGas EPs:</span>
            <span style={{fontWeight:700,color:'var(--g)'}}>🟢 {eg.filled} Filled</span>
            <span style={{fontWeight:700,color:'var(--am)'}}>🟡 {eg.empty} Empty</span>
            <span style={{fontWeight:700,color:'var(--a)'}}>⬡ {eg.total} Total</span>
          </div>
        </div>
      )}

      {/* ── LPG Stations ────────────────────────────────────── */}
      <div style={{fontWeight:700,fontSize:13,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.7px',marginBottom:10}}>
        LPG Station Tanks
      </div>
      {lpg.list.length===0 ? (
        <div className="panel" style={{padding:'20px 24px',marginBottom:22,textAlign:'center',color:'var(--m)',fontSize:13}}>No LPG stations configured</div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:10,marginBottom:22}}>
          {lpg.list.map((st,i)=>{
            const col = st.pct>=70?'var(--g)':st.pct>=30?'var(--am)':'var(--r)'
            return (
              <div key={i} style={{background:'var(--w)',border:'1.5px solid var(--b)',borderRadius:10,padding:'12px 14px'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <span style={{fontSize:16}}>⛽</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{st.name}</div>
                    <div style={{fontSize:10,color:'var(--m)'}}>{st.location}</div>
                  </div>
                </div>
                {st.hasData ? (
                  <>
                    <div style={{textAlign:'center',padding:'8px 4px',borderRadius:8,background:'var(--bg)',marginBottom:8}}>
                      <div style={{fontSize:22,fontWeight:900,color:col,lineHeight:1}}>{st.totalKg.toLocaleString()}</div>
                      <div style={{fontSize:10,color:'var(--m)',marginTop:2}}>KG in tank{lpg.list.length>1?'s':''} · {st.pct}% full</div>
                    </div>
                    <div style={{height:6,borderRadius:3,background:'#e5e7eb',overflow:'hidden'}}>
                      <div style={{height:6,borderRadius:3,background:col,width:`${st.pct}%`,transition:'width .6s'}}/>
                    </div>
                  </>
                ) : <div style={{fontSize:11,color:'var(--m)',textAlign:'center',padding:'8px 0'}}>No stock reading yet</div>}
              </div>
            )
          })}
          {lpg.hasData&&(
            <div style={{background:'var(--as)',border:'1.5px solid var(--b)',borderRadius:10,padding:'12px 14px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4}}>
              <div style={{fontSize:10,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.5px'}}>All Stations Total</div>
              <div style={{fontSize:28,fontWeight:900,color:'var(--a)',lineHeight:1}}>{lpg.totalKg.toLocaleString()}</div>
              <div style={{fontSize:11,color:'var(--m)'}}>KG across {lpg.list.filter(s=>s.hasData).length} station{lpg.list.length>1?'s':''}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Holding Area ──────────────────────────────────────────────
function HoldingArea({ area }) {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const records = state.holding[area]
  const viewDate = state.holdingView[area]
  const label = area==='elh' ? 'ELH Holding Area' : 'Kumasi Holding Area'

  const [inputs, setInputs] = useState({})
  const setInput = (ci,f,v) => setInputs(p=>({...p,[`${ci}-${f}`]:v}))
  const getInput = (ci,f) => inputs[`${ci}-${f}`] ?? ''

  function save() {
    const dateEl = document.getElementById(`ha-date-${area}`)
    const date = dateEl?.value || today()
    const rows = HOLDING_CYLS.map((cyl,ci)=>({
      cyl,
      of:Number(getInput(ci,'of')||0), oe:Number(getInput(ci,'oe')||0),
      df:Number(getInput(ci,'df')||0), de:Number(getInput(ci,'de')||0),
      rf:Number(getInput(ci,'rf')||0), re:Number(getInput(ci,'re')||0),
    }))
    dispatch({ type:'HOLDING_SAVE', area, record:{ date, rows } })
    setInputs({})
    toast('success',`Entry saved for ${date}.`)
  }

  // Style helpers for this table
  const TH = (bg,color='#fff',extra={}) => ({padding:'7px 8px',border:'1px solid #ccc',fontSize:10,fontWeight:700,textAlign:'center',textTransform:'uppercase',letterSpacing:'.4px',background:bg,color,...extra})
  const TD = (color='#111',extra={}) => ({padding:'6px 8px',border:'1px solid #e0e0e0',fontSize:12,textAlign:'center',verticalAlign:'middle',color,...extra})

  const HeaderRow = () => (
    <>
      <tr>
        <th style={TH('#E8401C')} rowSpan={2}>Date</th>
        <th style={TH('#E8401C')} rowSpan={2}>Cylinder</th>
        <th style={TH('#2563eb')} colSpan={2}>Opening Stock</th>
        <th style={TH('#dc2626')} colSpan={2}>Dispatched</th>
        <th style={TH('#16a34a')} colSpan={2}>Received</th>
        <th style={TH('#7c3aed')} colSpan={2}>Closing Stock</th>
      </tr>
      <tr>
        <th style={TH('#dbeafe','#1d4ed8')}>Filled</th>
        <th style={TH('#dbeafe','#1d4ed8')}>Empty</th>
        <th style={TH('#fee2e2','#991b1b')}>Filled</th>
        <th style={TH('#fee2e2','#991b1b')}>Empty</th>
        <th style={TH('#dcfce7','#166534')}>Filled</th>
        <th style={TH('#dcfce7','#166534')}>Empty</th>
        <th style={TH('#ede9fe','#5b21b6')}>Filled</th>
        <th style={TH('#ede9fe','#5b21b6')}>Empty</th>
      </tr>
    </>
  )

  return (
    <div>
      {records.length > 0 && (
        <Card style={{marginBottom:12}}>
          <CardHeader title="📅 View Saved Entry" actions={
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              <select value={viewDate||''} onChange={e=>dispatch({type:'HOLDING_SET_VIEW',area,date:e.target.value})}
                style={{border:'1.5px solid var(--b)',borderRadius:7,padding:'5px 10px',fontSize:13,outline:'none',background:'#fff',fontFamily:'inherit'}}>
                <option value="">— Select a date —</option>
                {records.map(r=><option key={r.date} value={r.date}>{r.date}</option>)}
              </select>
              {viewDate&&<Button variant="danger" size="sm" onClick={()=>dispatch({type:'HOLDING_DEL',area,date:viewDate})}>🗑 Delete</Button>}
              <Button variant="ghost" size="sm" onClick={()=>dispatch({type:'HOLDING_CLEAR',area})}>Clear All</Button>
            </div>
          } />
          {viewDate && (() => {
            const rec = records.find(r=>r.date===viewDate)
            if (!rec) return null
            return (
              <CardBody noPad>
                <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
                  <table className="ha-table">
                    <thead><HeaderRow /></thead>
                    <tbody>
                      {HOLDING_CYLS.map((cyl,ci)=>{
                        const r = rec.rows[ci]||{}
                        const {cf,ce} = calcHoldingClosing(r)
                        return (
                          <tr key={cyl} style={{background:ci%2===0?'#fafafa':'#fff'}}>
                            {ci===0&&<td style={TD('#c2410c',{fontWeight:700,background:'#fff7ed'})} rowSpan={HOLDING_CYLS.length}>{rec.date}</td>}
                            <td style={TD('#0D0F14',{fontWeight:600,textAlign:'left',paddingLeft:12})}>{cyl}</td>
                            <td style={TD('#1d4ed8',{fontWeight:600})}>{r.of||0}</td>
                            <td style={TD('#1d4ed8',{fontWeight:600})}>{r.oe||0}</td>
                            <td style={TD('#991b1b',{fontWeight:600})}>{r.df||0}</td>
                            <td style={TD('#991b1b',{fontWeight:600})}>{r.de||0}</td>
                            <td style={TD('#166534',{fontWeight:600})}>{r.rf||0}</td>
                            <td style={TD('#166534',{fontWeight:600})}>{r.re||0}</td>
                            <td style={TD('#5b21b6',{fontWeight:700,background:'#f5f3ff'})}>{cf}</td>
                            <td style={TD('#5b21b6',{fontWeight:700,background:'#f5f3ff'})}>{ce}</td>
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
      <Card>
        <CardHeader title={`🏭 ${label} — New Entry`} actions={<>
          <span style={{fontSize:11,color:'var(--m)'}}>Closing = Opening + Received − Dispatched</span>
          <Button size="sm" onClick={save}>💾 Save Entry</Button>
        </>} />
        <CardBody noPad>
          <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
            <table className="ha-table">
              <thead><HeaderRow /></thead>
              <tbody>
                {HOLDING_CYLS.map((cyl,ci)=>{
                  const g = f => Number(getInput(ci,f)||0)
                  const cf = Math.max(0, g('of')+g('rf')-g('df'))
                  const ce = Math.max(0, g('oe')+g('re')-g('de'))
                  return (
                    <tr key={cyl} style={{background:ci%2===0?'#fffbeb':'#fff'}}>
                      {ci===0&&<td style={{border:'1px solid #e5e7eb',background:'#fef9c3',fontWeight:700,textAlign:'center',verticalAlign:'middle'}} rowSpan={HOLDING_CYLS.length}>
                        <input id={`ha-date-${area}`} type="date" defaultValue={today()}
                          style={{border:'1.5px solid var(--b)',borderRadius:5,padding:'5px 7px',fontSize:12,outline:'none',width:110,fontFamily:'inherit'}} />
                      </td>}
                      <td style={TD('#0D0F14',{fontWeight:700,textAlign:'left',paddingLeft:12,background:'#fef9c3'})}>{cyl}</td>
                      {['of','oe','df','de','rf','re'].map(f=>(
                        <td key={f} style={{border:'1px solid #e5e7eb',padding:2,background:'#fff'}}>
                          <input type="number" min="0" placeholder="0" value={getInput(ci,f)} onChange={e=>setInput(ci,f,e.target.value)} className="ha-input" />
                        </td>
                      ))}
                      <td style={TD('#7c3aed',{fontWeight:700,background:'#ede9fe'})}>{cf||'—'}</td>
                      <td style={TD('#7c3aed',{fontWeight:700,background:'#ede9fe'})}>{ce||'—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
      <div style={{marginTop:8,padding:'10px 14px',background:'var(--as)',borderRadius:8,fontSize:11,color:'var(--a)'}}>
        💡 <strong>Tip:</strong> Closing stock auto-calculates. Save to log the entry — then view old entries from the date selector above.
      </div>
    </div>
  )
}

// ── Winneba CDO ───────────────────────────────────────────────
function WinnebaArea() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const records = state.holding.wcd
  const viewDate = state.holdingView.wcd

  const [inputs, setInputs] = useState({})
  const setInput = (ci,f,v) => setInputs(p=>({...p,[`${ci}-${f}`]:v}))
  const getInput = (ci,f) => inputs[`${ci}-${f}`] ?? ''

  function save() {
    const dateEl = document.getElementById('wcd-date')
    const date = dateEl?.value || today()
    const rows = WINNEBA_CYLS.map((cyl,ci)=>({
      cyl,
      of:Number(getInput(ci,'of')||0), oe:Number(getInput(ci,'oe')||0),
      sf:Number(getInput(ci,'sf')||0),
      rf:Number(getInput(ci,'rf')||0), re:Number(getInput(ci,'re')||0),
      de:Number(getInput(ci,'de')||0),
    }))
    dispatch({ type:'HOLDING_SAVE', area:'wcd', record:{ date, rows } })
    setInputs({})
    toast('success',`Winneba CDO entry saved for ${date}.`)
  }

  const TH = (bg,color='#fff',extra={}) => ({padding:'7px 8px',border:'1px solid #ccc',fontSize:10,fontWeight:700,textAlign:'center',textTransform:'uppercase',letterSpacing:'.4px',background:bg,color,...extra})
  const TD = (color='#111',extra={}) => ({padding:'6px 8px',border:'1px solid #e0e0e0',fontSize:12,textAlign:'center',verticalAlign:'middle',color,...extra})

  const HeaderRow = () => (
    <>
      <tr>
        <th style={TH('#1e3a5f')} rowSpan={2}>Date</th>
        <th style={TH('#1e3a5f')} rowSpan={2}>Cylinder Size</th>
        <th style={TH('#2563eb')} colSpan={2}>Opening Stock</th>
        <th style={TH('#dc2626')} colSpan={1}>Total Sales</th>
        <th style={TH('#16a34a')} colSpan={2}>Received</th>
        <th style={TH('#7c3aed')} colSpan={1}>Dispatched</th>
        <th style={TH('#0369a1')} colSpan={2}>Closing Stock</th>
      </tr>
      <tr>
        <th style={TH('#dbeafe','#1d4ed8')}>Filled</th>
        <th style={TH('#dbeafe','#1d4ed8')}>Empty</th>
        <th style={TH('#fee2e2','#991b1b')}>Filled</th>
        <th style={TH('#dcfce7','#166534')}>Filled</th>
        <th style={TH('#dcfce7','#166534')}>Empties</th>
        <th style={TH('#ede9fe','#5b21b6')}>Empty</th>
        <th style={TH('#e0f2fe','#0369a1')}>Filled</th>
        <th style={TH('#e0f2fe','#0369a1')}>Empty</th>
      </tr>
    </>
  )

  return (
    <div>
      {records.length > 0 && (
        <Card style={{marginBottom:12}}>
          <CardHeader title="📅 View Saved Entry" actions={
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              <select value={viewDate||''} onChange={e=>dispatch({type:'HOLDING_SET_VIEW',area:'wcd',date:e.target.value})}
                style={{border:'1.5px solid var(--b)',borderRadius:7,padding:'5px 10px',fontSize:13,outline:'none',background:'#fff',fontFamily:'inherit'}}>
                <option value="">— Select a date —</option>
                {records.map(r=><option key={r.date} value={r.date}>{r.date}</option>)}
              </select>
              {viewDate&&<Button variant="danger" size="sm" onClick={()=>dispatch({type:'HOLDING_DEL',area:'wcd',date:viewDate})}>🗑 Delete</Button>}
              <Button variant="ghost" size="sm" onClick={()=>dispatch({type:'HOLDING_CLEAR',area:'wcd'})}>Clear All</Button>
            </div>
          } />
          {viewDate && (() => {
            const rec = records.find(r=>r.date===viewDate)
            if (!rec) return null
            return (
              <CardBody noPad>
                <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
                  <table className="ha-table">
                    <thead><HeaderRow /></thead>
                    <tbody>
                      {WINNEBA_CYLS.map((cyl,ci)=>{
                        const r = rec.rows[ci]||{}
                        const {cf,ce} = calcWcdClosing(r)
                        return (
                          <tr key={cyl} style={{background:ci%2===0?'#fafafa':'#fff'}}>
                            {ci===0&&<td style={TD('#1e3a5f',{fontWeight:700,background:'#dbeafe'})} rowSpan={WINNEBA_CYLS.length}>{rec.date}</td>}
                            <td style={TD('#0D0F14',{fontWeight:600,textAlign:'left',paddingLeft:12})}>{cyl}</td>
                            <td style={TD('#1d4ed8',{fontWeight:600})}>{r.of||0}</td>
                            <td style={TD('#1d4ed8',{fontWeight:600})}>{r.oe||0}</td>
                            <td style={TD('#991b1b',{fontWeight:600})}>{r.sf||0}</td>
                            <td style={TD('#166534',{fontWeight:600})}>{r.rf||0}</td>
                            <td style={TD('#166534',{fontWeight:600})}>{r.re||0}</td>
                            <td style={TD('#5b21b6',{fontWeight:600})}>{r.de||0}</td>
                            <td style={TD('#0369a1',{fontWeight:700,background:'#e0f2fe'})}>{cf}</td>
                            <td style={TD('#0369a1',{fontWeight:700,background:'#e0f2fe'})}>{ce}</td>
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
      <Card>
        <CardHeader title="🏭 Winneba CDO — New Entry" actions={<>
          <span style={{fontSize:11,color:'var(--m)'}}>Closing = Opening + Received − Dispatched/Sales</span>
          <Button size="sm" onClick={save}>💾 Save Entry</Button>
        </>} />
        <CardBody noPad>
          <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
            <table className="ha-table">
              <thead><HeaderRow /></thead>
              <tbody>
                {WINNEBA_CYLS.map((cyl,ci)=>{
                  const g = f => Number(getInput(ci,f)||0)
                  const cf = Math.max(0, g('of')+g('rf')-g('sf'))
                  const ce = Math.max(0, g('oe')+g('re')-g('de'))
                  return (
                    <tr key={cyl} style={{background:ci%2===0?'#f0f7ff':'#fff'}}>
                      {ci===0&&<td style={{border:'1px solid #e5e7eb',background:'#dbeafe',fontWeight:700,textAlign:'center',verticalAlign:'middle'}} rowSpan={WINNEBA_CYLS.length}>
                        <input id="wcd-date" type="date" defaultValue={today()}
                          style={{border:'1.5px solid var(--b)',borderRadius:5,padding:'5px 7px',fontSize:12,outline:'none',width:110,fontFamily:'inherit'}} />
                      </td>}
                      <td style={TD('#0D0F14',{fontWeight:700,textAlign:'left',paddingLeft:12,background:'#dbeafe'})}>{cyl}</td>
                      {['of','oe','sf','rf','re','de'].map(f=>(
                        <td key={f} style={{border:'1px solid #e5e7eb',padding:2,background:'#fff'}}>
                          <input type="number" min="0" placeholder="0" value={getInput(ci,f)} onChange={e=>setInput(ci,f,e.target.value)} className="ha-input" />
                        </td>
                      ))}
                      <td style={TD('#0369a1',{fontWeight:700,background:'#e0f2fe'})}>{cf||'—'}</td>
                      <td style={TD('#0369a1',{fontWeight:700,background:'#e0f2fe'})}>{ce||'—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}


// ── Print Functions ────────────────────────────────────────────
const LOGO = 'https://i0.wp.com/henosenergy.com/wp/wp-content/uploads/2023/10/Henos-Logo-White1.png?fit=1000%2C416&ssl=1'

function printHeader(title, subtitle='') {
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:3px solid #1e3a5f">
    <div><div style="background:#1e3a5f;border-radius:10px;padding:5px 14px;display:inline-flex;align-items:center;margin-bottom:8px"><img src="${LOGO}" style="height:38px"/></div>
    <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.6px">Energizing Progress · Ghana</div></div>
    <div style="text-align:right"><div style="font-size:18px;font-weight:900;color:#1e3a5f">${title}</div>
    ${subtitle?`<div style="font-size:11px;color:#64748b;margin-top:4px">${subtitle}</div>`:''}
    <div style="font-size:11px;color:#64748b;margin-top:2px">Printed: ${new Date().toLocaleDateString('en-GH',{day:'2-digit',month:'short',year:'numeric'})}</div></div>
  </div>`
}

function printDelivery(del) {
  const itemRows = (del.items||[]).map((it,i)=>`<tr style="background:${i%2===0?'#fff':'#f9fafb'}">
    <td style="padding:8px 12px">${i+1}</td>
    <td style="padding:8px 12px;font-weight:600">${it.type||'—'}</td>
    <td style="padding:8px 12px;text-align:center;font-weight:700">${it.qty||'—'}</td>
    ${it.bulkDesc?`<td style="padding:8px 12px;font-size:11px;color:#6b7280">${it.bulkDesc}</td>`:'<td style="padding:8px 12px">—</td>'}
  </tr>`).join('')
  const win = window.open('','_blank','width=600,height=680')
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Delivery Receipt ${del.id}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:28px 32px;color:#0f172a;font-size:13px}
  table{width:100%;border-collapse:collapse}thead{background:#1e3a5f;color:#fff}th{padding:9px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;text-align:left}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}.box{background:#f8faff;border-radius:8px;padding:12px 14px}
  .lbl{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px}.val{font-size:13px;font-weight:700}
  .sig{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:60px}.sigline{border-top:1.5px solid #1e3a5f;padding-top:5px;font-size:11px;color:#6b7280;text-align:center}
  @media print{button{display:none}}</style></head><body>
  ${printHeader('Delivery Receipt / Waybill', del.id)}
  <div class="grid">
    ${[['Order Ref',del.orderRef||'—'],['Driver',del.driver||'—'],['Truck Plate',del.truck||'—'],['Destination',del.destination||'—'],['Status',del.status||'—'],['Date',del.date||'—']].map(([l,v])=>`<div class="box"><div class="lbl">${l}</div><div class="val">${v}</div></div>`).join('')}
  </div>
  <div style="font-weight:700;font-size:13px;margin-bottom:10px;border-bottom:2px solid #1e3a5f;padding-bottom:6px">Items / Load</div>
  <table><thead><tr><th>#</th><th>Item</th><th style="text-align:center">Qty</th><th>Description</th></tr></thead>
  <tbody>${itemRows||'<tr><td colspan="4" style="padding:12px;text-align:center;color:#6b7280">No items recorded</td></tr>'}</tbody></table>
  <div class="sig"><div class="sigline">Driver Signature &amp; Date</div><div class="sigline">Authorised By &amp; Date</div></div>
  <div style="margin-top:28px;text-align:center"><button onclick="window.print()" style="background:#1e3a5f;color:#fff;border:none;border-radius:8px;padding:10px 28px;font-size:14px;font-weight:700;cursor:pointer">🖨️ Print Receipt</button></div>
  </body></html>`)
  win.document.close()
}

function printDeliveredLog(log, filterDate) {
  const rows = log.map((e,i)=>`<tr style="background:${i%2===0?'#fff':'#f9fafb'}">
    <td style="padding:8px 12px;font-size:11px;color:#1a56db;font-family:monospace;font-weight:600">${e.orderId}</td>
    <td style="padding:8px 12px;font-weight:600">${e.customer||'—'}</td>
    <td style="padding:8px 12px">${e.product||'—'}</td>
    <td style="padding:8px 12px;text-align:center">${e.qty||'—'}</td>
    <td style="padding:8px 12px;text-align:right;font-weight:700;color:#16a34a">${e.value?`GH₵${Number(e.value).toLocaleString()}`:'—'}</td>
    <td style="padding:8px 12px">${e.placedBy||'—'}</td>
    <td style="padding:8px 12px;font-size:11px;font-family:monospace">${e.invoiceId||'—'}</td>
    <td style="padding:8px 12px;font-weight:700;color:#16a34a">✅ ${e.deliveredAt}</td>
  </tr>`).join('')
  const total = log.reduce((s,e)=>s+Number(e.value||0),0)
  const win = window.open('','_blank','width=900,height=680')
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Delivered Orders Log</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:28px 32px;color:#0f172a;font-size:12px}
  table{width:100%;border-collapse:collapse}thead{background:#1e3a5f;color:#fff}th{padding:9px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;text-align:left}
  .footer{margin-top:14px;display:flex;gap:20px;font-size:12px;color:#6b7280;border-top:1px solid #e2e8f0;padding-top:10px}
  @media print{button{display:none}}</style></head><body>
  ${printHeader('Delivered Orders Log', filterDate ? `Date: ${filterDate}` : 'All Dates')}
  <table><thead><tr><th>Order ID</th><th>Customer</th><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Value</th><th>Placed By</th><th>Invoice</th><th>Delivered</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div class="footer">
    <span>Total Orders: <strong>${log.length}</strong></span>
    ${total>0?`<span>Total Value: <strong style="color:#16a34a">GH₵${total.toLocaleString()}</strong></span>`:''}
  </div>
  <div style="margin-top:24px;text-align:center"><button onclick="window.print()" style="background:#1e3a5f;color:#fff;border:none;border-radius:8px;padding:10px 28px;font-size:14px;font-weight:700;cursor:pointer">🖨️ Print</button></div>
  </body></html>`)
  win.document.close()
}

// ── Small drawers ─────────────────────────────────────────────
function StockDrawer({ open, onClose, dispatch, toast }) {
  const { register, handleSubmit, reset, formState:{errors} } = useForm()
  async function onSubmit(d) {
    try {
      await dispatch({ type:'DB_INSERT', key:'stock', record:{ id:uid('SKU'), status:'OK', product:d.product, qty:Number(d.qty||0), reorder:Number(d.reorder||0), warehouse:d.warehouse } })
      toast('success','Stock added.'); reset(); onClose()
    } catch (error) {
      toast('error', error.message || 'Could not add stock.')
    }
  }
  return (
    <Drawer open={open} onClose={onClose} title="Add Stock Item"
      footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Stock</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="Product Name" error={errors.product?.message}><Input {...register('product',{required:'Required'})} placeholder="e.g. 13kg LPG Cylinder" /></Field>
      <div className="frow">
        <Field label="Quantity on Hand"><Input {...register('qty')} type="number" placeholder="0" /></Field>
        <Field label="Reorder Level"><Input {...register('reorder')} type="number" placeholder="0" /></Field>
      </div>
      <Field label="Warehouse / Depot"><Input {...register('warehouse')} placeholder="e.g. Accra Depot" /></Field>
    </Drawer>
  )
}

function LocationField({ mode, selectedPoints, setSelectedPoints, register, locationOptions }) {
  return (
    <>
      <Field label="Delivery Location">
        <Select {...register('locationType')} defaultValue="crm_dtd">
          <option value="crm_dtd">CRM-DTD</option>
          <option value="exchange_points">Exchange Points</option>
          <option value="other">Other (type below)</option>
        </Select>
      </Field>
      {mode === 'exchange_points' ? (
        <Field label="Select Exchange Points">
          <select
            multiple
            value={selectedPoints}
            onChange={event => setSelectedPoints(Array.from(event.target.selectedOptions, option => option.value))}
            style={{width:'100%',minHeight:120,border:'1.5px solid var(--b)',borderRadius:8,padding:'9px 11px',fontSize:13,outline:'none',background:'#fff',fontFamily:'inherit'}}
          >
            {locationOptions.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
          <div className="hint">Hold `Ctrl` to select multiple exchange points.</div>
        </Field>
      ) : mode === 'crm_dtd' ? (
        <Field label="Selected Location">
          <Input value="CRM-DTD" disabled />
        </Field>
      ) : (
        <Field label="Custom Destination">
          <Input {...register('destination')} placeholder="e.g. Customer address, GPS: GS-0382-3921" />
        </Field>
      )}
    </>
  )
}

function DelivDrawer({ open, onClose, dispatch, toast }) {
  const { state } = useApp()
  const epLocations = state.exchangePoints || []
  const locationOptions = epLocations.map(ep => `${ep.name}${ep.location ? ` - ${ep.location}` : ''}`)
  const { register, handleSubmit, reset, watch } = useForm({ defaultValues: { locationType:'crm_dtd' } })
  const [items, setItems] = useState([])
  const [selectedPoints, setSelectedPoints] = useState([])
  const locationMode = watch('locationType', 'crm_dtd')
  async function onSubmit(d) {
    const destination = locationMode === 'crm_dtd' ? 'CRM-DTD' : locationMode === 'exchange_points' ? selectedPoints.join(' | ') : d.destination
    if (!destination) { toast('error','Destination required.'); return }
    try {
      await dispatch({ type:'DB_INSERT', key:'deliveries', record:{
        id:uid('DEL'), date:today(),
        orderRef:d.orderRef, driver:d.driver, truck:d.truck,
        destination,
        exchangePoints: locationMode === 'exchange_points' ? selectedPoints : [],
        status:d.status||'Scheduled', items,
      }})
      toast('success','Delivery added.'); reset({ locationType:'crm_dtd' }); setItems([]); setSelectedPoints([]); onClose()
    } catch (error) {
      toast('error', error.message || 'Could not add delivery.')
    }
  }
  return (
    <Drawer open={open} onClose={onClose} title="New Delivery"
      footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Delivery</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="Order Reference"><Input {...register('orderRef')} placeholder="e.g. SO-1001" /></Field>
      <div className="frow">
        <Field label="Driver Name"><Input {...register('driver')} placeholder="Full name" /></Field>
        <Field label="Truck Plate"><Input {...register('truck')} placeholder="e.g. GW-421-24" /></Field>
      </div>
      <LocationField mode={locationMode} selectedPoints={selectedPoints} setSelectedPoints={setSelectedPoints} register={register} locationOptions={locationOptions} />
      <Field label="Status"><Select {...register('status')}><option>Scheduled</option><option>Loaded</option><option>En Route</option><option>Delivered</option><option>Failed</option></Select></Field>
      <DelivItemBuilder items={items} setItems={setItems} />
    </Drawer>
  )
}

function SupDrawer({ open, onClose, dispatch, toast }) {
  const { register, handleSubmit, reset, formState:{errors} } = useForm()
  async function onSubmit(d) {
    try {
      await dispatch({ type:'DB_INSERT', key:'suppliers', record:{ id:uid('SUP'), status:d.status||'Active', name:d.name, product:d.product, contact:d.contact, location:d.location } })
      toast('success','Supplier added.'); reset(); onClose()
    } catch (error) {
      toast('error', error.message || 'Could not add supplier.')
    }
  }
  return (
    <Drawer open={open} onClose={onClose} title="Add Supplier"
      footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Supplier</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="Supplier Name" error={errors.name?.message}><Input {...register('name',{required:'Required'})} placeholder="Company name" /></Field>
      <Field label="Product/Service"><Input {...register('product')} placeholder="e.g. Bulk LPG" /></Field>
      <Field label="Contact & Phone"><Input {...register('contact')} placeholder="Name · number" /></Field>
      <Field label="Location"><Input {...register('location')} placeholder="City / Region" /></Field>
      <Field label="Status"><Select {...register('status')}><option>Active</option><option>Inactive</option><option>Blacklisted</option></Select></Field>
    </Drawer>
  )
}
