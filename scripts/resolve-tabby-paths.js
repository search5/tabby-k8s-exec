#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const os = require('os')

function findBuiltinPluginsDir () {
    let candidates
    switch (process.platform) {
        case 'darwin':
            candidates = [
                '/Applications/Tabby.app/Contents/Resources/builtin-plugins',
            ]
            break
        case 'win32': {
            const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
            const programFiles = process.env.ProgramFiles || 'C:\\Program Files'
            candidates = [
                path.join(localAppData, 'Programs', 'Tabby', 'resources', 'builtin-plugins'),
                path.join(programFiles, 'Tabby', 'resources', 'builtin-plugins'),
            ]
            break
        }
        default:
            candidates = [
                '/opt/Tabby/resources/builtin-plugins',
                '/usr/lib/tabby/resources/builtin-plugins',
                '/usr/share/tabby/resources/builtin-plugins',
            ]
            break
    }
    return candidates.find(p => fs.existsSync(p))
}

const dir = findBuiltinPluginsDir()

if (!dir) {
    console.error(`[resolve-tabby-paths] Could not locate a Tabby installation for platform '${process.platform}'.`)
    console.error('[resolve-tabby-paths] Install Tabby first, or edit tsconfig.paths.json manually.')
    process.exit(1)
}

const paths = {
    'tabby-core': [path.join(dir, 'tabby-core')],
    'tabby-ssh': [path.join(dir, 'tabby-ssh')],
    'tabby-terminal': [path.join(dir, 'tabby-terminal')],
}

const outPath = path.join(__dirname, '..', 'tsconfig.paths.json')
fs.writeFileSync(outPath, JSON.stringify({ compilerOptions: { paths } }, null, 4) + '\n')

console.log(`[resolve-tabby-paths] Detected Tabby builtin-plugins at ${dir}`)
console.log(`[resolve-tabby-paths] Wrote ${outPath}`)
