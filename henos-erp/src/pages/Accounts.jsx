import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useApp } from '../context/AppContext'
import { useToast } from '../hooks/useToast'
import { exportRowsAsCsv } from '../utils/csv'
import { uid, today, money, REP_COLORS } from '../utils/helpers'
import { PageHeader, Pills, Card, CardBody, CardHeader, Table, Badge, RepBadge, Button, Drawer, Field, Input, Select, NotifBell, EmptyState, ConfirmModal, KpiCard } from '../components/ui'

const CYL_ITEMS = ['50KG Cylinder', '14.5KG Cylinder', '12.5KG Cylinder', '6KG Cylinder', '3KG Cylinder', 'Autogas', 'Bulk LPG']
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'MoMo', 'POS', 'Other']
const EXPENSE_STATUSES = ['Pending Approval', 'Approved', 'Rejected', 'Paid']

export default function Accounts() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const { db } = state
  const [tab, setTab] = useState('invoices')
  const [invOpen, setInvOpen] = useState(false)
  const [expOpen, setExpOpen] = useState(false)
  const [editInv, setEditInv] = useState(null)
  const [editExp, setEditExp] = useState(null)
  const [payInv, setPayInv] = useState(null)
  const [delConfirm, setDelConfirm] = useState(null)
  const [invFilter, setInvFilter] = useState('')
  const [invDateFilter, setInvDateFilter] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [expenseSearch, setExpenseSearch] = useState('')
  const [paymentSearch, setPaymentSearch] = useState('')
  const [balanceSearch, setBalanceSearch] = useState('')
  const [statementCustomer, setStatementCustomer] = useState('')
  const [statementSearch, setStatementSearch] = useState('')

  const invoices = db.invoices || []
  const expenses = db.expenses || []
  const customers = db.customers || []
  const payments = db.payments || []
  const unreadA = (db.anotifs || []).filter(n => !n.read).length

  const paidInvoiceTotal = invoices.filter(i => i.status === 'Paid').reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0)
  const outstandingTotal = invoices.reduce((sum, invoice) => sum + getInvoiceBalance(invoice), 0)
  const approvedExpenseTotal = expenses.filter(expense => expense.status === 'Approved' || expense.status === 'Paid' || expense.approved).reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
  const paymentTotal = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)

  const filteredInvoices = useMemo(() => invoices.filter(invoice => {
    const customerMatches = !invFilter || invoice.customer?.toLowerCase().includes(invFilter.toLowerCase()) || invoice.id?.toLowerCase().includes(invFilter.toLowerCase())
    const invoiceDay = invoice.date || invoice.createdAt?.slice?.(0, 10) || ''
    const dateMatches = !invDateFilter || invoiceDay === invDateFilter
    return customerMatches && dateMatches
  }), [invDateFilter, invFilter, invoices])

  const filteredCustomers = useMemo(() => customers.filter(customer =>
    !customerSearch || [customer.name, customer.type, customer.region, customer.contact, customer.rep]
      .some(value => String(value || '').toLowerCase().includes(customerSearch.toLowerCase()))
  ), [customerSearch, customers])

  const filteredExpenses = useMemo(() => expenses.filter(expense =>
    !expenseSearch || [expense.id, expense.category, expense.description, expense.date, expense.status]
      .some(value => String(value || '').toLowerCase().includes(expenseSearch.toLowerCase()))
  ), [expenseSearch, expenses])

  const filteredPayments = useMemo(() => payments.filter(payment =>
    !paymentSearch || [payment.receiptNo, payment.customer, payment.invoiceId, payment.method, payment.reference, payment.recordedByName]
      .some(value => String(value || '').toLowerCase().includes(paymentSearch.toLowerCase()))
  ), [paymentSearch, payments])

  const statementOptions = useMemo(() => customers.map(customer => customer.name).filter(Boolean).sort((a, b) => a.localeCompare(b)), [customers])
  const selectedStatementCustomer = statementCustomer || statementOptions[0] || ''

  const statements = useMemo(() => buildCustomerStatement(selectedStatementCustomer, invoices, payments), [invoices, payments, selectedStatementCustomer])
  const agingRows = useMemo(() => buildAgingRows(invoices), [invoices])

  async function doDelete() {
    try {
      await dispatch({ type: 'DB_DELETE', key: delConfirm.key, id: delConfirm.id })
      toast('success', 'Deleted.')
      setDelConfirm(null)
    } catch (error) {
      toast('error', error.message || 'Could not delete record.')
    }
  }

  function applyStatementSearch() {
    const query = String(statementSearch || '').trim()
    if (!query) {
      setStatementCustomer(statementOptions[0] || '')
      return
    }
    const match = statementOptions.find(option => option.toLowerCase().includes(query.toLowerCase()))
    if (!match) {
      toast('error', `Customer "${query}" was not found.`)
      return
    }
    setStatementCustomer(match)
  }

  return (
    <div style={{ animation: 'fadein .3s cubic-bezier(.4,0,.2,1)' }}>
      <PageHeader title="Accounts" actions={<>
        <NotifBell notifKey="anotifs" />
        {(tab === 'invoices' || tab === 'statements') && <Button onClick={() => setInvOpen(true)}>+ New Invoice</Button>}
        {tab === 'expenses' && <Button onClick={() => setExpOpen(true)}>+ Log Expense</Button>}
      </>} />

      {unreadA > 0 && (
        <div className="ibar ib">
          <span><strong>{unreadA}</strong> new auto-invoice{unreadA > 1 ? 's' : ''} from delivered orders. Record payments and follow up overdue balances below.</span>
        </div>
      )}

      <div className="krow">
        <KpiCard label="Payments Received" value={paymentTotal ? money(paymentTotal) : '—'} note="Payment register" valueStyle={{ color: 'var(--g)' }} />
        <KpiCard label="Outstanding" value={outstandingTotal ? money(outstandingTotal) : '—'} note="Unpaid / partial" valueStyle={{ color: outstandingTotal ? 'var(--r)' : 'var(--m)' }} />
        <KpiCard label="Approved Expenses" value={approvedExpenseTotal ? money(approvedExpenseTotal) : '—'} note="Approved or paid" valueStyle={{ color: 'var(--am)' }} />
        <KpiCard label="Paid Invoices" value={paidInvoiceTotal ? money(paidInvoiceTotal) : '—'} note="Closed invoices" />
      </div>

      <Pills
        tabs={[
          { id: 'invoices', label: 'Invoices' },
          { id: 'payments', label: 'Payments' },
          { id: 'statements', label: 'Statements' },
          { id: 'aging', label: 'Aging' },
          { id: 'customers', label: 'Customers' },
          { id: 'expenses', label: 'Expenses' },
          { id: 'balances', label: 'Balances' },
          { id: 'pl', label: 'P&L' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'invoices' && (
        <>
          <Toolbar
            value={invFilter}
            onChange={setInvFilter}
            placeholder="Search customer or invoice..."
            dateValue={invDateFilter}
            onDateChange={setInvDateFilter}
            onReset={() => { setInvFilter(''); setInvDateFilter('') }}
            showReset={!!(invFilter || invDateFilter)}
            actions={<Button variant="secondary" size="sm" onClick={() => exportRowsAsCsv('accounts-invoices', ['Invoice #', 'Customer', 'Rep', 'Amount', 'Paid', 'Balance', 'Delivery', 'Due', 'Status'], filteredInvoices.map(invoice => [invoice.id, invoice.customer || '', invoice.repName || '', invoice.amount || '', invoice.amountPaid || '', getInvoiceBalance(invoice), invoice.deliveryDate || '', invoice.dueDate || '', invoice.status || '']))}>Export CSV</Button>}
          />
          <Card><CardBody noPad>
            <Table
              columns={['Invoice #', 'Customer', 'Rep', 'Amount', 'Paid', 'Balance', 'Delivery', 'Due', 'Status', '']}
              rows={filteredInvoices.map(invoice => [
                <span style={monoStyle}>{invoice.id}</span>,
                invoice.customer || '—',
                <RepBadge name={invoice.repName} colors={REP_COLORS} />,
                money(invoice.amount || 0),
                <span style={{ color: 'var(--g)', fontWeight: 700 }}>{money(invoice.amountPaid || 0)}</span>,
                <span style={{ color: getInvoiceBalance(invoice) ? 'var(--r)' : 'var(--g)', fontWeight: 800 }}>{money(getInvoiceBalance(invoice))}</span>,
                invoice.deliveryDate || '—',
                invoice.dueDate || '—',
                <Badge variant={invoiceStatusVariant(invoice.status, getInvoiceBalance(invoice), invoice.dueDate)}>{invoiceStatusLabel(invoice)}</Badge>,
                <div style={{ display: 'flex', gap: 4 }}>
                  {getInvoiceBalance(invoice) > 0 && <Button variant="success" size="sm" onClick={() => setPayInv(invoice)}>Pay</Button>}
                  <Button variant="secondary" size="sm" onClick={() => printInvoice(invoice)}>Print</Button>
                  <Button variant="secondary" size="sm" onClick={() => setEditInv(invoice)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDelConfirm({ key: 'invoices', id: invoice.id })}>Del</Button>
                </div>,
              ])}
            />
          </CardBody></Card>
        </>
      )}

      {tab === 'payments' && (
        <>
          <Toolbar
            value={paymentSearch}
            onChange={setPaymentSearch}
            placeholder="Search receipt, customer, invoice..."
            showReset={!!paymentSearch}
            onReset={() => setPaymentSearch('')}
            actions={<Button variant="secondary" size="sm" onClick={() => exportRowsAsCsv('accounts-payments', ['Receipt', 'Date', 'Customer', 'Invoice', 'Amount', 'Method', 'Reference', 'Recorded By'], filteredPayments.map(payment => [payment.receiptNo || '', payment.date || '', payment.customer || '', payment.invoiceId || '', payment.amount || '', payment.method || '', payment.reference || '', payment.recordedByName || '']))}>Export CSV</Button>}
          />
          <Card><CardBody noPad>
            <Table
              columns={['Receipt', 'Date', 'Customer', 'Invoice', 'Amount', 'Method', 'Reference', 'Recorded By', '']}
              rows={filteredPayments.map(payment => [
                <span style={monoStyle}>{payment.receiptNo || '—'}</span>,
                payment.date || '—',
                payment.customer || '—',
                <span style={monoStyle}>{payment.invoiceId || '—'}</span>,
                <span style={{ color: 'var(--g)', fontWeight: 800 }}>{money(payment.amount || 0)}</span>,
                payment.method || '—',
                payment.reference || '—',
                payment.recordedByName || '—',
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button variant="secondary" size="sm" onClick={() => printPaymentReceipt(payment, invoices.find(invoice => invoice.id === payment.invoiceId))}>Receipt</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDelConfirm({ key: 'payments', id: payment.id })}>Del</Button>
                </div>,
              ])}
              empty="No payments recorded yet"
            />
          </CardBody></Card>
        </>
      )}

      {tab === 'statements' && (
        <CustomerStatementView
          customers={statementOptions}
          customer={selectedStatementCustomer}
          search={statementSearch}
          onSearchChange={setStatementSearch}
          onApplySearch={applyStatementSearch}
          statement={statements}
          onPrint={() => printCustomerStatement(statements)}
        />
      )}

      {tab === 'aging' && (
        <AgingView rows={agingRows} onExport={() => exportRowsAsCsv('accounts-aging', ['Customer', 'Current', '0-30', '31-60', '61-90', '90+'], agingRows.map(row => [row.customer, row.current, row.bucket30, row.bucket60, row.bucket90, row.bucket90Plus]))} />
      )}

      {tab === 'customers' && (
        <Card><CardBody noPad>
          <Toolbar
            value={customerSearch}
            onChange={setCustomerSearch}
            placeholder="Search customer, type, region..."
            showReset={!!customerSearch}
            onReset={() => setCustomerSearch('')}
            actions={<Button variant="secondary" size="sm" onClick={() => exportRowsAsCsv('accounts-customers', ['ID', 'Name', 'Type', 'Region', 'Contact', 'GPS', 'Account Manager', 'Status'], filteredCustomers.map(customer => [customer.id, customer.name || '', customer.type || '', customer.region || '', customer.contact || '', customer.gps || '', customer.rep || '', customer.status || '']))}>Export CSV</Button>}
          />
          <Table
            columns={['ID', 'Name', 'Type', 'Region', 'Contact', 'GPS', 'Acct Mgr', 'Status']}
            rows={filteredCustomers.map(customer => [
              <span style={monoStyle}>{customer.id}</span>,
              customer.name || '—',
              customer.type || '—',
              customer.region || '—',
              customer.contact || '—',
              customer.gps || '—',
              <RepBadge name={customer.rep} colors={REP_COLORS} />,
              <Badge variant={customer.status === 'Active' ? 'success' : 'neutral'}>{customer.status || 'Active'}</Badge>,
            ])}
            empty="No customers available yet"
          />
        </CardBody></Card>
      )}

      {tab === 'expenses' && (
        <Card><CardBody noPad>
          <Toolbar
            value={expenseSearch}
            onChange={setExpenseSearch}
            placeholder="Search expense, category, status..."
            showReset={!!expenseSearch}
            onReset={() => setExpenseSearch('')}
            actions={<>
              <Button variant="secondary" size="sm" onClick={() => exportRowsAsCsv('accounts-expenses', ['ID', 'Category', 'Description', 'Amount', 'Date', 'Status'], filteredExpenses.map(expense => [expense.id, expense.category || '', expense.description || '', expense.amount || '', expense.date || '', expense.status || '']))}>Export CSV</Button>
              <Button variant="secondary" size="sm" onClick={() => printExpenses(filteredExpenses)}>Print</Button>
            </>}
          />
          <Table
            columns={['ID', 'Category', 'Description', 'Amount', 'Date', 'Status', '']}
            rows={filteredExpenses.map(expense => [
              <span style={monoStyle}>{expense.id}</span>,
              expense.category || '—',
              expense.description || '—',
              money(expense.amount || 0),
              expense.date || '—',
              <Badge variant={expenseStatusVariant(expense.status)}>{expense.status || 'Pending Approval'}</Badge>,
              <div style={{ display: 'flex', gap: 4 }}>
                <Button variant="secondary" size="sm" onClick={() => setEditExp(expense)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => setDelConfirm({ key: 'expenses', id: expense.id })}>Del</Button>
              </div>,
            ])}
          />
        </CardBody></Card>
      )}

      {tab === 'balances' && <BalanceSummary invoices={invoices} search={balanceSearch} onSearchChange={setBalanceSearch} onPrint={() => printBalances(invoices, balanceSearch)} onExport={() => exportBalanceCsv(invoices, balanceSearch)} />}
      {tab === 'pl' && <PLView invoices={invoices} expenses={expenses} payments={payments} />}

      <InvoiceDrawer open={invOpen} onClose={() => setInvOpen(false)} db={db} dispatch={dispatch} toast={toast} />
      {editInv && <EditInvoiceDrawer inv={editInv} onClose={() => setEditInv(null)} dispatch={dispatch} toast={toast} />}
      <ExpenseDrawer open={expOpen} onClose={() => setExpOpen(false)} dispatch={dispatch} toast={toast} />
      {editExp && <EditExpenseDrawer exp={editExp} onClose={() => setEditExp(null)} dispatch={dispatch} toast={toast} />}
      {payInv && <PayModal inv={payInv} onClose={() => setPayInv(null)} dispatch={dispatch} toast={toast} />}
      <ConfirmModal open={!!delConfirm} onClose={() => setDelConfirm(null)} onConfirm={doDelete} title="Confirm Delete" message="This record will be permanently deleted." />
    </div>
  )
}

