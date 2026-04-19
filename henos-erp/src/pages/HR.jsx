import { useMemo } from 'react'
import { useAuth } from '../auth/AuthContext'
import { PageHeader, Panel, PanelHeader, PanelBody, Table, Badge, KpiCard } from '../components/ui'

export default function HR() {
  const { users } = useAuth()

  const departmentSummary = useMemo(() => {
    return users.reduce((acc, user) => {
      const key = user.department || 'Unassigned'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  }, [users])

  const roleSummary = useMemo(() => {
    return users.reduce((acc, user) => {
      const key = user.role || 'viewer'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  }, [users])

  const activeUsers = users.filter(user => user.active !== false).length
  const inactiveUsers = users.length - activeUsers
  const departments = Object.keys(departmentSummary).length

  return (
    <div style={{ animation: 'fadein .3s cubic-bezier(.4,0,.2,1)' }}>
      <PageHeader title="HR" />

      <div className="krow">
        <KpiCard label="Headcount" value={users.length || '-'} note={`${departments} departments`} />
        <KpiCard label="Active Staff" value={activeUsers || '-'} note="Enabled accounts" valueStyle={{ color: 'var(--g)' }} />
        <KpiCard label="Inactive Staff" value={inactiveUsers || '-'} note="Disabled or archived" valueStyle={{ color: inactiveUsers ? 'var(--am)' : 'var(--m)' }} />
        <KpiCard label="Managers" value={roleSummary.manager || '-'} note="Oversight users" valueStyle={{ color: 'var(--a)' }} />
      </div>

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
          <PanelHeader title="Staff Directory" />
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
    </div>
  )
}
