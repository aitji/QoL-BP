import { existsSync, readFileSync, writeFileSync } from "fs"
import { resolve } from "path"
const configPath = resolve("scripts/_config.js")
const manifestPath = resolve("manifest.json")

// update js config
if (!existsSync(configPath)) {
    console.error(`File not found: ${configPath}`)
    process.exit(1)
}

let config = readFileSync(configPath, "utf8")
const updatedConfig = config.replace(/DEBUG\s*:\s*true/, "DEBUG: false")

if (config !== updatedConfig) {
    writeFileSync(configPath, updatedConfig, "utf8")
    console.log("Set DEBUG: false in _config.js")
}

// update manifest.json
if (!existsSync(manifestPath)) {
    console.error(`File not found: ${manifestPath}`)
    process.exit(1)
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
let changed = false
for (const s of manifest.settings || []) {
    if (s.name === "qol:DEBUG" && s.default === true) {
        s.default = false
        changed = true
    }
}

if (changed) {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
    console.log("Set qol:DEBUG default to false in manifest.json")
} else console.log("qol:DEBUG already false or not found")