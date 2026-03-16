import { existsSync, readFileSync, writeFileSync } from "fs"
import { resolve } from "path"
const configPath = resolve("scripts/_config.js")

if (!existsSync(configPath)) {
    console.error(`File not found: ${configPath}`)
    process.exit(1)
}

let content = readFileSync(configPath, "utf8")
const updated = content.replace(/DEBUG\s*:\s*true/, "DEBUG: false")

if (content === updated) console.log("DEBUG was already false or not found no change made.")
else {
    writeFileSync(configPath, updated, "utf8");
    console.log("Set DEBUG: false in scripts/_config.js")
}