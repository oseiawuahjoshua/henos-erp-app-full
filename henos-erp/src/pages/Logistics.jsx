import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useApp } from '../context/AppContext'
import { useToast } from '../hooks/useToast'
import { exportRowsAsCsv } from '../utils/csv'
import { uid, today, money } from '../utils/helpers'
import { PageHeader, Card, CardBody, CardHeader, Button, Drawer, Field, Input, Select, Table, EmptyState, KpiCard, ConfirmModal } from '../components/ui'

export default function Logistics() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const vehicles = state.db.logisticsVehicles || []
  const loadings = state.db.logisticsLoadings || []
  const [vehicleOpen, setVehicleOpen] = useState(false)
  const [loadingOpen, setLoadingOpen] = useState(false)
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id || null)
  const [delConfirm, setDelConfirm] = useState(null)

  const selectedVehicle = vehicles.find(vehicle => vehicle.id === selectedVehicleId) || vehicles[0] || null
  const vehicleLoadings = useMemo(() => loadings
    .filter(loading => loading.vehicleId === selectedVehicle?.id)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))), [loadings, selectedVehicle])

  const totals = useMemo(() => ({
    vehicles: vehicles.length,
    loadings: vehicleLoadings.length,
    weight: vehicleLoadings.reduce((sum, item) => sum + Number(item.productWeight || 0), 0),
    payable: vehicleLoadings.reduce((sum, item) => sum + Number(item.amountPayable || 0), 0),
  }), [vehicleLoadings, vehicles.length])

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
      <PageHeader title="Logistics" actions={<>
        <Button variant="secondary" onClick={() => setVehicleOpen(true)}>+ Register BRV</Button>
        <Button onClick={() => setLoadingOpen(true)} disabled={!selectedVehicle}>+ Record Loading</Button>
      </>} />

      <div className="krow">
        <KpiCard label="BRVs Registered" value={vehicles.length || '—'} note="Fleet register" valueStyle={{ color: 'var(--a)' }} />
        <KpiCard label="Loadings" value={totals.loadings || '—'} note={selectedVehicle ? selectedVehicle.brvNumber : 'Select a BRV'} valueStyle={{ color: 'var(--g)' }} />
        <KpiCard label="Product Weight" value={totals.weight ? `${Number(totals.weight).toLocaleString()} kg` : '—'} note="Visible records" />
        <KpiCard label="Amount Payable" value={totals.payable ? money(totals.payable) : '—'} note="Auto-calculated at 92.5%" valueStyle={{ color: 'var(--am)' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0,1fr)', gap: 16 }}>
        <Card style={{ alignSelf: 'start' }}>
          <CardHeader title="BRV Register" actions={
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
          } />
          <CardBody>
            {!vehicles.length ? (
              <EmptyState icon="🚛" message="No BRVs registered yet" sub="Register your LPG tankers and BRVs to begin tracking daily loadings." />
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {vehicles.map(vehicle => {
                  const count = loadings.filter(loading => loading.vehicleId === vehicle.id).length
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 10, fontSize: 11, color: 'var(--m)' }}>
                        <span>{vehicle.driver || 'No driver set'}</span>
                        <span>{count} loading{count === 1 ? '' : 's'}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={selectedVehicle ? `${selectedVehicle.brvNumber} Loading Sheet` : 'Loading Sheet'}
            actions={selectedVehicle && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => exportRowsAsCsv(
                    `logistics-${selectedVehicle.brvNumber}`,
                    ['Date', 'Period', 'Driver', 'Product Weight', 'Location', 'Distance', 'Rate', 'Amount Payable', 'Fuel', 'Road Expenses', 'Product Expense %', 'OMC'],
                    vehicleLoadings.map(item => [item.date || '', item.period || '', item.driver || '', item.productWeight || '', item.location || '', item.distance || '', item.rate || '', item.amountPayable || '', item.fuel || '', item.roadExpenses || '', item.productExpensePercent || '', item.omc || '']),
                  )}
                >
                  Export CSV
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDelConfirm({ key: 'logisticsVehicles', id: selectedVehicle.id })}>Delete BRV</Button>
              </div>
            )}
          />
          <CardBody noPad>
            {!selectedVehicle ? (
              <EmptyState icon="📋" message="Select a BRV" sub="Choose a registered BRV from the left to see its daily loading sheet." />
            ) : (
              <>
                <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, borderBottom: '1px solid var(--b)' }}>
                  <Metric label="Vehicle Type" value={selectedVehicle.type || '—'} />
                  <Metric label="Capacity" value={selectedVehicle.capacityKg ? `${selectedVehicle.capacityKg.toLocaleString()} kg` : '—'} />
                  <Metric label="Driver" value={selectedVehicle.driver || '—'} />
                  <Metric label="Status" value={selectedVehicle.status || 'Active'} />
                </div>
                <Table
                  columns={['Date', 'Period', 'Driver', 'Product Weight', 'Location', 'Distance', 'Rate', 'Amount Payable', 'Fuel', 'Road Expenses', 'Product Expense %', 'OMC', '']}
                  rows={vehicleLoadings.map(item => [
                    item.date || '—',
                    item.period || '—',
                    item.driver || '—',
                    item.productWeight ? `${Number(item.productWeight).toLocaleString()} kg` : '—',
                    item.location || '—',
                    item.distance || '—',
                    item.rate !== null && item.rate !== undefined ? Number(item.rate).toFixed(2) : '—',
                    item.amountPayable ? money(item.amountPayable) : money(0),
                    item.fuel ? money(item.fuel) : '—',
                    item.roadExpenses ? money(item.roadExpenses) : '—',
                    `${Number(item.productExpensePercent || 0).toFixed(2)}%`,
                    item.omc || '—',
                    <Button variant="ghost" size="sm" onClick={() => setDelConfirm({ key: 'logisticsLoadings', id: item.id })}>Del</Button>,
                  ])}
                  empty="No loading records yet"
                />
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <VehicleDrawer open={vehicleOpen} onClose={() => setVehicleOpen(false)} dispatch={dispatch} toast={toast} />
      {selectedVehicle && <LoadingDrawer open={loadingOpen} onClose={() => setLoadingOpen(false)} dispatch={dispatch} toast={toast} vehicle={selectedVehicle} />}
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

function LoadingDrawer({ open, onClose, dispatch, toast, vehicle }) {
  const { register, handleSubmit, reset, watch } = useForm({ defaultValues: { date: today(), driver: vehicle.driver || '', rate: '', roadExpenses: 180 } })
  const productWeight = Number(watch('productWeight') || 0)
  const rate = Number(watch('rate') || 0)
  const fuel = Number(watch('fuel') || 0)
  const roadExpenses = Number(watch('roadExpenses') || 0)
  const amountPayable = Number((productWeight * rate * 0.925).toFixed(2))
  const productExpensePercent = amountPayable > 0 ? Number((((fuel + roadExpenses) / amountPayable) * 100).toFixed(2)) : 0

  async function onSubmit(data) {
    try {
      await dispatch({
        type: 'DB_INSERT',
        key: 'logisticsLoadings',
        record: {
          id: uid('LOAD'),
          vehicleId: vehicle.id,
          date: data.date,
          period: data.period ? Number(data.period) : null,
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
      reset({ date: today(), driver: vehicle.driver || '', rate: '', roadExpenses: 180 })
      onClose()
    } catch (error) {
      toast('error', error.message || 'Could not save loading record.')
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={`Record Loading - ${vehicle.brvNumber}`} footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Save Loading</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10, marginBottom: 14 }}>
        <Metric label="Amount Payable" value={money(amountPayable)} />
        <Metric label="Product Expense %" value={`${productExpensePercent.toFixed(2)}%`} />
      </div>
      <div className="frow">
        <Field label="Date"><Input {...register('date')} type="date" /></Field>
        <Field label="Period"><Input {...register('period')} type="number" step="0.01" placeholder="e.g. 2" /></Field>
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
        <span>Amount payable = <strong>92.5%</strong> of <strong>product weight × rate</strong>. Product expense % = <strong>(fuel + road expenses) / amount payable × 100</strong>.</span>
      </div>
    </Drawer>
  )
}