function Toolbar({ value, onChange, placeholder, dateValue, onDateChange, showReset, onReset, actions }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
      <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} style={searchStyle} />
      {onDateChange && <input value={dateValue} onChange={event => onDateChange(event.target.value)} type="date" style={searchStyle} />}
      {showReset && <Button variant="ghost" size="sm" onClick={onReset}>Reset</Button>}
      {actions}
    </div>
  )
}

function CustomerStatementView({ customers, customer, search, onSearchChange, onApplySearch, statement, onPrint }) {
  if (!customers.length) return <EmptyState icon="ST" message="No customers available for statements" />
  return (
    <Card>
      <CardHeader
        title="Customer Statement"
        actions={<>
          <input value={search} onChange={event => onSearchChange(event.target.value)} list="statement-customers" placeholder="Search customer..." style={searchStyle} />
          <datalist id="statement-customers">{customers.map(option => <option key={option} value={option} />)}</datalist>
          <Button variant="secondary" size="sm" onClick={onApplySearch}>Load Statement</Button>
          <Button variant="secondary" size="sm" onClick={onPrint}>Print Statement</Button>
        </>}
      />
      <CardBody>
        <div className="krow" style={{ marginBottom: 16 }}>
          <KpiCard label="Total Invoiced" value={money(statement.totalInvoiced)} note={customer || 'Selected customer'} />
          <KpiCard label="Total Paid" value={money(statement.totalPaid)} note="Payments register" valueStyle={{ color: 'var(--g)' }} />
          <KpiCard label="Outstanding" value={money(statement.outstanding)} note="Live balance" valueStyle={{ color: statement.outstanding ? 'var(--r)' : 'var(--g)' }} />
          <KpiCard label="Invoices" value={statement.invoices.length} note="Customer activity" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 16 }}>
          <Card><CardHeader title="Invoices" /><CardBody noPad>
            <Table
              columns={['Invoice', 'Date', 'Due', 'Amount', 'Paid', 'Balance', 'Status']}
              rows={statement.invoices.map(invoice => [
                <span style={monoStyle}>{invoice.id}</span>,
                invoice.date || '—',
                invoice.dueDate || '—',
                money(invoice.amount || 0),
                money(invoice.amountPaid || 0),
                <span style={{ color: getInvoiceBalance(invoice) ? 'var(--r)' : 'var(--g)', fontWeight: 700 }}>{money(getInvoiceBalance(invoice))}</span>,
                <Badge variant={invoiceStatusVariant(invoice.status, getInvoiceBalance(invoice), invoice.dueDate)}>{invoiceStatusLabel(invoice)}</Badge>,
              ])}
              empty="No invoices yet"
            />
          </CardBody></Card>
          <Card><CardHeader title="Payments" /><CardBody noPad>
            <Table
              columns={['Receipt', 'Date', 'Amount', 'Method']}
              rows={statement.payments.map(payment => [
                <span style={monoStyle}>{payment.receiptNo || '—'}</span>,
                payment.date || '—',
                money(payment.amount || 0),
                payment.method || '—',
              ])}
              empty="No payments yet"
            />
          </CardBody></Card>
        </div>
      </CardBody>
    </Card>
  )
}

