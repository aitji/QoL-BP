import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = __dirname

const WOOD_TYPE = [
    "acacia", "birch", "cherry", "crimson", "dark_oak",
    "jungle", "mangrove", "oak", "pale_oak", "spruce", "warped"
]

const ITEM_ORDER = {
    stairs: 0.1,
    slab: 1,
    fence: 2,
    fence_gate: 3,
    trapdoor: 4,
    door: 5,
    sign: 6,
    pressure_plate: 7,
    button: 8
}

const MATERIAL_ORDER = {
    planks: 0,
    stripped_log: 0,
    stripped_wood: 0,
    log: 0,
    wood: 0
}

const BASE_COUNT = {
    slab: Math.ceil(1.5),
    stick: Math.ceil(2),
    sign: Math.ceil(0.5),
    slab: Math.ceil(1.5),
    door: Math.ceil(0.5),
    pressure_plate: Math.ceil(0.5),
    trapdoor: Math.ceil(0.5),
    fence_gate: Math.ceil(0.5),
    fence: Math.ceil(0.5),
}

const PLANK_MULTIPLIER = {
    planks: 1,
    stripped_log: 4,
    stripped_wood: 4,
    log: 4,
    wood: 4
}

const SP_WOOD = {
    warped: { log: "warped_stem", wood: "warped_hyphae" },
    crimson: { log: "crimson_stem", wood: "crimson_hyphae" }
}

const oakSpecial = name => {
    if (name === "door") return "wooden_door"
    if (name === "button") return "wooden_button"
    if (name === "pressure_plate") return "wooden_pressure_plate"
    if (name === "trapdoor") return "trapdoor"
    if (name === "fence_gate") return "fence_gate"
    return `oak_${name}`
}

const getOutput = (wood, item) => {
    if (wood === "oak") return oakSpecial(item)
    return `${wood}_${item}`
}

const getMaterial = (input, woodEntry) => {
    const { log, wood } = woodEntry
    if (input.endsWith("_planks")) return "planks"
    if (input === `stripped_${log}`) return "stripped_log"
    if (input === `stripped_${wood}`) return "stripped_wood"
    if (input === log) return "log"
    if (input === wood) return "wood"
    return "wood"
}

const calcPriority = (item, input, woodEntry) => {
    const m = MATERIAL_ORDER[getMaterial(input, woodEntry)]
    const i = ITEM_ORDER[item]
    return m * 10 + i
}

const recipe = (input, output, priority, count) => `{
 "format_version": "1.20.10",
 "minecraft:recipe_shapeless": {
  "description": {
   "identifier": "minecraft:stonecutter_${input}_to_${output}"
  },
  "tags": ["stonecutter"],
  "priority": ${priority},
  "ingredients": [
   { "item": "minecraft:${input}" }
  ],
  "result": {
   "item": "minecraft:${output}",
   "count": ${count}
  },
  "unlock": [{ "item": "minecraft:${input}" }]
 }
}`

const BLOCK_CONV_PRIORITY = {
    log: { planks: -4, stripped_log: -3, wood: -2, stripped_wood: -1 },
    wood: { planks: -3, stripped_wood: -2, stripped_log: -1 },
    stripped_log: { planks: -2, stripped_wood: -1 },
    stripped_wood: { planks: -2, stripped_log: -1 },
}

for (const wood of WOOD_TYPE) {

    const dir = path.join(ROOT, wood)
    fs.mkdirSync(dir, { recursive: true })

    const log = SP_WOOD[wood]?.log ?? `${wood}_log`
    const woodBlock = SP_WOOD[wood]?.wood ?? `${wood}_wood`

    const woodEntry = { log, wood: woodBlock }

    const strippedLog = `stripped_${log}`
    const strippedWood = `stripped_${woodBlock}`
    const planks = `${wood}_planks`

    const blockId = {
        planks,
        log,
        wood: woodBlock,
        stripped_log: strippedLog,
        stripped_wood: strippedWood,
    }

    for (const [inputMat, targets] of Object.entries(BLOCK_CONV_PRIORITY)) {
        const inputId = blockId[inputMat]
        for (const [outputMat, priority] of Object.entries(targets)) {
            const outputId = blockId[outputMat]
            const count = outputMat === "planks" ? 4 : 1
            const filename = `${inputId}_to_${outputId}.json`
            fs.writeFileSync(
                path.join(dir, filename),
                recipe(inputId, outputId, priority, count)
            )
        }
    }

    const inputs = [planks, strippedLog, strippedWood, log, woodBlock]

    for (const item in ITEM_ORDER) {
        const output = getOutput(wood, item)
        const base = BASE_COUNT[item] ?? 1
        const material = (input) => getMaterial(input, woodEntry)

        for (const input of inputs) {
            const multiplier = PLANK_MULTIPLIER[material(input)]
            const count = Math.ceil(base * multiplier)
            const priority = calcPriority(item, input, woodEntry)
            const filename = `${input}_to_${item}.json`
            fs.writeFileSync(
                path.join(dir, filename),
                recipe(input, output, priority, count)
            )
        }
    }

    for (const input of inputs) {
        const material = getMaterial(input, woodEntry)
        const multiplier = PLANK_MULTIPLIER[material]
        const count = Math.ceil(BASE_COUNT.stick * multiplier)
        const priority = 4
        const filename = input === planks ? "stick.json" : `${input}_to_stick.json`
        fs.writeFileSync(
            path.join(dir, filename),
            recipe(input, "stick", priority, count)
        )
    }
}