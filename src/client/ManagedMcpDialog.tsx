import { useEffect, useState } from 'react'
import { Button, Checkbox, Input, Modal, SegmentedControl, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import { postManaged, type ManagedPayload, type ManagedSecret, type ManagedServer } from './catalog-api.ts'
import type { SkillHubKey } from './locales.ts'
import css from './SkillHubPanel.module.css'

type Kind = 'stdio' | 'streamable-http'
type SecretRow = {
  key: string
  value: string
  clear: boolean
  configured: boolean
  masked?: string
}

function rowsOf(fields: readonly ManagedSecret[]): SecretRow[] {
  return fields.map(field => ({
    key: field.key,
    value: '',
    clear: false,
    configured: field.configured,
    ...field.masked === undefined ? {} : { masked: field.masked },
  }))
}

function emptyRow(): SecretRow {
  return { key: '', value: '', clear: false, configured: false }
}

function fieldPayload(rows: readonly SecretRow[]): { key: string; value?: string; clear?: boolean }[] {
  return rows
    .filter(row => row.key.trim() !== '')
    .map(row => ({
      key: row.key.trim(),
      ...row.value !== '' ? { value: row.value } : {},
      ...row.clear ? { clear: true } : {},
    }))
}

export interface ManagedMcpDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  server?: ManagedServer | undefined
  t: Translate<SkillHubKey>
  onClose: () => void
  onSaved: (payload: ManagedPayload) => void
}

