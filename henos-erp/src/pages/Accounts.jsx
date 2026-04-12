import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useApp } from '../context/AppContext'
import { useToast } from '../hooks/useToast'
import { uid, today, money, statusVariant, REPS, REP_COLORS } from '../utils/helpers'
import { PageHeader, Pills, Card, CardBody, CardHeader, Table, Badge, RepBadge, Button, Drawer, Field, Input, Select, NotifBell, EmptyState, ConfirmModal, KpiCard } from '../components/ui'

const CYL_ITEMS = ['50KG Cylinder','14.5KG Cylinder','12.5KG Cylinder','6KG Cylinder','3KG Cylinder','Autogas','Bulk LPG']

export default function Accounts() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const { db } = state
  const [tab, setTab]             = useState('invoices')
  const [invOpen, setInvOpen]     = useState(false)
  const [expOpen, setExpOpen]     = useState(false)
  const [editInv, setEditInv]     = useState(null)
  const [editExp, setEditExp]     = useState(null)
  const [payInv, setPayInv]       = useState(null)
  const [delConfirm, setDelConfirm] = useState(null)
  const [invFilter, setInvFilter] = useState('')

  const paid    = db.invoices.filter(i=>i.status==='Paid').reduce((s,i)=>s+Number(i.amount||0),0)
  const unp     = db.invoices.filter(i=>i.status!=='Paid').reduce((s,i)=>s+Number(i.amount||0),0)
  const ext     = db.expenses.filter(e=>e.approved).reduce((s,e)=>s+Number(e.amount||0),0)
  const unreadA = db.anotifs.filter(n=>!n.read).length

  const filtInv = invFilter
    ? db.invoices.filter(i=>i.customer?.toLowerCase().includes(invFilter.toLowerCase()))
    : db.invoices

  function doDelete() {
    dispatch({ type:'DB_DELETE', key:delConfirm.key, id:delConfirm.id })
    toast('success','Deleted.')
    setDelConfirm(null)
  }

  const statusV = s => ({Paid:'success',Unpaid:'danger',Partial:'warning',Overdue:'danger'}[s]||'neutral')

  return (
    <div style={{animation:'fadein .3s cubic-bezier(.4,0,.2,1)'}}>
      <PageHeader title="Accounts" actions={<>
        <NotifBell notifKey="anotifs" />
        {tab==='invoices' && <Button onClick={()=>setInvOpen(true)}>+ New Invoice</Button>}
        {tab==='expenses' && <><Button variant="secondary" onClick={()=>printExpenses(db.expenses)}>🖨 Print</Button><Button onClick={()=>setExpOpen(true)}>+ Log Expense</Button></>}
      </>} />

      {unreadA>0 && (
        <div className="ibar ib">
          <span>🧾</span><span><strong>{unreadA}</strong> new auto-invoice{unreadA>1?'s':''} from delivered orders. <strong>Record payments below.</strong></span>
        </div>
      )}

      <div className="krow">
        <KpiCard label="Collected"   value={paid?money(paid):'—'} note="Fully paid"       valueStyle={{color:'var(--g)'}} />
        <KpiCard label="Outstanding" value={unp?money(unp):'—'}   note="Unpaid / partial" valueStyle={{color:unp?'var(--r)':'var(--m)'}} />
        <KpiCard label="Expenses"    value={ext?money(ext):'—'}   note="Approved"         valueStyle={{color:'var(--am)'}} />
        <KpiCard label="Invoices"    value={db.invoices.length}   note="Total" />
      </div>

      <Pills tabs={[
        {id:'invoices',label:'📄 Invoices'},
        {id:'expenses',label:'💸 Expenses'},
        {id:'balances',label:'🏦 Balances'},
        {id:'pl',      label:'📊 P&L'},
      ]} active={tab} onChange={setTab} />

      {tab==='invoices' && <>
        <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
          <input value={invFilter} onChange={e=>setInvFilter(e.target.value)}
            placeholder="🔍 Filter by customer…"
            style={{flex:1,minWidth:160,border:'1.5px solid var(--b)',borderRadius:7,padding:'8px 11px',fontSize:13,outline:'none'}} />
          {invFilter && <Button variant="ghost" size="sm" onClick={()=>setInvFilter('')}>Reset</Button>}
        </div>
        <Card><CardBody noPad>
          <Table
            columns={['Invoice #','Customer','Rep','Amount','Paid','Due','Status','']}
            rows={filtInv.map(inv=>{
              const bal = Math.max(0,Number(inv.amount||0)-Number(inv.amountPaid||0))
              return [
                <span style={{fontSize:11,color:'var(--a)',fontFamily:'monospace'}}>{inv.id}</span>,
                inv.customer||'—',
                <RepBadge name={inv.repName} colors={REP_COLORS} />,
                money(inv.amount),
                <span style={{color:'var(--g)',fontWeight:600}}>{money(inv.amountPaid)}</span>,
                inv.dueDate||'—',
                <Badge variant={statusV(inv.status)}>{inv.status}</Badge>,
                <div style={{display:'flex',gap:4}}>
                  {inv.status!=='Paid' && <Button variant="success" size="sm" onClick={()=>setPayInv(inv)}>💳 Pay</Button>}
                  <Button variant="secondary" size="sm" onClick={()=>printInvoice(inv)}>🖨</Button>
                  <Button variant="secondary" size="sm" onClick={()=>setEditInv(inv)}>✏️</Button>
                  <Button variant="ghost" size="sm" onClick={()=>setDelConfirm({key:'invoices',id:inv.id})}>Del</Button>
                </div>,
              ]
            })}
          />
        </CardBody></Card>
      </>}

      {tab==='expenses' && (
        <Card><CardBody noPad>
          <Table
            columns={['ID','Category','Description','Amount','Date','Approved','']}
            rows={db.expenses.map(e=>[
              <span style={{fontSize:11,color:'var(--m)',fontFamily:'monospace'}}>{e.id}</span>,
              e.category||'—', e.description||'—',
              e.amount?money(e.amount):'—', e.date||'—',
              <button onClick={()=>dispatch({type:'DB_UPDATE',key:'expenses',id:e.id,patch:{approved:!e.approved}})}>
                <Badge variant={e.approved?'success':'warning'}>{e.approved?'Approved':'Pending'}</Badge>
              </button>,
              <div style={{display:'flex',gap:4}}>
                <Button variant="secondary" size="sm" onClick={()=>setEditExp(e)}>✏️</Button>
                <Button variant="ghost" size="sm" onClick={()=>setDelConfirm({key:'expenses',id:e.id})}>Del</Button>
              </div>,
            ])}
          />
        </CardBody></Card>
      )}

      {tab==='balances' && <BalanceSummary invoices={db.invoices} onPrint={()=>printBalances(db.invoices)} />}
      {tab==='pl' && <PLView paid={paid} unp={unp} ext={ext} invoices={db.invoices} expenses={db.expenses} />}

      <InvoiceDrawer open={invOpen} onClose={()=>setInvOpen(false)} db={db} dispatch={dispatch} toast={toast} />
      {editInv && <EditInvoiceDrawer inv={editInv} onClose={()=>setEditInv(null)} db={db} dispatch={dispatch} toast={toast} />}
      <ExpenseDrawer open={expOpen} onClose={()=>setExpOpen(false)} dispatch={dispatch} toast={toast} />
      {editExp && <EditExpenseDrawer exp={editExp} onClose={()=>setEditExp(null)} dispatch={dispatch} toast={toast} />}
      {payInv && <PayModal inv={payInv} onClose={()=>setPayInv(null)} dispatch={dispatch} toast={toast} />}
      <ConfirmModal open={!!delConfirm} onClose={()=>setDelConfirm(null)} onConfirm={doDelete} title="Confirm Delete" message="This record will be permanently deleted." />
    </div>
  )
}

