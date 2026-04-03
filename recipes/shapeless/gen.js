import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const flowersType = {
    "allium": 4,
    "azure_bluet": 4,
    "blue_orchid": 4,
    "cornflower": 4,
    "dandelion": 4,
    "lily_of_the_valley": 4,
    "oxeye_daisy": 4,
    "poppy": 4,
    "orange_tulip": 4,
    "pink_tulip": 4,
    "red_tulip": 4,
    "white_tulip": 4,

    // nerf day-cycle flower
    "closed_eyeblossom": 3,
    "open_eyeblossom": 3,

    // big flowers
    "lilac": 2,
    "peony": 2,
    "rose_bush": 2,
    "sunflower": 2,
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = __dirname
const dir = path.join(ROOT, 'flowers')
fs.mkdirSync(dir, { recursive: true })

for (const [name, count] of Object.entries(flowersType)) {
    const data = {
        "format_version": "1.20.10",
        "minecraft:recipe_shapeless": {
            "description": { "identifier": `bonemeal_${name}` },
            "tags": ["crafting_table"],
            "ingredients": [
                { "item": "minecraft:bone_meal" },
                { "item": `minecraft:${name}` }
            ],
            "result": {
                "item": `minecraft:${name}`,
                "count": count
            },
            "unlock": [
                { "item": "minecraft:bone_meal" },
                { "item": `minecraft:${name}` }
            ]
        }
    }
    fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(data, null, 4))
}