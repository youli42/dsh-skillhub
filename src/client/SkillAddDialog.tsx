import { useEffect, useState } from 'react'
import { Button, Input, Modal, SegmentedControl } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import { postCatalog, type CatalogPayload, type HomeKind } from './catalog-api.ts'
import type { SkillHubKey } from './locales.ts'
import css from './SkillHubPanel.module.css'

type Mode = 'install' | 'create'
type Home = Extract<HomeKind, 'agent' | 'dsh'>

export interface SkillAddDialogProps {
  open: boolean
  t: Translate<SkillHubKey>
  onClose: () => void
  onSaved: (catalog: CatalogPayload) => void
}

export function SkillAddDialog(props: SkillAddDialogProps) {
  const { t } = props
  const [mode, setMode] = useState<Mode>('install')
  const [home, setHome] = useState<Home>('agent')
  const [sourceDir, setSourceDir] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [whenToUse, setWhenToUse] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!props.open) return
    setMode('install')
    setHome('agent')
    setSourceDir('')
    setName('')
    setDescription('')
    setWhenToUse('')
    setBody('')
    setError(undefined)
    setBusy(false)
  }, [props.open])

  const submit = async () => {
    if (busy) return
    setBusy(true)
    setError(undefined)
    try {
      const catalog = mode === 'install'
        ? await postCatalog('/install', { sourceDir: sourceDir.trim(), home })
        : await postCatalog('/skill/create', {
          home,
          name: name.trim(),
          description: description.trim(),
          whenToUse: whenToUse.trim(),
          body,
        })
      props.onSaved(catalog)
    } catch (caught) {
      setError(String(caught))
    } finally {
      setBusy(false)
    }
  }

  return <Modal
    open={props.open}
    onClose={props.onClose}
    title={t('skill.add.title')}
    closeLabel={t('close')}
    contentClassName={css.dialogBody}
    footer={<>
      <Button variant="outline" size="sm" disabled={busy} onClick={props.onClose}>{t('cancel')}</Button>
      <Button variant="primary" size="sm" disabled={busy} onClick={() => void submit()}>
        {t(busy ? 'skill.add.saving' : mode === 'install' ? 'skill.add.install' : 'skill.add.create')}
      </Button>
    </>}
  >
    <div className={css.formGrid}>
      <SegmentedControl
        id="skillhub-skill-add-mode"
        value={mode}
        options={[
          { value: 'install', label: t('skill.add.modeInstall') },
          { value: 'create', label: t('skill.add.modeCreate') },
        ]}
        onChange={next => setMode(next)}
        label={t('skill.add.title')}
        disabled={busy}
      />
      {mode === 'install' ? <>
        <label className={css.field}>
          <span className={css.fieldLabel}>{t('skill.add.path')}</span>
          <Input value={sourceDir} disabled={busy} data-modal-autofocus
            placeholder={t('skill.add.pathHint')} aria-label={t('skill.add.path')}
            onChange={event => setSourceDir(event.currentTarget.value)} />
          <span className={css.fieldHint}>{t('skill.add.pathNote')}</span>
        </label>
      </> : <>
        <label className={css.field}>
          <span className={css.fieldLabel}>{t('skill.add.name')}</span>
          <Input value={name} disabled={busy} data-modal-autofocus
            placeholder="my-skill" aria-label={t('skill.add.name')}
            onChange={event => setName(event.currentTarget.value)} />
          <span className={css.fieldHint}>{t('skill.add.nameHint')}</span>
        </label>
        <label className={css.field}>
          <span className={css.fieldLabel}>{t('skill.add.description')}</span>
          <Input value={description} disabled={busy} aria-label={t('skill.add.description')}
            onChange={event => setDescription(event.currentTarget.value)} />
        </label>
        <label className={css.field}>
          <span className={css.fieldLabel}>{t('skill.add.whenToUse')}</span>
          <Input value={whenToUse} disabled={busy} aria-label={t('skill.add.whenToUse')}
            onChange={event => setWhenToUse(event.currentTarget.value)} />
        </label>
        <label className={css.field}>
          <span className={css.fieldLabel}>{t('skill.add.body')}</span>
          <textarea className={css.textarea} rows={8} value={body} disabled={busy}
            placeholder={t('skill.add.bodyHint')} aria-label={t('skill.add.body')}
            onChange={event => setBody(event.currentTarget.value)} />
        </label>
      </>}
      <div className={css.field}>
        <span className={css.fieldLabel}>{t('skill.add.home')}</span>
        <SegmentedControl
          id="skillhub-skill-add-home"
          value={home}
          options={[
            { value: 'agent', label: t('home.agent') },
            { value: 'dsh', label: t('home.dsh') },
          ]}
          onChange={next => setHome(next)}
          label={t('skill.add.home')}
          disabled={busy}
        />
        <span className={css.fieldHint}>{t('skill.add.homeHint')}</span>
      </div>
      {error !== undefined ? <p className={css.error} role="alert">{error}</p> : null}
    </div>
  </Modal>
}
