import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api'

function createInitialState() {
  return {
    db: {
      orders: [],
      customers: [],
      prices: [],
      invoices: [],
      expenses: [],
      stock: [],
      deliveries: [],
      suppliers: [],
      campaigns: [],
      leads: [],
      cnotifs: [],
      anotifs: [],
    },
    deliveredLog: [],
    holding: { elh: [], kum: [], wcd: [] },
    holdingView: { elh: null, kum: null, wcd: null },
    exchangePoints: [],
    stations: [],
    esg: {
      cylRefill: 0,
      bulkDeliveries: 0,
      leakReports: 0,
      safetyTraining: 0,
      treesPlanted: 0,
      wasteKg: 0,
      communityEvents: 0,
      ltiDays: 0,
      femaleStaff: 0,
      totalStaff: 0,
      logs: [],
    },
    cfg: {
      companyName: 'Henos Energy Company Ltd.',
      currency: 'GH₵',
      region: 'Ghana',
      fiscalYear: 'January – December',
      creditLimit: 50000,
      lowStockAlert: true,
      autoInvoice: true,
      theme: 'light',
    },
    darkMode: false,
    toasts: [],
  }
}

function reduceState(state, action) {
  switch (action.type) {
    case 'SET_REMOTE_STATE':
      return {
        ...state,
        ...action.payload,
        db: { ...state.db, ...action.payload.db },
        holding: { ...state.holding, ...action.payload.holding },
        holdingView: { ...state.holdingView, ...action.payload.holdingView },
        esg: { ...state.esg, ...action.payload.esg },
      }

    case 'DB_INSERT': {
      const db = { ...state.db, [action.key]: [action.record, ...state.db[action.key]] }
      return { ...state, db }
    }

    case 'DB_UPDATE': {
      const db = {
        ...state.db,
        [action.key]: state.db[action.key].map(r => r.id === action.id ? { ...r, ...action.patch } : r),
      }
      return { ...state, db }
    }

    case 'DB_DELETE': {
      const db = { ...state.db, [action.key]: state.db[action.key].filter(r => r.id !== action.id) }
      return { ...state, db }
    }

    case 'DELIVERED_LOG_ADD':
      return { ...state, deliveredLog: [action.entry, ...state.deliveredLog] }

    case 'DELIVERED_LOG_SET':
      return { ...state, deliveredLog: action.entries }

    case 'HOLDING_SAVE': {
      const records = state.holding[action.area]
      const existing = records.findIndex(r => r.date === action.record.date)
      const next = existing >= 0
        ? records.map((r, i) => i === existing ? { ...r, rows: action.record.rows } : r)
        : [action.record, ...records]
      return {
        ...state,
        holding: { ...state.holding, [action.area]: next },
        holdingView: { ...state.holdingView, [action.area]: action.record.date },
      }
    }

    case 'HOLDING_DEL': {
      const remaining = state.holding[action.area].filter(r => r.date !== action.date)
      return {
        ...state,
        holding: { ...state.holding, [action.area]: remaining },
        holdingView: { ...state.holdingView, [action.area]: remaining.length ? remaining[0].date : null },
      }
    }

    case 'HOLDING_CLEAR':
      return {
        ...state,
        holding: { ...state.holding, [action.area]: [] },
        holdingView: { ...state.holdingView, [action.area]: null },
      }

    case 'HOLDING_SET_VIEW':
      return { ...state, holdingView: { ...state.holdingView, [action.area]: action.date } }

    case 'EP_SAVE': {
      const exchangePoints = state.exchangePoints.map(ep => {
        if (ep.id !== action.epId) return ep
        const existing = ep.records.findIndex(r => r.date === action.record.date)
        const records = existing >= 0
          ? ep.records.map((r, i) => i === existing ? { ...r, rows: action.record.rows } : r)
          : [action.record, ...ep.records]
        return { ...ep, records, viewDate: action.record.date }
      })
      return { ...state, exchangePoints }
    }

    case 'EP_SET_VIEW':
      return {
        ...state,
        exchangePoints: state.exchangePoints.map(ep => ep.id === action.epId ? { ...ep, viewDate: action.date } : ep),
      }

    case 'EP_DEL_ENTRY':
      return {
        ...state,
        exchangePoints: state.exchangePoints.map(ep => {
          if (ep.id !== action.epId) return ep
          const records = ep.records.filter(r => r.date !== action.date)
          return { ...ep, records, viewDate: records.length ? records[0].date : null }
        }),
      }

    case 'EP_CLEAR':
      return {
        ...state,
        exchangePoints: state.exchangePoints.map(ep => ep.id === action.epId ? { ...ep, records: [], viewDate: null } : ep),
      }

    case 'EP_ADD':
      return { ...state, exchangePoints: [...state.exchangePoints, action.ep] }

    case 'EP_EDIT':
      return {
        ...state,
        exchangePoints: state.exchangePoints.map(ep => ep.id === action.epId ? { ...ep, ...action.patch } : ep),
      }

    case 'EP_DELETE':
      return { ...state, exchangePoints: state.exchangePoints.filter(ep => ep.id !== action.epId) }

    case 'STATION_ADD':
      return { ...state, stations: [...state.stations, action.station] }

    case 'STATION_UPDATE':
      return { ...state, stations: state.stations.map(s => s.id === action.id ? { ...s, ...action.patch } : s) }

    case 'STATION_DELETE':
      return { ...state, stations: state.stations.filter(s => s.id !== action.id) }

    case 'STATION_STOCK_ADD':
      return {
        ...state,
        stations: state.stations.map(s => {
          if (s.id !== action.stId) return s
          const stock = [action.record, ...(s.stock || []).filter(r => r.date !== action.record.date)]
            .sort((a, b) => b.date.localeCompare(a.date))
          return { ...s, stock }
        }),
      }

    case 'ESG_UPDATE':
      return { ...state, esg: { ...state.esg, ...action.patch } }

    case 'ESG_LOG_ADD':
      return { ...state, esg: { ...state.esg, logs: [action.entry, ...state.esg.logs] } }

    case 'CFG_UPDATE':
      return { ...state, cfg: { ...state.cfg, ...action.patch } }

    case 'NOTIF_READ_ONE': {
      const db = {
        ...state.db,
        [action.key]: state.db[action.key].map(n => n.id === action.id ? { ...n, read: true } : n),
      }
      return { ...state, db }
    }

    case 'NOTIF_READ_ALL': {
      const db = { ...state.db, [action.key]: state.db[action.key].map(n => ({ ...n, read: true })) }
      return { ...state, db }
    }

    case 'TOAST_ADD':
      return { ...state, toasts: [...state.toasts, action.toast] }

    case 'TOAST_REMOVE':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) }

    case 'TOGGLE_DARK':
      return { ...state, darkMode: !state.darkMode }

    default:
      return state
  }
}

