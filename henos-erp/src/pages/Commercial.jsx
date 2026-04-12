import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useApp } from '../context/AppContext'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../hooks/useToast'
import { uid, today, ts, money, statusVariant, REPS, REP_COLORS, owedBalance } from '../utils/helpers'
import { PageHeader, Pills, Card, CardBody, Table, Badge, RepBadge, Button, Drawer, Field, Input, Select, NotifBell, EmptyState, ConfirmModal, Modal } from '../components/ui'

const PRODUCTS = ['50KG Cylinder','14.5KG Cylinder','12.5KG Cylinder','6KG Cylinder','3KG Cylinder','Bulk LPG','Autogas']
const CUST_TYPES = ['Commercial','Industrial','Agricultural','Fleet','Retail']

export default function Commercial() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const { db } = state

  const [tab, setTab]               = useState('orders')
  const [orderOpen, setOrderOpen]   = useState(false)
  const [custOpen, setCustOpen]     = useState(false)
  const [priceOpen, setPriceOpen]   = useState(false)
  const [editCust, setEditCust]     = useState(null)
  const [editOrder, setEditOrder]   = useState(null)
  const [editPrice, setEditPrice]   = useState(null)
  const [delConfirm, setDelConfirm] = useState(null)
  // New customer popup triggered from order form
  const [newCustModal, setNewCustModal] = useState(null) // { pendingOrder, custName }

  const pend = db.orders.filter(o => o.status === 'Awaiting Ops Review').length

  const tabs = [
    { id:'orders',    label:'Orders', badge: pend || null },
    { id:'history',   label:'📋 Order History' },
    { id:'customers', label:'Customers' },
    { id:'pricing',   label:'Pricing' },
  ]

  async function doDelete() {
    try {
      await dispatch({ type:'DB_DELETE', key:delConfirm.key, id:delConfirm.id })
      toast('success','Deleted.')
      setDelConfirm(null)
    } catch (error) {
      toast('error', error.message || 'Could not delete record.')
    }
  }

  // Called when order form detects unknown customer
  function handleNewCust({ custName, pendingOrder }) {
    setNewCustModal({ custName, pendingOrder })
    setOrderOpen(false)
  }

  // After new customer registered, place the order
  async function finishOrder(pendingOrder) {
    await dispatch({ type:'DB_INSERT', key:'orders', record: pendingOrder })
    await dispatch({ type:'DB_INSERT', key:'cnotifs', record:{
      id:uid('N'), type:'approved', read:false, time:ts(),
      title:`Order ${pendingOrder.id} placed`,
      message:`New order for ${pendingOrder.product} for ${pendingOrder.customer} submitted to Operations.`
    }})
    toast('success','Customer registered & order submitted to Operations.')
    setNewCustModal(null)
  }

  const { session } = useAuth()

  return (
    <div style={{animation:'fadein .3s cubic-bezier(.4,0,.2,1)'}}>
      <PageHeader title="Commercial" actions={<>
        <NotifBell notifKey="cnotifs" />
        {tab==='orders'    && <Button onClick={()=>setOrderOpen(true)}>+ New Order</Button>}
        {tab==='customers' && <Button onClick={()=>setCustOpen(true)}>+ Add Customer</Button>}
        {tab==='pricing'   && <Button onClick={()=>setPriceOpen(true)}>+ Set Price</Button>}
      </>} />

      <div className="ibar ib"><span>ℹ️</span><span>Orders go to <strong>Operations</strong> for credit check before processing.</span></div>

      <Pills tabs={tabs} active={tab} onChange={setTab} />

      {tab==='orders' && (
        <Card><CardBody noPad>
          <Table
            columns={['Order ID','Customer','Product','Qty','Total','Placed By','Date','Status','']}
            rows={db.orders.map(o => [
              <span style={{fontSize:11,color:'var(--a)',fontFamily:'monospace'}}>{o.id}</span>,
              o.customer||'—', o.product||'—', o.qty||'—',
              o.qty&&o.unitPrice ? money(o.qty*o.unitPrice) : '—',
              <RepBadge name={o.placedBy} colors={REP_COLORS} />,
              o.date||'—',
              <Badge variant={statusVariant(o.status)}>{o.status}</Badge>,
              <div style={{display:'flex',gap:4}}>
                <Button variant="secondary" size="sm" onClick={()=>setEditOrder(o)}>✏️</Button>
                <Button variant="ghost" size="sm" onClick={()=>setDelConfirm({key:'orders',id:o.id})}>Del</Button>
              </div>,
            ])}
          />
        </CardBody></Card>
      )}

      {tab==='history' && (
        <Card>
          <div className="phd" style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
            <span className="ptl2">📋 All Orders — Live Status from Operations</span>
            <Button variant="secondary" size="sm" onClick={()=>printOrderHistory(db.orders)}>🖨 Print All</Button>
          </div>
          <CardBody noPad>
            <Table
              columns={['Order ID','Customer','Product','Qty','Total','Placed By','Date','Status','']}
              rows={db.orders.slice().reverse().map(o => [
                <span style={{fontSize:11,color:'var(--a)',fontFamily:'monospace'}}>{o.id}</span>,
                o.customer||'—', o.product||'—', o.qty||'—',
                o.qty&&o.unitPrice ? money(o.qty*o.unitPrice) : '—',
                <RepBadge name={o.placedBy} colors={REP_COLORS} />,
                o.deliveredAt || o.approvedAt || o.cancelledAt || o.date || '—',
                <Badge variant={statusVariant(o.status)}>{o.status}</Badge>,
                <Button variant="ghost" size="sm" onClick={()=>printSingleOrder(o)}>🖨</Button>,
              ])}
              empty="No orders placed yet. Go to Orders tab to place your first order."
            />
          </CardBody>
        </Card>
      )}

      {tab==='customers' && (
        <Card><CardBody noPad>
          <Table
            columns={['ID','Name','Type','Region','Contact','GPS','Acct Mgr','Status','']}
            rows={db.customers.map(c => [
              <span style={{fontSize:11,color:'var(--m)',fontFamily:'monospace'}}>{c.id}</span>,
              c.name||'—', c.type||'—', c.region||'—', c.contact||'—',
              c.gps ? <span style={{fontSize:11,color:'var(--a)'}}>📍{c.gps}</span> : '—',
              <RepBadge name={c.rep} colors={REP_COLORS} />,
              <Badge variant={c.status==='Active'?'success':'neutral'}>{c.status||'Active'}</Badge>,
              <div style={{display:'flex',gap:4}}>
                <Button variant="secondary" size="sm" onClick={()=>setEditCust(c)}>✏️</Button>
                <Button variant="ghost" size="sm" onClick={()=>setDelConfirm({key:'customers',id:c.id})}>Del</Button>
              </div>,
            ])}
          />
        </CardBody></Card>
      )}

      {tab==='pricing' && (
        <Card><CardBody noPad>
          <Table
            columns={['ID','Product','Category','Unit','Price (GH₵)','Updated','']}
            rows={db.prices.map(p => [
              <span style={{fontSize:11,color:'var(--m)',fontFamily:'monospace'}}>{p.id}</span>,
              p.product||'—', p.category||'—', p.unit||'—',
              p.price ? Number(p.price).toLocaleString() : '—',
              p.updatedAt||'—',
              <div style={{display:'flex',gap:4}}>
                <Button variant="secondary" size="sm" onClick={()=>setEditPrice(p)}>✏️</Button>
                <Button variant="ghost" size="sm" onClick={()=>setDelConfirm({key:'prices',id:p.id})}>Del</Button>
              </div>,
            ])}
          />
        </CardBody></Card>
      )}

      {/* Drawers & Modals */}
      <OrderDrawer open={orderOpen} onClose={()=>setOrderOpen(false)} db={db} dispatch={dispatch} toast={toast} onNewCust={handleNewCust} session={session} />
      {editOrder && <EditOrderDrawer order={editOrder} onClose={()=>setEditOrder(null)} dispatch={dispatch} toast={toast} />}
      <CustomerDrawer open={custOpen} onClose={()=>setCustOpen(false)} dispatch={dispatch} toast={toast} />
      {editCust && <EditCustomerDrawer cust={editCust} onClose={()=>setEditCust(null)} dispatch={dispatch} toast={toast} />}
      <PriceDrawer open={priceOpen} onClose={()=>setPriceOpen(false)} dispatch={dispatch} toast={toast} />
      {editPrice && <EditPriceDrawer price={editPrice} onClose={()=>setEditPrice(null)} dispatch={dispatch} toast={toast} />}

      {/* New Customer Popup (triggered mid-order) */}
      {newCustModal && (
        <NewCustomerModal
          custName={newCustModal.custName}
          pendingOrder={newCustModal.pendingOrder}
          onCancel={()=>{ setNewCustModal(null); setOrderOpen(true) }}
          onSave={async (custData)=>{
            try {
              const createdCustomer = await dispatch({ type:'DB_INSERT', key:'customers', record: custData })
              await finishOrder({
                ...newCustModal.pendingOrder,
                customerId: createdCustomer.id,
                customer: createdCustomer.name,
              })
            } catch (error) {
              toast('error', error.message || 'Could not register customer and place order.')
            }
          }}
          dispatch={dispatch}
        />
      )}

      <ConfirmModal open={!!delConfirm} onClose={()=>setDelConfirm(null)} onConfirm={doDelete} title="Confirm Delete" message="This record will be permanently deleted." />
    </div>
  )
}

