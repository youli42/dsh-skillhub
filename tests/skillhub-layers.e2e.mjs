/** Real registry/filesystem regression for this checkout's built SkillHub.
 * All skills and visibility documents are isolated under temporary directories.
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const RUNTIME = process.env.DSHX_HARNESS
if (!RUNTIME) throw new Error('Set DSHX_HARNESS for the real registry integration test')
const harnessFile = path => pathToFileURL(join(RUNTIME, path)).href
const SKILLHUB = new URL('../lib/types/', import.meta.url).href

const { Context } = await import('@deepseek-ai/cordis')
const SkillRegistry = (await import(harnessFile('packages/skill/skill/lib/index.js'))).default
const SkillFileSystem = await import(harnessFile('packages/skill/skill-filesystem/lib/index.js'))
const { createScope, scopeOf } = await import(harnessFile('packages/core/scope/lib/index.js'))
const { SkillHub } = await import(`${SKILLHUB}hub.js`)
const { createSkillHubProvider } = await import(`${SKILLHUB}provider.js`)

async function writeSkill(root, name) {
  const dir = join(root, name)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${name} desc\n---\n\nBody for ${name}.\n`)
}

const rows = []
function check(label, ok, detail = '') {
  rows.push({ ok, label, detail })
  if (!ok) throw new Error(`FAILED: ${label} ${detail}`)
}

const home = await mkdtemp(join(tmpdir(), 'skillhub-e2e-'))
const project = await mkdtemp(join(tmpdir(), 'skillhub-e2e-project-'))
const presetSkills = join(home, 'preset', 'skills')
const agentsSkills = join(home, '.agents', 'skills')
const dshSkills = join(home, '.dsh', 'skills')
const sessionId = 'session-e2e'
try {
  // Fixture: the real layout, plus a bulk that a sample could not fake.
  await writeSkill(presetSkills, 'creator-mode-plus')
  await writeSkill(agentsSkills, 'shared-skill')
  await writeSkill(agentsSkills, 'other-agents-skill')
  await writeSkill(dshSkills, 'dsh-only-skill')
  for (let index = 0; index < 40; index += 1) await writeSkill(agentsSkills, `bulk-skill-${String(index).padStart(2, '0')}`)

  const hub = new SkillHub({ agentHome: agentsSkills, dshHome: dshSkills, storeDir: join(home, 'store') })

  const ctx = new Context()
  await ctx.plugin(SkillRegistry)
  // The preset row exactly as the fixed config now declares it.
  await ctx.plugin(SkillFileSystem, {
    providerName: 'preset-filesystem',
    includeDefaultRoots: false,
    dshHome: join(home, '.dsh'),
    agentsHome: join(home, '.agents'),
    customSkillDirs: [presetSkills],
    watch: false,
  })
  // Deployment provider (SkillHub) in the global layer.
  let control
  await ctx.plugin({
    name: 'skillhub-provider',
    inject: ['skills'],
    apply(inner) {
      inner.skills.registerProvider((next) => {
        control = next
        return createSkillHubProvider(hub)
      })
    },
  })
  // The per-agent registration the plugin makes on agent/created, with its chat bound.
  const scope = createScope(ctx, { session: { id: sessionId, header: { id: sessionId, cwd: project } } })
  await scope.ctx.plugin({
    name: 'skillhub-agent-provider',
    inject: ['skills'],
    apply(inner) {
      inner.skills.registerProvider(() => createSkillHubProvider(hub, sessionId))
    },
  })

  const read = async (readScope) =>
    (await ctx.skills.list({ cwd: project, scope: scopeOf(readScope) })).filter(skill => skill.invocation.modelInvocable).map(skill => skill.name).sort()
  const modelCatalog = () => read(scope.ctx)
  const has = async (name) => (await modelCatalog()).includes(name)

  // 1. Both halves are served: the preset's own skill and SkillHub's homes.
  const initial = await modelCatalog()
  check('preset keeps its own skill', initial.includes('creator-mode-plus'))
  check('SkillHub serves the agent home', initial.includes('shared-skill'))
  check('SkillHub serves the dsh home', initial.includes('dsh-only-skill'))
  check('the whole home is served, not a sample', initial.filter(n => n.startsWith('bulk-skill-')).length === 40, String(initial.length))

  // 2. GLOBAL (settings page) reaches the model.
  hub.toggle({ layer: 'global', target: { kind: 'skill', id: 'agent:shared-skill/SKILL.md', on: false } })
  control.invalidate()
  check('global OFF hides it from the model', !(await has('shared-skill')))
  check('global OFF leaves other skills alone', await has('dsh-only-skill'))

  // 3. PROJECT (this workspace) beats global.
  hub.toggle({ layer: 'project', folder: project, target: { kind: 'skill', id: 'agent:shared-skill/SKILL.md', on: true } })
  control.invalidate()
  check('project ON beats global OFF', await has('shared-skill'))
  const elsewhere = hub.catalog({ layer: 'project', folder: join(home, 'other-ws'), resolved: true })
  check('another workspace still follows global OFF', elsewhere.inventory.find(s => s.name === 'shared-skill')?.gate === 'off')

  // 4. CHAT beats the project — the layer that used to be ignored.
  hub.toggle({ layer: 'session', sessionId, folder: project, target: { kind: 'skill', id: 'agent:shared-skill/SKILL.md', on: false } })
  control.invalidate()
  check('chat OFF beats project ON', !(await has('shared-skill')))
  hub.inherit({ layer: 'session', sessionId, folder: project, target: { kind: 'skill', id: 'agent:shared-skill/SKILL.md' } })
  control.invalidate()
  check('chat inherit falls back to the project value', await has('shared-skill'))

  // 5. A NEW chat in this workspace follows the workspace setting.
  const second = createScope(ctx, { session: { id: 'session-e2e-2', header: { id: 'session-e2e-2', cwd: project } } })
  const secondNames = await read(second.ctx)
  check('a new chat inherits the workspace value', secondNames.includes('shared-skill'))

  // 6. The panel and the model agree, and the panel names the deciding layer.
  const displayed = hub.catalog({ layer: 'session', sessionId, folder: project, resolved: true })
  const interesting = ['creator-mode-plus', 'shared-skill', 'dsh-only-skill', 'other-agents-skill']
  // The panel governs the disk homes; the model catalog also carries skills a
  // plugin registered. Parity therefore means: every skill the panel reports as
  // ON is in the model catalog, and nothing it reports as OFF is.
  const panelRows = displayed.inventory.filter(s => interesting.includes(s.name))
  const modelNames = await modelCatalog()
  const disagreements = panelRows
    .filter(s => (s.gate === 'on') !== modelNames.includes(s.name))
    .map(s => `${s.name}:panel=${s.gate}`)
  check('every panel ON is reachable by the model and every panel OFF is not', disagreements.length === 0, disagreements.join(','))
  check('the panel actually saw the governed skills', panelRows.length >= 3, String(panelRows.length))
  check('panel names the layer that decided', displayed.inventory.find(s => s.name === 'shared-skill')?.source === 'project')

  // 7. Global All-Off empties the shared homes but keeps the preset's own skill.
  hub.toggle({ layer: 'global', target: { kind: 'all', on: false } })
  control.invalidate()
  const allOff = await modelCatalog()
  check('global All-Off clears the skills this workspace never overrode', !allOff.includes('dsh-only-skill') && !allOff.includes('bulk-skill-00'))
  check('global All-Off reaches a previously changed workspace', !allOff.includes('shared-skill'))
  check('global All-Off keeps the preset-owned skill', allOff.includes('creator-mode-plus'), JSON.stringify(allOff))
  // …and a brand-new workspace with no override follows the global default.
  const freshScope = createScope(ctx, { session: { id: 'session-e2e-3', header: { id: 'session-e2e-3', cwd: join(home, 'fresh-ws') } } })
  const freshProject = join(home, 'fresh-ws')
  await freshScope.ctx.plugin({
    name: 'skillhub-agent-provider-3',
    inject: ['skills'],
    apply(inner) { inner.skills.registerProvider(() => createSkillHubProvider(hub, 'session-e2e-3')) },
  })
  const fresh = await read(freshScope.ctx)
  check('new chats also see the latest global operation', !fresh.includes('shared-skill'))

  console.log('\n===== SkillHub end-to-end on the real registry + filesystem provider =====')
  for (const row of rows) console.log(`  PASS  ${row.label}${row.detail === '' ? '' : `  (${row.detail})`}`)
  console.log(`\n  ${rows.length}/${rows.length} checks passed\n`)
} finally {
  await rm(home, { recursive: true, force: true })
  await rm(project, { recursive: true, force: true })
}