export function ManagedMcpDialog(props: ManagedMcpDialogProps) {
  const { t, mode, server } = props
  const [name, setName] = useState('')
  const [transport, setTransport] = useState<Kind>('stdio')
  const [command, setCommand] = useState('')
  const [argsText, setArgsText] = useState('')
  const [cwd, setCwd] = useState('')
  const [url, setUrl] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [env, setEnv] = useState<SecretRow[]>([])
  const [headers, setHeaders] = useState<SecretRow[]>([])
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!props.open) return
    setError(undefined)
    setBusy(false)
    if (mode === 'edit' && server !== undefined) {
      setName(server.name)
      setTransport(server.transport)
      setCommand(server.command)
      setArgsText(server.args.join('\n'))
      setCwd(server.cwd)
      setUrl(server.url)
      setEnabled(server.enabled)
      setEnv(rowsOf(server.env))
      setHeaders(rowsOf(server.headers))
    } else {
      setName('')
      setTransport('stdio')
      setCommand('')
      setArgsText('')
      setCwd('')
      setUrl('')
      setEnabled(true)
      setEnv([])
      setHeaders([])
    }
  }, [props.open, mode, server])

  const updateRow = (kind: 'env' | 'headers', index: number, patch: Partial<SecretRow>) => {
    const setter = kind === 'env' ? setEnv : setHeaders
    setter(current => current.map((row, at) => at === index ? { ...row, ...patch } : row))
  }
  const addRow = (kind: 'env' | 'headers') => {
    const setter = kind === 'env' ? setEnv : setHeaders
    setter(current => [...current, emptyRow()])
  }
  const removeRow = (kind: 'env' | 'headers', index: number) => {
    const setter = kind === 'env' ? setEnv : setHeaders
    setter(current => current.filter((_row, at) => at !== index))
  }

  const save = async () => {
    if (busy) return
    setBusy(true)
    setError(undefined)
    try {
      const args = argsText.split('\n').filter(line => line !== '')
      const payload = {
        name: name.trim(),
        transport,
        ...transport === 'stdio'
          ? { command: command.trim(), args, cwd: cwd.trim() }
          : { url: url.trim() },
        ...transport === 'stdio' ? { env: fieldPayload(env) } : { headers: fieldPayload(headers) },
        enabled,
        ...mode === 'edit' && server !== undefined ? { expectedRevision: server.revision } : {},
      }
      const result = await postManaged(mode === 'create' ? 'create' : 'update', payload)
      props.onSaved(result)
    } catch (caught) {
      setError(String(caught))
    } finally {
      setBusy(false)
    }
  }

  const label = (key: SkillHubKey) => t(key)
  const secretRows = (kind: 'env' | 'headers', rows: readonly SecretRow[]) => <div className={css.field}>
    <span className={css.fieldLabel}>{label(kind === 'env' ? 'mcp.form.env' : 'mcp.form.headers')}</span>
    <p className={css.fieldHint}>{label('mcp.form.secretHint')}</p>
    {rows.map((row, index) => <div className={css.secretRow} key={`${kind}:${index}`}>
      <Input className={css.secretKey} value={row.key} disabled={busy}
        placeholder={label('mcp.form.key')} aria-label={label('mcp.form.key')}
        onChange={event => updateRow(kind, index, { key: event.currentTarget.value })} />
      <Input className={css.secretValue} type="password" value={row.value} disabled={busy || row.clear}
        autoComplete="new-password" placeholder={row.configured && row.masked !== undefined ? row.masked : label('mcp.form.value')}
        aria-label={label('mcp.form.value')}
        onChange={event => updateRow(kind, index, { value: event.currentTarget.value })} />
      <div className={css.secretActions}>
        {row.configured ? <Tag tone={row.clear ? 'warning' : 'quiet'}>
          {label(row.clear ? 'mcp.form.clearPending' : 'mcp.form.saved')}
        </Tag> : null}
        {row.configured ? <Button type="button" variant="ghost" size="sm" disabled={busy}
          onClick={() => updateRow(kind, index, { clear: !row.clear, value: '' })}>
          {label(row.clear ? 'mcp.form.keep' : 'mcp.form.clear')}
        </Button> : null}
        <Button type="button" variant="ghost" size="sm" disabled={busy}
          onClick={() => removeRow(kind, index)}>{label('mcp.form.remove')}</Button>
      </div>
    </div>)}
    <Button type="button" variant="outline" size="sm" disabled={busy}
      onClick={() => addRow(kind)}>{label(kind === 'env' ? 'mcp.form.addEnv' : 'mcp.form.addHeader')}</Button>
  </div>

  return <Modal
    open={props.open}
    onClose={props.onClose}
    title={label(mode === 'create' ? 'mcp.form.createTitle' : 'mcp.form.editTitle')}
    closeLabel={label('close')}
    contentClassName={css.dialogBody}
    footer={<>
      <Button variant="outline" size="sm" disabled={busy} onClick={props.onClose}>{label('cancel')}</Button>
      <Button variant="primary" size="sm" disabled={busy} onClick={() => void save()}>
        {label(busy ? 'mcp.form.saving' : mode === 'create' ? 'mcp.form.create' : 'mcp.form.save')}
      </Button>
    </>}
  >
    <div className={css.formGrid}>
      <label className={css.field}>
        <span className={css.fieldLabel}>{label('mcp.form.name')}</span>
        <Input value={name} disabled={busy || mode === 'edit'} data-modal-autofocus
          placeholder={label('mcp.form.nameHint')} aria-label={label('mcp.form.name')}
          onChange={event => setName(event.currentTarget.value)} />
      </label>
      <div className={css.field}>
        <span className={css.fieldLabel}>{label('mcp.form.transport')}</span>
        <SegmentedControl
          id="skillhub-mcp-transport"
          value={transport}
          options={[
            { value: 'stdio', label: label('mcp.form.stdio') },
            { value: 'streamable-http', label: label('mcp.form.http') },
          ]}
          onChange={next => setTransport(next)}
          label={label('mcp.form.transport')}
          disabled={busy}
        />
      </div>
      {transport === 'stdio' ? <>
        <label className={css.field}>
          <span className={css.fieldLabel}>{label('mcp.form.command')}</span>
          <Input value={command} disabled={busy} placeholder={label('mcp.form.commandHint')}
            aria-label={label('mcp.form.command')}
            onChange={event => setCommand(event.currentTarget.value)} />
        </label>
        <label className={css.field}>
          <span className={css.fieldLabel}>{label('mcp.form.args')}</span>
          <textarea className={css.textarea} value={argsText} disabled={busy} rows={3}
            placeholder={label('mcp.form.argsHint')} aria-label={label('mcp.form.args')}
            onChange={event => setArgsText(event.currentTarget.value)} />
          <span className={css.fieldHint}>{label('mcp.form.argsHint')}</span>
        </label>
        <label className={css.field}>
          <span className={css.fieldLabel}>{label('mcp.form.cwd')}</span>
          <Input value={cwd} disabled={busy} placeholder={label('mcp.form.cwdHint')}
            aria-label={label('mcp.form.cwd')}
            onChange={event => setCwd(event.currentTarget.value)} />
        </label>
        {secretRows('env', env)}
      </> : <>
        <label className={css.field}>
          <span className={css.fieldLabel}>{label('mcp.form.url')}</span>
          <Input value={url} disabled={busy} placeholder="https://example.com/mcp"
            aria-label={label('mcp.form.url')}
            onChange={event => setUrl(event.currentTarget.value)} />
        </label>
        {secretRows('headers', headers)}
      </>}
      <label className={css.checkRow}>
        <Checkbox checked={enabled} disabled={busy} label={label('mcp.form.enabled')}
          onChange={setEnabled} />
      </label>
      <p className={css.fieldHint}>{label('mcp.form.enabledHint')}</p>
      {error !== undefined ? <p className={css.error} role="alert">{error}</p> : null}
    </div>
  </Modal>
}