function AgingView({ rows, onExport }) {
  return (
    <Card>
      <CardHeader title="Receivables Aging" actions={<Button variant="secondary" size="sm" onClick={onExport}>Export CSV</Button>} />
      <CardBody noPad>
        <Table
          columns={['Customer', 'Current', '0-30', '31-60', '61-90', '90+']}
          rows={rows.map(row => [
            <span style={{ fontWeight: 700 }}>{row.customer}</span>,
            money(row.current),
            money(row.bucket30),
            money(row.bucket60),
            money(row.bucket90),
            <span style={{ color: row.bucket90Plus ? 'var(--r)' : '#0D0F14', fontWeight: 800 }}>{money(row.bucket90Plus)}</span>,
          ])}
          empty="No aging data yet"
        />
      </CardBody>
    </Card>
  )
}

function ExpenseApprovalsView({ expenses, onApprove, onReject, onPaid }) {
  const approvalRows = expenses.filter(expense => expense.status !== 'Paid').sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
  return (
    <Card>
      <CardHeader title="Expense Approval Workflow" />
      <CardBody noPad>
        <Table
          columns={['ID', 'Category', 'Description', 'Amount', 'Date', 'Status', 'Action']}
          rows={approvalRows.map(expense => [
            <span style={monoStyle}>{expense.id}</span>,
            expense.category || '—',
            expense.description || '—',
            money(expense.amount || 0),
            expense.date || '—',
            <Badge variant={expenseStatusVariant(expense.status)}>{expense.status || 'Pending Approval'}</Badge>,
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {expense.status !== 'Approved' && <Button variant="success" size="sm" onClick={() => onApprove(expense)}>Approve</Button>}
              {expense.status !== 'Rejected' && <Button variant="danger" size="sm" onClick={() => onReject(expense)}>Reject</Button>}
              {expense.status === 'Approved' && <Button variant="secondary" size="sm" onClick={() => onPaid(expense)}>Mark Paid</Button>}
            </div>,
          ])}
          empty="No expense approvals pending"
        />
      </CardBody>
    </Card>
  )
}

