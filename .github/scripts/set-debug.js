import { existsSync, readFileSync, writeFileSync } from "fs"
import { resolve } from "path"

const isRP = process.argv.includes("--rp")
const prefix = isRP ? 'qofrp' : 'qof'

if (!isRP) {
    const configPath = resolve("scripts/_config.ts")
    if (!existsSync(configPath)) {
        console.error(`File not found: ${configPath}`)
        process.exit(1)
    }
    const config = readFileSync(configPath, "utf8")
    const updatedConfig = config.replace(/DEBUG\s*:\s*true/, "DEBUG: false")
    if (config !== updatedConfig) {
        writeFileSync(configPath, updatedConfig)
        console.log("Set DEBUG: false in _config.js")
    }
}

// update manifest.json (both BP & RP)
const manifestPath = resolve("manifest.json")
if (!existsSync(manifestPath)) {
    console.error(`File not found: ${manifestPath}`)
    process.exit(1)
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
let changed = false
for (const s of manifest.settings || []) {
    if (s.name === `${prefix}:DEBUG` && s.default === true) {
        s.default = false
        changed = true
        break
    }
}

if (changed) {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
    console.log("Set qof:DEBUG default to false in manifest.json")
} else console.log("qof:DEBUG already false or not found")