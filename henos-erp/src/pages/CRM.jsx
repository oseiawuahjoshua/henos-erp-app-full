import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useApp } from '../context/AppContext'
import { useToast } from '../hooks/useToast'
import { money, today, uid } from '../utils/helpers'
import { PageHeader, Pills, Panel, PanelHeader, PanelBody, Table, Badge, Button, Drawer, Field, Input, Select, KpiCard, ConfirmModal } from '../components/ui'

const LEAD_STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']

export default function CRM() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const { db } = state
  const [tab, setTab] = useState('overview')
  const [leadOpen, setLeadOpen] = useState(false)
  const [editLead, setEditLead] = useState(null)
  const [delConfirm, setDelConfirm] = useState(null)

  const customerSummaries = useMemo(() => {
    return db.customers.map(customer => {
      const orders = db.orders.filter(order => order.customer === customer.name)
      const invoices = db.invoices.filter(invoice => invoice.customer === customer.name)
      const revenue = invoices.reduce((sum, invoice) => sum + Number(invoice.amountPaid || 0), 0)
      const balance = invoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.amount || 0) - Number(invoice.amountPaid || 0)), 0)
      const latestOrder = orders[0]?.date || orders[0]?.createdAt?.slice?.(0, 10) || '-'
      return { ...customer, orders: orders.length, revenue, balance, latestOrder }
    }).sort((a, b) => b.revenue - a.revenue || b.orders - a.orders)
  }, [db.customers, db.invoices, db.orders])

  const leadValue = db.leads.reduce((sum, lead) => sum + Number(lead.value || 0), 0)
  const hotLeads = db.leads.filter(lead => ['Proposal', 'Negotiation', 'Qualified'].includes(lead.stage)).length
  const outstanding = customerSummaries.reduce((sum, customer) => sum + customer.balance, 0)
  const activeCustomers = customerSummaries.filter(customer => customer.orders > 0).length

  async function doDelete() {
    try {
      await dispatch({ type: 'DB_DELETE', key: 'leads', id: delConfirm.id })
      toast('success', 'Lead removed.')
      setDelConfirm(null)
    } catch (error) {
      toast('error', error.message || 'Could not remove lead.')
    }
  }

  return (
    <div style={{ animation: 'fadein .3s cubic-bezier(.4,0,.2,1)' }}>
      <PageHeader
        title="CRM"
        actions={tab === 'pipeline' ? <Button onClick={() => setLeadOpen(true)}>+ Add Opportunity</Button> : null}
      />

      <div className="krow">
        <KpiCard label="Customers" value={db.customers.length || '-'} note={`${activeCustomers} with activity`} />
        <KpiCard label="Open Pipeline" value={leadValue ? money(leadValue) : '-'} note={`${hotLeads} hot opportunities`} valueStyle={{ color: 'var(--a)' }} />
        <KpiCard label="Outstanding" value={outstanding ? money(outstanding) : '-'} note="Receivables exposure" valueStyle={{ color: outstanding ? 'var(--r)' : 'var(--m)' }} />
        <KpiCard label="Orders Won" value={db.orders.filter(order => order.status === 'Delivered').length || '-'} note="Delivered customer orders" valueStyle={{ color: 'var(--g)' }} />
      </div>

      <Pills
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'customers', label: 'Customers' },
          { id: 'pipeline', label: 'Pipeline' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 16 }} className="dgrid">
          <Panel>
            <PanelHeader title="Top Customers" />
            <PanelBody noPad>
              <Table
                columns={['Customer', 'Orders', 'Collected', 'Outstanding', 'Last Order']}
                rows={customerSummaries.slice(0, 8).map(customer => [
                  customer.name || '-',
                  customer.orders || '-',
                  customer.revenue ? money(customer.revenue) : '-',
                  customer.balance ? money(customer.balance) : '-',
                  customer.latestOrder,
                ])}
                empty="No customers yet"
              />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Pipeline Snapshot" />
            <PanelBody>
              <div style={{ display: 'grid', gap: 10 }}>
                {LEAD_STAGES.map(stage => {
                  const matches = db.leads.filter(lead => lead.stage === stage)
                  const total = matches.reduce((sum, lead) => sum + Number(lead.value || 0), 0)
                  return (
                    <div key={stage} style={{ border: '1.5px solid var(--b)', borderRadius: 12, padding: '12px 14px', background: '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{stage}</span>
                        <Badge variant={stage === 'Closed Won' ? 'success' : stage === 'Closed Lost' ? 'danger' : 'info'}>{matches.length}</Badge>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--m)', marginTop: 6 }}>{total ? money(total) : 'No value logged yet'}</div>
                    </div>
                  )
                })}
              </div>
            </PanelBody>
          </Panel>
        </div>
      )}

      {tab === 'customers' && (
        <Panel>
          <PanelHeader title="Customer Relationship View" />
          <PanelBody noPad>
            <Table
              columns={['Customer', 'Orders', 'Collected', 'Outstanding', 'Latest Activity']}
              rows={customerSummaries.map(customer => [
                customer.name || '-',
                customer.orders || '-',
                customer.revenue ? money(customer.revenue) : '-',
                customer.balance ? money(customer.balance) : '-',
                customer.latestOrder,
              ])}
              empty="No customers have been added yet"
            />
          </PanelBody>
        </Panel>
      )}

      {tab === 'pipeline' && (
        <Panel>
          <PanelHeader title="Opportunities" />
          <PanelBody noPad>
            <Table
              columns={['Company', 'Contact', 'Source', 'Value', 'Stage', 'Date', '']}
              rows={db.leads.map(lead => [
                lead.name || '-',
                lead.contact || '-',
                lead.source || '-',
                lead.value ? money(lead.value) : '-',
                <Badge variant={lead.stage === 'Closed Won' ? 'success' : lead.stage === 'Closed Lost' ? 'danger' : lead.stage === 'Proposal' || lead.stage === 'Negotiation' ? 'warning' : 'info'}>
                  {lead.stage || 'New'}
                </Badge>,
                lead.date || '-',
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button variant="secondary" size="sm" onClick={() => setEditLead(lead)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDelConfirm({ id: lead.id })}>Del</Button>
                </div>,
              ])}
              empty="No opportunities yet"
            />
          </PanelBody>
        </Panel>
      )}

      <LeadDrawer open={leadOpen} onClose={() => setLeadOpen(false)} dispatch={dispatch} toast={toast} />
      {editLead && <EditLeadDrawer lead={editLead} onClose={() => setEditLead(null)} dispatch={dispatch} toast={toast} />}
      <ConfirmModal open={!!delConfirm} onClose={() => setDelConfirm(null)} onConfirm={doDelete} title="Delete Opportunity" message="This opportunity will be removed from the CRM pipeline." />
    </div>
  )
}