function ItemBuilder({ items, setItems }) {
  function addItem() {
    setItems(prev => [...prev, { id: uid('IT'), type: '', isBulk: false, bulkDesc: '', qty: 1, price: 0 }])
  }

  function removeItem(id) {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  function updateItem(id, patch) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item))
  }

  const total = items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <label style={miniLabelStyle}>Items / Cylinders</label>
        <button type="button" className="btn btng btnsm" onClick={addItem}>+ Add Item</button>
      </div>
      {!items.length && <div style={emptyInlineStyle}>No items yet — click "+ Add Item"</div>}
      {items.map(item => (
        <div key={item.id} style={itemBoxStyle}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 8 }}>
            <div style={{ flex: 2 }}>
              <label style={miniLabelStyle}>Item Type</label>
              <select value={item.type} onChange={event => updateItem(item.id, { type: event.target.value, isBulk: event.target.value === 'Bulk LPG' })} style={fieldInputStyle}>
                <option value="">Select…</option>
                {CYL_ITEMS.map(option => <option key={option}>{option}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={miniLabelStyle}>Qty</label>
              <input type="number" min="1" value={item.qty} onChange={event => updateItem(item.id, { qty: event.target.value })} style={fieldInputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={miniLabelStyle}>Price</label>
              <input type="number" min="0" value={item.price} onChange={event => updateItem(item.id, { price: event.target.value })} style={fieldInputStyle} />
            </div>
            <button type="button" onClick={() => removeItem(item.id)} style={removeButtonStyle}>×</button>
          </div>
          {item.isBulk && (
            <div>
              <label style={miniLabelStyle}>Bulk Description</label>
              <input value={item.bulkDesc} onChange={event => updateItem(item.id, { bulkDesc: event.target.value })} placeholder="e.g. 5000 KG" style={fieldInputStyle} />
            </div>
          )}
          <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--a)', fontWeight: 700, marginTop: 4 }}>
            Subtotal: {money(Number(item.qty || 0) * Number(item.price || 0))}
          </div>
        </div>
      ))}
      {!!items.length && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--sb)', borderRadius: 8, marginTop: 4 }}>
          <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>TOTAL</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{money(total)}</span>
        </div>
      )}
    </div>
  )
}

function InvoiceDrawer({ open, onClose, db, dispatch, toast }) {
  const { register, handleSubmit, reset } = useForm()
  const [items, setItems] = useState([])
  const itemTotal = items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0), 0)

  async function onSubmit(data) {
    if (!data.customer) return toast('error', 'Customer required.')
    if (!items.length) return toast('error', 'Add at least one item.')
    if (!itemTotal) return toast('error', 'At least one item must have a price.')

    const customer = db.customers.find(item => item.name?.trim().toUpperCase() === data.customer.trim().toUpperCase())
    try {
      await dispatch({
        type: 'DB_INSERT',
        key: 'invoices',
        record: {
          id: uid('INV'),
          date: data.date || today(),
          source: 'Manual',
          customer: data.customer.trim().toUpperCase(),
          amount: itemTotal,
          amountPaid: 0,
          items,
          repName: customer?.rep || '',
          deliveryDate: data.deliveryDate || null,
          dueDate: data.dueDate || null,
          status: data.status || 'Unpaid',
        },
      })
      toast('success', 'Invoice created.')
      reset()
      setItems([])
      onClose()
    } catch (error) {
      toast('error', error.message || 'Could not create invoice.')
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="New Invoice" footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Create Invoice</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="Customer">
        <Input {...register('customer')} placeholder="Customer name" list="accounts-customer-list" />
        <datalist id="accounts-customer-list">{db.customers.map(customer => <option key={customer.id} value={customer.name} />)}</datalist>
      </Field>
      <div className="frow">
        <Field label="Invoice Date"><Input {...register('date')} type="date" defaultValue={today()} /></Field>
        <Field label="Delivery Date"><Input {...register('deliveryDate')} type="date" /></Field>
      </div>
      <div className="frow">
        <Field label="Due Date"><Input {...register('dueDate')} type="date" /></Field>
        <Field label="Status"><Select {...register('status')}><option>Unpaid</option><option>Partial</option><option>Paid</option></Select></Field>
      </div>
      <ItemBuilder items={items} setItems={setItems} />
    </Drawer>
  )
}

function EditInvoiceDrawer({ inv, onClose, dispatch, toast }) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      date: inv.date || today(),
      deliveryDate: inv.deliveryDate || '',
      dueDate: inv.dueDate || '',
      status: inv.status || 'Unpaid',
    },
  })
  const [items, setItems] = useState(inv.items || [])

  async function onSubmit(data) {
    const amount = items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0), 0)
    try {
      await dispatch({
        type: 'DB_UPDATE',
        key: 'invoices',
        id: inv.id,
        patch: {
          date: data.date,
          deliveryDate: data.deliveryDate || null,
          dueDate: data.dueDate || null,
          status: data.status,
          items,
          amount,
        },
      })
      toast('success', 'Invoice updated.')
      onClose()
    } catch (error) {
      toast('error', error.message || 'Could not update invoice.')
    }
  }

  return (
    <Drawer open={!!inv} onClose={onClose} title={`Edit Invoice ${inv.id}`} footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Changes</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <div className="ibar ib" style={{ marginBottom: 12 }}>
        <span>Customer stays linked to the original invoice. Use this screen for dates, status, and item changes.</span>
      </div>
      <div className="frow">
        <Field label="Invoice Date"><Input {...register('date')} type="date" /></Field>
        <Field label="Delivery Date"><Input {...register('deliveryDate')} type="date" /></Field>
      </div>
      <div className="frow">
        <Field label="Due Date"><Input {...register('dueDate')} type="date" /></Field>
        <Field label="Status"><Select {...register('status')}><option>Unpaid</option><option>Partial</option><option>Paid</option><option>Overdue</option></Select></Field>
      </div>
      <ItemBuilder items={items} setItems={setItems} />
    </Drawer>
  )
}

