import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useApp } from '../context/AppContext'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../hooks/useToast'
import { formatAccraDate, today, uid } from '../utils/helpers'
import { PageHeader, Panel, PanelHeader, PanelBody, Button, Drawer, Field, Input, Select, Badge, EmptyState, ConfirmModal } from '../components/ui'

const UPDATE_TYPES = ['General', 'Operations', 'Commercial', 'Accounts', 'HR', 'Safety']

export default function Updates() {
  const { state, dispatch } = useApp()
  const { session } = useAuth()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [delConfirm, setDelConfirm] = useState(null)
  const canPublish = session?.role === 'admin' || session?.role === 'manager'

  const updates = useMemo(() => {
    return [...state.db.broadcasts].sort((a, b) => new Date(b.createdAt || b.time || 0) - new Date(a.createdAt || a.time || 0))
  }, [state.db.broadcasts])

  async function doDelete() {
    try {
      await dispatch({ type: 'DB_DELETE', key: 'broadcasts', id: delConfirm.id })
      toast('success', 'Update removed.')
      setDelConfirm(null)
    } catch (error) {
      toast('error', error.message || 'Could not remove update.')
    }
  }

  return (
    <div style={{ animation: 'fadein .3s cubic-bezier(.4,0,.2,1)' }}>
      <PageHeader title="Updates" actions={canPublish ? <Button onClick={() => setOpen(true)}>+ New Update</Button> : null} />

      <Panel>
        <PanelHeader title="Company Feed" actions={<Badge variant="info">{updates.length} post{updates.length === 1 ? '' : 's'}</Badge>} />
        <PanelBody>
          {!updates.length ? (
            <EmptyState icon="UP" message="No company updates yet" sub="Manager announcements will appear here for everyone to see." />
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {updates.map(item => (
                <article key={item.id} style={{ border: '1.5px solid var(--b)', borderRadius: 16, padding: '16px 18px', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.25 }}>{item.title}</h3>
                        <Badge variant="info">{item.type || 'General'}</Badge>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--m)' }}>
                        Posted by {item.author || item.createdBy || 'Management'} on {item.createdAt ? formatAccraDate({ day: '2-digit', month: 'short', year: 'numeric' }, item.createdAt) : item.time || today()}
                      </div>
                    </div>
                    {canPublish && (
                      <Button variant="ghost" size="sm" onClick={() => setDelConfirm({ id: item.id })}>Delete</Button>
                    )}
                  </div>
                  <p style={{ marginTop: 12, fontSize: 13, lineHeight: 1.7, color: '#243041', whiteSpace: 'pre-wrap' }}>{item.message}</p>
                </article>
              ))}
            </div>
          )}
        </PanelBody>
      </Panel>

      {canPublish && <UpdateDrawer open={open} onClose={() => setOpen(false)} dispatch={dispatch} toast={toast} session={session} />}
      <ConfirmModal open={!!delConfirm} onClose={() => setDelConfirm(null)} onConfirm={doDelete} title="Delete Update" message="This company update will be removed for everyone." />
    </div>
  )
}

function UpdateDrawer({ open, onClose, dispatch, toast, session }) {
  const { register, handleSubmit, reset } = useForm({ defaultValues: { type: 'General' } })

  async function onSubmit(data) {
    try {
      await dispatch({
        type: 'DB_INSERT',
        key: 'broadcasts',
        record: {
          id: uid('UP'),
          title: data.title,
          message: data.message,
          type: data.type || 'General',
          time: today(),
          author: session?.name || 'Management',
          createdBy: session?.id || null,
        },
      })
      toast('success', 'Update published.')
      reset({ type: 'General', title: '', message: '' })
      onClose()
    } catch (error) {
      toast('error', error.message || 'Could not publish update.')
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Publish Update"
      footer={<><Button className="btnfw" onClick={handleSubmit(onSubmit)}>Publish</Button><Button variant="ghost" className="btnfw" onClick={onClose}>Cancel</Button></>}
    >
      <Field label="Title"><Input {...register('title')} placeholder="Short headline for the team" /></Field>
      <Field label="Category">
        <Select {...register('type')}>
          {UPDATE_TYPES.map(type => <option key={type}>{type}</option>)}
        </Select>
      </Field>
      <Field label="Message">
        <textarea
          {...register('message')}
          placeholder="Write the update you want everyone to see..."
          style={{ minHeight: 160, resize: 'vertical', border: '1.5px solid var(--b)', borderRadius: 7, padding: '10px 11px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
        />
      </Field>
    </Drawer>
  )
}
