import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useApp } from '../context/AppContext'
import { useToast } from '../hooks/useToast'
import { exportRowsAsCsv } from '../utils/csv'
import { uid, today, money, periodFromDate, LOGISTICS_DISTANCE_RATES, rateFromDistance, normalizeDistanceRateRows } from '../utils/helpers'
import { PageHeader, Pills, Card, CardBody, CardHeader, Button, Drawer, Field, Input, Select, Table, EmptyState, KpiCard, ConfirmModal } from '../components/ui'

export default function Logistics() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const vehicles = state.db.logisticsVehicles || []
  const loadings = state.db.logisticsLoadings || []
  const maintenanceRecords = state.db.logisticsMaintenance || []
  const storedRates = state.db.logisticsRates || []
  const [vehicleOpen, setVehicleOpen] = useState(false)
  const [loadingOpen, setLoadingOpen] = useState(false)
  const [maintenanceOpen, setMaintenanceOpen] = useState(false)
  const [rateOpen, setRateOpen] = useState(false)
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id || null)
  const [sheetDate, setSheetDate] = useState('')
  const [maintenanceDate, setMaintenanceDate] = useState('')
  const [tab, setTab] = useState('loadings')
  const [pnlPeriod, setPnlPeriod] = useState('')
  const [delConfirm, setDelConfirm] = useState(null)

  useEffect(() => {
    if (!vehicles.length) {
      setSelectedVehicleId(null)
      return
    }
    if (!vehicles.some(vehicle => vehicle.id === selectedVehicleId)) {
      setSelectedVehicleId(vehicles[0].id)
    }
  }, [selectedVehicleId, vehicles])

  const selectedVehicle = vehicles.find(vehicle => vehicle.id === selectedVehicleId) || vehicles[0] || null
  const usesServiceCharge = /iveco/i.test(String(selectedVehicle?.name || selectedVehicle?.brvNumber || selectedVehicle?.type || ''))
  const activeRates = useMemo(() => normalizeDistanceRateRows(storedRates.length ? storedRates : LOGISTICS_DISTANCE_RATES), [storedRates])

  const vehicleLoadings = useMemo(() => loadings
    .filter(loading => loading.vehicleId === selectedVehicle?.id)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))), [loadings, selectedVehicle])

  const vehicleMaintenance = useMemo(() => maintenanceRecords
    .filter(entry => entry.vehicleId === selectedVehicle?.id)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))), [maintenanceRecords, selectedVehicle])

  const visibleLoadings = useMemo(() => vehicleLoadings.filter(item => !sheetDate || item.date === sheetDate), [sheetDate, vehicleLoadings])
  const visibleMaintenance = useMemo(() => vehicleMaintenance.filter(item => !maintenanceDate || item.date === maintenanceDate), [maintenanceDate, vehicleMaintenance])

  const totals = useMemo(() => {
    const payable = vehicleLoadings.reduce((sum, item) => sum + Number(item.amountPayable || 0), 0)
    const fuel = vehicleLoadings.reduce((sum, item) => sum + Number(item.fuel || 0), 0)
    const road = vehicleLoadings.reduce((sum, item) => sum + Number(item.roadExpenses || 0), 0)
    const maintenance = vehicleMaintenance.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    return {
      vehicles: vehicles.length,
      loadings: vehicleLoadings.length,
      weight: vehicleLoadings.reduce((sum, item) => sum + Number(item.productWeight || 0), 0),
      payable,
      fuel,
      road,
      maintenance,
      pnl: payable - fuel - road - maintenance,
    }
  }, [vehicleLoadings, vehicleMaintenance, vehicles.length])

  const pnlRows = useMemo(() => {
    const byPeriod = new Map()

    vehicleLoadings.forEach(item => {
      const key = item.period || periodFromDate(item.date) || 'Unassigned'
      const row = byPeriod.get(key) || { period: key, loadings: 0, amountPayable: 0, fuel: 0, roadExpenses: 0, maintenance: 0 }
      row.loadings += 1
      row.amountPayable += Number(item.amountPayable || 0)
      row.fuel += Number(item.fuel || 0)
      row.roadExpenses += Number(item.roadExpenses || 0)
      byPeriod.set(key, row)
    })

    vehicleMaintenance.forEach(item => {
      const key = item.period || periodFromDate(item.date) || 'Unassigned'
      const row = byPeriod.get(key) || { period: key, loadings: 0, amountPayable: 0, fuel: 0, roadExpenses: 0, maintenance: 0 }
      row.maintenance += Number(item.amount || 0)
      byPeriod.set(key, row)
    })

    return Array.from(byPeriod.values())
      .map(row => ({
        ...row,
        totalCost: row.fuel + row.roadExpenses + row.maintenance,
        net: row.amountPayable - row.fuel - row.roadExpenses - row.maintenance,
      }))
      .sort((a, b) => String(b.period).localeCompare(String(a.period)))
  }, [vehicleLoadings, vehicleMaintenance])

  const pnlPeriods = useMemo(() => pnlRows.map(row => row.period).filter(Boolean), [pnlRows])

  useEffect(() => {
    if (!pnlRows.length) {
      setPnlPeriod('')
      return
    }
    if (!pnlPeriod || !pnlRows.some(row => row.period === pnlPeriod)) {
      setPnlPeriod(pnlRows[0].period)
    }
  }, [pnlPeriod, pnlRows])

  const selectedPnl = useMemo(() => {
    if (!pnlRows.length) return null
    return pnlRows.find(row => row.period === pnlPeriod) || pnlRows[0]
  }, [pnlPeriod, pnlRows])

  const pnlSummary = useMemo(() => {
    if (!selectedPnl) return null
    const serviceCharge = usesServiceCharge ? Number((selectedPnl.amountPayable * 0.15).toFixed(2)) : 0
    const totalNetUppf = Number((selectedPnl.amountPayable - serviceCharge).toFixed(2))
    const deductionTotal = Number((selectedPnl.roadExpenses + selectedPnl.maintenance).toFixed(2))
    const netUppfToProvider = Number((totalNetUppf - deductionTotal).toFixed(2))
    return {
      period: selectedPnl.period,
      totalUppfPayable: selectedPnl.amountPayable,
      serviceCharge,
      totalNetUppf,
      roadExpenses: selectedPnl.roadExpenses,
      maintenance: selectedPnl.maintenance,
      deductionTotal,
      netUppfToProvider,
    }
  }, [selectedPnl, usesServiceCharge])

  async function doDelete() {
    try {
      await dispatch({ type: 'DB_DELETE', key: delConfirm.key, id: delConfirm.id })
      toast('success', 'Deleted.')
      setDelConfirm(null)
    } catch (error) {
      toast('error', error.message || 'Could not delete record.')
    }
  }

  const loadingDates = [...new Set(vehicleLoadings.map(item => item.date).filter(Boolean))].sort((a, b) => b.localeCompare(a))
  const maintenanceDates = [...new Set(vehicleMaintenance.map(item => item.date).filter(Boolean))].sort((a, b) => b.localeCompare(a))

  return (
    <div style={{ animation: 'fadein .3s cubic-bezier(.4,0,.2,1)' }}>
      <PageHeader title="Logistics" actions={<>
        <Button variant="secondary" onClick={() => setVehicleOpen(true)}>+ Register BRV</Button>
        <Button variant="secondary" onClick={() => setRateOpen(true)}>+ Rate Chart</Button>
        <Button variant="secondary" onClick={() => setMaintenanceOpen(true)} disabled={!selectedVehicle}>+ Maintenance</Button>
        <Button onClick={() => setLoadingOpen(true)} disabled={!selectedVehicle}>+ Record Loading</Button>
      </>} />

      <div className="krow">
        <KpiCard label="BRVs Registered" value={totals.vehicles || '-'} note="Fleet register" valueStyle={{ color: 'var(--a)' }} />
        <KpiCard label="Amount Payable" value={totals.payable ? money(totals.payable) : money(0)} note="92.5% of weight x rate" valueStyle={{ color: 'var(--g)' }} />
        <KpiCard label="Total Costs" value={money(totals.fuel + totals.road + totals.maintenance)} note="Fuel + road + maintenance" valueStyle={{ color: 'var(--am)' }} />
        <KpiCard label="Net P&L" value={money(totals.pnl)} note={selectedVehicle ? selectedVehicle.brvNumber : 'Select a BRV'} valueStyle={{ color: totals.pnl >= 0 ? 'var(--g)' : 'var(--r)' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0,1fr)', gap: 16 }}>
        <Card style={{ alignSelf: 'start' }}>
          <CardHeader
            title="BRV Register"
            actions={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => exportRowsAsCsv(
                  'logistics-brvs',
                  ['BRV Number', 'Name', 'Type', 'Capacity Kg', 'Driver', 'Status'],
                  vehicles.map(vehicle => [vehicle.brvNumber || '', vehicle.name || '', vehicle.type || '', vehicle.capacityKg || '', vehicle.driver || '', vehicle.status || '']),
                )}
              >
                Export CSV
              </Button>
            }
          />
          <CardBody>
            {!vehicles.length ? (
              <EmptyState icon="TR" message="No BRVs registered yet" sub="Register your LPG tankers and BRVs to begin tracking daily loadings and P&L." />
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {vehicles.map(vehicle => {
                  const count = loadings.filter(loading => loading.vehicleId === vehicle.id).length
                  const maintenanceCount = maintenanceRecords.filter(item => item.vehicleId === vehicle.id).length
                  return (
                    <button
                      key={vehicle.id}
                      type="button"
                      onClick={() => setSelectedVehicleId(vehicle.id)}
                      style={{
                        textAlign: 'left',
                        border: `1.5px solid ${selectedVehicle?.id === vehicle.id ? 'var(--a)' : 'var(--b)'}`,
                        background: selectedVehicle?.id === vehicle.id ? 'var(--as)' : 'var(--w)',
                        borderRadius: 14,
                        padding: '14px 16px',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0D0F14' }}>{vehicle.brvNumber}</div>
                      <div style={{ fontSize: 12, color: 'var(--m)', marginTop: 4 }}>{vehicle.name || vehicle.type || 'Fleet vehicle'}</div>
                      <div style={{ display: 'grid', gap: 4, marginTop: 10, fontSize: 11, color: 'var(--m)' }}>
                        <span>{vehicle.driver || 'No driver set'}</span>
                        <span>{count} loading{count === 1 ? '' : 's'} and {maintenanceCount} maintenance record{maintenanceCount === 1 ? '' : 's'}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <div style={{ display: 'grid', gap: 16 }}>
          <Card>
            <CardHeader
              title={selectedVehicle ? `${selectedVehicle.brvNumber} Fleet Summary` : 'Fleet Summary'}
              actions={selectedVehicle && (
                <Button variant="ghost" size="sm" onClick={() => setDelConfirm({ key: 'logisticsVehicles', id: selectedVehicle.id })}>Delete BRV</Button>
              )}
            />
            <CardBody>
              {!selectedVehicle ? (
                <EmptyState icon="LS" message="Select a BRV" sub="Choose a registered BRV from the left to see its loadings, maintenance, and P&L." />
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 12 }}>
                    <Metric label="Vehicle Type" value={selectedVehicle.type || '-'} />
                    <Metric label="Capacity" value={selectedVehicle.capacityKg ? `${selectedVehicle.capacityKg.toLocaleString()} kg` : '-'} />
                    <Metric label="Driver" value={selectedVehicle.driver || '-'} />
                    <Metric label="Status" value={selectedVehicle.status || 'Active'} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
                    <Metric label="Loadings" value={String(vehicleLoadings.length)} />
                    <Metric label="Product Weight" value={`${Number(totals.weight || 0).toLocaleString()} kg`} />
                    <Metric label="Fuel" value={money(totals.fuel)} />
                    <Metric label="Road Expenses" value={money(totals.road)} />
                    <Metric label="Maintenance" value={money(totals.maintenance)} />
                    <Metric label="Net P&L" value={money(totals.pnl)} />
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Rate Chart" actions={<span style={{ fontSize: 11, color: 'var(--m)' }}>Distance auto-fills the rate when there is a matching chart entry.</span>} />
            <CardBody noPad>
              <Table
                columns={['Distance', 'Rate']}
                rows={activeRates.map(item => [`${item.distance} km`, Number(item.rate).toFixed(2)])}
                empty="No rate chart configured"
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={selectedVehicle ? `${selectedVehicle.brvNumber} Records` : 'Records'} />
            <CardBody>
              <Pills
                tabs={[
                  { id: 'loadings', label: `Loadings (${vehicleLoadings.length})` },
                  { id: 'maintenance', label: `Maintenance (${vehicleMaintenance.length})` },
                  { id: 'pnl', label: 'P&L' },
                ]}
                active={tab}
                onChange={setTab}
              />

              {tab === 'loadings' && (
                <>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                    <label style={{ fontSize: 11, color: 'var(--m)' }}>Filter by date:</label>
                    <select value={sheetDate} onChange={event => setSheetDate(event.target.value)} style={filterSelectStyle}>
                      <option value="">All loading dates</option>
                      {loadingDates.map(value => <option key={value} value={value}>{value}</option>)}
                    </select>
                    {(sheetDate) && <Button variant="ghost" size="sm" onClick={() => setSheetDate('')}>Clear</Button>}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => exportRowsAsCsv(
                        `logistics-${selectedVehicle?.brvNumber || 'loadings'}`,
                        ['Date', 'Period', 'Driver', 'Product Weight', 'Location', 'Distance', 'Rate', 'Amount Payable', 'Fuel', 'Road Expenses', 'Product Expense %', 'OMC'],
                        visibleLoadings.map(item => [item.date || '', item.period || '', item.driver || '', item.productWeight || '', item.location || '', item.distance || '', item.rate || '', item.amountPayable || '', item.fuel || '', item.roadExpenses || '', item.productExpensePercent || '', item.omc || '']),
                      )}
                    >
                      Export CSV
                    </Button>
                  </div>
                  <Table
                    columns={['Date', 'Period', 'Driver', 'Product Weight', 'Location', 'Distance', 'Rate', 'Amount Payable', 'Fuel', 'Road Expenses', 'Product Expense %', 'OMC', '']}
                    rows={visibleLoadings.map(item => [
                      item.date || '-',
                      item.period || '-',
                      item.driver || '-',
                      item.productWeight ? `${Number(item.productWeight).toLocaleString()} kg` : '-',
                      item.location || '-',
                      item.distance || '-',
                      item.rate !== null && item.rate !== undefined ? Number(item.rate).toFixed(2) : '-',
                      money(item.amountPayable || 0),
                      item.fuel ? money(item.fuel) : '-',
                      item.roadExpenses ? money(item.roadExpenses) : '-',
                      `${Number(item.productExpensePercent || 0).toFixed(2)}%`,
                      item.omc || '-',
                      <Button variant="ghost" size="sm" onClick={() => setDelConfirm({ key: 'logisticsLoadings', id: item.id })}>Del</Button>,
                    ])}
                    empty="No loading records yet"
                  />
                </>
              )}

              {tab === 'maintenance' && (
                <>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                    <label style={{ fontSize: 11, color: 'var(--m)' }}>Filter by date:</label>
                    <select value={maintenanceDate} onChange={event => setMaintenanceDate(event.target.value)} style={filterSelectStyle}>
                      <option value="">All maintenance dates</option>
                      {maintenanceDates.map(value => <option key={value} value={value}>{value}</option>)}
                    </select>
                    {maintenanceDate && <Button variant="ghost" size="sm" onClick={() => setMaintenanceDate('')}>Clear</Button>}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => exportRowsAsCsv(
                        `logistics-${selectedVehicle?.brvNumber || 'maintenance'}-maintenance`,
                        ['Date', 'Period', 'Description', 'Vendor', 'Amount', 'Notes'],
                        visibleMaintenance.map(item => [item.date || '', item.period || '', item.description || '', item.vendor || '', item.amount || '', item.notes || '']),
                      )}
                    >
                      Export CSV
                    </Button>
                  </div>
                  <Table
                    columns={['Date', 'Period', 'Description', 'Vendor', 'Amount', 'Notes', '']}
                    rows={visibleMaintenance.map(item => [
                      item.date || '-',
                      item.period || '-',
                      item.description || '-',
                      item.vendor || '-',
                      money(item.amount || 0),
                      item.notes || '-',
                      <Button variant="ghost" size="sm" onClick={() => setDelConfirm({ key: 'logisticsMaintenance', id: item.id })}>Del</Button>,
                    ])}
                    empty="No maintenance records yet"
                  />
                </>
              )}

              {tab === 'pnl' && (
                <>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                    <label style={{ fontSize: 11, color: 'var(--m)' }}>Period:</label>
                    <select value={pnlPeriod} onChange={event => setPnlPeriod(event.target.value)} style={filterSelectStyle}>
                      {pnlPeriods.map(value => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </div>
                  {pnlSummary ? (
                    <>
                      <div style={{ border: '1px solid var(--b)', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
                        <div style={{ padding: '14px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--b)', fontWeight: 800 }}>
                          SERVICE PROVIDER, {String(selectedVehicle?.name || selectedVehicle?.brvNumber || 'BRV').toUpperCase()} · {pnlSummary.period}
                        </div>
                        <div style={{ padding: '8px 0' }}>
                          <PnlLine label="Total UPPF Payable to Service Provider" value={pnlSummary.totalUppfPayable} />
                          {usesServiceCharge && <PnlLine label="15% Service Charge to Client" value={-pnlSummary.serviceCharge} negative />}
                          <PnlLine label="Total Net UPPF" value={pnlSummary.totalNetUppf} strong />
                          <div style={{ padding: '14px 16px 8px', fontWeight: 800 }}>Less Repairs and Maintenance for the Month</div>
                          <PnlLine label="ROAD EXPENSES" value={pnlSummary.roadExpenses} />
                          <PnlLine label="MAINTENANCE COST" value={pnlSummary.maintenance} />
                          <PnlLine label="TOTAL" value={pnlSummary.deductionTotal} strong />
                          <PnlLine label="Net UPPF to Service Provider" value={pnlSummary.netUppfToProvider} strong finalRow />
                        </div>
                      </div>
                    </>
                  ) : (
                    <EmptyState icon="PL" message="No P&L records yet" sub="Add loadings and maintenance for this BRV to generate the monthly P&L." />
                  )}
                  <Table
                    columns={usesServiceCharge ? ['Period', 'Loadings', 'UPPF Payable', '15% Charge', 'Net UPPF', 'Road Expenses', 'Maintenance', 'Net to Provider'] : ['Period', 'Loadings', 'UPPF Payable', 'Net UPPF', 'Road Expenses', 'Maintenance', 'Net to Provider']}
                    rows={pnlRows.map(item => {
                      const serviceCharge = usesServiceCharge ? Number((item.amountPayable * 0.15).toFixed(2)) : 0
                      const totalNetUppf = Number((item.amountPayable - serviceCharge).toFixed(2))
                      const netToProvider = Number((totalNetUppf - item.roadExpenses - item.maintenance).toFixed(2))
                      const row = [
                        item.period || '-',
                        item.loadings,
                        money(item.amountPayable),
                      ]
                      if (usesServiceCharge) row.push(`(${money(serviceCharge)})`)
                      row.push(
                        money(totalNetUppf),
                        money(item.roadExpenses),
                        money(item.maintenance),
                        <span style={{ color: netToProvider >= 0 ? 'var(--g)' : 'var(--r)', fontWeight: 700 }}>{money(netToProvider)}</span>,
                      )
                      return row
                    })}
                    empty="No P&L records yet"
                  />
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <VehicleDrawer open={vehicleOpen} onClose={() => setVehicleOpen(false)} dispatch={dispatch} toast={toast} />
      <RateDrawer open={rateOpen} onClose={() => setRateOpen(false)} dispatch={dispatch} toast={toast} />
      {selectedVehicle && <LoadingDrawer open={loadingOpen} onClose={() => setLoadingOpen(false)} dispatch={dispatch} toast={toast} vehicle={selectedVehicle} />}
      {selectedVehicle && <MaintenanceDrawer open={maintenanceOpen} onClose={() => setMaintenanceOpen(false)} dispatch={dispatch} toast={toast} vehicle={selectedVehicle} />}
      <ConfirmModal open={!!delConfirm} onClose={() => setDelConfirm(null)} onConfirm={doDelete} title="Confirm Delete" message="This record will be permanently deleted." />
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, color: 'var(--m)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

function PnlLine({ label, value, negative = false, strong = false, finalRow = false }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 180px',
      gap: 12,
      padding: '10px 16px',
      borderTop: '1px solid var(--b)',
      fontWeight: strong || finalRow ? 800 : 500,
      background: finalRow ? 'var(--bg)' : '#fff',
    }}>
      <div>{label}</div>
      <div style={{ textAlign: 'right', color: negative ? 'var(--r)' : '#0D0F14' }}>
        {negative ? `(${money(Math.abs(value || 0))})` : money(value || 0)}
      </div>
    </div>
  )
}

function VehicleDrawer({ open, onClose, dispatch, toast }) {
  const { register, handleSubmit, reset } = useForm({ defaultValues: { status: 'Active' } })

  async function onSubmit(data) {
    try {
      await dispatch({
        type: 'DB_INSERT',
        key: 'logisticsVehicles',
        record: {
          id: uid('BRV'),
          brvNumber: (data.brvNumber || '').trim().toUpperCase(),
          name: data.name || null,
          type: data.type || null,
          capacityKg: data.capacityKg ? Number(data.capacityKg) : null,
          driver: data.driver || null,
          status: data.status || 'Active',
          notes: data.notes || null,
        },
      })
      toast('success', 'BRV registered.')
      reset({ status: 'Active' })
      onClose()
    } catch (error) {
      toast('error', error.message || 'Could not register BRV.')
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Register BRV / LPG Tanker" footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save BRV</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <Field label="BRV Number"><Input {...register('brvNumber')} placeholder="e.g. BRV-IVECO-01" /></Field>
      <div className="frow">
        <Field label="Vehicle Name"><Input {...register('name')} placeholder="e.g. Scania / Iveco" /></Field>
        <Field label="Type"><Input {...register('type')} placeholder="e.g. LPG Tanker" /></Field>
      </div>
      <div className="frow">
        <Field label="Capacity (KG)"><Input {...register('capacityKg')} type="number" placeholder="0" /></Field>
        <Field label="Driver"><Input {...register('driver')} placeholder="Assigned driver" /></Field>
      </div>
      <Field label="Status"><Select {...register('status')}><option>Active</option><option>Under Maintenance</option><option>Inactive</option></Select></Field>
      <Field label="Notes"><Input {...register('notes')} placeholder="Any notes about this BRV" /></Field>
    </Drawer>
  )
}

function RateDrawer({ open, onClose, dispatch, toast }) {
  const { register, handleSubmit, reset } = useForm()

  async function onSubmit(data) {
    try {
      await dispatch({
        type: 'DB_INSERT',
        key: 'logisticsRates',
        record: {
          id: uid('RATE'),
          distance: Number(data.distance || 0),
          rate: Number(data.rate || 0),
          notes: data.notes || null,
        },
      })
      toast('success', 'Rate chart updated.')
      reset()
      onClose()
    } catch (error) {
      toast('error', error.message || 'Could not save rate.')
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add Distance Rate" footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Rate</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <div className="ibar ib" style={{ marginBottom: 12 }}>
        <span>Adding a distance that already exists will update its rate instead of creating a duplicate.</span>
      </div>
      <div className="frow">
        <Field label="Distance"><Input {...register('distance')} type="number" placeholder="e.g. 140" /></Field>
        <Field label="Rate"><Input {...register('rate')} type="number" step="0.01" placeholder="e.g. 0.47" /></Field>
      </div>
      <Field label="Notes"><Input {...register('notes')} placeholder="Optional route or source note" /></Field>
    </Drawer>
  )
}

function LoadingDrawer({ open, onClose, dispatch, toast, vehicle }) {
  const { state } = useApp()
  const activeRates = useMemo(() => normalizeDistanceRateRows((state.db.logisticsRates || []).length ? state.db.logisticsRates : LOGISTICS_DISTANCE_RATES), [state.db.logisticsRates])
  const { register, handleSubmit, reset, watch, setValue, getValues } = useForm({
    defaultValues: {
      date: today(),
      period: periodFromDate(today()),
      driver: vehicle.driver || '',
      rate: '',
      roadExpenses: 180,
    },
  })

  const dateValue = watch('date')
  const distanceValue = watch('distance')
  const productWeight = Number(watch('productWeight') || 0)
  const rate = Number(watch('rate') || 0)
  const fuel = Number(watch('fuel') || 0)
  const roadExpenses = Number(watch('roadExpenses') || 0)
  const matchedRate = rateFromDistance(distanceValue, activeRates)
  const amountPayable = Number((productWeight * rate * 0.925).toFixed(2))
  const productExpensePercent = amountPayable > 0 ? Number((((fuel + roadExpenses) / amountPayable) * 100).toFixed(2)) : 0

  useEffect(() => {
    const nextPeriod = periodFromDate(dateValue)
    if (nextPeriod && getValues('period') !== nextPeriod) {
      setValue('period', nextPeriod)
    }
  }, [dateValue, getValues, setValue])

  useEffect(() => {
    if (matchedRate !== null && Number(getValues('rate') || 0) !== Number(matchedRate)) {
      setValue('rate', matchedRate)
    }
  }, [distanceValue, getValues, matchedRate, setValue])

  async function onSubmit(data) {
    try {
      await dispatch({
        type: 'DB_INSERT',
        key: 'logisticsLoadings',
        record: {
          id: uid('LOAD'),
          vehicleId: vehicle.id,
          date: data.date,
          period: data.period || periodFromDate(data.date),
          driver: data.driver || null,
          productWeight: productWeight || 0,
          location: data.location || null,
          distance: data.distance ? Number(data.distance) : null,
          rate: rate || 0,
          amountPayable,
          fuel: data.fuel ? Number(data.fuel) : null,
          roadExpenses: data.roadExpenses ? Number(data.roadExpenses) : null,
          productExpensePercent,
          omc: data.omc || null,
        },
      })
      toast('success', 'Loading record saved.')
      reset({
        date: today(),
        period: periodFromDate(today()),
        driver: vehicle.driver || '',
        rate: '',
        roadExpenses: 180,
      })
      onClose()
    } catch (error) {
      toast('error', error.message || 'Could not save loading record.')
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={`Record Loading - ${vehicle.brvNumber}`} footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Loading</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10, marginBottom: 14 }}>
        <Metric label="Matched Rate" value={matchedRate !== null ? Number(matchedRate).toFixed(2) : '-'} />
        <Metric label="Amount Payable" value={money(amountPayable)} />
        <Metric label="Product Expense %" value={`${productExpensePercent.toFixed(2)}%`} />
      </div>
      <div className="frow">
        <Field label="Date"><Input {...register('date')} type="date" /></Field>
        <Field label="Period"><Input {...register('period')} readOnly /></Field>
      </div>
      <div className="frow">
        <Field label="Driver"><Input {...register('driver')} placeholder="Driver name" /></Field>
        <Field label="Product Weight (KG)"><Input {...register('productWeight')} type="number" placeholder="0" /></Field>
      </div>
      <div className="frow">
        <Field label="Location"><Input {...register('location')} placeholder="Destination / loading point" /></Field>
        <Field label="Distance"><Input {...register('distance')} type="number" placeholder="0" /></Field>
      </div>
      <div className="frow">
        <Field label="Rate"><Input {...register('rate')} type="number" step="0.01" placeholder="0.00" /></Field>
        <Field label="Fuel"><Input {...register('fuel')} type="number" step="0.01" placeholder="0.00" /></Field>
      </div>
      <div className="frow">
        <Field label="Road Expenses"><Input {...register('roadExpenses')} type="number" step="0.01" placeholder="0.00" /></Field>
        <Field label="OMC"><Input {...register('omc')} placeholder="OMC / reconciliation note" /></Field>
      </div>
      <div className="ibar ib">
        <span>Rate is pulled automatically from the distance chart when there is a match. Amount payable = 92.5% of product weight x rate. Product expense % = (fuel + road expenses) / amount payable x 100.</span>
      </div>
    </Drawer>
  )
}

function MaintenanceDrawer({ open, onClose, dispatch, toast, vehicle }) {
  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      date: today(),
      period: periodFromDate(today()),
    },
  })

  const dateValue = watch('date')

  useEffect(() => {
    setValue('period', periodFromDate(dateValue))
  }, [dateValue, setValue])

  async function onSubmit(data) {
    try {
      await dispatch({
        type: 'DB_INSERT',
        key: 'logisticsMaintenance',
        record: {
          id: uid('MNT'),
          vehicleId: vehicle.id,
          date: data.date,
          period: data.period || periodFromDate(data.date),
          description: data.description,
          amount: Number(data.amount || 0),
          vendor: data.vendor || null,
          notes: data.notes || null,
        },
      })
      toast('success', 'Maintenance saved.')
      reset({
        date: today(),
        period: periodFromDate(today()),
      })
      onClose()
    } catch (error) {
      toast('error', error.message || 'Could not save maintenance.')
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={`Maintenance - ${vehicle.brvNumber}`} footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Maintenance</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <div className="frow">
        <Field label="Date"><Input {...register('date')} type="date" /></Field>
        <Field label="Period"><Input {...register('period')} readOnly /></Field>
      </div>
      <Field label="Description"><Input {...register('description')} placeholder="e.g. Tyre change, servicing, welding" /></Field>
      <div className="frow">
        <Field label="Amount"><Input {...register('amount')} type="number" step="0.01" placeholder="0.00" /></Field>
        <Field label="Vendor / Garage"><Input {...register('vendor')} placeholder="e.g. Kumasi garage" /></Field>
      </div>
      <Field label="Notes"><Input {...register('notes')} placeholder="Optional note" /></Field>
    </Drawer>
  )
}

const filterSelectStyle = {
  border: '1.5px solid var(--b)',
  borderRadius: 7,
  padding: '5px 10px',
  fontSize: 13,
  outline: 'none',
  background: '#fff',
}