// ── Order Drawer ─────────────────────────────────────────────
function OrderDrawer({ open, onClose, db, dispatch, toast, onNewCust, session }) {
  const autoRep = session?.role==='sales_rep' ? session?.name : (session?.name||'')
  const { register, handleSubmit, watch, reset, formState:{errors} } = useForm({ defaultValues:{ placedBy: autoRep } })
  const prVal = watch('product')
  const custVal = watch('customer','')

  // Live owed balance check
  const custUp = (custVal||'').trim().toUpperCase()
  const custExists = !!db.customers.find(c=>c.name.trim().toUpperCase()===custUp)
  const owed = custUp ? owedBalance(custUp, db.invoices) : 0

  async function onSubmit(data) {
    const customer = data.customer.trim().toUpperCase()
    const product  = data.product==='custom' ? (data.customProduct||'').toUpperCase() : data.product
    if (!customer || !product) { toast('error','Customer and product required.'); return }

    const order = {
      id: uid('SO'), status:'Awaiting Ops Review', date:today(),
      customer, product,
      qty: data.qty ? Number(data.qty) : null,
      unitPrice: data.unitPrice ? Number(data.unitPrice) : null,
      placedBy: data.placedBy || null,
      notes: data.notes || null,
    }

    const exists = db.customers.find(c=>c.name.trim().toUpperCase()===customer)
    if (!exists) {
      // Trigger new customer popup
      onNewCust({ custName: customer, pendingOrder: order })
      reset()
      return
    }

    try {
      await dispatch({ type:'DB_INSERT', key:'orders', record: order })
      await dispatch({ type:'DB_INSERT', key:'cnotifs', record:{
        id:uid('N'), type:'approved', read:false, time:ts(),
        title:`Order ${order.id} placed`,
        message:`New order for ${product} for ${customer} submitted to Operations.`
      }})
      toast('success','Order submitted to Operations.')
      reset(); onClose()
    } catch (error) {
      toast('error', error.message || 'Could not submit order.')
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Place New Order"
      footer={<>
        <Button className="btnfw" onClick={handleSubmit(onSubmit)}>Submit to Operations →</Button>
        <Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button>
      </>}
    >
      <div className="ibar iw"><span>⚠️</span><span>Goes to Operations for credit check before processing.</span></div>

      <Field label="Placed By" hint={session?.role==='sales_rep'?'Auto-filled from your profile':undefined}>
        {session?.role==='sales_rep'
          ? <input value={session?.name||''} disabled style={{border:'1.5px solid var(--b)',borderRadius:7,padding:'9px 11px',fontSize:13,background:'var(--bg)',color:'var(--m)',width:'100%',fontFamily:'inherit'}}/>
          : <Select {...register('placedBy')}><option value="">Select rep…</option>{REPS.map(r=><option key={r}>{r}</option>)}</Select>
        }
      </Field>

      <Field label="Customer Name" error={errors.customer?.message}
        hint={custUp && !custExists ? '⚠️ Customer not found — will prompt to register' : custUp && custExists ? '✓ Customer found' : ''}>
        <Input {...register('customer',{required:'Customer name is required'})} placeholder="e.g. METRO FAST FOOD" />
      </Field>

      {/* Outstanding balance warning */}
      {custUp && custExists && owed > 0 && (
        <div className="ibar ir">
          <span>🔴</span>
          <span><strong>{custUp}</strong> has an outstanding balance of <strong>{money(owed)}</strong>. Operations will see this during review.</span>
        </div>
      )}

      <Field label="Product / Cylinder Size">
        <Select {...register('product')}><option value="">Select product…</option>
          {PRODUCTS.map(p=><option key={p}>{p}</option>)}
          <option value="custom">Other (specify below)</option>
        </Select>
      </Field>
      {prVal==='custom' && <Field label="Specify Product"><Input {...register('customProduct')} placeholder="Type product name…" /></Field>}
      {prVal==='Bulk LPG' && <Field label="Bulk Weight (KG)"><Input {...register('bulkKg')} type="number" placeholder="e.g. 5000" /></Field>}

      <div className="frow">
        <Field label="Quantity"><Input {...register('qty')} type="number" placeholder="e.g. 10" /></Field>
        <Field label="Unit Price (GH₵)"><Input {...register('unitPrice')} type="number" placeholder="0.00" /></Field>
      </div>
      <Field label="Delivery Date"><Input {...register('deliveryDate')} type="date" /></Field>
      <Field label="Notes / Special Instructions"><Input {...register('notes')} placeholder="Any special instructions…" /></Field>
    </Drawer>
  )
}

// ── New Customer Popup (mid-order) ────────────────────────────
function NewCustomerModal({ custName, pendingOrder, onCancel, onSave }) {
  const { register, handleSubmit, formState:{errors} } = useForm({
    defaultValues:{ name: custName }
  })
  function onSubmit(data) {
    const cust = {
      id: uid('C'), status:'Active',
      name: data.name.trim().toUpperCase(),
      type: data.type, region: data.region,
      contact: data.contact, gps: data.gps, rep: data.rep,
    }
    onSave(cust)
  }
  return (
    <div className="mov on" onClick={e=>{ if(e.target===e.currentTarget) onCancel() }}>
      <div className="mdl" style={{width:'min(480px,96vw)'}}>
        {/* Header */}
        <div style={{background:'linear-gradient(135deg,#1a56db,#1e40af)',padding:'16px 18px'}}>
          <div style={{fontWeight:700,fontSize:15,color:'#fff'}}>👤 New Customer — Required</div>
          <div style={{fontSize:12,color:'rgba(255,255,255,.8)',marginTop:4}}>
            "<strong>{custName}</strong>" isn't in your customer list. Please register them to place this order.
          </div>
        </div>
        <div style={{background:'var(--as)',borderBottom:'1.5px solid var(--b)',padding:'9px 18px',fontSize:11,color:'var(--a)',display:'flex',gap:6,alignItems:'center'}}>
          <span>ℹ️</span><span>All fields below are <strong>compulsory</strong>. Complete registration to submit the order.</span>
        </div>
        <div style={{padding:'18px',display:'flex',flexDirection:'column',gap:12,maxHeight:'60vh',overflowY:'auto'}}>
          <Field label="Company / Name" required error={errors.name?.message}>
            <Input {...register('name',{required:'Required'})} style={{fontWeight:700}} />
          </Field>
          <div className="frow">
            <Field label="Customer Type" required error={errors.type?.message}>
              <Select {...register('type',{required:'Required'})}>
                <option value="">Select type…</option>
                {CUST_TYPES.map(v=><option key={v}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Region" required error={errors.region?.message}>
              <Input {...register('region',{required:'Required'})} placeholder="e.g. Accra North" />
            </Field>
          </div>
          <Field label="Contact Person & Phone" required error={errors.contact?.message}>
            <Input {...register('contact',{required:'Required'})} placeholder="Full name · phone number" />
          </Field>
          <Field label="GPS / Digital Address" required error={errors.gps?.message} hint="📍 Ghana Post GPS address or coordinates">
            <Input {...register('gps',{required:'Required'})} placeholder="e.g. GS-0382-3921" />
          </Field>
          <Field label="Account Manager" required error={errors.rep?.message}>
            <Select {...register('rep',{required:'Required'})}>
              <option value="">Select account manager…</option>
              {REPS.map(r=><option key={r}>{r}</option>)}
            </Select>
          </Field>
        </div>
        <div style={{padding:'12px 18px',borderTop:'1.5px solid var(--b)',display:'flex',flexDirection:'column',gap:8}}>
          <Button className="btnfw" onClick={handleSubmit(onSubmit)}>✓ Register Customer & Submit Order</Button>
          <Button variant="ghost" className="btnfw" onClick={onCancel}>✕ Cancel — Go Back to Order Form</Button>
        </div>
      </div>
    </div>
  )
}


// ── Print helpers ─────────────────────────────────────────────
function printOrderHistory(orders) {
  const LOGO_URL = 'https://i0.wp.com/henosenergy.com/wp/wp-content/uploads/2023/10/Henos-Logo-White1.png?fit=1000%2C416&ssl=1'
  const rows = orders.map((o,i) => {
    const total = o.qty && o.unitPrice ? `GH₵${(o.qty*o.unitPrice).toLocaleString()}` : '—'
    const statusColor = {Delivered:'#16a34a',Cancelled:'#dc2626','Awaiting Ops Review':'#d97706',Processing:'#1a56db','In Transit':'#1a56db'}[o.status]||'#6b7280'
    return `<tr style="background:${i%2===0?'#fff':'#f9fafb'}">
      <td style="padding:8px 12px;font-size:11px;color:#1a56db;font-family:monospace">${o.id}</td>
      <td style="padding:8px 12px;font-weight:600">${o.customer||'—'}</td>
      <td style="padding:8px 12px">${o.product||'—'}</td>
      <td style="padding:8px 12px;text-align:center">${o.qty||'—'}</td>
      <td style="padding:8px 12px;text-align:right;font-weight:700">${total}</td>
      <td style="padding:8px 12px">${o.placedBy||'—'}</td>
      <td style="padding:8px 12px">${o.deliveredAt||o.approvedAt||o.cancelledAt||o.date||'—'}</td>
      <td style="padding:8px 12px"><span style="background:${statusColor}22;color:${statusColor};font-size:11px;font-weight:700;border-radius:3px;padding:2px 7px">${o.status}</span></td>
    </tr>`
  }).join('')
  const win = window.open('','_blank','width=900,height=700')
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Order History</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:28px 32px;color:#0f172a;font-size:12px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:3px solid #1e3a5f}
  table{width:100%;border-collapse:collapse}thead{background:#1e3a5f;color:#fff}th{padding:9px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;text-align:left}
  @media print{button{display:none}}</style></head><body>
  <div class="header">
    <div><div style="background:#1e3a5f;border-radius:10px;padding:5px 14px;display:inline-flex;align-items:center;margin-bottom:8px"><img src="${LOGO_URL}" style="height:38px"/></div>
    <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.6px">Energizing Progress · Ghana</div></div>
    <div style="text-align:right"><div style="font-size:18px;font-weight:900;color:#1e3a5f">Order History</div>
    <div style="font-size:11px;color:#64748b;margin-top:4px">Printed: ${new Date().toLocaleDateString('en-GH',{day:'2-digit',month:'short',year:'numeric'})}</div>
    <div style="font-size:11px;color:#64748b">Total Orders: ${orders.length}</div></div>
  </div>
  <table><thead><tr><th>Order ID</th><th>Customer</th><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Total</th><th>Placed By</th><th>Date</th><th>Status</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div style="margin-top:24px;text-align:center"><button onclick="window.print()" style="background:#1e3a5f;color:#fff;border:none;border-radius:8px;padding:10px 28px;font-size:14px;font-weight:700;cursor:pointer">🖨️ Print</button></div>
  </body></html>`)
  win.document.close()
}

function printSingleOrder(o) {
  const LOGO_URL = 'https://i0.wp.com/henosenergy.com/wp/wp-content/uploads/2023/10/Henos-Logo-White1.png?fit=1000%2C416&ssl=1'
  const total = o.qty && o.unitPrice ? o.qty * o.unitPrice : 0
  const statusColor = {Delivered:'#16a34a',Cancelled:'#dc2626','Awaiting Ops Review':'#d97706',Processing:'#1a56db','In Transit':'#1a56db'}[o.status]||'#6b7280'
  const win = window.open('','_blank','width=600,height=500')
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Order ${o.id}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:28px 32px;color:#0f172a;font-size:13px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:3px solid #1e3a5f}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px}
  .box{background:#f8faff;border-radius:8px;padding:14px 16px}.lbl{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px}.val{font-size:14px;font-weight:700}
  @media print{button{display:none}}</style></head><body>
  <div class="header">
    <div><div style="background:#1e3a5f;border-radius:10px;padding:5px 14px;display:inline-flex;align-items:center;margin-bottom:8px"><img src="${LOGO_URL}" style="height:38px"/></div>
    <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.6px">Energizing Progress · Ghana</div></div>
    <div style="text-align:right"><div style="font-size:18px;font-weight:900;color:#1e3a5f">Order Confirmation</div>
    <div style="font-size:12px;font-family:monospace;color:#1a56db;margin-top:4px">${o.id}</div>
    <div style="margin-top:6px"><span style="background:${statusColor}22;color:${statusColor};font-size:12px;font-weight:700;border-radius:4px;padding:3px 10px">${o.status}</span></div></div>
  </div>
  <div class="grid">
    ${[['Customer',o.customer||'—'],['Product',o.product||'—'],['Quantity',o.qty||'—'],['Unit Price',o.unitPrice?`GH₵${Number(o.unitPrice).toLocaleString()}`:'—'],['Order Total',total?`GH₵${total.toLocaleString()}`:'—'],['Placed By',o.placedBy||'—'],['Date Placed',o.date||'—'],['Status',o.status]].map(([l,v])=>`<div class="box"><div class="lbl">${l}</div><div class="val">${v}</div></div>`).join('')}
  </div>
  ${o.notes?`<div style="margin-top:16px;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:8px;padding:12px 14px"><div style="font-size:10px;color:#1a56db;text-transform:uppercase;font-weight:700;margin-bottom:4px">Notes</div><div style="font-size:13px">${o.notes}</div></div>`:''}
  <div style="margin-top:28px;text-align:center"><button onclick="window.print()" style="background:#1e3a5f;color:#fff;border:none;border-radius:8px;padding:10px 28px;font-size:14px;font-weight:700;cursor:pointer">🖨️ Print</button></div>
  </body></html>`)
  win.document.close()
}
// ── Edit Order Drawer ─────────────────────────────────────────
function EditOrderDrawer({ order, onClose, dispatch, toast }) {
  const { register, handleSubmit, watch } = useForm({ defaultValues:{ ...order, product: PRODUCTS.includes(order.product)?order.product:'custom', customProduct: PRODUCTS.includes(order.product)?'':order.product } })
  const prVal = watch('product')
  async function onSubmit(data) {
    const product = data.product==='custom'?(data.customProduct||'').toUpperCase():data.product
    try {
      await dispatch({ type:'DB_UPDATE', key:'orders', id:order.id, patch:{
        product, qty:data.qty?Number(data.qty):null,
        unitPrice:data.unitPrice?Number(data.unitPrice):null,
        placedBy:data.placedBy||null, notes:data.notes||null,
      }})
      toast('success','Order updated.'); onClose()
    } catch (error) {
      toast('error', error.message || 'Could not update order.')
    }
  }
  return (
    <Drawer open={true} onClose={onClose} title={`Edit Order — ${order.id}`}
      footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Changes</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="Customer"><Input value={order.customer} disabled style={{background:'var(--bg)',color:'var(--m)'}}/></Field>
      <Field label="Placed By"><Select {...register('placedBy')}><option value="">Select rep…</option>{REPS.map(r=><option key={r}>{r}</option>)}</Select></Field>
      <Field label="Product">
        <Select {...register('product')}><option value="">Select…</option>{PRODUCTS.map(p=><option key={p}>{p}</option>)}<option value="custom">Other</option></Select>
      </Field>
      {prVal==='custom'&&<Field label="Specify Product"><Input {...register('customProduct')} /></Field>}
      <div className="frow">
        <Field label="Quantity"><Input {...register('qty')} type="number" /></Field>
        <Field label="Unit Price (GH₵)"><Input {...register('unitPrice')} type="number" /></Field>
      </div>
      <Field label="Notes"><Input {...register('notes')} /></Field>
    </Drawer>
  )
}

// ── Customer Drawer (standalone add) ─────────────────────────
function CustomerDrawer({ open, onClose, dispatch, toast }) {
  const { register, handleSubmit, reset, formState:{errors} } = useForm()
  async function onSubmit(data) {
    try {
      await dispatch({ type:'DB_INSERT', key:'customers', record:{
        id:uid('C'), status:'Active',
        name:data.name.trim().toUpperCase(),
        type:data.type, region:data.region,
        contact:data.contact, gps:data.gps, rep:data.rep,
      }})
      toast('success','Customer added.'); reset(); onClose()
    } catch (error) {
      toast('error', error.message || 'Could not add customer.')
    }
  }
  return (
    <Drawer open={open} onClose={onClose} title="Add Customer"
      footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Customer</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="Company / Name" required error={errors.name?.message}><Input {...register('name',{required:'Required'})} placeholder="e.g. Metro Fast Food" /></Field>
      <div className="frow">
        <Field label="Type"><Select {...register('type')}><option value="">Select…</option>{CUST_TYPES.map(v=><option key={v}>{v}</option>)}</Select></Field>
        <Field label="Region"><Input {...register('region')} placeholder="e.g. Accra North" /></Field>
      </div>
      <Field label="Contact & Phone"><Input {...register('contact')} placeholder="Name · phone" /></Field>
      <Field label="GPS / Digital Address" hint="📍 Ghana Post GPS or coordinates"><Input {...register('gps')} placeholder="e.g. GS-0382-3921" /></Field>
      <Field label="Account Manager"><Select {...register('rep')}><option value="">Select rep…</option>{REPS.map(r=><option key={r}>{r}</option>)}</Select></Field>
      <Field label="Status"><Select {...register('status')}><option>Active</option><option>Inactive</option></Select></Field>
    </Drawer>
  )
}

// ── Edit Customer Drawer ──────────────────────────────────────
function EditCustomerDrawer({ cust, onClose, dispatch, toast }) {
  const { register, handleSubmit } = useForm({ defaultValues: cust })
  async function onSubmit(data) {
    try {
      await dispatch({ type:'DB_UPDATE', key:'customers', id:cust.id, patch:{
        name:data.name.trim().toUpperCase(), type:data.type, region:data.region,
        contact:data.contact, gps:data.gps, rep:data.rep, status:data.status,
      }})
      toast('success','Customer updated.'); onClose()
    } catch (error) {
      toast('error', error.message || 'Could not update customer.')
    }
  }
  return (
    <Drawer open={true} onClose={onClose} title={`Edit — ${cust.name}`}
      footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Changes</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="Company / Name"><Input {...register('name')} /></Field>
      <div className="frow">
        <Field label="Type"><Select {...register('type')}><option value="">Select…</option>{CUST_TYPES.map(v=><option key={v}>{v}</option>)}</Select></Field>
        <Field label="Region"><Input {...register('region')} /></Field>
      </div>
      <Field label="Contact & Phone"><Input {...register('contact')} /></Field>
      <Field label="GPS"><Input {...register('gps')} /></Field>
      <Field label="Account Manager"><Select {...register('rep')}><option value="">Select rep…</option>{REPS.map(r=><option key={r}>{r}</option>)}</Select></Field>
      <Field label="Status"><Select {...register('status')}><option>Active</option><option>Inactive</option></Select></Field>
    </Drawer>
  )
}

// ── Price Drawer ──────────────────────────────────────────────
function PriceDrawer({ open, onClose, dispatch, toast }) {
  const { register, handleSubmit, reset, formState:{errors} } = useForm()
  async function onSubmit(data) {
    try {
      await dispatch({ type:'DB_INSERT', key:'prices', record:{ id:uid('PR'), updatedAt:today(), product:data.product, category:data.category, unit:data.unit, price:data.price||null }})
      toast('success','Price saved.'); reset(); onClose()
    } catch (error) {
      toast('error', error.message || 'Could not save price.')
    }
  }
  return (
    <Drawer open={open} onClose={onClose} title="Set Price"
      footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Price</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="Product" error={errors.product?.message}><Input {...register('product',{required:'Required'})} placeholder="e.g. 50kg Industrial Cylinder" /></Field>
      <Field label="Category"><Select {...register('category')}><option value="">Select…</option>{['Cylinder','Bulk LPG','Autogas','Accessories'].map(v=><option key={v}>{v}</option>)}</Select></Field>
      <Field label="Unit"><Input {...register('unit')} placeholder="e.g. per cylinder" /></Field>
      <Field label="Price (GH₵)"><Input {...register('price')} type="number" placeholder="0.00" /></Field>
    </Drawer>
  )
}

// ── Edit Price Drawer ─────────────────────────────────────────
function EditPriceDrawer({ price, onClose, dispatch, toast }) {
  const { register, handleSubmit } = useForm({ defaultValues: price })
  async function onSubmit(data) {
    try {
      await dispatch({ type:'DB_UPDATE', key:'prices', id:price.id, patch:{ product:data.product, category:data.category, unit:data.unit, price:data.price||null, updatedAt:today() }})
      toast('success','Price updated.'); onClose()
    } catch (error) {
      toast('error', error.message || 'Could not update price.')
    }
  }
  return (
    <Drawer open={true} onClose={onClose} title={`Edit Price — ${price.product}`}
      footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Changes</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="Product"><Input {...register('product')} /></Field>
      <Field label="Category"><Select {...register('category')}><option value="">Select…</option>{['Cylinder','Bulk LPG','Autogas','Accessories'].map(v=><option key={v}>{v}</option>)}</Select></Field>
      <Field label="Unit"><Input {...register('unit')} /></Field>
      <Field label="Price (GH₵)"><Input {...register('price')} type="number" /></Field>
    </Drawer>
  )
}
