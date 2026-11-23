import { useEffect, useState } from 'react'
import { Modal, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import { fetchManagedAudit, type ManagedAuditEntry } from './catalog-api.ts'
import type { SkillHubKey } from './locales.ts'
import css from './SkillHubPanel.module.css'

function actionLabel(t: Translate<SkillHubKey>, action: string): string {
  if (action === 'server.create') return t('record.create')
  if (action === 'server.update') return t('record.update')
  if (action === 'server.delete') return t('record.delete')
  if (action === 'server.enable') return t('record.enable')
  if (action === 'server.disable') return t('record.disable')
  if (action === 'server.restart') return t('record.restart')
  if (action === 'secret.set') return t('record.secretSet')
  if (action === 'secret.clear') return t('record.secretClear')
  return action
}

export function ManagedMcpRecords(props: {
  open: boolean
  server?: string | undefined
  t: Translate<SkillHubKey>
  onClose: () => void
}) {
  const { t, server } = props
  const [entries, setEntries] = useState<ManagedAuditEntry[]>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!props.open) return
    let cancelled = false
    setEntries(undefined)
    setError(undefined)
    void fetchManagedAudit(server)
      .then(rows => { if (!cancelled) setEntries(rows) })
      .catch((caught: unknown) => { if (!cancelled) setError(String(caught)) })
    return () => { cancelled = true }
  }, [props.open, server])

  return <Modal
    open={props.open}
    onClose={props.onClose}
    title={server === undefined ? t('record.titleAll') : t('record.title', { name: server })}
    closeLabel={t('close')}
    contentClassName={css.dialogBody}
  >
    <p className={css.fieldHint}>{t('record.hint')}</p>
    {error !== undefined ? <p className={css.error} role="alert">{error}</p> : null}
    {entries === undefined && error === undefined ? <p className={css.empty}>{t('loading')}</p> : null}
    {entries !== undefined && entries.length === 0 ? <p className={css.empty}>{t('record.empty')}</p> : null}
    {entries !== undefined && entries.length > 0 ? <ol className={css.recordList}>
      {entries.map((entry, index) => <li className={css.recordRow} key={`${entry.at}:${index}`}>
        <span className={css.recordTime}>{new Date(entry.at).toLocaleString()}</span>
        <span className={css.recordAction}>{actionLabel(t, entry.action)}</span>
        <Tag tone={entry.result === 'ok' ? 'quiet' : 'danger'}>
          {entry.result === 'ok' ? t('record.ok') : t('record.failed')}
        </Tag>
        {entry.fields !== undefined && entry.fields.length > 0
          ? <span className={css.recordDetail}>{entry.fields.join(', ')}</span> : null}
        {entry.error !== undefined ? <span className={css.recordDetail}>{entry.error}</span> : null}
      </li>)}
    </ol> : null}
  </Modal>
}