// ── Invoice item builder (shared between new & edit) ──────────
function ItemBuilder({ items, setItems }) {
  function addItem() {
    setItems(prev => [...prev, { id: uid('IT'), type:'', isBulk:false, bulkDesc:'', qty:1, price:0 }])
  }
  function removeItem(id) {
    setItems(prev => prev.filter(it=>it.id!==id))
  }
  function update(id, patch) {
    setItems(prev => prev.map(it=>it.id===id ? {...it,...patch} : it))
  }
  const total = items.reduce((s,it)=>s+Number(it.qty||0)*Number(it.price||0),0)

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
        <label style={{fontSize:10,fontWeight:600,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.5px'}}>Items / Cylinders</label>
        <button type="button" className="btn btng btnsm" onClick={addItem}>+ Add Item</button>
      </div>
      {items.length===0 && (
        <div style={{background:'var(--bg)',borderRadius:8,padding:'12px 14px',fontSize:12,color:'var(--m)',textAlign:'center'}}>
          No items yet — click "+ Add Item"
        </div>
      )}
      {items.map((it,i)=>(
        <div key={it.id} style={{background:'var(--bg)',border:'1.5px solid var(--b)',borderRadius:8,padding:'10px 12px',marginBottom:8}}>
          <div style={{display:'flex',gap:6,alignItems:'flex-start',marginBottom:8}}>
            <div style={{flex:2}}>
              <label style={{fontSize:10,fontWeight:600,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:4}}>Item Type</label>
              <select value={it.type} onChange={e=>update(it.id,{type:e.target.value,isBulk:e.target.value==='Bulk LPG'})}
                style={{width:'100%',border:'1.5px solid var(--b)',borderRadius:7,padding:'7px 9px',fontSize:13,outline:'none',background:'#fff'}}>
                <option value="">Select…</option>
                {CYL_ITEMS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{flex:1}}>
              <label style={{fontSize:10,fontWeight:600,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:4}}>Qty</label>
              <input type="number" min="1" value={it.qty} onChange={e=>update(it.id,{qty:e.target.value})}
                style={{width:'100%',border:'1.5px solid var(--b)',borderRadius:7,padding:'7px 9px',fontSize:13,outline:'none',textAlign:'center'}} />
            </div>
            <div style={{flex:1}}>
              <label style={{fontSize:10,fontWeight:600,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:4}}>Price (GH₵)</label>
              <input type="number" min="0" value={it.price} onChange={e=>update(it.id,{price:e.target.value})}
                style={{width:'100%',border:'1.5px solid var(--b)',borderRadius:7,padding:'7px 9px',fontSize:13,outline:'none'}} />
            </div>
            <button type="button" onClick={()=>removeItem(it.id)}
              style={{marginTop:20,background:'none',border:'none',color:'var(--r)',fontSize:18,cursor:'pointer',lineHeight:1,padding:'4px 6px'}}>×</button>
          </div>
          {it.isBulk && (
            <div>
              <label style={{fontSize:10,fontWeight:600,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:4}}>Bulk Description (e.g. weight in KG)</label>
              <input value={it.bulkDesc} onChange={e=>update(it.id,{bulkDesc:e.target.value})}
                placeholder="e.g. 5000 KG"
                style={{width:'100%',border:'1.5px solid var(--b)',borderRadius:7,padding:'7px 9px',fontSize:13,outline:'none'}} />
            </div>
          )}
          <div style={{textAlign:'right',fontSize:11,color:'var(--a)',fontWeight:700,marginTop:4}}>
            Subtotal: {money(Number(it.qty||0)*Number(it.price||0))}
          </div>
        </div>
      ))}
      {items.length>0 && (
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'var(--sb)',borderRadius:8,marginTop:4}}>
          <span style={{fontSize:12,color:'#9ca3af',fontWeight:600}}>TOTAL</span>
          <span style={{fontSize:16,fontWeight:800,color:'#fff'}}>{money(total)}</span>
        </div>
      )}
    </div>
  )
}