function ExpenseDrawer({ open, onClose, dispatch, toast }) {
  const { register, handleSubmit, reset } = useForm({ defaultValues: { date: today(), status: 'Pending Approval' } })

  async function onSubmit(data) {
    try {
      await dispatch({
        type: 'DB_INSERT',
        key: 'expenses',
        record: {
          id: uid('EXP'),
          description: data.description || null,
          amount: Number(data.amount || 0),
          category: data.category || null,
          date: data.date || today(),
          status: 'Pending Approval',
          approved: false,
        },
      })
      toast('success', 'Expense logged.')
      reset({ date: today(), status: 'Pending Approval' })
      onClose()
    } catch (error) {
      toast('error', error.message || 'Could not log expense.')
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Log Expense" footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Expense</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="Description / Summary"><Input {...register('description')} placeholder="e.g. Vehicle maintenance - fuel & oil" /></Field>
      <div className="frow">
        <Field label="Amount"><Input {...register('amount')} type="number" /></Field>
        <Field label="Date"><Input {...register('date')} type="date" /></Field>
      </div>
      <Field label="Category"><Select {...register('category')}><option value="">Select…</option>{['Fuel', 'Maintenance', 'Salaries', 'Utilities', 'Supplies', 'Other'].map(value => <option key={value}>{value}</option>)}</Select></Field>
    </Drawer>
  )
}

function EditExpenseDrawer({ exp, onClose, dispatch, toast }) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      description: exp.description || '',
      amount: exp.amount || 0,
      date: exp.date || today(),
      category: exp.category || '',
      status: exp.status || 'Pending Approval',
      rejectionReason: exp.rejectionReason || '',
      paymentMethod: exp.paymentMethod || '',
    },
  })

  async function onSubmit(data) {
    try {
      await dispatch({
        type: 'DB_UPDATE',
        key: 'expenses',
        id: exp.id,
        patch: {
          description: data.description || null,
          amount: Number(data.amount || 0),
          date: data.date || null,
          category: data.category || null,
          status: data.status,
          approved: data.status === 'Approved' || data.status === 'Paid',
          rejectionReason: data.rejectionReason || null,
          paymentMethod: data.paymentMethod || null,
        },
      })
      toast('success', 'Expense updated.')
      onClose()
    } catch (error) {
      toast('error', error.message || 'Could not update expense.')
    }
  }

  return (
    <Drawer open={!!exp} onClose={onClose} title={`Edit Expense ${exp.id}`} footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Changes</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="Description"><Input {...register('description')} /></Field>
      <div className="frow">
        <Field label="Amount"><Input {...register('amount')} type="number" /></Field>
        <Field label="Date"><Input {...register('date')} type="date" /></Field>
      </div>
      <Field label="Category"><Select {...register('category')}><option value="">Select…</option>{['Fuel', 'Maintenance', 'Salaries', 'Utilities', 'Supplies', 'Other'].map(value => <option key={value}>{value}</option>)}</Select></Field>
      <Field label="Status"><Select {...register('status')}>{EXPENSE_STATUSES.map(value => <option key={value}>{value}</option>)}</Select></Field>
      <Field label="Payment Method"><Input {...register('paymentMethod')} placeholder="Optional when paid" /></Field>
      <Field label="Rejection Reason"><Input {...register('rejectionReason')} placeholder="Used only if rejected" /></Field>
    </Drawer>
  )
}

function PayModal({ inv, onClose, dispatch, toast }) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      date: today(),
      amount: getInvoiceBalance(inv),
      method: 'Cash',
    },
  })
  const balance = getInvoiceBalance(inv)

  async function onSubmit(data) {
    const amount = Number(data.amount || 0)
    if (!amount || amount <= 0) return toast('error', 'Enter a valid amount.')
    if (amount > balance) return toast('error', 'Payment exceeds invoice balance.')

    try {
      await dispatch({
        type: 'DB_INSERT',
        key: 'payments',
        record: {
          id: uid('PAY'),
          invoiceId: inv.id,
          customerId: inv.customerId,
          date: data.date || today(),
          amount,
          method: data.method || 'Cash',
          reference: data.reference || null,
          notes: data.notes || null,
        },
      })
      toast('success', 'Payment recorded.')
      onClose()
    } catch (error) {
      toast('error', error.message || 'Could not record payment.')
    }
  }

  return (
    <div className="mov on" onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="mdl">
        <div style={{ background: 'linear-gradient(135deg,#1e40af,#1e3a8a)', padding: '16px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>Record Payment</div>
          <div style={{ fontSize: 12, color: '#93c5fd', fontFamily: 'monospace', marginTop: 2 }}>{inv.id}</div>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, background: 'var(--bg)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            {[['Customer', inv.customer || '—'], ['Invoice Total', money(inv.amount || 0)], ['Balance Due', money(balance)]].map(([label, value]) => (
              <div key={label}>
                <div style={miniLabelStyle}>{label}</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Date"><Input {...register('date')} type="date" /></Field>
            <Field label="Amount"><Input {...register('amount')} type="number" style={{ fontSize: 18, fontWeight: 700 }} /></Field>
            <Field label="Payment Method"><Select {...register('method')}>{PAYMENT_METHODS.map(method => <option key={method}>{method}</option>)}</Select></Field>
            <Field label="Reference"><Input {...register('reference')} placeholder="e.g. transfer ID, cheque no." /></Field>
            <Field label="Notes"><Input {...register('notes')} placeholder="Optional note" /></Field>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn btng btnmd" onClick={onClose}>Cancel</button>
            <button className="btn btns btnmd" onClick={handleSubmit(onSubmit)}>Record Payment</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function BalanceSummary({ invoices, search, onSearchChange, onPrint, onExport }) {
  const balances = buildBalances(invoices).filter(item => !search || item.customer.toLowerCase().includes(search.toLowerCase()))
  const totalOwed = balances.reduce((sum, item) => sum + item.balance, 0)
  if (!balances.length) return <EmptyState icon="BA" message="No customer balance data yet" />
  return (
    <Card>
      <CardHeader title="Customer Balances" actions={<><Button variant="secondary" size="sm" onClick={onExport}>Export CSV</Button><Button variant="secondary" size="sm" onClick={onPrint}>Print</Button></>} />
      <CardBody noPad>
        <Toolbar value={search} onChange={onSearchChange} placeholder="Search customer balance..." showReset={!!search} onReset={() => onSearchChange('')} />
        <Table
          columns={['Customer', 'Invoices', 'Total Invoiced', 'Amount Paid', 'Balance Due']}
          rows={balances.map(item => [
            <span style={{ fontWeight: 700 }}>{item.customer}</span>,
            item.count,
            money(item.total),
            <span style={{ color: 'var(--g)', fontWeight: 700 }}>{money(item.paid)}</span>,
            <span style={{ color: item.balance ? 'var(--r)' : 'var(--g)', fontWeight: 800 }}>{money(item.balance)}</span>,
          ])}
        />
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--b)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--m)' }}>Total Balance Due</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--r)' }}>{money(totalOwed)}</span>
        </div>
      </CardBody>
    </Card>
  )
}