function normalizeOrder(order) {
  return {
    ...order,
    customer: order.customer?.name || order.customer || '',
    placedBy: order.placedBy?.name || order.placedBy || '',
  }
}

function normalizeInvoice(invoice) {
  return {
    ...invoice,
    customer: invoice.customer?.name || invoice.customer || '',
    items: invoice.items || [],
  }
}

function normalizeStation(station) {
  return {
    ...station,
    stock: (station.readings || station.stock || []).map(reading => ({
      ...reading,
      tanks: reading.tanks || [],
    })),
    readings: undefined,
  }
}

function normalizeExchangePoint(ep) {
  const records = (ep.records || []).map(record => ({ ...record, rows: record.rows || [] }))
  return { ...ep, records, viewDate: records[0]?.date || null }
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const { session, token, canAccess } = useAuth()
  const [state, setState] = useState(createInitialState)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      if (!session || !token) {
        if (!cancelled) setState(createInitialState())
        return
      }

      const next = createInitialState()

      try {
        if (canAccess('commercial') || canAccess('operations')) {
          const orders = await apiGet('/api/orders', token)
          next.db.orders = orders.map(normalizeOrder)
        }

        if (canAccess('commercial')) {
          const [customers, prices, cnotifs] = await Promise.all([
            apiGet('/api/customers', token),
            apiGet('/api/prices', token),
            apiGet('/api/notifications/cnotifs', token),
          ])
          next.db.customers = customers
          next.db.prices = prices
          next.db.cnotifs = cnotifs
        }

        if (canAccess('accounts')) {
          const [invoices, expenses, anotifs] = await Promise.all([
            apiGet('/api/invoices', token),
            apiGet('/api/expenses', token),
            apiGet('/api/notifications/anotifs', token),
          ])
          next.db.invoices = invoices.map(normalizeInvoice)
          next.db.expenses = expenses
          next.db.anotifs = anotifs
        }

        if (canAccess('operations')) {
          const [stock, deliveries, suppliers, deliveredLog, elh, kum, wcd] = await Promise.all([
            apiGet('/api/stock', token),
            apiGet('/api/deliveries', token),
            apiGet('/api/suppliers', token),
            apiGet('/api/deliveries/log', token),
            apiGet('/api/holding/elh', token),
            apiGet('/api/holding/kum', token),
            apiGet('/api/holding/wcd', token),
          ])
          next.db.stock = stock
          next.db.deliveries = deliveries
          next.db.suppliers = suppliers
          next.deliveredLog = deliveredLog
          next.holding = { elh, kum, wcd }
          next.holdingView = {
            elh: elh[0]?.date || null,
            kum: kum[0]?.date || null,
            wcd: wcd[0]?.date || null,
          }
        }

        if (canAccess('marketing')) {
          const [campaigns, leads] = await Promise.all([
            apiGet('/api/campaigns', token),
            apiGet('/api/campaigns/leads', token),
          ])
          next.db.campaigns = campaigns
          next.db.leads = leads
        }

        if (canAccess('stations')) {
          const stations = await apiGet('/api/stations', token)
          next.stations = stations.map(normalizeStation)
        }

        if (canAccess('eazigas')) {
          const exchangePoints = await apiGet('/api/eazigas', token)
          next.exchangePoints = exchangePoints.map(normalizeExchangePoint)
        }

        if (canAccess('esg')) {
          const [metrics, logs] = await Promise.all([
            apiGet('/api/esg/metrics', token),
            apiGet('/api/esg/logs', token),
          ])
          next.esg = { ...next.esg, ...metrics, logs }
        }

        if (!cancelled) {
          setState(current => reduceState(current, { type: 'SET_REMOTE_STATE', payload: next }))
        }
      } catch (error) {
        console.error('Failed to hydrate app data:', error)
      }
    }

    hydrate()
    return () => { cancelled = true }
  }, [session, token, canAccess])

  async function dispatch(action) {
    const current = stateRef.current

    if (!token || !session) {
      setState(prev => reduceState(prev, action))
      return
    }

    try {
      switch (action.type) {
        case 'DB_INSERT':
          await handleInsert(action, current, token, session)
          break
        case 'DB_UPDATE':
          await handleUpdate(action, current, token)
          break
        case 'DB_DELETE':
          await handleDelete(action, token)
          break
        case 'NOTIF_READ_ONE':
          await apiPatch(`/api/notifications/${action.id}/read`, {}, token)
          break
        case 'NOTIF_READ_ALL':
          await apiPatch(`/api/notifications/read-all/${action.key}`, {}, token)
          break
        case 'DELIVERED_LOG_ADD':
          await apiPost('/api/deliveries/log', action.entry, token)
          break
        case 'HOLDING_SAVE':
          await apiPost(`/api/holding/${action.area}`, action.record, token)
          break
        case 'HOLDING_DEL':
          await apiDelete(`/api/holding/${action.area}/${action.date}`, token)
          break
        case 'HOLDING_CLEAR':
          for (const record of current.holding[action.area]) {
            await apiDelete(`/api/holding/${action.area}/${record.date}`, token)
          }
          break
        case 'EP_ADD': {
          const created = await apiPost('/api/eazigas', action.ep, token)
          action = { ...action, ep: normalizeExchangePoint(created) }
          break
        }
        case 'EP_EDIT':
          await apiPatch(`/api/eazigas/${action.epId}`, action.patch, token)
          break
        case 'EP_DELETE':
          await apiDelete(`/api/eazigas/${action.epId}`, token)
          break
        case 'EP_SAVE':
          await apiPost(`/api/eazigas/${action.epId}/records`, action.record, token)
          break
        case 'EP_DEL_ENTRY':
          await apiDelete(`/api/eazigas/${action.epId}/records/${action.date}`, token)
          break
        case 'EP_CLEAR': {
          const ep = current.exchangePoints.find(item => item.id === action.epId)
          for (const record of ep?.records || []) {
            await apiDelete(`/api/eazigas/${action.epId}/records/${record.date}`, token)
          }
          break
        }
        case 'STATION_ADD': {
          const created = await apiPost('/api/stations', stripStationForApi(action.station), token)
          action = { ...action, station: normalizeStation(created) }
          break
        }
        case 'STATION_UPDATE':
          await apiPatch(`/api/stations/${action.id}`, stripStationForApi(action.patch), token)
          break
        case 'STATION_STOCK_ADD':
          await apiPost(`/api/stations/${action.stId}/readings`, action.record, token)
          break
        case 'ESG_UPDATE':
          await apiPatch('/api/esg/metrics', action.patch, token)
          break
        case 'ESG_LOG_ADD':
          await apiPost('/api/esg/logs', action.entry, token)
          break
        default:
          break
      }

      setState(prev => reduceState(prev, action))
      return action.record
    } catch (error) {
      console.error('Action failed:', action, error)
      setState(prev => reduceState(prev, {
        type: 'TOAST_ADD',
        toast: {
          id: `ERR-${Date.now()}`,
          type: 'error',
          message: error.message || 'Could not save your change.',
        },
      }))
      throw error
    }
  }

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