// ── New Invoice Drawer ────────────────────────────────────────
function InvoiceDrawer({ open, onClose, db, dispatch, toast }) {
  const { register, handleSubmit, reset, watch } = useForm()
  const [items, setItems] = useState([])
  const custVal = watch('customer','')

  const itemTotal = items.reduce((s,it)=>s+Number(it.qty||0)*Number(it.price||0),0)

  function onSubmit(data) {
    if (!data.customer) { toast('error','Customer required.'); return }
    if (items.length===0) { toast('error','Add at least one item.'); return }
    if (!itemTotal) { toast('error','At least one item must have a price.'); return }
    const custRec = db.customers.find(c=>c.name.trim().toUpperCase()===data.customer.trim().toUpperCase())
    dispatch({ type:'DB_INSERT', key:'invoices', record:{
      id:uid('INV'), date:today(), source:'Manual', amountPaid:0,
      customer:data.customer.trim().toUpperCase(),
      amount:itemTotal, items,
      repName:custRec?.rep||'',
      dueDate:data.dueDate, status:data.status||'Unpaid',
    }})
    toast('success','Invoice created.')
    reset(); setItems([]); onClose()
  }

  return (
    <Drawer open={open} onClose={onClose} title="New Invoice"
      footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Create Invoice</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="Customer">
        <Input {...register('customer')} placeholder="Customer name" list="inv-cu-list" />
        <datalist id="inv-cu-list">{db.customers.map(c=><option key={c.id} value={c.name}/>)}</datalist>
      </Field>
      <div className="frow">
        <Field label="Due Date"><Input {...register('dueDate')} type="date" /></Field>
        <Field label="Status"><Select {...register('status')}><option>Unpaid</option><option>Partial</option><option>Paid</option></Select></Field>
      </div>
      <ItemBuilder items={items} setItems={setItems} />
    </Drawer>
  )
}

