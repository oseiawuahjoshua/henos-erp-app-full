import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useApp } from '../context/AppContext'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../hooks/useToast'
import { exportRowsAsCsv } from '../utils/csv'
import { uid, today, ts, money, statusVariant, REPS, REP_COLORS, owedBalance } from '../utils/helpers'
import { PageHeader, Pills, Card, CardBody, Table, Badge, RepBadge, Button, Drawer, Field, Input, Select, NotifBell, ConfirmModal, Modal, DetailModal } from '../components/ui'

const PRODUCTS = ['50KG Cylinder', '14.5KG Cylinder', '12.5KG Cylinder', '6KG Cylinder', '3KG Cylinder', 'Bulk LPG', 'Autogas']
const CUST_TYPES = ['Commercial', 'B2B']

export default function Commercial() {
  const { state, dispatch } = useApp()
  const { session } = useAuth()
  const toast = useToast()
  const { db } = state

  const [tab, setTab] = useState('orders')
  const [orderOpen, setOrderOpen] = useState(false)
  const [custOpen, setCustOpen] = useState(false)
  const [priceOpen, setPriceOpen] = useState(false)
  const [b2bOpen, setB2bOpen] = useState(false)
  const [editOrder, setEditOrder] = useState(null)
  const [editCust, setEditCust] = useState(null)
  const [editPrice, setEditPrice] = useState(null)
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all')
  const [b2bDateFilter, setB2bDateFilter] = useState('')
  const [historyDateFilter, setHistoryDateFilter] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [b2bSearch, setB2bSearch] = useState('')
  const [delConfirm, setDelConfirm] = useState(null)
  const [newCustModal, setNewCustModal] = useState(null)
  const [detailView, setDetailView] = useState(null)

  const todaysOrders = useMemo(() => db.orders.filter(order => (order.date || '') === today()), [db.orders])
  const pendingToday = todaysOrders.filter(order => order.status === 'Awaiting Ops Review').length
  const totalTodayQty = todaysOrders.reduce((sum, order) => sum + Number(order.qty || 0), 0)
  const normalizedCustomers = useMemo(() => db.customers.map(customer => ({ ...customer, type: normalizeCustomerType(customer.type) })), [db.customers])
  const filteredCustomers = useMemo(() => (
    normalizedCustomers.filter(customer => {
      const typeMatches = customerTypeFilter === 'all' || customer.type === customerTypeFilter
      const searchMatches = !customerSearch || [customer.name, customer.region, customer.contact, customer.rep, customer.gps]
        .some(value => String(value || '').toLowerCase().includes(customerSearch.toLowerCase()))
      return typeMatches && searchMatches
    })
  ), [customerSearch, customerTypeFilter, normalizedCustomers])
  const filteredB2b = useMemo(() => (
    db.b2b.filter(entry => {
      const dateMatches = !b2bDateFilter || entry.date === b2bDateFilter
      const searchMatches = !b2bSearch || [entry.customerName, entry.bdc, entry.depot, entry.orderNumber, entry.vehicleNumber]
        .some(value => String(value || '').toLowerCase().includes(b2bSearch.toLowerCase()))
      return dateMatches && searchMatches
    })
  ), [b2bDateFilter, b2bSearch, db.b2b])
  const filteredHistory = useMemo(() => (
    db.orders.filter(order => {
      const orderDate = order.deliveredAt || order.approvedAt || order.cancelledAt || order.date || ''
      const dateMatches = !historyDateFilter || orderDate === historyDateFilter
      const searchMatches = !historySearch || [order.id, order.customer, order.product, order.placedBy, order.status]
        .some(value => String(value || '').toLowerCase().includes(historySearch.toLowerCase()))
      return dateMatches && searchMatches
    })
  ), [db.orders, historyDateFilter, historySearch])
  const newCustomersThisMonth = filteredCustomers.filter(customer => {
    const created = customer.createdAt ? String(customer.createdAt).slice(0, 7) : ''
    return created === today().slice(0, 7)
  }).length
  const orderTrend = useMemo(() => buildDailyTrend(db.orders, order => order.date, order => Number(order.qty || 0), 7), [db.orders])
  const b2bTrend = useMemo(() => buildDailyTrend(db.b2b, entry => entry.date, entry => Number(entry.volume || 0), 7), [db.b2b])
  const b2bVolumeToday = filteredB2b
    .filter(entry => !b2bDateFilter || entry.date === b2bDateFilter)
    .reduce((sum, entry) => sum + Number(entry.volume || 0), 0)

  const tabs = [
    { id: 'orders', label: 'Orders', badge: pendingToday || null },
    { id: 'history', label: 'Order History' },
    { id: 'customers', label: 'Customers' },
    { id: 'b2b', label: 'B2B' },
    { id: 'pricing', label: 'Pricing' },
  ]

  async function doDelete() {
    try {
      await dispatch({ type: 'DB_DELETE', key: delConfirm.key, id: delConfirm.id })
      toast('success', 'Deleted.')
      setDelConfirm(null)
    } catch (error) {
      toast('error', error.message || 'Could not delete record.')
    }
  }

  function handleNewCust(payload) {
    setNewCustModal(payload)
    setOrderOpen(false)
  }

  async function finishOrder(order) {
    await dispatch({ type: 'DB_INSERT', key: 'orders', record: order })
    await dispatch({
      type: 'DB_INSERT',
      key: 'cnotifs',
      record: {
        id: uid('N'),
        type: 'approved',
        read: false,
        time: ts(),
        title: `Order ${order.id} placed`,
        message: `New order for ${order.product} for ${order.customer} submitted to Operations.`,
      },
    })
    toast('success', 'Customer registered and order submitted.')
    setNewCustModal(null)
  }

  return (
    <div style={{ animation: 'fadein .3s cubic-bezier(.4,0,.2,1)' }}>
      <PageHeader
        title="Commercial"
        actions={<>
          <NotifBell notifKey="cnotifs" />
          {tab === 'orders' && <Button onClick={() => setOrderOpen(true)}>+ New Order</Button>}
          {tab === 'customers' && <Button onClick={() => setCustOpen(true)}>+ Add Customer</Button>}
          {tab === 'b2b' && <Button onClick={() => setB2bOpen(true)}>+ Add B2B Entry</Button>}
          {tab === 'pricing' && <Button onClick={() => setPriceOpen(true)}>+ Set Price</Button>}
        </>}
      />

      <div className="ibar ib">
        <span>Orders go to <strong>Operations</strong> for credit check before processing. The active order board resets each day, while Order History keeps all previous records.</span>
      </div>

      <Pills tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'orders' && (
        <Card>
          <div className="phd" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <span className="ptl2">Today&apos;s Orders</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--m)' }}>Total Qty: <strong style={{ color: '#0D0F14' }}>{totalTodayQty}</strong></span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => exportRowsAsCsv(
                  'commercial-orders-today',
                  ['Order ID', 'Customer', 'Product', 'Qty', 'Total', 'Placed By', 'Date', 'Status'],
                  todaysOrders.map(order => [order.id, order.customer || '', order.product || '', order.qty || '', order.qty && order.unitPrice ? order.qty * order.unitPrice : '', order.placedBy || '', order.date || '', order.status || '']),
                )}
              >
                Export CSV
              </Button>
            </div>
          </div>
          <div style={{ padding: '0 16px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 12 }}>
              <SummaryTile label="Orders Today" value={todaysOrders.length} note="Active order board" />
              <SummaryTile label="Total Quantity" value={totalTodayQty} note="Across all products" />
              <SummaryTile label="Pending Review" value={pendingToday} note="Awaiting Operations" />
            </div>
            <TrendCard title="Order Trend - Last 7 Days" subtitle="Tracks order count and quantities placed each day." points={orderTrend} unit="qty" />
          </div>
          <CardBody noPad>
            <Table
              columns={['Order ID', 'Customer', 'Product', 'Qty', 'Total', 'Placed By', 'Date', 'Status', '']}
              rows={todaysOrders.map(order => [
                <button type="button" className="detail-action-link" onClick={() => setDetailView({ type: 'order', record: order })}><span style={{ fontSize: 11, color: 'var(--a)', fontFamily: 'monospace' }}>{order.id}</span></button>,
                order.customer || '-',
                order.product || '-',
                order.qty || '-',
                order.qty && order.unitPrice ? money(order.qty * order.unitPrice) : '-',
                <RepBadge name={order.placedBy} colors={REP_COLORS} />,
                order.date || '-',
                <Badge variant={statusVariant(order.status)}>{order.status}</Badge>,
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button variant="secondary" size="sm" onClick={() => setEditOrder(order)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDelConfirm({ key: 'orders', id: order.id })}>Del</Button>
                </div>,
              ])}
              empty="No orders recorded for today yet"
            />
          </CardBody>
        </Card>
      )}

      {tab === 'history' && (
        <Card>
          <div className="phd" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <span className="ptl2">All Orders</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => exportRowsAsCsv(
                  'commercial-order-history',
                  ['Order ID', 'Customer', 'Product', 'Qty', 'Total', 'Placed By', 'Date', 'Status'],
                  db.orders.map(order => [order.id, order.customer || '', order.product || '', order.qty || '', order.qty && order.unitPrice ? order.qty * order.unitPrice : '', order.placedBy || '', order.deliveredAt || order.approvedAt || order.cancelledAt || order.date || '', order.status || '']),
                )}
              >
                Export CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={() => printOrderHistory(filteredHistory)}>Print</Button>
            </div>
          </div>
          <div style={{ padding: '0 16px 14px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={historySearch} onChange={event => setHistorySearch(event.target.value)} placeholder="Search customer, product, order ID..." style={filterInputStyle(true)} />
            <input value={historyDateFilter} onChange={event => setHistoryDateFilter(event.target.value)} type="date" style={filterInputStyle()} />
            {(historySearch || historyDateFilter) && <Button variant="ghost" size="sm" onClick={() => { setHistorySearch(''); setHistoryDateFilter('') }}>Reset</Button>}
          </div>
          <CardBody noPad>
            <Table
              columns={['Order ID', 'Customer', 'Product', 'Qty', 'Total', 'Placed By', 'Date', 'Status', '']}
              rows={filteredHistory.map(order => [
                <button type="button" className="detail-action-link" onClick={() => setDetailView({ type: 'order', record: order })}><span style={{ fontSize: 11, color: 'var(--a)', fontFamily: 'monospace' }}>{order.id}</span></button>,
                order.customer || '-',
                order.product || '-',
                order.qty || '-',
                order.qty && order.unitPrice ? money(order.qty * order.unitPrice) : '-',
                <RepBadge name={order.placedBy} colors={REP_COLORS} />,
                order.deliveredAt || order.approvedAt || order.cancelledAt || order.date || '-',
                <Badge variant={statusVariant(order.status)}>{order.status}</Badge>,
                <Button variant="secondary" size="sm" onClick={() => printSingleOrder(order)}>Print</Button>,
              ])}
              empty="No order history yet"
            />
          </CardBody>
        </Card>
      )}

      {tab === 'customers' && (
        <Card>
          <div className="phd" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              <button className={`pill${customerTypeFilter === 'all' ? ' on' : ''}`} onClick={() => setCustomerTypeFilter('all')}>All</button>
              <button className={`pill${customerTypeFilter === 'Commercial' ? ' on' : ''}`} onClick={() => setCustomerTypeFilter('Commercial')}>Commercial</button>
              <button className={`pill${customerTypeFilter === 'B2B' ? ' on' : ''}`} onClick={() => setCustomerTypeFilter('B2B')}>B2B</button>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportRowsAsCsv(
                'commercial-customers',
                ['ID', 'Name', 'Type', 'Region', 'Contact', 'GPS', 'Account Manager', 'Status'],
                filteredCustomers.map(customer => [customer.id, customer.name || '', customer.type || '', customer.region || '', customer.contact || '', customer.gps || '', customer.rep || '', customer.status || '']),
              )}
            >
              Export CSV
            </Button>
          </div>
          <div style={{ padding: '0 16px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 12 }}>
              <SummaryTile label="Visible Customers" value={filteredCustomers.length} note="Current filter result" />
              <SummaryTile label="New This Month" value={newCustomersThisMonth} note="Created in current month" />
              <SummaryTile label="B2B Customers" value={normalizedCustomers.filter(customer => normalizeCustomerType(customer.type) === 'B2B').length} note="Across all records" />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input value={customerSearch} onChange={event => setCustomerSearch(event.target.value)} placeholder="Search customer, contact, region..." style={filterInputStyle(true)} />
              {customerSearch && <Button variant="ghost" size="sm" onClick={() => setCustomerSearch('')}>Reset</Button>}
            </div>
          </div>
          <CardBody noPad>
            <Table
              columns={['ID', 'Name', 'Type', 'Region', 'Contact', 'GPS', 'Acct Mgr', 'Status', '']}
              rows={filteredCustomers.map(customer => [
                <button type="button" className="detail-action-link" onClick={() => setDetailView({ type: 'customer', record: customer })}><span style={{ fontSize: 11, color: 'var(--m)', fontFamily: 'monospace' }}>{customer.id}</span></button>,
                customer.name || '-',
                normalizeCustomerType(customer.type) || '-',
                customer.region || '-',
                customer.contact || '-',
                customer.gps || '-',
                <RepBadge name={customer.rep} colors={REP_COLORS} />,
                <Badge variant={customer.status === 'Active' ? 'success' : 'neutral'}>{customer.status || 'Active'}</Badge>,
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button variant="secondary" size="sm" onClick={() => setEditCust(customer)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDelConfirm({ key: 'customers', id: customer.id })}>Del</Button>
                </div>,
              ])}
              empty="No customers yet"
            />
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--b)', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--m)' }}>
              <span>Total customers shown: <strong style={{ color: '#0D0F14' }}>{filteredCustomers.length}</strong></span>
              <span>New this month: <strong style={{ color: 'var(--g)' }}>{newCustomersThisMonth}</strong></span>
            </div>
          </CardBody>
        </Card>
      )}

      {tab === 'b2b' && (
        <Card>
          <div className="phd" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="ptl2">B2B Register</span>
              <input value={b2bDateFilter} onChange={event => setB2bDateFilter(event.target.value)} type="date" style={{ minWidth: 180, border: '1.5px solid var(--b)', borderRadius: 7, padding: '7px 10px', fontSize: 13, outline: 'none' }} />
              {b2bDateFilter && <Button variant="ghost" size="sm" onClick={() => setB2bDateFilter('')}>Reset</Button>}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportRowsAsCsv(
                'commercial-b2b',
                ['Date', 'Customer', 'Volume', 'BDC', 'Depot', 'Order Number', 'Vehicle Number', 'Price', 'Total Cost', 'Volume in Transit'],
                filteredB2b.map(entry => [entry.date || '', entry.customerName || '', entry.volume || '', entry.bdc || '', entry.depot || '', entry.orderNumber || '', entry.vehicleNumber || '', entry.price || '', entry.totalCost || Number(entry.price || 0) * Number(entry.volume || 0), entry.volumeInTransit || '']),
              )}
            >
              Export CSV
            </Button>
          </div>
          <div style={{ padding: '0 16px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 12 }}>
              <SummaryTile label="Entries Shown" value={filteredB2b.length} note="Current B2B filter" />
              <SummaryTile label="Total Volume" value={b2bVolumeToday} note={b2bDateFilter ? `For ${b2bDateFilter}` : 'Visible entries'} />
            </div>
            <TrendCard title="B2B Volume Trend - Last 7 Days" subtitle="Daily B2B volume movement." points={b2bTrend} unit="kg" />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
              <input value={b2bSearch} onChange={event => setB2bSearch(event.target.value)} placeholder="Search customer, BDC, depot, vehicle..." style={filterInputStyle(true)} />
              {b2bSearch && <Button variant="ghost" size="sm" onClick={() => setB2bSearch('')}>Reset</Button>}
            </div>
          </div>
          <CardBody noPad>
            <Table
              columns={['Date', 'Customer', 'Volume', 'BDC', 'Depot', 'Order Number', 'Vehicle Number', 'Price', 'Total Cost', 'Transit', '']}
              rows={filteredB2b.map(entry => [
                <button type="button" className="detail-action-link" onClick={() => setDetailView({ type: 'b2b', record: entry })}>{entry.date || '-'}</button>,
                entry.customerName || '-',
                entry.volume || '-',
                entry.bdc || '-',
                entry.depot || '-',
                entry.orderNumber || '-',
                entry.vehicleNumber || '-',
                entry.price ? money(entry.price) : '-',
                entry.totalCost ? money(entry.totalCost) : money(Number(entry.price || 0) * Number(entry.volume || 0)),
                entry.volumeInTransit || '-',
                <Button variant="ghost" size="sm" onClick={() => setDelConfirm({ key: 'b2b', id: entry.id })}>Del</Button>,
              ])}
              empty="No B2B entries yet"
            />
          </CardBody>
        </Card>
      )}

      {tab === 'pricing' && (
        <Card>
          <div className="phd" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <span className="ptl2">Price List</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportRowsAsCsv(
                'commercial-pricing',
                ['ID', 'Product', 'Category', 'Unit', 'Price', 'Updated'],
                db.prices.map(price => [price.id, price.product || '', price.category || '', price.unit || '', price.price || '', price.updatedAt || '']),
              )}
            >
              Export CSV
            </Button>
          </div>
          <CardBody noPad>
            <Table
              columns={['ID', 'Product', 'Category', 'Unit', 'Price (GHs)', 'Updated', '']}
              rows={db.prices.map(price => [
                <button type="button" className="detail-action-link" onClick={() => setDetailView({ type: 'price', record: price })}><span style={{ fontSize: 11, color: 'var(--m)', fontFamily: 'monospace' }}>{price.id}</span></button>,
                price.product || '-',
                price.category || '-',
                price.unit || '-',
                price.price ? Number(price.price).toLocaleString() : '-',
                price.updatedAt || '-',
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button variant="secondary" size="sm" onClick={() => setEditPrice(price)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDelConfirm({ key: 'prices', id: price.id })}>Del</Button>
                </div>,
              ])}
              empty="No pricing records yet"
            />
          </CardBody>
        </Card>
      )}

      <OrderDrawer open={orderOpen} onClose={() => setOrderOpen(false)} db={db} exchangePoints={state.exchangePoints} dispatch={dispatch} toast={toast} onNewCust={handleNewCust} session={session} />
      {editOrder && <EditOrderDrawer order={editOrder} onClose={() => setEditOrder(null)} dispatch={dispatch} toast={toast} />}
      <CustomerDrawer open={custOpen} onClose={() => setCustOpen(false)} dispatch={dispatch} toast={toast} />
      {editCust && <EditCustomerDrawer cust={editCust} onClose={() => setEditCust(null)} dispatch={dispatch} toast={toast} />}
      <B2BDrawer open={b2bOpen} onClose={() => setB2bOpen(false)} dispatch={dispatch} toast={toast} customers={db.customers} />
      <PriceDrawer open={priceOpen} onClose={() => setPriceOpen(false)} dispatch={dispatch} toast={toast} />
      {editPrice && <EditPriceDrawer price={editPrice} onClose={() => setEditPrice(null)} dispatch={dispatch} toast={toast} />}
      <CommercialDetailModal detailView={detailView} onClose={() => setDetailView(null)} />

      {newCustModal && (
        <NewCustomerModal
          custName={newCustModal.custName}
          onCancel={() => { setNewCustModal(null); setOrderOpen(true) }}
          onSave={async customerRecord => {
            try {
              const createdCustomer = await dispatch({ type: 'DB_INSERT', key: 'customers', record: customerRecord })
              await finishOrder({
                ...newCustModal.pendingOrder,
                customerId: createdCustomer.id,
                customer: createdCustomer.name,
              })
            } catch (error) {
              toast('error', error.message || 'Could not register customer.')
            }
          }}
        />
      )}

      <ConfirmModal open={!!delConfirm} onClose={() => setDelConfirm(null)} onConfirm={doDelete} title="Confirm Delete" message="This record will be permanently deleted." />
    </div>
  )
}

