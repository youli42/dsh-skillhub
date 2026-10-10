import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const packageRoot = dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))

function resolveHarness(): string {
  const configured = process.env.DSHX_HARNESS?.trim()
  if (configured) return resolve(configured)
  const configPath = join(homedir(), '.config/dshx/harness')
  const recorded = existsSync(configPath) ? readFileSync(configPath, 'utf8').trim() : undefined
  if (!recorded) throw new Error('Set DSHX_HARNESS to the supported DSH checkout before building')
  return resolve(recorded)
}

// Read the target's platform table; all outputs remain in this plugin directory.
const harnessRoot = resolveHarness()
process.env.DSHX_HARNESS = harnessRoot
const adapter = join(harnessRoot, 'tools/dshx/src/client-build.js')
if (!existsSync(adapter)) throw new Error(`DSHX client build adapter not found: ${adapter}`)
const { externalClientBundle } = await import(pathToFileURL(adapter).href)
const builds = externalClientBundle(manifest.name, ['lib/types/dsh-skillhub.js'], {
  packageRoot,
  clientEntry: 'src/client/index.tsx',
})

// Published clients do not contain source maps or local build-directory names.
const client = builds[1]
client.sourcemap = false
client.plugins.push({
  name: 'portable-output',
  generateBundle(_options: unknown, output: Record<string, { type?: string; code?: string }>) {
    const bundle = output['client.js']
    if (bundle?.type !== 'chunk' || typeof bundle.code !== 'string') {
      throw new Error('client.js was not emitted')
    }
    bundle.code = bundle.code.replace(
      /^([ \t]*\/\/#region \\0dshx-css-module:).*[\\/]([^/\\\r\n]+\.module\.css\.mjs)(\r?)$/gmu,
      '$1$2$3',
    )
    if (/(?:^|[\s"'`=(])(?:\/(?:Users|home|opt|var|tmp|private|agent)\/|[A-Za-z]:\\)/.test(bundle.code)) {
      throw new Error('client.js contains a non-portable absolute path')
    }
  },
})

export default builds
