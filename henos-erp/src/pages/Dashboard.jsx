import { useNavigate } from 'react-router'
import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { useApp } from '../context/AppContext'
import { useAuth } from '../auth/AuthContext'
import { money, greet } from '../utils/helpers'
import { KpiCard } from '../components/ui'

export default function Dashboard() {
  const { state } = useApp()
  const { db } = state
  const { session } = useAuth()
  const navigate = useNavigate()

  const paid  = db.invoices.filter(i=>i.status==='Paid').reduce((s,i)=>s+Number(i.amount||0),0)
  const unp   = db.invoices.filter(i=>i.status!=='Paid').reduce((s,i)=>s+Number(i.amount||0),0)
  const cr    = db.stock.filter(s=>s.status==='Critical').length
  const pip   = db.leads.reduce((s,l)=>s+Number(l.value||0),0)
  const pend  = db.orders.filter(o=>o.status==='Awaiting Ops Review').length
  const active= db.orders.filter(o=>['Awaiting Ops Review','Processing','In Transit'].includes(o.status)).length
  const delivered = db.orders.filter(o=>o.status==='Delivered').length
  const cancelled = db.orders.filter(o=>o.status==='Cancelled').length
  const total = db.orders.length

  const donutData = [
    {name:'Active',    value:active,    color:'#1a56db'},
    {name:'Delivered', value:delivered, color:'#16a34a'},
    {name:'Cancelled', value:cancelled, color:'#dc2626'},
    {name:'Pending',   value:pend,      color:'#d97706'},
  ].filter(d=>d.value>0)

  const modules = [
    {path:'/commercial',i:'◈',l:'Commercial',    d:'Orders · pricing · customers',  c:`${db.orders.length} orders`,    al:pend},
    {path:'/accounts',  i:'◎',l:'Accounts',      d:'Invoices · expenses · P&L',     c:`${db.orders.length} invoices`},
    {path:'/operations',i:'⬢',l:'Operations',    d:'Stock · deliveries · suppliers', c:`${db.stock.length} SKUs`,       al:pend},
    {path:'/marketing', i:'◆',l:'Branding & Mktg',d:'Campaigns · leads',            c:`${db.campaigns.length} campaigns`},
  ]

  return (
    <div style={{animation:'fadein .3s cubic-bezier(.4,0,.2,1)'}}>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:24,fontWeight:700}}>{greet()}, {session?.name?.split(' ')[0]||'there'} 👋</div>
        <div style={{fontSize:12,color:'var(--m)',marginTop:4}}>
          Welcome back to Henos Energy ERP &nbsp;·&nbsp;
          <span style={{color:'var(--a)',fontWeight:600}}>{({admin:'Administrator',manager:'Manager',sales_rep:'Sales Representative',accountant:'Accounts Officer',operations:'Operations Officer',viewer:'Viewer'})[session?.role]||session?.role}</span>
          {session?.department && <span> · {session.department}</span>}
        </div>
      </div>

      <div className="krow">
        <KpiCard label="Revenue"       value={paid?money(paid):'—'}  note="Paid invoices"    valueStyle={{color:'var(--g)'}} />
        <KpiCard label="Outstanding"   value={unp?money(unp):'—'}    note="Awaiting payment" valueStyle={{color:unp?'var(--r)':'var(--m)'}} />
        <KpiCard label="Active Orders" value={active||'—'}            note="In pipeline" />
        <KpiCard label="Stock Alerts"  value={cr||'—'}               note="Critical SKUs"    valueStyle={{color:cr?'var(--r)':'var(--m)'}} />
        <KpiCard label="Pipeline"      value={pip?money(pip):'—'}    note="Open leads"       valueStyle={{color:'var(--a)'}} />
      </div>

      {pend>0&&(
        <div className="ibar iw" onClick={()=>navigate('/operations')} style={{cursor:'pointer'}}>
          <span>⚠️</span><span><strong>{pend}</strong> order{pend>1?'s':''} from Commercial awaiting review. <strong>Go →</strong></span>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'220px 1fr',gap:16,alignItems:'start'}} className="dgrid">
        {/* Donut */}
        <div className="panel" style={{flexShrink:0}}>
          <div style={{padding:'16px 18px'}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>📦 Order Tracker</div>
            {total===0?(
              <div style={{textAlign:'center',padding:'24px 0',color:'var(--m)',fontSize:13}}>No orders yet</div>
            ):(
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
                <div style={{position:'relative',width:160,height:160}}>
                  <PieChart width={160} height={160}>
                    <Pie data={donutData} cx={80} cy={80} innerRadius={42} outerRadius={62} dataKey="value" startAngle={90} endAngle={-270} stroke="none">
                      {donutData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                    </Pie>
                    <Tooltip formatter={(v,n)=>[v,n]}/>
                  </PieChart>
                  <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
                    <div style={{fontSize:30,fontWeight:800,color:'#0D0F14',lineHeight:1}}>{total}</div>
                    <div style={{fontSize:10,color:'var(--m)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px',marginTop:3}}>Orders</div>
                  </div>
                </div>
                <div style={{width:'100%'}}>
                  {[{l:'Active',c:'#1a56db',v:active},{l:'Delivered',c:'#16a34a',v:delivered},{l:'Cancelled',c:'#dc2626',v:cancelled},{l:'Pending',c:'#d97706',v:pend}].map(s=>(
                    <div key={s.l} style={{display:'flex',alignItems:'center',gap:7,padding:'5px 0',borderBottom:'1px solid var(--b)'}}>
                      <div style={{width:11,height:11,borderRadius:'50%',background:s.c,flexShrink:0}}/>
                      <div style={{flex:1,fontSize:11,color:'var(--m)'}}>{s.l}</div>
                      <div style={{fontSize:13,fontWeight:700,color:'#0D0F14'}}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <button className="btn btng btnsm btnfw" onClick={()=>navigate('/commercial')} style={{fontSize:11}}>View All Orders</button>
              </div>
            )}
          </div>
        </div>

        {/* Module grid */}
        <div className="mgrid" style={{margin:0}}>
          {modules.map(m=>(
            <div key={m.path} className={`mcard${m.al?' mal':''}`} onClick={()=>navigate(m.path)}>
              <div className={`mico${m.al?' al':''}`}>{m.i}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',flexWrap:'wrap'}}>
                  <span className="mnm">{m.l}</span>
                  {m.al?<span style={{background:'var(--am)',color:'#fff',fontSize:10,fontWeight:700,borderRadius:8,padding:'1px 6px',marginLeft:6}}>{m.al} pending</span>:null}
                </div>
                <div className="mds">{m.d}</div>
                <div className="mct">{m.c}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
