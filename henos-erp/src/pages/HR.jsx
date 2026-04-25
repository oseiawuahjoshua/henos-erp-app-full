import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../auth/AuthContext'
import { useApp } from '../context/AppContext'
import { useToast } from '../hooks/useToast'
import { exportRowsAsCsv } from '../utils/csv'
import { money, today, uid } from '../utils/helpers'
import { PageHeader, Pills, Panel, PanelHeader, PanelBody, Table, Badge, KpiCard, Button, Drawer, Field, Input, Select, ConfirmModal } from '../components/ui'

export default function HR() {
  const { users } = useAuth()
  const { state, dispatch } = useApp()
  const toast = useToast()
  const [tab, setTab] = useState('overview')
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [salaryOpen, setSalaryOpen] = useState(false)
  const [delConfirm, setDelConfirm] = useState(null)

  const leaveSchedules = state.db.leaveSchedules || []
  const salaries = state.db.salaries || []

  const departmentSummary = useMemo(() => users.reduce((acc, user) => {
    const key = user.department || 'Unassigned'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {}), [users])

  const activeUsers = users.filter(user => user.active !== false).length
  const inactiveUsers = users.length - activeUsers
  const departments = Object.keys(departmentSummary).length
  const plannedLeave = leaveSchedules.filter(item => item.status !== 'Completed').length
  const monthlyPayroll = salaries.reduce((sum, item) => sum + Number(item.amount || 0), 0)

  async function doDelete() {
    try {
      await dispatch({ type: 'DB_DELETE', key: delConfirm.key, id: delConfirm.id })
      toast('success', 'Deleted.')
      setDelConfirm(null)
    } catch (error) {
      toast('error', error.message || 'Could not delete record.')
    }
  }

  return (
    <div style={{ animation: 'fadein .3s cubic-bezier(.4,0,.2,1)' }}>
      <PageHeader title="HR" actions={<>
        {tab === 'leave' && <Button onClick={() => setLeaveOpen(true)}>+ Add Leave</Button>}
        {tab === 'salary' && <Button onClick={() => setSalaryOpen(true)}>+ Add Salary</Button>}
      </>} />

      <div className="krow">
        <KpiCard label="Headcount" value={users.length || '-'} note={`${departments} departments`} />
        <KpiCard label="Active Staff" value={activeUsers || '-'} note="Enabled accounts" valueStyle={{ color: 'var(--g)' }} />
        <KpiCard label="Leave Planned" value={plannedLeave || '-'} note="Upcoming / active" valueStyle={{ color: 'var(--am)' }} />
        <KpiCard label="Salary Records" value={salaries.length || '-'} note={monthlyPayroll ? money(monthlyPayroll) : 'No amount logged'} valueStyle={{ color: 'var(--a)' }} />
      </div>

      <Pills
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'leave', label: 'Leave Schedule' },
          { id: 'salary', label: 'Staff Salary' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '.85fr 1.15fr', gap: 16 }} className="dgrid">
          <Panel>
            <PanelHeader title="Department Breakdown" />
            <PanelBody>
              <div style={{ display: 'grid', gap: 10 }}>
                {Object.entries(departmentSummary).map(([department, count]) => (
                  <div key={department} style={{ border: '1.5px solid var(--b)', borderRadius: 12, padding: '12px 14px', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{department}</span>
                      <Badge variant="info">{count}</Badge>
                    </div>
                  </div>
                ))}
                {!users.length && <div style={{ fontSize: 13, color: 'var(--m)' }}>No staff records available yet.</div>}
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Staff Directory" actions={<Button variant="secondary" size="sm" onClick={() => exportRowsAsCsv('hr-staff-directory', ['Employee ID','Name','Department','Role','Status'], users.map(user => [user.id, user.name || '', user.department || '', user.role || '', user.active === false ? 'Inactive' : 'Active']))}>Export CSV</Button>} />
            <PanelBody noPad>
              <Table
                columns={['Employee ID', 'Name', 'Department', 'Role', 'Status']}
                rows={users.map(user => [
                  user.id,
                  user.name || '-',
                  user.department || '-',
                  user.role || '-',
                  <Badge variant={user.active === false ? 'warning' : 'success'}>{user.active === false ? 'Inactive' : 'Active'}</Badge>,
                ])}
                empty="No staff records yet"
              />
            </PanelBody>
          </Panel>
        </div>
      )}

      {tab === 'leave' && (
        <Panel>
          <PanelHeader title="Leave Schedule" actions={<Button variant="secondary" size="sm" onClick={() => exportRowsAsCsv('hr-leave-schedule', ['Employee','Department','Type','Start Date','End Date','Days','Status','Notes'], leaveSchedules.map(item => [item.employeeName || '', item.department || '', item.leaveType || '', item.startDate || '', item.endDate || '', item.days || '', item.status || '', item.notes || '']))}>Export CSV</Button>} />
          <PanelBody noPad>
            <Table
              columns={['Employee', 'Department', 'Type', 'Start', 'End', 'Days', 'Status', '']}
              rows={leaveSchedules.map(item => [
                item.employeeName || '-',
                item.department || '-',
                item.leaveType || '-',
                item.startDate || '-',
                item.endDate || '-',
                item.days || '-',
                <Badge variant={item.status === 'Approved' ? 'success' : item.status === 'Completed' ? 'neutral' : 'warning'}>{item.status || 'Scheduled'}</Badge>,
                <Button variant="ghost" size="sm" onClick={() => setDelConfirm({ key: 'leaveSchedules', id: item.id })}>Del</Button>,
              ])}
              empty="No leave schedule records yet"
            />
          </PanelBody>
        </Panel>
      )}

      {tab === 'salary' && (
        <Panel>
          <PanelHeader title="Staff Salary" actions={<Button variant="secondary" size="sm" onClick={() => exportRowsAsCsv('hr-salaries', ['Employee','Department','Month','Amount','Status','Notes'], salaries.map(item => [item.employeeName || '', item.department || '', item.month || '', item.amount || '', item.status || '', item.notes || '']))}>Export CSV</Button>} />
          <PanelBody noPad>
            <Table
              columns={['Employee', 'Department', 'Month', 'Amount', 'Status', '']}
              rows={salaries.map(item => [
                item.employeeName || '-',
                item.department || '-',
                item.month || '-',
                item.amount ? money(item.amount) : '-',
                <Badge variant={item.status === 'Paid' ? 'success' : 'warning'}>{item.status || 'Pending'}</Badge>,
                <Button variant="ghost" size="sm" onClick={() => setDelConfirm({ key: 'salaries', id: item.id })}>Del</Button>,
              ])}
              empty="No salary records yet"
            />
          </PanelBody>
        </Panel>
      )}

      <LeaveDrawer open={leaveOpen} onClose={() => setLeaveOpen(false)} users={users} dispatch={dispatch} toast={toast} />
      <SalaryDrawer open={salaryOpen} onClose={() => setSalaryOpen(false)} users={users} dispatch={dispatch} toast={toast} />
      <ConfirmModal open={!!delConfirm} onClose={() => setDelConfirm(null)} onConfirm={doDelete} title="Confirm Delete" message="This record will be permanently deleted." />
    </div>
  )
}