function PLView({ invoices, expenses, payments }) {
  const collected = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const invoiced = invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0)
  const outstanding = invoices.reduce((sum, invoice) => sum + getInvoiceBalance(invoice), 0)
  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
  const approvedExpenses = expenses.filter(expense => expense.status === 'Approved' || expense.status === 'Paid' || expense.approved).reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
  const paidExpenses = expenses.filter(expense => expense.status === 'Paid').reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
  const net = collected - paidExpenses
  const expenseByCategory = Object.values(expenses.reduce((acc, expense) => {
    const key = expense.category || 'Uncategorised'
    if (!acc[key]) acc[key] = { category: key, total: 0, count: 0 }
    acc[key].total += Number(expense.amount || 0)
    acc[key].count += 1
    return acc
  }, {})).sort((a, b) => b.total - a.total)
  const expenseByStatus = ['Pending Approval', 'Approved', 'Rejected', 'Paid'].map(status => ({
    status,
    total: expenses.filter(expense => (expense.status || 'Pending Approval') === status).reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    count: expenses.filter(expense => (expense.status || 'Pending Approval') === status).length,
  }))
  const recentExpenses = expenses.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 6)

  return (
    <Card>
      <CardHeader title="Profit & Loss Summary" />
      <CardBody>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14 }}>
          {[
            { label: 'Total Invoiced', value: money(invoiced) },
            { label: 'Collected', value: money(collected), style: { color: 'var(--g)' } },
            { label: 'Outstanding', value: money(outstanding), style: { color: 'var(--r)' } },
            { label: 'Recorded Expenses', value: money(totalExpenses), style: { color: 'var(--am)' } },
            { label: 'Approved Expenses', value: money(approvedExpenses), style: { color: 'var(--am)' } },
            { label: 'Paid Expenses', value: money(paidExpenses), style: { color: 'var(--am)' } },
            { label: 'Net Cash Position', value: money(net), style: { color: net >= 0 ? 'var(--g)' : 'var(--r)' } },
            { label: 'Payment Entries', value: payments.length },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={miniLabelStyle}>{item.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, ...(item.style || {}) }}>{item.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 16, marginTop: 16 }}>
          <Card>
            <CardHeader title="Expense Categories" />
            <CardBody noPad>
              <Table
                columns={['Category', 'Entries', 'Total']}
                rows={expenseByCategory.map(item => [
                  <span style={{ fontWeight: 700 }}>{item.category}</span>,
                  item.count,
                  money(item.total),
                ])}
                empty="No expense data yet"
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Expense Status Summary" />
            <CardBody noPad>
              <Table
                columns={['Status', 'Entries', 'Total']}
                rows={expenseByStatus.map(item => [
                  <Badge variant={expenseStatusVariant(item.status)}>{item.status}</Badge>,
                  item.count,
                  money(item.total),
                ])}
                empty="No expense status data yet"
              />
            </CardBody>
          </Card>
        </div>
        <Card style={{ marginTop: 16 }}>
          <CardHeader title="Recent Recorded Expenses" />
          <CardBody noPad>
            <Table
              columns={['Date', 'Category', 'Description', 'Status', 'Amount']}
              rows={recentExpenses.map(expense => [
                expense.date || 'â€”',
                expense.category || 'â€”',
                expense.description || 'â€”',
                <Badge variant={expenseStatusVariant(expense.status)}>{expense.status || 'Pending Approval'}</Badge>,
                money(expense.amount || 0),
              ])}
              empty="No expenses recorded yet"
            />
          </CardBody>
        </Card>
      </CardBody>
    </Card>
  )
}

function getInvoiceBalance(invoice) {
  return Math.max(0, Number(invoice.amount || 0) - Number(invoice.amountPaid || 0))
}

function invoiceStatusLabel(invoice) {
  const balance = getInvoiceBalance(invoice)
  if (balance <= 0) return 'Paid'
  if (invoice.dueDate && new Date(invoice.dueDate) < new Date(today())) return 'Overdue'
  return invoice.status || 'Unpaid'
}

function invoiceStatusVariant(status, balance, dueDate) {
  if (!balance) return 'success'
  if (dueDate && new Date(dueDate) < new Date(today())) return 'danger'
  if (status === 'Partial') return 'warning'
  return 'danger'
}

function expenseStatusVariant(status) {
  return {
    'Pending Approval': 'warning',
    Approved: 'success',
    Rejected: 'danger',
    Paid: 'info',
  }[status] || 'neutral'
}

function buildBalances(invoices) {
  const map = {}
  invoices.forEach(invoice => {
    const key = String(invoice.customer || '').trim().toUpperCase()
    if (!map[key]) map[key] = { customer: key, total: 0, paid: 0, count: 0, balance: 0 }
    map[key].total += Number(invoice.amount || 0)
    map[key].paid += Number(invoice.amountPaid || 0)
    map[key].count += 1
    map[key].balance += getInvoiceBalance(invoice)
  })
  return Object.values(map).sort((a, b) => b.balance - a.balance)
}

function buildCustomerStatement(customer, invoices, payments) {
  const key = String(customer || '').trim().toUpperCase()
  const customerInvoices = invoices.filter(invoice => String(invoice.customer || '').trim().toUpperCase() === key)
  const invoiceIds = new Set(customerInvoices.map(invoice => invoice.id))
  const customerPayments = payments.filter(payment => String(payment.customer || '').trim().toUpperCase() === key || invoiceIds.has(payment.invoiceId))
  return {
    customer,
    invoices: customerInvoices,
    payments: customerPayments,
    totalInvoiced: customerInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0),
    totalPaid: customerPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    outstanding: customerInvoices.reduce((sum, invoice) => sum + getInvoiceBalance(invoice), 0),
  }
}

