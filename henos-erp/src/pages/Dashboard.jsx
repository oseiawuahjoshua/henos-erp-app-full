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

  const paid = db.invoices.filter(i => i.status === 'Paid').reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0)
  const outstanding = db.invoices.reduce(
    (sum, invoice) => sum + Math.max(0, Number(invoice.amount || 0) - Number(invoice.amountPaid || 0)),
    0
  )
  const criticalStock = db.stock.filter(item => item.status === 'Critical').length
  const pipelineValue = db.leads.reduce((sum, lead) => sum + Number(lead.value || 0), 0)
  const pending = db.orders.filter(order => order.status === 'Awaiting Ops Review').length
  const active = db.orders.filter(order => ['Awaiting Ops Review', 'Processing', 'In Transit'].includes(order.status)).length
  const delivered = db.orders.filter(order => order.status === 'Delivered').length
  const cancelled = db.orders.filter(order => order.status === 'Cancelled').length
  const total = db.orders.length
  const todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const donutData = [
    { name: 'Active', value: active, color: '#1a56db' },
    { name: 'Delivered', value: delivered, color: '#16a34a' },
    { name: 'Cancelled', value: cancelled, color: '#dc2626' },
    { name: 'Pending', value: pending, color: '#d97706' },
  ].filter(item => item.value > 0)

  const modules = [
    { path: '/commercial', label: 'Commercial', detail: 'Orders · pricing · customers', count: `${db.orders.length} orders`, alert: pending },
    { path: '/accounts', label: 'Accounts', detail: 'Invoices · expenses · P&L', count: `${db.invoices.length} invoices` },
    { path: '/operations', label: 'Operations', detail: 'Stock · deliveries · suppliers', count: `${db.stock.length} SKUs`, alert: pending },
    { path: '/marketing', label: 'Branding & Mktg', detail: 'Campaigns · leads', count: `${db.campaigns.length} campaigns` },
  ]

  return (
    <div style={{ animation: 'fadein .3s cubic-bezier(.4,0,.2,1)' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{greet()}, {session?.name?.split(' ')[0] || 'there'}</div>
        <div style={{ fontSize: 12, color: 'var(--m)', marginTop: 4 }}>
          Welcome back to Henos Energy ERP ·
          <span style={{ color: 'var(--a)', fontWeight: 600 }}>
            {' '}
            {({
              admin: 'Administrator',
              manager: 'Manager',
              sales_rep: 'Sales Representative',
              accountant: 'Accounts Officer',
              operations: 'Operations Officer',
              viewer: 'Viewer',
            })[session?.role] || session?.role}
          </span>
          {session?.department && <span> · {session.department}</span>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--m)', marginTop: 8 }}>
          Date: <span style={{ color: '#0D0F14', fontWeight: 600 }}>{todayLabel}</span>
        </div>
      </div>

      <div className="krow">
        <KpiCard label="Revenue" value={paid ? money(paid) : '-'} note="Paid invoices" valueStyle={{ color: 'var(--g)' }} />
        <KpiCard label="Outstanding" value={outstanding ? money(outstanding) : '-'} note="Balance due" valueStyle={{ color: outstanding ? 'var(--r)' : 'var(--m)' }} />
        <KpiCard label="Active Orders" value={active || '-'} note="In pipeline" />
        <KpiCard label="Stock Alerts" value={criticalStock || '-'} note="Critical SKUs" valueStyle={{ color: criticalStock ? 'var(--r)' : 'var(--m)' }} />
        <KpiCard label="Pipeline" value={pipelineValue ? money(pipelineValue) : '-'} note="Open leads" valueStyle={{ color: 'var(--a)' }} />
      </div>

      {pending > 0 && (
        <div className="ibar iw" onClick={() => navigate('/operations')} style={{ cursor: 'pointer' }}>
          <span><strong>{pending}</strong> order{pending > 1 ? 's' : ''} from Commercial awaiting review. <strong>Go to Operations</strong></span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'start' }} className="dgrid">
        <div className="panel" style={{ flexShrink: 0 }}>
          <div style={{ padding: '16px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Order Tracker</div>
            {total === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--m)', fontSize: 13 }}>No orders yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', width: 160, height: 160 }}>
                  <PieChart width={160} height={160}>
                    <Pie data={donutData} cx={80} cy={80} innerRadius={42} outerRadius={62} dataKey="value" startAngle={90} endAngle={-270} stroke="none">
                      {donutData.map((item, index) => <Cell key={index} fill={item.color} />)}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                  </PieChart>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <div style={{ fontSize: 30, fontWeight: 800, color: '#0D0F14', lineHeight: 1 }}>{total}</div>
                    <div style={{ fontSize: 10, color: 'var(--m)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 3 }}>Orders</div>
                  </div>
                </div>
                <div style={{ width: '100%' }}>
                  {[
                    { label: 'Active', color: '#1a56db', value: active },
                    { label: 'Delivered', color: '#16a34a', value: delivered },
                    { label: 'Cancelled', color: '#dc2626', value: cancelled },
                    { label: 'Pending', color: '#d97706', value: pending },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 0', borderBottom: '1px solid var(--b)' }}>
                      <div style={{ width: 11, height: 11, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 11, color: 'var(--m)' }}>{item.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0D0F14' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <button className="btn btng btnsm btnfw" onClick={() => navigate('/commercial')} style={{ fontSize: 11 }}>View All Orders</button>
              </div>
            )}
          </div>
        </div>

        <div className="mgrid" style={{ margin: 0 }}>
          {modules.map(module => (
            <div key={module.path} className={`mcard${module.alert ? ' mal' : ''}`} onClick={() => navigate(module.path)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="mnm">{module.label}</span>
                  {module.alert ? (
                    <span style={{ background: 'var(--am)', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 8, padding: '1px 6px', marginLeft: 6 }}>
                      {module.alert} pending
                    </span>
                  ) : null}
                </div>
                <div className="mds">{module.detail}</div>
                <div className="mct">{module.count}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
