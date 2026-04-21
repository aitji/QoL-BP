import { Block, BlockComponentTypes, BlockFluidContainerComponent, BlockPermutation, EntityEquippableComponent, EquipmentSlot, FluidType, ItemStack, Player, PlayerInteractWithBlockBeforeEvent, system, world } from "@minecraft/server"
import { checkPerm, getEqu, playSound, RUNTIME } from "../../lib"
const { DEBUG, WATER_CAULDRON: { FIND_NEAR_COLOR } } = RUNTIME
const RGB_PRECISION = 4 // hardcode, don't make config
const DYE_COLORS: { name: string; r: number; g: number; b: number }[] = [
    { name: 'white', r: 0.9412, g: 0.9412, b: 0.9412 },
    { name: 'light_gray', r: 0.6157, g: 0.6157, b: 0.5922 },
    { name: 'gray', r: 0.2784, g: 0.3098, b: 0.3216 },
    { name: 'black', r: 0.1137, g: 0.1137, b: 0.1294 },
    { name: 'brown', r: 0.5137, g: 0.3294, b: 0.1961 },
    { name: 'red', r: 0.6902, g: 0.1804, b: 0.1490 },
    { name: 'orange', r: 0.9765, g: 0.5020, b: 0.1137 },
    { name: 'yellow', r: 0.9961, g: 0.8471, b: 0.2392 },
    { name: 'lime', r: 0.5020, g: 0.7804, b: 0.1216 },
    { name: 'green', r: 0.3686, g: 0.4863, b: 0.0863 },
    { name: 'cyan', r: 0.0863, g: 0.6118, b: 0.6118 },
    { name: 'light_blue', r: 0.2275, g: 0.7020, b: 0.8549 },
    { name: 'blue', r: 0.2353, g: 0.2667, b: 0.6667 },
    { name: 'pink', r: 0.9529, g: 0.5451, b: 0.6667 },
    { name: 'purple', r: 0.5373, g: 0.1961, b: 0.7216 },
    { name: 'magenta', r: 0.7804, g: 0.3059, b: 0.7412 },
]

// helper
const toKey = (r: number, g: number, b: number) => `${r.toFixed(RGB_PRECISION)},${g.toFixed(RGB_PRECISION)},${b.toFixed(RGB_PRECISION)}`
const DYE_COLOR_MAP = new Map<string, string>(DYE_COLORS.map(({ name, r, g, b }) => [toKey(r, g, b), name]))
function getNearestDye(r: number, g: number, b: number) {
    const exact = DYE_COLOR_MAP.get(toKey(r, g, b))
    if (exact) return { color: exact, distance: 0 }

    if (!FIND_NEAR_COLOR) return { color: 'null', distance: -1 }
    let nearest = DYE_COLORS[0]
    let minDist = Infinity
    for (const dye of DYE_COLORS) {
        const dist = 0.299 * (r - dye.r) ** 2 + 0.587 * (g - dye.g) ** 2 + 0.114 * (b - dye.b) ** 2
        if (dist < minDist) { minDist = dist; nearest = dye }
    }
    return { color: nearest.name, distance: minDist }
}

type DyeableEntry = {
    match: (id: string) => boolean
    dyed: (id: string, dye: string) => string
    clean: (id: string) => string
}

const DYEABLE: DyeableEntry[] = [
    { // carpet -> *_carpet
        match: id => id.includes('carpet'),
        dyed: (_id, dye) => `minecraft:${dye}_carpet`,
        clean: _ => 'minecraft:white_carpet',
    },
    { // wool -> *_wool
        match: id => id.includes('wool'),
        dyed: (_id, dye) => `minecraft:${dye}_wool`,
        clean: _ => 'minecraft:white_wool',
    },
    { // concrete / concrete_powder -> *_concrete[_powder]
        match: id => id.includes('concrete'),
        dyed: (id, dye) => `minecraft:${dye}_concrete${id.endsWith('_powder') ? '_powder' : ''}`,
        clean: id => `minecraft:white_concrete${id.endsWith('_powder') ? '_powder' : ''}`,
    },
    { // glass / glass_pane -> *_stained_glass[_pane]
        match: id => id.includes('glass'),
        dyed: (id, dye) => `minecraft:${dye}_stained_glass${id.endsWith('_pane') ? '_pane' : ''}`,
        clean: id => id.endsWith('_pane') ? 'minecraft:glass_pane' : 'minecraft:glass',
    },
    { // hardened_clay / terracotta / glazed_terracotta -> hardened_clay / *(_glazed)_terracotta
        match: id => id.includes('hardened_clay') || id.includes('terracotta'),
        dyed: (id, dye) => `minecraft:${dye}${id.includes('_glazed') ? '_glazed' : ''}_terracotta`,
        clean: _id => _id.includes("_glazed") ? 'white_glazed_terracotta' : 'hardened_clay',
    },

    // (shulkers, banners, bundles) have nbt cannot safe replace
]

const reduceWaterState = (block: Block, fluid: BlockFluidContainerComponent) => {
    if (fluid.fillLevel <= 0) return
    block.setPermutation(BlockPermutation.resolve(block.typeId).withState('fill_level', fluid.fillLevel - 1))
    playSound(block.dimension, block.center(), { ID: "cauldron.dyearmor", VOLUME: 1.0, PITCH: 1.0 })
}

function applyDye(
    fluid: BlockFluidContainerComponent, isWater: boolean, nearDye: string,
    block: Block, itemStack: ItemStack, equ: EntityEquippableComponent
) {
    const id = itemStack.typeId
    const entry = DYEABLE.find(e => e.match(id))
    if (!entry) return

    const resultId = isWater ? entry.clean(id) : entry.dyed(id, nearDye)
    if (resultId !== id) equ.setEquipment(EquipmentSlot.Mainhand, new ItemStack(resultId, itemStack.amount))

    reduceWaterState(block, fluid)
}

// main
const delay: Record<string, number> = {}
export const cauldron_playerInteractWithBlock = (data: PlayerInteractWithBlockBeforeEvent) => {
    const { player, block, itemStack, isFirstEvent } = data

    if (!isFirstEvent) {
        const playerDelay = delay[player.id] || 0
        if (playerDelay > system.currentTick) return
    }
    delay[player.id] = system.currentTick + 8

    if (checkPerm(player) === false) return
    if (!block || block.typeId !== 'minecraft:cauldron') return

    const fluid = block.getComponent(BlockComponentTypes.FluidContainer)
    if (!fluid || fluid.fillLevel <= 0) return

    const slot = player.selectedSlotIndex
    const equ = getEqu(player)!
    system.run(() => {
        if (slot !== player.selectedSlotIndex) player.selectedSlotIndex = slot
        if (itemStack?.typeId !== equ?.getEquipment(EquipmentSlot.Mainhand)?.typeId) return
        if (fluid.getFluidType() !== FluidType.Water) return

        const { red, green, blue } = fluid.fluidColor
        const isWater = red === 0 && green === 0 && blue === 0
        const dye = getNearestDye(red, green, blue)

        if (dye.color === 'null') return
        if (DEBUG) console.log(
            `nearest dye: ${dye.color} §8~${dye.distance.toFixed(6)} §r§7` +
            `(RGBA=${red.toFixed(2)},${green.toFixed(2)},${blue.toFixed(2)},${fluid.fluidColor.alpha})`
        )

        if (itemStack) applyDye(fluid, isWater, dye.color, block, itemStack, equ)
    })
}