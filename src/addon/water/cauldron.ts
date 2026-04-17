import { Block, BlockComponentTypes, BlockFluidContainerComponent, BlockPermutation, EntityEquippableComponent, EquipmentSlot, FluidType, ItemStack, Player, PlayerInteractWithBlockBeforeEvent, system, world } from "@minecraft/server"
import { getEqu, playSound, RUNTIME } from "../../lib"
const { DEBUG } = RUNTIME

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

function getNearestDye(r: number, g: number, b: number) {
    let nearest = DYE_COLORS[0]
    let minDist = Infinity

    for (const dye of DYE_COLORS) {
        const dr = r - dye.r
        const dg = g - dye.g
        const db = b - dye.b

        // weighted, eyes like (blue > green)
        const dist = 0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db
        if (dist < minDist) {
            minDist = dist
            nearest = dye
        }
    }

    return { color: nearest.name, distance: minDist }
}

const delay: Record<string, number> = {}
export const cauldron_playerInteractWithBlock = (data: PlayerInteractWithBlockBeforeEvent) => {
    const { player, block, itemStack, isFirstEvent } = data

    if (!isFirstEvent) {
        const playerDelay = delay[player.id] || 0
        if (playerDelay > system.currentTick) return
    }
    delay[player.id] = system.currentTick + 8

    if (!block) return
    if (block.typeId !== 'minecraft:cauldron') return

    const fluid = block.getComponent(BlockComponentTypes.FluidContainer)
    if (!fluid) return
    if (fluid.fillLevel <= 0) return

    const slot = player.selectedSlotIndex
    const equ = getEqu(player)!
    system.run(() => {
        if (slot !== player.selectedSlotIndex) player.selectedSlotIndex = slot
        if (itemStack?.typeId !== equ?.getEquipment(EquipmentSlot.Mainhand)?.typeId) return

        const liq = fluid.getFluidType()
        if (liq !== FluidType.Water) return

        const { red, green, blue } = fluid.fluidColor
        const isWater = red == 0 && green == 0 && blue == 0
        const dye = getNearestDye(red, green, blue)
        if (DEBUG) console.log(`nearest dye: ${dye.color} §8~${dye.distance.toFixed(6)} §r§7(RGBA=${red.toFixed(2)},${green.toFixed(2)},${blue.toFixed(2)},${fluid.fluidColor.alpha})`)

        glassHandle(fluid, isWater, dye.color, player, block, itemStack, equ)
    })
}

const reduceWaterState = (block: Block, fluid: BlockFluidContainerComponent) => {
    const { fillLevel } = fluid
    if (fillLevel <= 0) return
    block.setPermutation(BlockPermutation.resolve(block.typeId).withState('fill_level', fillLevel - 1))
    playSound(block.dimension, block.center(), { ID: "cauldron.dyearmor", VOLUME: 1.0, PITCH: 1.0 })
}

const glassHandle = (
    fluid: BlockFluidContainerComponent, isWater: boolean, nearDye: string,
    player: Player, block: Block, itemStack?: ItemStack, equ?: EntityEquippableComponent
) => {
    if (!itemStack || !itemStack.typeId.includes('glass')) return

    const id = itemStack.typeId
    const isPane = id.includes('pane')
    let resultId: string | null = null

    if (isWater) {
        const clean = isPane ? 'minecraft:glass_pane' : 'minecraft:glass'
        if (id !== clean) resultId = clean
    } else resultId = `minecraft:${nearDye}_stained_glass${isPane ? '_pane' : ''}`

    if (resultId) equ?.setEquipment(
        EquipmentSlot.Mainhand,
        new ItemStack(resultId, itemStack.amount)
    )

    reduceWaterState(block, fluid)
}

// todo: shulkers, banners?