async function handleInsert(action, state, token, session) {
  const { key, record } = action

  switch (key) {
    case 'orders': {
      const customer = record.customerId
        ? { id: record.customerId, name: record.customer || '' }
        : resolveCustomer(state, record.customer)
      const placedById = record.placedById || resolvePlacedById(state, session, record.placedBy)
      const created = await apiPost('/api/orders', {
        ...record,
        customerId: customer.id,
        placedById,
      }, token)
      action.record = normalizeOrder({ ...created, customer: { name: customer.name }, placedBy: { name: record.placedBy || session.name } })
      return
    }

    case 'customers':
      action.record = await apiPost('/api/customers', normalizeBlankStrings(record), token)
      return

    case 'prices':
      action.record = await apiPost('/api/prices', normalizeBlankStrings(record), token)
      return

    case 'invoices': {
      const customer = resolveCustomer(state, record.customer)
      const created = await apiPost('/api/invoices', {
        ...record,
        customerId: customer.id,
        createdById: session.id,
      }, token)
      action.record = normalizeInvoice({ ...created, customer: { name: customer.name } })
      return
    }

    case 'expenses':
      action.record = await apiPost('/api/expenses', { ...record, createdById: session.id }, token)
      return

    case 'stock':
      action.record = await apiPost('/api/stock', normalizeBlankStrings(record), token)
      return

    case 'deliveries':
      action.record = await apiPost('/api/deliveries', normalizeBlankStrings(record), token)
      return

    case 'suppliers':
      action.record = await apiPost('/api/suppliers', normalizeBlankStrings(record), token)
      return

    case 'campaigns':
      action.record = await apiPost('/api/campaigns', normalizeBlankStrings(record), token)
      return

    case 'leads':
      action.record = await apiPost('/api/campaigns/leads', normalizeBlankStrings(record), token)
      return

    case 'cnotifs':
    case 'anotifs':
      action.record = await apiPost('/api/notifications', { ...record, channel: key }, token)
      return

    default:
      return
  }
}