// ── Edit Invoice Drawer ───────────────────────────────────────
function EditInvoiceDrawer({ inv, onClose, db, dispatch, toast }) {
  const { register, handleSubmit } = useForm({ defaultValues:{ dueDate:inv.dueDate, status:inv.status } })
  const [items, setItems] = useState(inv.items||[])
  const itemTotal = items.reduce((s,it)=>s+Number(it.qty||0)*Number(it.price||0),0)

  function onSubmit(data) {
    dispatch({ type:'DB_UPDATE', key:'invoices', id:inv.id, patch:{
      dueDate:data.dueDate, status:data.status,
      items, amount: itemTotal || Number(inv.amount),
    }})
    toast('success','Invoice updated.'); onClose()
  }
  return (
    <Drawer open={true} onClose={onClose} title={`Edit Invoice — ${inv.id}`}
      footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Changes</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="Customer"><Input value={inv.customer} disabled style={{background:'var(--bg)',color:'var(--m)'}} /></Field>
      <div className="frow">
        <Field label="Due Date"><Input {...register('dueDate')} type="date" /></Field>
        <Field label="Status"><Select {...register('status')}><option>Unpaid</option><option>Partial</option><option>Paid</option></Select></Field>
      </div>
      <ItemBuilder items={items} setItems={setItems} />
    </Drawer>
  )
}

// ── Expense Drawer ────────────────────────────────────────────
function ExpenseItemBuilder({ items, setItems }) {
  function addItem() { setItems(p=>[...p,{id:uid('EI'),description:'',qty:1,unitCost:0}]) }
  function remove(id) { setItems(p=>p.filter(it=>it.id!==id)) }
  function update(id,patch) { setItems(p=>p.map(it=>it.id===id?{...it,...patch}:it)) }
  const total = items.reduce((s,it)=>s+Number(it.qty||0)*Number(it.unitCost||0),0)
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
        <label style={{fontSize:10,fontWeight:600,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.5px'}}>Expense Items</label>
        <button type="button" className="btn btng btnsm" onClick={addItem}>+ Add Item</button>
      </div>
      {items.length===0&&<div style={{background:'var(--bg)',borderRadius:8,padding:'12px 14px',fontSize:12,color:'var(--m)',textAlign:'center'}}>No items yet — click "+ Add Item"</div>}
      {items.map(it=>(
        <div key={it.id} style={{background:'var(--bg)',border:'1.5px solid var(--b)',borderRadius:8,padding:'10px 12px',marginBottom:8}}>
          <div style={{display:'flex',gap:6,alignItems:'flex-end'}}>
            <div style={{flex:3}}>
              <label style={{fontSize:10,fontWeight:600,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:4}}>Description</label>
              <input value={it.description} onChange={e=>update(it.id,{description:e.target.value})} placeholder="e.g. Engine oil, 2 litres"
                style={{width:'100%',border:'1.5px solid var(--b)',borderRadius:7,padding:'7px 9px',fontSize:13,outline:'none',fontFamily:'inherit',background:'var(--w)',color:'var(--t)'}} />
            </div>
            <div style={{flex:1}}>
              <label style={{fontSize:10,fontWeight:600,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:4}}>Qty</label>
              <input type="number" min="1" value={it.qty} onChange={e=>update(it.id,{qty:e.target.value})}
                style={{width:'100%',border:'1.5px solid var(--b)',borderRadius:7,padding:'7px 9px',fontSize:13,outline:'none',textAlign:'center',fontFamily:'inherit',background:'var(--w)',color:'var(--t)'}} />
            </div>
            <div style={{flex:1}}>
              <label style={{fontSize:10,fontWeight:600,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:4}}>Unit Cost</label>
              <input type="number" min="0" value={it.unitCost} onChange={e=>update(it.id,{unitCost:e.target.value})}
                style={{width:'100%',border:'1.5px solid var(--b)',borderRadius:7,padding:'7px 9px',fontSize:13,outline:'none',fontFamily:'inherit',background:'var(--w)',color:'var(--t)'}} />
            </div>
            <button type="button" onClick={()=>remove(it.id)}
              style={{background:'none',border:'none',color:'var(--r)',fontSize:20,cursor:'pointer',lineHeight:1,padding:'4px 6px',marginBottom:2,flexShrink:0}}>×</button>
          </div>
          <div style={{textAlign:'right',fontSize:11,color:'var(--a)',fontWeight:700,marginTop:6}}>
            Subtotal: {money(Number(it.qty||0)*Number(it.unitCost||0))}
          </div>
        </div>
      ))}
      {items.length>0&&(
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'var(--sb)',borderRadius:8,marginTop:4}}>
          <span style={{fontSize:12,color:'#9ca3af',fontWeight:600}}>TOTAL</span>
          <span style={{fontSize:16,fontWeight:800,color:'#fff'}}>{money(total)}</span>
        </div>
      )}
    </div>
  )
}