function LeaveDrawer({ open, onClose, users, dispatch, toast }) {
  const { register, handleSubmit, reset, watch } = useForm({ defaultValues: { status: 'Scheduled', startDate: today(), endDate: today() } })
  const employeeId = watch('employeeId', '')
  const currentUser = users.find(user => user.id === employeeId)

  async function onSubmit(data) {
    try {
      await dispatch({
        type: 'DB_INSERT',
        key: 'leaveSchedules',
        record: {
          id: uid('LV'),
          employeeId: data.employeeId || null,
          employeeName: currentUser?.name || data.employeeName || '',
          department: currentUser?.department || data.department || '',
          leaveType: data.leaveType || null,
          startDate: data.startDate || null,
          endDate: data.endDate || null,
          days: data.days ? Number(data.days) : null,
          status: data.status || 'Scheduled',
          notes: data.notes || null,
        },
      })
      toast('success', 'Leave schedule saved.')
      reset({ status: 'Scheduled', startDate: today(), endDate: today() })
      onClose()
    } catch (error) {
      toast('error', error.message || 'Could not save leave schedule.')
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add Leave Schedule" footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Leave</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="Employee">
        <Select {...register('employeeId')}>
          <option value="">Select staff...</option>
          {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
        </Select>
      </Field>
      <div className="frow">
        <Field label="Department"><Input value={currentUser?.department || ''} readOnly /></Field>
        <Field label="Leave Type"><Select {...register('leaveType')}><option value="">Select...</option>{['Annual Leave', 'Sick Leave', 'Maternity Leave', 'Paternity Leave', 'Study Leave'].map(type => <option key={type}>{type}</option>)}</Select></Field>
      </div>
      <div className="frow">
        <Field label="Start Date"><Input {...register('startDate')} type="date" /></Field>
        <Field label="End Date"><Input {...register('endDate')} type="date" /></Field>
      </div>
      <div className="frow">
        <Field label="Days"><Input {...register('days')} type="number" placeholder="0" /></Field>
        <Field label="Status"><Select {...register('status')}><option>Scheduled</option><option>Approved</option><option>Completed</option></Select></Field>
      </div>
      <Field label="Notes"><Input {...register('notes')} placeholder="Optional note" /></Field>
    </Drawer>
  )
}

function SalaryDrawer({ open, onClose, users, dispatch, toast }) {
  const { register, handleSubmit, reset, watch } = useForm({ defaultValues: { status: 'Pending' } })
  const employeeId = watch('employeeId', '')
  const currentUser = users.find(user => user.id === employeeId)

  async function onSubmit(data) {
    try {
      await dispatch({
        type: 'DB_INSERT',
        key: 'salaries',
        record: {
          id: uid('SAL'),
          employeeId: data.employeeId || null,
          employeeName: currentUser?.name || data.employeeName || '',
          department: currentUser?.department || data.department || '',
          month: data.month || null,
          amount: data.amount ? Number(data.amount) : 0,
          status: data.status || 'Pending',
          notes: data.notes || null,
        },
      })
      toast('success', 'Salary record saved.')
      reset({ status: 'Pending' })
      onClose()
    } catch (error) {
      toast('error', error.message || 'Could not save salary record.')
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add Salary Record" footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Salary</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="Employee">
        <Select {...register('employeeId')}>
          <option value="">Select staff...</option>
          {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
        </Select>
      </Field>
      <div className="frow">
        <Field label="Department"><Input value={currentUser?.department || ''} readOnly /></Field>
        <Field label="Month"><Input {...register('month')} placeholder="e.g. April 2026" /></Field>
      </div>
      <div className="frow">
        <Field label="Amount"><Input {...register('amount')} type="number" placeholder="0.00" /></Field>
        <Field label="Status"><Select {...register('status')}><option>Pending</option><option>Paid</option></Select></Field>
      </div>
      <Field label="Notes"><Input {...register('notes')} placeholder="Optional note" /></Field>
    </Drawer>
  )
}