function CommercialDetailModal({ detailView, onClose }) {
  if (!detailView) return null
  const { type, record } = detailView

  if (type === 'order') {
    const summary = summarizeCommercialExchange(record.exchangeBreakdown || [])
    return (
      <DetailModal open onClose={onClose} title={`Order ${record.id}`} subtitle={`${record.customer || 'Unknown customer'} · ${record.status || 'Awaiting Ops Review'}`}>
        <div className="detail-grid">
          {[
            ['Customer', record.customer || '—'],
            ['Channel', record.channel || 'Commercial'],
            ['Placed By', record.placedBy || '—'],
            ['Product', record.product || '—'],
            ['Quantity', record.qty || '—'],
            ['Unit Price', record.unitPrice ? money(record.unitPrice) : '—'],
            ['Date', record.date || '—'],
            ['Delivery Date', record.deliveryDate || '—'],
            ['Order Total', record.qty && record.unitPrice ? money(Number(record.qty) * Number(record.unitPrice)) : '—'],
          ].map(([label, value]) => <CommercialDetailItem key={label} label={label} value={value} />)}
        </div>
        {summary.points.length > 0 && (
          <>
            <CommercialDetailSection title="Exchange Points">
              <div className="detail-list">
                {summary.points.map((point, index) => (
                  <div key={index} className="detail-card">
                    <div className="detail-value">{point.exchangePointName || 'Unnamed exchange point'}</div>
                    <div style={{ marginTop: 8, display:'flex', gap:8, flexWrap:'wrap' }}>
                      {(point.items || []).map((item, itemIndex) => <span key={itemIndex} className="detail-chip">{item.type} · {item.qty}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </CommercialDetailSection>
            <CommercialDetailSection title="Totals by Cylinder Size">
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {summary.totals.map(item => <span key={item.type} className="detail-chip">{item.type} · {item.qty}</span>)}
              </div>
            </CommercialDetailSection>
          </>
        )}
        {record.notes && <CommercialDetailSection title="Notes"><div className="detail-value" style={{ fontWeight:600 }}>{record.notes}</div></CommercialDetailSection>}
      </DetailModal>
    )
  }

  if (type === 'customer') {
    return (
      <DetailModal open onClose={onClose} title={record.name || record.id} subtitle={`${record.type || 'Customer'} · ${record.region || 'No region'}`} size="sm">
        <div className="detail-grid">
          {[
            ['Customer ID', record.id || '—'],
            ['Type', record.type || '—'],
            ['Region', record.region || '—'],
            ['Contact', record.contact || '—'],
            ['GPS', record.gps || '—'],
            ['Account Manager', record.rep || '—'],
            ['Status', record.status || 'Active'],
          ].map(([label, value]) => <CommercialDetailItem key={label} label={label} value={value} />)}
        </div>
      </DetailModal>
    )
  }

  if (type === 'b2b') {
    return (
      <DetailModal open onClose={onClose} title={`B2B ${record.orderNumber || record.id}`} subtitle={`${record.customerName || 'Unknown customer'} · ${record.date || '—'}`}>
        <div className="detail-grid">
          {[
            ['Customer', record.customerName || '—'],
            ['Date', record.date || '—'],
            ['Volume', record.volume || '—'],
            ['BDC', record.bdc || '—'],
            ['Depot', record.depot || '—'],
            ['Vehicle Number', record.vehicleNumber || '—'],
            ['Price', record.price ? money(record.price) : '—'],
            ['Total Cost', money(record.totalCost || Number(record.price || 0) * Number(record.volume || 0))],
            ['Volume in Transit', record.volumeInTransit || '—'],
          ].map(([label, value]) => <CommercialDetailItem key={label} label={label} value={value} />)}
        </div>
      </DetailModal>
    )
  }

  if (type === 'price') {
    return (
      <DetailModal open onClose={onClose} title={record.product || record.id} subtitle={`${record.category || 'Price record'} · ${record.unit || 'No unit'}`} size="sm">
        <div className="detail-grid">
          {[
            ['Price ID', record.id || '—'],
            ['Product', record.product || '—'],
            ['Category', record.category || '—'],
            ['Unit', record.unit || '—'],
            ['Price', record.price ? money(record.price) : '—'],
            ['Updated', record.updatedAt || '—'],
          ].map(([label, value]) => <CommercialDetailItem key={label} label={label} value={value} />)}
        </div>
      </DetailModal>
    )
  }

  return null
}

function summarizeCommercialExchange(rows = []) {
  const totals = new Map()
  rows.forEach(point => {
    ;(point.items || []).forEach(item => {
      const key = item.type || 'Unknown'
      totals.set(key, (totals.get(key) || 0) + Number(item.qty || 0))
    })
  })
  return { points: rows, totals: Array.from(totals.entries()).map(([type, qty]) => ({ type, qty })) }
}

function CommercialDetailSection({ title, children }) {
  return (
    <div className="detail-section">
      <div className="detail-section-head"><div className="detail-section-title">{title}</div></div>
      <div className="detail-section-body">{children}</div>
    </div>
  )
}

function CommercialDetailItem({ label, value }) {
  return (
    <div className="detail-card">
      <div className="detail-label">{label}</div>
      <div className="detail-value">{value}</div>
    </div>
  )
}

function OrderDrawer({ open, onClose, db, exchangePoints, dispatch, toast, onNewCust, session }) {
  const autoRep = session?.role === 'sales_rep' ? session?.name : session?.name || ''
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({ defaultValues: { placedBy: autoRep, deliveryDate: today(), channel: 'Commercial' } })
  const [exchangeAllocations, setExchangeAllocations] = useState([])
  const productValue = watch('product')
  const channelValue = watch('channel', 'Commercial')
  const customerValue = watch('customer', '')
  const customerName = (customerValue || '').trim().toUpperCase()
  const customerExists = db.customers.some(customer => customer.name?.trim().toUpperCase() === customerName)
  const owed = customerName ? owedBalance(customerName, db.invoices) : 0

  function resetOrderForm() {
    reset({ placedBy: autoRep, deliveryDate: today(), channel: 'Commercial' })
    setExchangeAllocations([])
  }

  function addExchangeAllocation() {
    setExchangeAllocations(current => [
      ...current,
      { id: uid('XPT'), exchangePointId: '', items: [{ id: uid('XIT'), product: '', qty: 1 }] },
    ])
  }

  function updateExchangeAllocation(id, patch) {
    setExchangeAllocations(current => current.map(entry => entry.id === id ? { ...entry, ...patch } : entry))
  }

  function removeExchangeAllocation(id) {
    setExchangeAllocations(current => current.filter(entry => entry.id !== id))
  }

  function addExchangeItem(id) {
    setExchangeAllocations(current => current.map(entry => (
      entry.id === id
        ? { ...entry, items: [...entry.items, { id: uid('XIT'), product: '', qty: 1 }] }
        : entry
    )))
  }

  function updateExchangeItem(allocationId, itemId, patch) {
    setExchangeAllocations(current => current.map(entry => (
      entry.id === allocationId
        ? { ...entry, items: entry.items.map(item => item.id === itemId ? { ...item, ...patch } : item) }
        : entry
    )))
  }

  function removeExchangeItem(allocationId, itemId) {
    setExchangeAllocations(current => current.map(entry => (
      entry.id === allocationId
        ? { ...entry, items: entry.items.filter(item => item.id !== itemId) }
        : entry
    )))
  }

  async function onSubmit(data) {
    const channel = data.channel || 'Commercial'
    const customer = channel === 'Exchange Point' ? 'EXCHANGE POINT ORDERS' : (data.customer || '').trim().toUpperCase()
    const product = data.product === 'custom' ? (data.customProduct || '').trim().toUpperCase() : data.product
    if (channel === 'Commercial' && !customer) {
      toast('error', 'Customer is required.')
      return
    }

    let exchangeBreakdown = []
    let resolvedProduct = product
    let resolvedQty = data.qty ? Number(data.qty) : null
    let resolvedUnitPrice = data.unitPrice ? Number(data.unitPrice) : null

    if (channel === 'Exchange Point') {
      const cleaned = exchangeAllocations
        .map(entry => {
          const point = exchangePoints.find(item => item.id === entry.exchangePointId)
          return {
            exchangePointId: entry.exchangePointId,
            exchangePointName: point?.name || '',
            items: (entry.items || [])
              .map(item => ({ type: item.product, qty: Number(item.qty || 0) }))
              .filter(item => item.type && item.qty > 0),
          }
        })
        .filter(entry => entry.exchangePointId && entry.items.length)

      if (!cleaned.length) {
        toast('error', 'Select at least one exchange point and add items for it.')
        return
      }

      exchangeBreakdown = cleaned
      resolvedProduct = 'EXCHANGE POINT ORDER'
      resolvedQty = cleaned.reduce((sum, entry) => sum + entry.items.reduce((itemSum, item) => itemSum + Number(item.qty || 0), 0), 0)
      resolvedUnitPrice = null
    } else if (!resolvedProduct) {
      toast('error', 'Product is required.')
      return
    }

    const order = {
      id: uid('SO'),
      status: 'Awaiting Ops Review',
      date: today(),
      channel,
      customer,
      product: resolvedProduct,
      qty: resolvedQty,
      unitPrice: resolvedUnitPrice,
      placedBy: data.placedBy || null,
      deliveryDate: data.deliveryDate || null,
      notes: data.notes || null,
      exchangeBreakdown,
    }

    let existing = db.customers.find(item => item.name?.trim().toUpperCase() === customer)
    if (!existing && channel === 'Exchange Point') {
      try {
        existing = await dispatch({
          type: 'DB_INSERT',
          key: 'customers',
          record: {
            id: uid('C'),
            status: 'Active',
            name: customer,
            type: 'Commercial',
            region: null,
            contact: null,
            gps: null,
            rep: data.placedBy || autoRep || null,
          },
        })
      } catch (error) {
        toast('error', error.message || 'Could not prepare exchange point order.')
        return
      }
    }
    if (!existing) {
      onNewCust({ custName: customer, pendingOrder: order })
      resetOrderForm()
      return
    }

    try {
      await dispatch({ type: 'DB_INSERT', key: 'orders', record: { ...order, customerId: existing.id } })
      await dispatch({
        type: 'DB_INSERT',
        key: 'cnotifs',
        record: {
          id: uid('N'),
          type: 'approved',
          read: false,
          time: ts(),
          title: `Order ${order.id} placed`,
          message: `New order for ${order.product} for ${customer} submitted to Operations.`,
        },
      })
      toast('success', 'Order submitted to Operations.')
      resetOrderForm()
      onClose()
    } catch (error) {
      toast('error', error.message || 'Could not submit order.')
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Place New Order" footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Submit to Operations</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="Placed By">
        {session?.role === 'sales_rep'
          ? <Input value={session?.name || ''} disabled />
          : <Select {...register('placedBy')}><option value="">Select rep...</option>{REPS.map(rep => <option key={rep}>{rep}</option>)}</Select>}
      </Field>
      <Field label="Order Type">
        <Select {...register('channel')}>
          <option value="Commercial">Commercial</option>
          <option value="Exchange Point">Exchange Point</option>
        </Select>
      </Field>
      {channelValue === 'Commercial' ? (
        <>
          <Field label="Customer Name" error={errors.customer?.message} hint={customerName ? customerExists ? 'Customer found in register.' : 'Customer not found yet. You will be prompted to register them.' : undefined}>
            <Input {...register('customer', { required: 'Customer name is required.' })} placeholder="e.g. METRO FAST FOOD" />
          </Field>
          {customerName && customerExists && owed > 0 && (
            <div className="ibar ir">
              <span><strong>{customerName}</strong> currently owes <strong>{money(owed)}</strong>. Operations will see this in review.</span>
            </div>
          )}
        </>
      ) : (
        <div className="ibar ib">
          <span>Exchange point orders use the selected points below, so no customer name is needed for this workflow.</span>
        </div>
      )}
      {channelValue === 'Commercial' ? (
        <>
          <Field label="Product / Cylinder Size">
            <Select {...register('product')}><option value="">Select product...</option>{PRODUCTS.map(product => <option key={product}>{product}</option>)}<option value="custom">Other</option></Select>
          </Field>
          {productValue === 'custom' && <Field label="Specify Product"><Input {...register('customProduct')} placeholder="Type product name" /></Field>}
          <div className="frow">
            <Field label="Quantity"><Input {...register('qty')} type="number" placeholder="0" /></Field>
            <Field label="Unit Price (GHs)"><Input {...register('unitPrice')} type="number" placeholder="0.00" /></Field>
          </div>
        </>
      ) : (
        <div style={{ display: 'grid', gap: 10, marginBottom: 8 }}>
          <div className="ibar ib">
            <span>Select one or more exchange points, then add one or more cylinder items with quantities under each point.</span>
          </div>
          {!exchangeAllocations.length && <div style={emptyInlineStyle}>No exchange point selected yet.</div>}
          {exchangeAllocations.map(allocation => (
            <div key={allocation.id} style={itemBoxStyle}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <label style={miniLabelStyle}>Exchange Point</label>
                  <select value={allocation.exchangePointId} onChange={event => updateExchangeAllocation(allocation.id, { exchangePointId: event.target.value })} style={fieldInputStyle}>
                    <option value="">Select exchange point...</option>
                    {exchangePoints.map(point => <option key={point.id} value={point.id}>{point.name}</option>)}
                  </select>
                </div>
                <button type="button" onClick={() => removeExchangeAllocation(allocation.id)} style={removeButtonStyle}>×</button>
              </div>
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                {allocation.items.map(item => (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr .7fr auto', gap: 8, alignItems: 'end' }}>
                    <div>
                      <label style={miniLabelStyle}>Item</label>
                      <select value={item.product} onChange={event => updateExchangeItem(allocation.id, item.id, { product: event.target.value })} style={fieldInputStyle}>
                        <option value="">Select item...</option>
                        {PRODUCTS.filter(option => option !== 'Bulk LPG' && option !== 'Autogas').map(option => <option key={option}>{option}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={miniLabelStyle}>Qty</label>
                      <input type="number" min="1" value={item.qty} onChange={event => updateExchangeItem(allocation.id, item.id, { qty: event.target.value })} style={fieldInputStyle} />
                    </div>
                    <button type="button" onClick={() => removeExchangeItem(allocation.id, item.id)} style={removeButtonStyle}>×</button>
                  </div>
                ))}
                <Button variant="secondary" size="sm" onClick={() => addExchangeItem(allocation.id)}>+ Add Item</Button>
              </div>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={addExchangeAllocation}>+ Add Exchange Point</Button>
        </div>
      )}
      <Field label="Delivery Date"><Input {...register('deliveryDate')} type="date" /></Field>
      <Field label="Notes / Special Instructions"><Input {...register('notes')} placeholder="Any delivery note or site instruction" /></Field>
    </Drawer>
  )
}

function EditOrderDrawer({ order, onClose, dispatch, toast }) {
  const { register, handleSubmit, watch } = useForm({ defaultValues: { ...order, product: PRODUCTS.includes(order.product) ? order.product : 'custom', customProduct: PRODUCTS.includes(order.product) ? '' : order.product } })
  const productValue = watch('product')

  async function onSubmit(data) {
    try {
      await dispatch({
        type: 'DB_UPDATE',
        key: 'orders',
        id: order.id,
        patch: {
          product: data.product === 'custom' ? (data.customProduct || '').trim().toUpperCase() : data.product,
          qty: data.qty ? Number(data.qty) : null,
          unitPrice: data.unitPrice ? Number(data.unitPrice) : null,
          placedBy: data.placedBy || null,
          deliveryDate: data.deliveryDate || null,
          notes: data.notes || null,
        },
      })
      toast('success', 'Order updated.')
      onClose()
    } catch (error) {
      toast('error', error.message || 'Could not update order.')
    }
  }

  return (
    <Drawer open={!!order} onClose={onClose} title={`Edit Order - ${order.id}`} footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Changes</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="Customer"><Input value={order.customer} disabled /></Field>
      <Field label="Placed By"><Select {...register('placedBy')}><option value="">Select rep...</option>{REPS.map(rep => <option key={rep}>{rep}</option>)}</Select></Field>
      <Field label="Product"><Select {...register('product')}><option value="">Select product...</option>{PRODUCTS.map(product => <option key={product}>{product}</option>)}<option value="custom">Other</option></Select></Field>
      {productValue === 'custom' && <Field label="Specify Product"><Input {...register('customProduct')} /></Field>}
      <div className="frow">
        <Field label="Quantity"><Input {...register('qty')} type="number" /></Field>
        <Field label="Unit Price (GHs)"><Input {...register('unitPrice')} type="number" /></Field>
      </div>
      <Field label="Delivery Date"><Input {...register('deliveryDate')} type="date" /></Field>
      <Field label="Notes"><Input {...register('notes')} /></Field>
    </Drawer>
  )
}

function CustomerDrawer({ open, onClose, dispatch, toast }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues: { status: 'Active', type: 'Commercial' } })

  async function onSubmit(data) {
    try {
      await dispatch({
        type: 'DB_INSERT',
        key: 'customers',
        record: {
          id: uid('C'),
          status: data.status || 'Active',
          name: (data.name || '').trim().toUpperCase(),
          type: data.type,
          region: data.region || null,
          contact: data.contact || null,
          gps: data.gps || null,
          rep: data.rep || null,
        },
      })
      toast('success', 'Customer added.')
      reset({ status: 'Active', type: 'Commercial' })
      onClose()
    } catch (error) {
      toast('error', error.message || 'Could not add customer.')
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add Customer" footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Customer</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="Company / Name" required error={errors.name?.message}><Input {...register('name', { required: 'Required' })} placeholder="e.g. Metro Fast Food" /></Field>
      <div className="frow">
      <Field label="Type"><Select {...register('type')}><option value="">Select...</option>{CUST_TYPES.map(type => <option key={type}>{type}</option>)}</Select></Field>
        <Field label="Region"><Input {...register('region')} placeholder="e.g. Accra North" /></Field>
      </div>
      <Field label="Contact & Phone"><Input {...register('contact')} placeholder="Name and phone" /></Field>
      <Field label="GPS / Digital Address"><Input {...register('gps')} placeholder="e.g. GS-0382-3921" /></Field>
      <Field label="Account Manager"><Select {...register('rep')}><option value="">Select rep...</option>{REPS.map(rep => <option key={rep}>{rep}</option>)}</Select></Field>
      <Field label="Status"><Select {...register('status')}><option>Active</option><option>Inactive</option></Select></Field>
    </Drawer>
  )
}

function EditCustomerDrawer({ cust, onClose, dispatch, toast }) {
  const { register, handleSubmit } = useForm({ defaultValues: cust })

  async function onSubmit(data) {
    try {
      await dispatch({
        type: 'DB_UPDATE',
        key: 'customers',
        id: cust.id,
        patch: {
          name: (data.name || '').trim().toUpperCase(),
          type: data.type || null,
          region: data.region || null,
          contact: data.contact || null,
          gps: data.gps || null,
          rep: data.rep || null,
          status: data.status || 'Active',
        },
      })
      toast('success', 'Customer updated.')
      onClose()
    } catch (error) {
      toast('error', error.message || 'Could not update customer.')
    }
  }

  return (
    <Drawer open={!!cust} onClose={onClose} title={`Edit - ${cust.name}`} footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Changes</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="Company / Name"><Input {...register('name')} /></Field>
      <div className="frow">
      <Field label="Type"><Select {...register('type')}><option value="">Select...</option>{CUST_TYPES.map(type => <option key={type}>{type}</option>)}</Select></Field>
        <Field label="Region"><Input {...register('region')} /></Field>
      </div>
      <Field label="Contact & Phone"><Input {...register('contact')} /></Field>
      <Field label="GPS"><Input {...register('gps')} /></Field>
      <Field label="Account Manager"><Select {...register('rep')}><option value="">Select rep...</option>{REPS.map(rep => <option key={rep}>{rep}</option>)}</Select></Field>
      <Field label="Status"><Select {...register('status')}><option>Active</option><option>Inactive</option></Select></Field>
    </Drawer>
  )
}

function B2BDrawer({ open, onClose, dispatch, toast, customers }) {
  const { register, handleSubmit, reset } = useForm({ defaultValues: { date: today() } })

  async function onSubmit(data) {
    try {
      await dispatch({
        type: 'DB_INSERT',
        key: 'b2b',
        record: {
          id: uid('B2B'),
          date: data.date || today(),
          customerName: (data.customerName || '').trim().toUpperCase(),
          volume: data.volume ? Number(data.volume) : null,
          bdc: data.bdc || null,
          depot: data.depot || null,
          orderNumber: data.orderNumber || null,
          vehicleNumber: data.vehicleNumber || null,
          price: data.price ? Number(data.price) : null,
          volumeInTransit: data.volumeInTransit ? Number(data.volumeInTransit) : null,
        },
      })
      toast('success', 'B2B entry saved.')
      reset({ date: today() })
      onClose()
    } catch (error) {
      toast('error', error.message || 'Could not save B2B entry.')
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add B2B Entry" footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save B2B Entry</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <div className="frow">
        <Field label="Date"><Input {...register('date')} type="date" /></Field>
        <Field label="Customer Name">
          <Input {...register('customerName')} list="b2b-customers" placeholder="Select or type customer name" />
          <datalist id="b2b-customers">{customers.filter(customer => normalizeCustomerType(customer.type) === 'B2B').map(customer => <option key={customer.id} value={customer.name} />)}</datalist>
        </Field>
      </div>
      <div className="frow">
        <Field label="Volume"><Input {...register('volume')} type="number" placeholder="0" /></Field>
        <Field label="BDC"><Input {...register('bdc')} placeholder="BDC" /></Field>
      </div>
      <div className="frow">
        <Field label="Depot"><Input {...register('depot')} placeholder="Depot" /></Field>
        <Field label="Order Number"><Input {...register('orderNumber')} placeholder="Order number" /></Field>
      </div>
      <div className="frow">
        <Field label="Vehicle Number"><Input {...register('vehicleNumber')} placeholder="Vehicle number" /></Field>
        <Field label="Price"><Input {...register('price')} type="number" placeholder="0.00" /></Field>
      </div>
      <Field label="Volume in Transit"><Input {...register('volumeInTransit')} type="number" placeholder="0" /></Field>
    </Drawer>
  )
}

function PriceDrawer({ open, onClose, dispatch, toast }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  async function onSubmit(data) {
    try {
      await dispatch({ type: 'DB_INSERT', key: 'prices', record: { id: uid('PR'), updatedAt: today(), product: data.product, category: data.category, unit: data.unit, price: data.price || null } })
      toast('success', 'Price saved.')
      reset()
      onClose()
    } catch (error) {
      toast('error', error.message || 'Could not save price.')
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Set Price" footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Price</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="Product" error={errors.product?.message}><Input {...register('product', { required: 'Required' })} placeholder="e.g. 50kg Industrial Cylinder" /></Field>
      <Field label="Category"><Select {...register('category')}><option value="">Select...</option>{['Cylinder', 'Bulk LPG', 'Autogas', 'Accessories'].map(category => <option key={category}>{category}</option>)}</Select></Field>
      <Field label="Unit"><Input {...register('unit')} placeholder="e.g. per cylinder" /></Field>
      <Field label="Price (GHs)"><Input {...register('price')} type="number" placeholder="0.00" /></Field>
    </Drawer>
  )
}

function EditPriceDrawer({ price, onClose, dispatch, toast }) {
  const { register, handleSubmit } = useForm({ defaultValues: price })

  async function onSubmit(data) {
    try {
      await dispatch({ type: 'DB_UPDATE', key: 'prices', id: price.id, patch: { product: data.product, category: data.category, unit: data.unit, price: data.price || null, updatedAt: today() } })
      toast('success', 'Price updated.')
      onClose()
    } catch (error) {
      toast('error', error.message || 'Could not update price.')
    }
  }

  return (
    <Drawer open={!!price} onClose={onClose} title={`Edit Price - ${price.product}`} footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Changes</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="Product"><Input {...register('product')} /></Field>
      <Field label="Category"><Select {...register('category')}><option value="">Select...</option>{['Cylinder', 'Bulk LPG', 'Autogas', 'Accessories'].map(category => <option key={category}>{category}</option>)}</Select></Field>
      <Field label="Unit"><Input {...register('unit')} /></Field>
      <Field label="Price (GHs)"><Input {...register('price')} type="number" /></Field>
    </Drawer>
  )
}

function NewCustomerModal({ custName, onCancel, onSave }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: { name: custName, type: 'Commercial', status: 'Active' } })

  function onSubmit(data) {
    onSave({
      id: uid('C'),
      status: data.status || 'Active',
      name: (data.name || '').trim().toUpperCase(),
      type: data.type,
      region: data.region || null,
      contact: data.contact || null,
      gps: data.gps || null,
      rep: data.rep || null,
    })
  }

  return (
    <Modal open onClose={onCancel}>
      <div style={{ padding: 22 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Register Customer to Continue</div>
        <div style={{ fontSize: 12, color: 'var(--m)', marginBottom: 16 }}>This customer is not yet in the register. Add them now and the order will continue automatically.</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <Field label="Company / Name" error={errors.name?.message}><Input {...register('name', { required: 'Required' })} /></Field>
          <div className="frow">
            <Field label="Type"><Select {...register('type')}><option value="">Select...</option>{CUST_TYPES.map(type => <option key={type}>{type}</option>)}</Select></Field>
            <Field label="Region"><Input {...register('region')} /></Field>
          </div>
          <Field label="Contact & Phone"><Input {...register('contact')} /></Field>
          <Field label="GPS / Digital Address"><Input {...register('gps')} /></Field>
          <Field label="Account Manager"><Select {...register('rep')}><option value="">Select rep...</option>{REPS.map(rep => <option key={rep}>{rep}</option>)}</Select></Field>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)}>Register and Submit Order</Button>
        </div>
      </div>
    </Modal>
  )
}

function printOrderHistory(orders) {
  const rows = orders.map(order => `
    <tr>
      <td>${order.id}</td>
      <td>${order.customer || '-'}</td>
      <td>${order.product || '-'}</td>
      <td>${order.qty || '-'}</td>
      <td>${order.qty && order.unitPrice ? money(order.qty * order.unitPrice) : '-'}</td>
      <td>${order.placedBy || '-'}</td>
      <td>${order.deliveredAt || order.approvedAt || order.cancelledAt || order.date || '-'}</td>
      <td>${order.status || '-'}</td>
    </tr>
  `).join('')
  const win = window.open('', '_blank', 'width=900,height=700')
  win.document.write(`<!doctype html><html><head><meta charset="UTF-8"><title>Order History</title><style>body{font-family:Arial,sans-serif;padding:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #dbeafe;padding:8px 10px;font-size:12px;text-align:left}th{background:#1e3a5f;color:#fff}button{margin-top:18px;padding:10px 22px;background:#1e3a5f;color:#fff;border:none;border-radius:8px;font-weight:700}</style></head><body><h2>Commercial Order History</h2><table><thead><tr><th>Order ID</th><th>Customer</th><th>Product</th><th>Qty</th><th>Total</th><th>Placed By</th><th>Date</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><button onclick="window.print()">Print</button></body></html>`)
  win.document.close()
}

function printSingleOrder(order) {
  const win = window.open('', '_blank', 'width=640,height=520')
  win.document.write(`<!doctype html><html><head><meta charset="UTF-8"><title>${order.id}</title><style>body{font-family:Arial,sans-serif;padding:24px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.box{background:#f8fbff;border:1px solid #dbeafe;border-radius:10px;padding:12px}.label{font-size:10px;text-transform:uppercase;color:#64748b;margin-bottom:4px}.value{font-size:14px;font-weight:700}button{margin-top:18px;padding:10px 22px;background:#1e3a5f;color:#fff;border:none;border-radius:8px;font-weight:700}</style></head><body><h2>Order ${order.id}</h2><div class="grid">${[['Customer', order.customer], ['Product', order.product], ['Qty', order.qty], ['Total', order.qty && order.unitPrice ? money(order.qty * order.unitPrice) : '-'], ['Placed By', order.placedBy], ['Date', order.date], ['Status', order.status], ['Delivery Date', order.deliveryDate || '-']].map(([label, value]) => `<div class="box"><div class="label">${label}</div><div class="value">${value || '-'}</div></div>`).join('')}</div><button onclick="window.print()">Print</button></body></html>`)
  win.document.close()
}

function normalizeCustomerType(type) {
  if (!type || type === 'CRM DTD') return 'Commercial'
  return type
}

function filterInputStyle(flexible = false) {
  return {
    flex: flexible ? 1 : undefined,
    minWidth: 180,
    border: '1.5px solid var(--b)',
    borderRadius: 7,
    padding: '7px 10px',
    fontSize: 13,
    outline: 'none',
  }
}

function SummaryTile({ label, value, note }) {
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--b)', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 10, color: 'var(--m)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0D0F14' }}>{value}</div>
      {note && <div style={{ fontSize: 12, color: 'var(--m)', marginTop: 4 }}>{note}</div>}
    </div>
  )
}

function buildDailyTrend(items, dateSelector, valueSelector, days = 7) {
  const points = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date()
    day.setDate(day.getDate() - offset)
    const key = day.toISOString().slice(0, 10)
    const dayItems = items.filter(item => (dateSelector(item) || '') === key)
    points.push({
      date: key,
      count: dayItems.length,
      value: dayItems.reduce((sum, item) => sum + Number(valueSelector(item) || 0), 0),
    })
  }
  return points
}

function TrendCard({ title, subtitle, points, unit }) {
  const max = Math.max(...points.map(point => point.count || 0), 1)
  const path = points.map((point, index) => {
    const x = points.length === 1 ? 12 : 12 + (index * (276 / (points.length - 1)))
    const y = 88 - ((point.count || 0) / max) * 56
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')

  return (
    <div style={{ background: 'linear-gradient(180deg,#f8fbff,#ffffff)', border: '1px solid var(--b)', borderRadius: 14, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--m)' }}>{subtitle}</div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--m)' }}>Latest total: <strong style={{ color: '#0D0F14' }}>{points.at(-1)?.value || 0} {unit}</strong></div>
      </div>
      <svg viewBox="0 0 300 110" style={{ width: '100%', height: 110 }}>
        <path d="M 12 88 L 288 88" stroke="#dbeafe" strokeWidth="1" fill="none" />
        <path d={path} stroke="#1d4ed8" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => {
          const x = points.length === 1 ? 12 : 12 + (index * (276 / (points.length - 1)))
          const y = 88 - ((point.count || 0) / max) * 56
          return (
            <g key={point.date}>
              <circle cx={x} cy={y} r="4" fill="#1d4ed8" />
              <text x={x} y="104" textAnchor="middle" style={{ fontSize: 9, fill: '#64748b' }}>{point.date.slice(5)}</text>
            </g>
          )
        })}
      </svg>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 8, marginTop: 8 }}>
        {points.map(point => (
          <div key={point.date} style={{ background: '#fff', border: '1px solid var(--b)', borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--m)', marginBottom: 4 }}>{point.date}</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{point.count} orders</div>
            <div style={{ fontSize: 11, color: '#1d4ed8' }}>{point.value} {unit}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const miniLabelStyle = { fontSize: 10, fontWeight: 600, color: 'var(--m)', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 4 }
const emptyInlineStyle = { background: 'var(--bg)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: 'var(--m)', textAlign: 'center' }
const itemBoxStyle = { background: 'var(--bg)', border: '1.5px solid var(--b)', borderRadius: 8, padding: '10px 12px' }
const fieldInputStyle = { width: '100%', border: '1.5px solid var(--b)', borderRadius: 7, padding: '7px 9px', fontSize: 13, outline: 'none', background: '#fff' }
const removeButtonStyle = { marginTop: 18, background: 'none', border: 'none', color: 'var(--r)', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '4px 6px' }