function LeadDrawer({ open, onClose, dispatch, toast }) {
  const { register, handleSubmit, reset } = useForm({ defaultValues: { date: today(), stage: 'New' } })

  async function onSubmit(data) {
    try {
      await dispatch({
        type: 'DB_INSERT',
        key: 'leads',
        record: {
          id: uid('L'),
          date: data.date || today(),
          name: data.name,
          contact: data.contact,
          source: data.source,
          value: data.value || null,
          stage: data.stage || 'New',
        },
      })
      toast('success', 'Opportunity added.')
      reset({ date: today(), stage: 'New', name: '', contact: '', source: '', value: '' })
      onClose()
    } catch (error) {
      toast('error', error.message || 'Could not save opportunity.')
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add Opportunity"
      footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}
    >
      <Field label="Company / Prospect"><Input {...register('name')} placeholder="Enter company or lead name" /></Field>
      <Field label="Contact"><Input {...register('contact')} placeholder="Name and phone/email" /></Field>
      <Field label="Source"><Input {...register('source')} placeholder="Referral, campaign, direct call..." /></Field>
      <Field label="Estimated Value"><Input {...register('value')} type="number" placeholder="0.00" /></Field>
      <Field label="Stage">
        <Select {...register('stage')}>
          {LEAD_STAGES.map(stage => <option key={stage}>{stage}</option>)}
        </Select>
      </Field>
      <Field label="Date"><Input {...register('date')} type="date" /></Field>
    </Drawer>
  )
}

function EditLeadDrawer({ lead, onClose, dispatch, toast }) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: lead.name || '',
      contact: lead.contact || '',
      source: lead.source || '',
      value: lead.value || '',
      stage: lead.stage || 'New',
      date: lead.date || today(),
    },
  })

  async function onSubmit(data) {
    try {
      await dispatch({
        type: 'DB_UPDATE',
        key: 'leads',
        id: lead.id,
        patch: {
          name: data.name,
          contact: data.contact,
          source: data.source,
          value: data.value || null,
          stage: data.stage,
          date: data.date,
        },
      })
      toast('success', 'Opportunity updated.')
      onClose()
    } catch (error) {
      toast('error', error.message || 'Could not update opportunity.')
    }
  }

  return (
    <Drawer
      open={!!lead}
      onClose={onClose}
      title="Edit Opportunity"
      footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Update</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}
    >
      <Field label="Company / Prospect"><Input {...register('name')} /></Field>
      <Field label="Contact"><Input {...register('contact')} /></Field>
      <Field label="Source"><Input {...register('source')} /></Field>
      <Field label="Estimated Value"><Input {...register('value')} type="number" /></Field>
      <Field label="Stage">
        <Select {...register('stage')}>
          {LEAD_STAGES.map(stage => <option key={stage}>{stage}</option>)}
        </Select>
      </Field>
      <Field label="Date"><Input {...register('date')} type="date" /></Field>
    </Drawer>
  )
}