function ExpenseDrawer({ open, onClose, dispatch, toast }) {
  const { register, handleSubmit, reset, formState:{errors} } = useForm()
  const [items, setItems] = useState([])
  function onSubmit(data) {
    const itemTotal = items.reduce((s,it)=>s+Number(it.qty||0)*Number(it.unitCost||0),0)
    const amount = itemTotal || Number(data.amount||0)
    if (!data.description&&!items.length) { toast('error','Add a description or at least one item.'); return }
    dispatch({ type:'DB_INSERT', key:'expenses', record:{
      id:uid('EXP'), approved:false, date:today(),
      description:data.description||items.map(it=>`${it.qty}× ${it.description}`).join(', '),
      amount, category:data.category, items
    }})
    toast('success','Expense logged.'); reset(); setItems([]); onClose()
  }
  return (
    <Drawer open={open} onClose={onClose} title="Log Expense"
      footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Expense</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="Description / Summary"><Input {...register('description')} placeholder="e.g. Vehicle maintenance — fuel & oil" /></Field>
      <div className="frow">
        <Field label="Category"><Select {...register('category')}><option value="">Select…</option>{['Fuel','Maintenance','Salaries','Utilities','Supplies','Other'].map(v=><option key={v}>{v}</option>)}</Select></Field>
        <Field label="Total Amount (GH₵)" hint="Auto-calculated from items below">
          <Input {...register('amount')} type="number" placeholder="0.00" />
        </Field>
      </div>
      <ExpenseItemBuilder items={items} setItems={setItems} />
    </Drawer>
  )
}

// ── Edit Expense Drawer ───────────────────────────────────────
function EditExpenseDrawer({ exp, onClose, dispatch, toast }) {
  const { register, handleSubmit } = useForm({ defaultValues: exp })
  function onSubmit(data) {
    dispatch({ type:'DB_UPDATE', key:'expenses', id:exp.id, patch:{ description:data.description, amount:data.amount, category:data.category }})
    toast('success','Expense updated.'); onClose()
  }
  return (
    <Drawer open={true} onClose={onClose} title="Edit Expense"
      footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Changes</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="Description"><Input {...register('description')} /></Field>
      <Field label="Amount (GH₵)"><Input {...register('amount')} type="number" /></Field>
      <Field label="Category"><Select {...register('category')}><option value="">Select…</option>{['Fuel','Maintenance','Salaries','Utilities','Other'].map(v=><option key={v}>{v}</option>)}</Select></Field>
    </Drawer>
  )
}

