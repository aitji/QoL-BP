import { appendFileSync } from "fs"

const oldVersion = JSON.parse(process.env.OLD_VERSION) // [BIG, UPDATE, PATCH]
const newVersion = JSON.parse(process.env.NEW_VERSION)

const [oldBig, oldUp, oldPatch] = oldVersion
const [newBig, newUp, newPatch] = newVersion

const versionString = newVersion.join(".")
const packName = `QoL-${versionString}.mcpack`

let releaseType = ""

if (newBig !== oldBig || newUp !== oldUp) releaseType = "release"
else if (newPatch !== oldPatch) releaseType = "prerelease"
else {
    console.log("NO_CHANGE")
    process.exit(0)
}

const output = process.env.GITHUB_OUTPUT
appendFileSync(output, `release_type=${releaseType}\n`)
appendFileSync(output, `version_string=${versionString}\n`)
appendFileSync(output, `pack_name=${packName}\n`)
appendFileSync(output, `changed=true\n`)

console.log(`Release type: ${releaseType}`)
console.log(`Version: ${versionString}`)
console.log(`Pack: ${packName}`)