function buildAgingRows(invoices) {
  const byCustomer = new Map()
  const now = new Date(today())

  invoices.forEach(invoice => {
    const balance = getInvoiceBalance(invoice)
    if (!balance) return
    const customer = String(invoice.customer || '').trim().toUpperCase()
    if (!byCustomer.has(customer)) {
      byCustomer.set(customer, { customer, current: 0, bucket30: 0, bucket60: 0, bucket90: 0, bucket90Plus: 0 })
    }
    const row = byCustomer.get(customer)
    if (!invoice.dueDate) {
      row.current += balance
      return
    }
    const due = new Date(invoice.dueDate)
    const diff = Math.floor((now - due) / (1000 * 60 * 60 * 24))
    if (diff <= 0) row.current += balance
    else if (diff <= 30) row.bucket30 += balance
    else if (diff <= 60) row.bucket60 += balance
    else if (diff <= 90) row.bucket90 += balance
    else row.bucket90Plus += balance
  })

  return Array.from(byCustomer.values()).sort((a, b) => (b.bucket90Plus + b.bucket90 + b.bucket60 + b.bucket30 + b.current) - (a.bucket90Plus + a.bucket90 + a.bucket60 + a.bucket30 + a.current))
}

function buildExpenseStatusPatch(expense, status) {
  const patch = {
    status,
    approved: status === 'Approved' || status === 'Paid',
  }
  if (status === 'Approved') {
    patch.approvedAt = today()
    patch.approvedBy = 'Accounts'
  }
  if (status === 'Rejected') {
    patch.rejectedAt = today()
    patch.rejectedBy = 'Accounts'
  }
  if (status === 'Paid') {
    patch.paidAt = today()
  }
  if (expense.rejectionReason) {
    patch.rejectionReason = expense.rejectionReason
  }
  return patch
}

function exportBalanceCsv(invoices, search = '') {
  const rows = buildBalances(invoices)
    .filter(item => !search || item.customer.toLowerCase().includes(search.toLowerCase()))
    .map(item => [item.customer, item.count, item.total, item.paid, item.balance])
  exportRowsAsCsv('accounts-balances', ['Customer', 'Invoices', 'Total Invoiced', 'Amount Paid', 'Balance Due'], rows)
}

const ALOGO = 'https://i0.wp.com/henosenergy.com/wp/wp-content/uploads/2023/10/Henos-Logo-White1.png?fit=1000%2C416&ssl=1'

function aHeader(title, sub = '') {
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;padding-bottom:14px;border-bottom:3px solid #1e3a5f">
    <div><div style="background:#1e3a5f;border-radius:10px;padding:5px 14px;display:inline-flex;align-items:center;margin-bottom:8px"><img src="${ALOGO}" style="height:38px"/></div>
    <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.6px">Energizing Progress · Ghana</div></div>
    <div style="text-align:right"><div style="font-size:18px;font-weight:900;color:#1e3a5f">${title}</div>
    ${sub ? `<div style="font-size:12px;color:#64748b;margin-top:3px">${sub}</div>` : ''}
    <div style="font-size:11px;color:#64748b;margin-top:2px">Printed: ${new Date().toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' })}</div></div>
  </div>`
}

function printInvoice(invoice) {
  const itemRows = (invoice.items || []).length
    ? invoice.items.map((item, index) => `<tr style="background:${index % 2 === 0 ? '#fff' : '#f9fafb'}"><td style="padding:8px 12px">${index + 1}</td><td style="padding:8px 12px;font-weight:600">${item.type || '—'}${item.bulkDesc ? ` (${item.bulkDesc})` : ''}</td><td style="padding:8px 12px;text-align:center">${item.qty || 1}</td><td style="padding:8px 12px;text-align:right">${money(item.price || 0)}</td><td style="padding:8px 12px;text-align:right;font-weight:700">${money(Number(item.qty || 0) * Number(item.price || 0))}</td></tr>`).join('')
    : `<tr><td colspan="5" style="padding:12px;text-align:center;color:#6b7280">No itemised breakdown</td></tr>`

  const win = window.open('', '_blank', 'width=720,height=860')
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${invoice.id}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:28px 32px;color:#0f172a;font-size:12px}table{width:100%;border-collapse:collapse}thead{background:#1e3a5f;color:#fff}th{padding:9px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;text-align:left}.meta{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}.box{background:#f8faff;border-radius:8px;padding:12px 14px}.lbl{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px}@media print{button{display:none}}</style></head><body>${aHeader('INVOICE', invoice.id)}<div class="meta"><div class="box"><div class="lbl">Customer</div><div style="font-size:14px;font-weight:700">${invoice.customer || '—'}</div><div style="font-size:12px;margin-top:4px">Rep: ${invoice.repName || '—'}</div></div><div class="box"><div class="lbl">Details</div><div>Date: ${invoice.date || '—'}</div><div>Delivery: ${invoice.deliveryDate || '—'}</div><div>Due: ${invoice.dueDate || '—'}</div></div></div><table><thead><tr><th>#</th><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Subtotal</th></tr></thead><tbody>${itemRows}</tbody></table><div style="margin-top:16px;text-align:right;font-size:16px;font-weight:800">Balance Due: ${money(getInvoiceBalance(invoice))}</div><div style="margin-top:24px;text-align:center"><button onclick="window.print()" style="background:#1e3a5f;color:#fff;border:none;border-radius:8px;padding:10px 28px;font-size:14px;font-weight:700;cursor:pointer">Print Invoice</button></div></body></html>`)
  win.document.close()
}

function printPaymentReceipt(payment, invoice) {
  const win = window.open('', '_blank', 'width=620,height=760')
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Receipt ${payment.receiptNo}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:28px 32px;color:#0f172a;font-size:12px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px}.box{background:#f8faff;border-radius:8px;padding:12px 14px}.lbl{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px}@media print{button{display:none}}</style></head><body>${aHeader('PAYMENT RECEIPT', payment.receiptNo || '')}<div class="grid">${[['Customer', payment.customer || '—'], ['Invoice', payment.invoiceId || '—'], ['Date', payment.date || '—'], ['Method', payment.method || '—'], ['Amount Received', money(payment.amount || 0)], ['Reference', payment.reference || '—'], ['Recorded By', payment.recordedByName || '—'], ['Balance After Payment', money(invoice ? getInvoiceBalance(invoice) : 0)]].map(([label, value]) => `<div class="box"><div class="lbl">${label}</div><div style="font-size:14px;font-weight:700">${value}</div></div>`).join('')}</div><div style="margin-top:26px;text-align:center"><button onclick="window.print()" style="background:#1e3a5f;color:#fff;border:none;border-radius:8px;padding:10px 28px;font-size:14px;font-weight:700;cursor:pointer">Print Receipt</button></div></body></html>`)
  win.document.close()
}