// ── Balance Summary ───────────────────────────────────────────
function BalanceSummary({ invoices, onPrint }) {
  const custMap = {}
  invoices.forEach(inv=>{
    const k=(inv.customer||'').trim().toUpperCase()
    if(!custMap[k]) custMap[k]={customer:k,total:0,paid:0,count:0}
    custMap[k].total+=Number(inv.amount||0)
    custMap[k].paid+=Number(inv.amountPaid||0)
    custMap[k].count++
  })
  const list=Object.values(custMap).sort((a,b)=>(b.total-b.paid)-(a.total-a.paid))
  const totalOwed=list.reduce((s,c)=>s+(c.total-c.paid),0)
  if(!list.length) return <EmptyState icon="🏦" message="No customer balance data yet" />
  return (
    <Card>
      <CardHeader title="Customer Balances" actions={onPrint&&<Button variant="secondary" size="sm" onClick={onPrint}>🖨 Print</Button>} />
      <CardBody noPad>
        <Table
          columns={['Customer','Invoices','Total Invoiced','Amount Paid','Balance Due']}
          rows={list.map(c=>{
            const owed=c.total-c.paid
            return [
              <span style={{fontWeight:600}}>{c.customer}</span>,
              c.count, money(c.total),
              <span style={{color:'var(--g)',fontWeight:600}}>{money(c.paid)}</span>,
              <span style={{fontWeight:700,color:owed>0?'var(--r)':'var(--g)'}}>{money(owed)}</span>,
            ]
          })}
        />
        <div style={{padding:'10px 14px',borderTop:'1px solid var(--b)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:12,color:'var(--m)'}}>Total Balance Due</span>
          <span style={{fontSize:16,fontWeight:900,color:'var(--r)'}}>{money(totalOwed)}</span>
        </div>
      </CardBody>
    </Card>
  )
}

// ── P&L View ─────────────────────────────────────────────────
function PLView({ paid, unp, ext, invoices, expenses }) {
  const net = paid - ext
  return (
    <Card>
      <CardHeader title="📊 Profit & Loss Summary" />
      <CardBody>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:14}}>
          {[
            {l:'Gross Revenue',     v:money(paid), s:{color:'var(--g)'}},
            {l:'Outstanding',       v:money(unp),  s:{color:'var(--r)'}},
            {l:'Approved Expenses', v:money(ext),  s:{color:'var(--am)'}},
            {l:'Net Position',      v:money(net),  s:{color:net>=0?'var(--g)':'var(--r)'}},
            {l:'Total Invoices',    v:invoices.length},
            {l:'Total Expenses',    v:expenses.length},
          ].map(item=>(
            <div key={item.l} style={{background:'var(--bg)',borderRadius:8,padding:'12px 14px'}}>
              <div style={{fontSize:10,fontWeight:600,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.7px',marginBottom:8}}>{item.l}</div>
              <div style={{fontSize:20,fontWeight:700,...(item.s||{})}}>{item.v}</div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}


// ── Accounts Print Functions ──────────────────────────────────
const ALOGO = 'https://i0.wp.com/henosenergy.com/wp/wp-content/uploads/2023/10/Henos-Logo-White1.png?fit=1000%2C416&ssl=1'

function aHeader(title, sub='') {
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;padding-bottom:14px;border-bottom:3px solid #1e3a5f">
    <div><div style="background:#1e3a5f;border-radius:10px;padding:5px 14px;display:inline-flex;align-items:center;margin-bottom:8px"><img src="${ALOGO}" style="height:38px"/></div>
    <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.6px">Energizing Progress · Ghana</div>
    <div style="font-size:10px;color:#64748b;margin-top:3px">Tel: +233 XXX XXX XXXX | info@henosenergy.com</div></div>
    <div style="text-align:right"><div style="font-size:18px;font-weight:900;color:#1e3a5f">${title}</div>
    ${sub?`<div style="font-size:12px;color:#64748b;margin-top:3px">${sub}</div>`:''}
    <div style="font-size:11px;color:#64748b;margin-top:2px">Printed: ${new Date().toLocaleDateString('en-GH',{day:'2-digit',month:'short',year:'numeric'})}</div></div>
  </div>`
}

function printInvoice(inv) {
  const total = Number(inv.amount||0)
  const paid  = Number(inv.amountPaid||0)
  const bal   = Math.max(0,total-paid)
  const statusColor = {Paid:'#16a34a',Unpaid:'#dc2626',Partial:'#d97706'}[inv.status]||'#6b7280'
  const itemRows = (inv.items||[]).length > 0
    ? inv.items.map((it,i)=>`<tr style="background:${i%2===0?'#fff':'#f9fafb'}">
        <td style="padding:8px 12px">${i+1}</td>
        <td style="padding:8px 12px;font-weight:600">${it.type||it.desc||'—'}${it.bulkDesc?` (${it.bulkDesc})`:''}</td>
        <td style="padding:8px 12px;text-align:center">${it.qty||1}</td>
        <td style="padding:8px 12px;text-align:right">GH₵${Number(it.price||0).toLocaleString()}</td>
        <td style="padding:8px 12px;text-align:right;font-weight:700">GH₵${(Number(it.qty||1)*Number(it.price||0)).toLocaleString()}</td>
      </tr>`).join('')
    : `<tr><td colspan="5" style="padding:12px;text-align:center;color:#6b7280">No itemised breakdown</td></tr>`

  const win = window.open('','_blank','width=680,height=820')
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${inv.id}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:28px 32px;color:#0f172a;font-size:12px}
  table{width:100%;border-collapse:collapse}thead{background:#1e3a5f;color:#fff}th{padding:9px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;text-align:left}
  .totals{margin-left:auto;width:260px;border:1.5px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-top:16px}
  .trow{display:flex;justify-content:space-between;padding:8px 14px;border-bottom:1px solid #e5e7eb;font-size:13px}
  .trow.grand{background:#1e3a5f;color:#fff;font-weight:700;font-size:15px;border:none}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
  .mbox{background:#f8faff;border-radius:8px;padding:12px 14px}.mlbl{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px}
  .sig{margin-top:36px;display:grid;grid-template-columns:1fr 1fr;gap:60px}
  .sigline{border-top:1.5px solid #1e3a5f;padding-top:5px;font-size:11px;color:#6b7280;text-align:center}
  @media print{button{display:none}}</style></head><body>
  ${aHeader('INVOICE', inv.id)}
  <div style="margin-bottom:8px"><span style="background:${statusColor}22;color:${statusColor};font-size:12px;font-weight:700;border-radius:4px;padding:3px 10px">${inv.status}</span></div>
  <div class="meta">
    <div class="mbox"><div class="mlbl">Bill To</div><div style="font-size:14px;font-weight:700">${inv.customer||'—'}</div>${inv.repName?`<div style="font-size:11px;color:#6b7280;margin-top:3px">Account Rep: ${inv.repName}</div>`:''}</div>
    <div class="mbox"><div class="mlbl">Invoice Details</div>
      <div style="font-size:12px"><strong>Date:</strong> ${inv.date||'—'}</div>
      <div style="font-size:12px;margin-top:3px"><strong>Due:</strong> ${inv.dueDate||'—'}</div>
      <div style="font-size:12px;margin-top:3px"><strong>Source:</strong> ${inv.source||'Manual'}</div>
    </div>
  </div>
  <table><thead><tr><th>#</th><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Subtotal</th></tr></thead>
  <tbody>${itemRows}</tbody></table>
  <div class="totals">
    <div class="trow grand"><span>Invoice Total</span><span>GH₵${total.toLocaleString()}</span></div>
    ${paid>0?`<div class="trow" style="background:#f0fdf4;color:#16a34a;font-weight:600"><span>Amount Paid</span><span>GH₵${paid.toLocaleString()}</span></div>`:''}
    ${bal>0?`<div class="trow" style="background:#fff7ed;color:#c2410c;font-weight:700"><span>Balance Due</span><span>GH₵${bal.toLocaleString()}</span></div>`:'<div class="trow" style="background:#f0fdf4;color:#16a34a;font-weight:700"><span>Balance Due</span><span>GH₵ 0.00 ✓</span></div>'}
  </div>
  <div class="sig"><div class="sigline">Customer Signature &amp; Date</div><div class="sigline">Authorised By &amp; Date</div></div>
  <div style="margin-top:28px;text-align:center"><button onclick="window.print()" style="background:#1e3a5f;color:#fff;border:none;border-radius:8px;padding:10px 28px;font-size:14px;font-weight:700;cursor:pointer">🖨️ Print Invoice</button></div>
  </body></html>`)
  win.document.close()
}

function printBalances(invoices) {
  const custMap = {}
  invoices.forEach(inv=>{
    const k=(inv.customer||'').trim().toUpperCase()
    if(!custMap[k]) custMap[k]={customer:k,total:0,paid:0,count:0}
    custMap[k].total+=Number(inv.amount||0); custMap[k].paid+=Number(inv.amountPaid||0); custMap[k].count++
  })
  const list = Object.values(custMap).sort((a,b)=>(b.total-b.paid)-(a.total-a.paid))
  const totalOwed = list.reduce((s,c)=>s+(c.total-c.paid),0)
  const rows = list.map((c,i)=>{
    const owed=c.total-c.paid
    return `<tr style="background:${i%2===0?'#fff':'#f9fafb'}">
      <td style="padding:8px 12px;font-weight:600">${c.customer}</td>
      <td style="padding:8px 12px;text-align:center">${c.count}</td>
      <td style="padding:8px 12px;text-align:right">GH₵${c.total.toLocaleString()}</td>
      <td style="padding:8px 12px;text-align:right;color:#16a34a;font-weight:600">GH₵${c.paid.toLocaleString()}</td>
      <td style="padding:8px 12px;text-align:right;font-weight:800;color:${owed>0?'#dc2626':'#16a34a'}">GH₵${owed.toLocaleString()}</td>
    </tr>`
  }).join('')
  const win = window.open('','_blank','width=720,height=720')
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Customer Balances</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:28px 32px;color:#0f172a;font-size:12px}
  table{width:100%;border-collapse:collapse}thead{background:#1e3a5f;color:#fff}th{padding:9px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;text-align:left}
  .footer{margin-top:14px;display:flex;justify-content:space-between;align-items:center;border-top:2px solid #1e3a5f;padding-top:10px}
  @media print{button{display:none}}</style></head><body>
  ${aHeader('Customer Balances')}
  <table><thead><tr><th>Customer</th><th style="text-align:center">Invoices</th><th style="text-align:right">Total Invoiced</th><th style="text-align:right">Amount Paid</th><th style="text-align:right">Balance Due</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div class="footer"><span style="font-size:12px;color:#6b7280">Total Outstanding</span><span style="font-size:18px;font-weight:900;color:#dc2626">GH₵${totalOwed.toLocaleString()}</span></div>
  <div style="margin-top:24px;text-align:center"><button onclick="window.print()" style="background:#1e3a5f;color:#fff;border:none;border-radius:8px;padding:10px 28px;font-size:14px;font-weight:700;cursor:pointer">🖨️ Print</button></div>
  </body></html>`)
  win.document.close()
}

function printExpenses(expenses) {
  const approved = expenses.filter(e=>e.approved)
  const total = approved.reduce((s,e)=>s+Number(e.amount||0),0)
  const rows = expenses.map((e,i)=>`<tr style="background:${i%2===0?'#fff':'#f9fafb'}">
    <td style="padding:8px 12px;font-size:11px;color:#6b7280;font-family:monospace">${e.id}</td>
    <td style="padding:8px 12px">${e.category||'—'}</td>
    <td style="padding:8px 12px">${e.description||'—'}</td>
    <td style="padding:8px 12px;text-align:right;font-weight:700">${e.amount?`GH₵${Number(e.amount).toLocaleString()}`:'—'}</td>
    <td style="padding:8px 12px">${e.date||'—'}</td>
    <td style="padding:8px 12px"><span style="background:${e.approved?'#dcfce7':'#fffbeb'};color:${e.approved?'#16a34a':'#d97706'};font-size:11px;font-weight:700;border-radius:3px;padding:2px 7px">${e.approved?'Approved':'Pending'}</span></td>
  </tr>`).join('')
  const win = window.open('','_blank','width=780,height=680')
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Expenses Report</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:28px 32px;color:#0f172a;font-size:12px}
  table{width:100%;border-collapse:collapse}thead{background:#1e3a5f;color:#fff}th{padding:9px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;text-align:left}
  .footer{margin-top:14px;display:flex;gap:20px;font-size:12px;color:#6b7280;border-top:1px solid #e2e8f0;padding-top:10px}
  @media print{button{display:none}}</style></head><body>
  ${aHeader('Expenses Report')}
  <table><thead><tr><th>ID</th><th>Category</th><th>Description</th><th style="text-align:right">Amount</th><th>Date</th><th>Status</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div class="footer">
    <span>Total Expenses: <strong>${expenses.length}</strong></span>
    <span>Total Approved: <strong style="color:#dc2626">GH₵${total.toLocaleString()}</strong></span>
  </div>
  <div style="margin-top:24px;text-align:center"><button onclick="window.print()" style="background:#1e3a5f;color:#fff;border:none;border-radius:8px;padding:10px 28px;font-size:14px;font-weight:700;cursor:pointer">🖨️ Print</button></div>
  </body></html>`)
  win.document.close()
}

// ── Pay Modal ─────────────────────────────────────────────────
function PayModal({ inv, onClose, dispatch, toast }) {
  const { register, handleSubmit, formState:{errors} } = useForm()
  const bal = Math.max(0,Number(inv.amount||0)-Number(inv.amountPaid||0))
  function onSubmit(data) {
    const pay=Number(data.amount||0)
    if(!pay||pay<=0){ toast('error','Enter a valid amount.'); return }
    const newPaid=Number(inv.amountPaid||0)+pay
    const newStatus=newPaid>=Number(inv.amount||0)?'Paid':'Partial'
    dispatch({ type:'DB_UPDATE', key:'invoices', id:inv.id, patch:{ amountPaid:newPaid, status:newStatus, payRef:data.ref, lastPayDate:today() }})
    toast('success','Payment recorded.'); onClose()
  }
  return (
    <div className="mov on" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="mdl">
        <div style={{background:'linear-gradient(135deg,#1e40af,#1e3a8a)',padding:'16px 18px'}}>
          <div style={{fontWeight:700,fontSize:15,color:'#fff'}}>💳 Record Payment</div>
          <div style={{fontSize:12,color:'#93c5fd',fontFamily:'monospace',marginTop:2}}>{inv.id}</div>
        </div>
        <div style={{padding:20}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,background:'var(--bg)',borderRadius:10,padding:14,marginBottom:16}}>
            {[['Customer',inv.customer||'—'],['Invoice Total',money(inv.amount)],['Balance Due',money(bal)]].map(([l,v])=>(
              <div key={l}>
                <div style={{fontSize:10,color:'var(--m)',textTransform:'uppercase',letterSpacing:'.7px',marginBottom:4}}>{l}</div>
                <div style={{fontWeight:700,fontSize:13}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <Field label="Amount Being Paid (GH₵)" error={errors.amount?.message}>
              <Input {...register('amount',{required:'Required',min:{value:1,message:'Must be > 0'}})} type="number" placeholder={String(bal)} style={{fontSize:18,fontWeight:700}} />
            </Field>
            <div style={{display:'flex',gap:8}}>
              <button type="button" className="btn btng btnsm" onClick={()=>{const el=document.getElementById('pay-amt-input');if(el)el.value=bal}}>Full ({money(bal)})</button>
              <button type="button" className="btn btng btnsm" onClick={()=>{const el=document.getElementById('pay-amt-input');if(el)el.value=Math.round(bal/2)}}>Half</button>
            </div>
            <Field label="Payment Reference (optional)"><Input {...register('ref')} placeholder="e.g. Cash, Cheque #123, MoMo…" /></Field>
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:20}}>
            <button className="btn btng btnmd" onClick={onClose}>Cancel</button>
            <button className="btn btns btnmd" onClick={handleSubmit(onSubmit)}>✓ Record Payment</button>
          </div>
        </div>
      </div>
    </div>
  )
}