async function handleUpdate(action, state, token) {
  const { key, id, patch } = action

  switch (key) {
    case 'orders':
      await apiPatch(`/api/orders/${id}`, patch, token)
      return
    case 'customers':
      await apiPatch(`/api/customers/${id}`, normalizeBlankStrings(patch), token)
      return
    case 'prices':
      await apiPatch(`/api/prices/${id}`, normalizeBlankStrings(patch), token)
      return
    case 'invoices':
      await apiPatch(`/api/invoices/${id}`, patch, token)
      return
    case 'expenses':
      await apiPatch(`/api/expenses/${id}`, patch, token)
      return
    case 'stock':
      await apiPatch(`/api/stock/${id}`, patch, token)
      return
    case 'deliveries':
      await apiPatch(`/api/deliveries/${id}`, patch, token)
      return
    case 'suppliers':
      await apiPatch(`/api/suppliers/${id}`, patch, token)
      return
    case 'campaigns':
      await apiPatch(`/api/campaigns/${id}`, patch, token)
      return
    case 'leads':
      return
    default:
      return
  }
}

async function handleDelete(action, token) {
  const { key, id } = action
  const routeMap = {
    orders: `/api/orders/${id}`,
    customers: `/api/customers/${id}`,
    prices: `/api/prices/${id}`,
    invoices: `/api/invoices/${id}`,
    expenses: `/api/expenses/${id}`,
    stock: `/api/stock/${id}`,
    deliveries: `/api/deliveries/${id}`,
    suppliers: `/api/suppliers/${id}`,
    campaigns: `/api/campaigns/${id}`,
    leads: `/api/campaigns/leads/${id}`,
  }
  if (routeMap[key]) await apiDelete(routeMap[key], token)
}

function normalizeBlankStrings(record) {
  const next = { ...record }
  Object.keys(next).forEach(key => {
    if (next[key] === '') next[key] = null
  })
  return next
}

function resolveCustomer(state, name) {
  const customer = state.db.customers.find(item => item.name?.trim().toUpperCase() === String(name || '').trim().toUpperCase())
  if (!customer) {
    throw new Error(`Customer "${name}" was not found.`)
  }
  return customer
}

function resolvePlacedById(state, session, placedByName) {
  if (!placedByName || placedByName === session.name) return session.id
  const matchingInvoice = state.db.invoices.find(inv => inv.repName === placedByName)
  return matchingInvoice?.createdById || session.id
}

function stripStationForApi(station) {
  const next = { ...station }
  delete next.stock
  delete next.readings
  delete next.capacity
  return next
}

export function useApp() {
  return useContext(AppContext)
}