function printCustomerStatement(statement) {
  const invoiceRows = statement.invoices.map((invoice, index) => `<tr style="background:${index % 2 === 0 ? '#fff' : '#f9fafb'}"><td style="padding:8px 12px">${invoice.id}</td><td style="padding:8px 12px">${invoice.date || '—'}</td><td style="padding:8px 12px">${invoice.dueDate || '—'}</td><td style="padding:8px 12px;text-align:right">${money(invoice.amount || 0)}</td><td style="padding:8px 12px;text-align:right">${money(invoice.amountPaid || 0)}</td><td style="padding:8px 12px;text-align:right;font-weight:700">${money(getInvoiceBalance(invoice))}</td></tr>`).join('')
  const paymentRows = statement.payments.map((payment, index) => `<tr style="background:${index % 2 === 0 ? '#fff' : '#f9fafb'}"><td style="padding:8px 12px">${payment.receiptNo || '—'}</td><td style="padding:8px 12px">${payment.date || '—'}</td><td style="padding:8px 12px">${payment.method || '—'}</td><td style="padding:8px 12px;text-align:right;font-weight:700">${money(payment.amount || 0)}</td></tr>`).join('')
  const win = window.open('', '_blank', 'width=900,height=860')
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Statement ${statement.customer}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:28px 32px;color:#0f172a;font-size:12px}table{width:100%;border-collapse:collapse;margin-bottom:20px}thead{background:#1e3a5f;color:#fff}th{padding:9px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;text-align:left}.totals{display:flex;gap:16px;margin-bottom:20px}.box{background:#f8faff;border-radius:8px;padding:12px 14px;flex:1}.lbl{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px}@media print{button{display:none}}</style></head><body>${aHeader('CUSTOMER STATEMENT', statement.customer)}<div class="totals">${[['Total Invoiced', money(statement.totalInvoiced)], ['Total Paid', money(statement.totalPaid)], ['Outstanding', money(statement.outstanding)]].map(([label, value]) => `<div class="box"><div class="lbl">${label}</div><div style="font-size:16px;font-weight:800">${value}</div></div>`).join('')}</div><table><thead><tr><th>Invoice</th><th>Date</th><th>Due</th><th style="text-align:right">Amount</th><th style="text-align:right">Paid</th><th style="text-align:right">Balance</th></tr></thead><tbody>${invoiceRows || '<tr><td colspan="6" style="padding:12px;text-align:center;color:#6b7280">No invoices</td></tr>'}</tbody></table><table><thead><tr><th>Receipt</th><th>Date</th><th>Method</th><th style="text-align:right">Amount</th></tr></thead><tbody>${paymentRows || '<tr><td colspan="4" style="padding:12px;text-align:center;color:#6b7280">No payments</td></tr>'}</tbody></table><div style="margin-top:24px;text-align:center"><button onclick="window.print()" style="background:#1e3a5f;color:#fff;border:none;border-radius:8px;padding:10px 28px;font-size:14px;font-weight:700;cursor:pointer">Print Statement</button></div></body></html>`)
  win.document.close()
}

function printBalances(invoices, search = '') {
  const balances = buildBalances(invoices).filter(item => !search || item.customer.toLowerCase().includes(search.toLowerCase()))
  const rows = balances.map((item, index) => `<tr style="background:${index % 2 === 0 ? '#fff' : '#f9fafb'}"><td style="padding:8px 12px;font-weight:700">${item.customer}</td><td style="padding:8px 12px;text-align:center">${item.count}</td><td style="padding:8px 12px;text-align:right">${money(item.total)}</td><td style="padding:8px 12px;text-align:right">${money(item.paid)}</td><td style="padding:8px 12px;text-align:right;font-weight:800">${money(item.balance)}</td></tr>`).join('')
  const win = window.open('', '_blank', 'width=760,height=760')
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Customer Balances</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:28px 32px;color:#0f172a;font-size:12px}table{width:100%;border-collapse:collapse}thead{background:#1e3a5f;color:#fff}th{padding:9px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;text-align:left}@media print{button{display:none}}</style></head><body>${aHeader('CUSTOMER BALANCES')}<table><thead><tr><th>Customer</th><th style="text-align:center">Invoices</th><th style="text-align:right">Total Invoiced</th><th style="text-align:right">Amount Paid</th><th style="text-align:right">Balance Due</th></tr></thead><tbody>${rows}</tbody></table><div style="margin-top:24px;text-align:center"><button onclick="window.print()" style="background:#1e3a5f;color:#fff;border:none;border-radius:8px;padding:10px 28px;font-size:14px;font-weight:700;cursor:pointer">Print</button></div></body></html>`)
  win.document.close()
}

function printExpenses(expenses) {
  const rows = expenses.map((expense, index) => `<tr style="background:${index % 2 === 0 ? '#fff' : '#f9fafb'}"><td style="padding:8px 12px">${expense.id}</td><td style="padding:8px 12px">${expense.category || '—'}</td><td style="padding:8px 12px">${expense.description || '—'}</td><td style="padding:8px 12px;text-align:right">${money(expense.amount || 0)}</td><td style="padding:8px 12px">${expense.date || '—'}</td><td style="padding:8px 12px">${expense.status || 'Pending Approval'}</td></tr>`).join('')
  const win = window.open('', '_blank', 'width=820,height=760')
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Expenses</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:28px 32px;color:#0f172a;font-size:12px}table{width:100%;border-collapse:collapse}thead{background:#1e3a5f;color:#fff}th{padding:9px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;text-align:left}@media print{button{display:none}}</style></head><body>${aHeader('EXPENSES REPORT')}<table><thead><tr><th>ID</th><th>Category</th><th>Description</th><th style="text-align:right">Amount</th><th>Date</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><div style="margin-top:24px;text-align:center"><button onclick="window.print()" style="background:#1e3a5f;color:#fff;border:none;border-radius:8px;padding:10px 28px;font-size:14px;font-weight:700;cursor:pointer">Print</button></div></body></html>`)
  win.document.close()
}

const searchStyle = { flex: 1, minWidth: 180, border: '1.5px solid var(--b)', borderRadius: 7, padding: '8px 11px', fontSize: 13, outline: 'none' }
const monoStyle = { fontSize: 11, color: 'var(--a)', fontFamily: 'monospace' }
const miniLabelStyle = { fontSize: 10, fontWeight: 600, color: 'var(--m)', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 4 }
const emptyInlineStyle = { background: 'var(--bg)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: 'var(--m)', textAlign: 'center' }
const itemBoxStyle = { background: 'var(--bg)', border: '1.5px solid var(--b)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }
const fieldInputStyle = { width: '100%', border: '1.5px solid var(--b)', borderRadius: 7, padding: '7px 9px', fontSize: 13, outline: 'none', background: '#fff' }
const removeButtonStyle = { marginTop: 20, background: 'none', border: 'none', color: 'var(--r)', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '4px 6px' }
