import { useNavigate } from 'react-router'
import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { useApp } from '../context/AppContext'
import { useAuth } from '../auth/AuthContext'
import { formatAccraDate, greet, money, today } from '../utils/helpers'
import { KpiCard, Badge, Button } from '../components/ui'

export default function Dashboard() {
  const { state } = useApp()
  const { db } = state
  const { session, canAccess } = useAuth()
  const navigate = useNavigate()
  const todaysOrders = db.orders.filter(order => (order.date || '') === today())

  const paid = db.invoices.filter(i => i.status === 'Paid').reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0)
  const outstanding = db.invoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.amount || 0) - Number(invoice.amountPaid || 0)), 0)
  const criticalStock = db.stock.filter(item => item.status === 'Critical').length
  const pipelineValue = db.leads.reduce((sum, lead) => sum + Number(lead.value || 0), 0)
  const pending = todaysOrders.filter(order => order.status === 'Awaiting Ops Review').length
  const active = todaysOrders.filter(order => ['Awaiting Ops Review', 'Processing', 'In Transit'].includes(order.status)).length
  const delivered = todaysOrders.filter(order => order.status === 'Delivered').length
  const cancelled = todaysOrders.filter(order => order.status === 'Cancelled').length
  const total = todaysOrders.length
  const todayLabel = formatAccraDate({ weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const timeLabel = formatAccraDate({ hour: '2-digit', minute: '2-digit', hour12: true })
  const latestUpdate = db.broadcasts[0]

  const donutData = [
    { name: 'Active', value: active, color: '#1a56db' },
    { name: 'Delivered', value: delivered, color: '#16a34a' },
    { name: 'Cancelled', value: cancelled, color: '#dc2626' },
    { name: 'Pending', value: pending, color: '#d97706' },
  ].filter(item => item.value > 0)

  const modules = [
    { path: '/commercial', label: 'Commercial', detail: 'Orders, pricing, and customers', count: `${db.orders.length} orders`, enabled: canAccess('commercial') },
    { path: '/crm', label: 'CRM', detail: 'Accounts, opportunities, and follow-ups', count: `${db.customers.length} customers`, enabled: canAccess('crm') },
    { path: '/accounts', label: 'Accounts', detail: 'Invoices, expenses, and balances', count: `${db.invoices.length} invoices`, enabled: canAccess('accounts') },
    { path: '/hr', label: 'HR', detail: 'People, teams, and workforce view', count: `${db.broadcasts.length} updates`, enabled: canAccess('hr') },
    { path: '/updates', label: 'Updates', detail: 'Company-wide notices from managers', count: `${db.broadcasts.length} posts`, enabled: canAccess('updates') },
    { path: '/operations', label: 'Operations', detail: 'Stock, deliveries, and suppliers', count: `${db.stock.length} SKUs`, enabled: canAccess('operations') },
  ].filter(item => item.enabled)

  return (
    <div style={{ animation: 'fadein .3s cubic-bezier(.4,0,.2,1)' }}>
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <div className="dashboard-kicker">Henos Energy ERP</div>
          <h1 className="dashboard-title">{greet()}, {session?.name?.split(' ')[0] || 'there'}</h1>
          <p className="dashboard-subtitle">
            You are signed in as <strong>{({
              admin: 'Administrator',
              manager: 'Manager',
              sales_rep: 'Sales Representative',
              accountant: 'Accounts Officer',
              operations: 'Operations Officer',
              viewer: 'Viewer',
            })[session?.role] || session?.role}</strong>
            {session?.department ? ` in ${session.department}` : ''}.
          </p>
        </div>
        <div className="dashboard-date-card">
          <div className="dashboard-date-label">Accra Time</div>
          <div className="dashboard-date-main">{todayLabel}</div>
          <div className="dashboard-date-sub">{timeLabel}</div>
        </div>
      </section>

      <div className="krow">
        <KpiCard label="Revenue" value={paid ? money(paid) : '-'} note="Paid invoices" valueStyle={{ color: 'var(--g)' }} />
        <KpiCard label="Outstanding" value={outstanding ? money(outstanding) : '-'} note="Balance due" valueStyle={{ color: outstanding ? 'var(--r)' : 'var(--m)' }} />
        <KpiCard label="Active Orders" value={active || '-'} note="In pipeline" />
        <KpiCard label="Stock Alerts" value={criticalStock || '-'} note="Critical SKUs" valueStyle={{ color: criticalStock ? 'var(--r)' : 'var(--m)' }} />
        <KpiCard label="Pipeline" value={pipelineValue ? money(pipelineValue) : '-'} note="Open leads" valueStyle={{ color: 'var(--a)' }} />
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div style={{ padding: '18px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Order Tracker Today</div>
            {total === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--m)', fontSize: 13 }}>No orders recorded for today</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', width: 180, height: 180 }}>
                  <PieChart width={180} height={180}>
                    <Pie data={donutData} cx={90} cy={90} innerRadius={48} outerRadius={68} dataKey="value" startAngle={90} endAngle={-270} stroke="none">
                      {donutData.map((item, index) => <Cell key={index} fill={item.color} />)}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                  </PieChart>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <div style={{ fontSize: 34, fontWeight: 800, color: '#0D0F14', lineHeight: 1 }}>{total}</div>
                    <div style={{ fontSize: 10, color: 'var(--m)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', marginTop: 4 }}>Orders</div>
                  </div>
                </div>
                <div style={{ width: '100%' }}>
                  {[
                    { label: 'Active', color: '#1a56db', value: active },
                    { label: 'Delivered', color: '#16a34a', value: delivered },
                    { label: 'Cancelled', color: '#dc2626', value: cancelled },
                    { label: 'Pending', color: '#d97706', value: pending },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--b)' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 12, color: 'var(--m)' }}>{item.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <Button variant="secondary" size="sm" onClick={() => navigate('/commercial')}>View Orders</Button>
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Manager Updates</div>
              {canAccess('updates') && <Button variant="secondary" size="sm" onClick={() => navigate('/updates')}>Open Feed</Button>}
            </div>
            {latestUpdate ? (
              <div className="dashboard-update-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{latestUpdate.title}</div>
                    <Badge variant="info">{latestUpdate.type || 'Update'}</Badge>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--m)', whiteSpace: 'nowrap' }}>{latestUpdate.time || latestUpdate.createdAt?.slice?.(0, 10) || '-'}</div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--m)', marginTop: 12, lineHeight: 1.6 }}>{latestUpdate.message}</p>
              </div>
            ) : (
              <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '18px', fontSize: 13, color: 'var(--m)' }}>
                No company-wide updates have been posted yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {pending > 0 && (
        <div className="ibar iw" onClick={() => navigate('/operations')} style={{ cursor: 'pointer' }}>
          <span><strong>{pending}</strong> order{pending > 1 ? 's are' : ' is'} awaiting review in Operations.</span>
        </div>
      )}

      <div className="dashboard-module-grid">
        {modules.map(module => (
          <div key={module.path} className="dashboard-module-card" onClick={() => navigate(module.path)}>
            <div className="dashboard-module-top">
              <span className="dashboard-module-name">{module.label}</span>
              <span className="dashboard-module-count">{module.count}</span>
            </div>
            <div className="dashboard-module-detail">{module.detail}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
