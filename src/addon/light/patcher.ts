import { world, system, EquipmentSlot, BlockPermutation, GameMode, PlayerInteractWithBlockBeforeEvent, Block, PlayerPlaceBlockBeforeEvent, PlayerBreakBlockBeforeEvent, Entity, ItemStack } from "@minecraft/server"
import { applyItemDamage, checkRandom, getEqu, reduceItem, RUNTIME, setEqu, pickupCooldown, cache, playSound, checkPerm } from "../../lib"
import { suppressLight } from "./core"
const {
    DEBUG, BLOCKFACE_TO_DIR, BLOCK_INTERACTION_DELAY,
    LIGHT: {
        ENABLED, SEEDTOBLOCK, FARMLAND_BLOCK,
        SOUND_SHOVEL_USE, SOUND_HOE_USE, FIRE_ITEM,
        LIGHT_BLOCK
    }
} = RUNTIME
export const isFrame = (b: Block) => b.permutation.matches('minecraft:frame') || b.permutation.matches('minecraft:glow_frame')

let HANGING_ROOTS: ItemStack
let DIRT: BlockPermutation
let FARMLAND: BlockPermutation
let GRASS_PATH: BlockPermutation
if (ENABLED) system.run(() => {
    HANGING_ROOTS = new ItemStack('minecraft:hanging_roots', 1)
    DIRT = BlockPermutation.resolve('minecraft:dirt')
    FARMLAND = BlockPermutation.resolve('minecraft:farmland')
    GRASS_PATH = BlockPermutation.resolve('minecraft:grass_path')
})

const delay: Record<string, number> = {}
export const light_playerInteractWithBlock = (data: PlayerInteractWithBlockBeforeEvent) => {
    const { player, block, blockFace, itemStack, isFirstEvent } = data
    let tick = system.currentTick

    if (!isFirstEvent) {
        const playerDelay = delay[player.id] || 0
        if (playerDelay > tick) return
    }
    delay[player.id] = tick + BLOCK_INTERACTION_DELAY
    if (checkPerm(player) === false) return

    if (!itemStack || !block) return
    const dimension = block.dimension

    let above: Block | undefined // cache above block
    const isLight = (b: Block | undefined) => b?.permutation?.matches(LIGHT_BLOCK) ?? false
    const isAboveLight = () => { // don't perm check if unnesscery
        above = block.above(1)
        return isLight(above)
    }

    const dirtTypeCheck = () => {
        if (block.hasTag('dirt')) {
            if (!isAboveLight()) return
            system.run(() => {
                tick++
                let toolUsed = false
                if (itemStack?.hasTag('minecraft:is_shovel')) {
                    switch (block?.typeId ?? '') {
                        case 'minecraft:grass_path':
                        case 'minecraft:farmland':
                            return
                        default: break
                    }

                    suppressLight(above!, false, true, false, tick)
                    block.setPermutation(GRASS_PATH)
                    toolUsed = true

                    playSound(dimension, block.center(), SOUND_SHOVEL_USE)
                }
                if (itemStack?.hasTag('minecraft:is_hoe')) {
                    switch (block?.typeId ?? '') {
                        case 'minecraft:farmland':
                        case 'minecraft:podzol':
                        case 'minecraft:mycelium':
                            return

                        case 'minecraft:dirt_with_roots':
                            const root = dimension.spawnItem(HANGING_ROOTS, block.center())
                            pickupCooldown(root, 15)
                            block.setPermutation(DIRT)
                            break
                        case 'minecraft:coarse_dirt':
                            block.setPermutation(DIRT)
                            break
                        default:
                            block.setPermutation(FARMLAND)
                            break
                    }

                    toolUsed = true
                    playSound(dimension, block.center(), SOUND_HOE_USE)
                }

                // all logic
                if (toolUsed && cache.getPlayer(player, "gameMode") !== GameMode.Creative) {
                    const { changed, item } = applyItemDamage(player, itemStack)
                    if (changed) {
                        const equ = getEqu(player)!
                        equ.setEquipment(EquipmentSlot.Mainhand, item)
                    }
                }
            })
        }
    }
    dirtTypeCheck()

    // farmland
    const farmlandCheck = () => {
        const blockType = block.typeId
        if (FARMLAND_BLOCK[blockType]) {
            if (!isAboveLight()) return
            const raw = SEEDTOBLOCK[itemStack?.typeId || '']
            if (!raw) return
            const { asBlock, pot, sound } = raw

            if (pot === blockType) {
                const isCreative = cache.getPlayer(player, 'gameMode') === GameMode.Creative
                const _playSound = () => {
                    // if (DEBUG) world.sendMessage(`sound=${sound}`)
                    const center = block.center()
                    switch (sound) {
                        case 'nature': return playSound(dimension, center, { ID: "place.grass", VOLUME: 0.8, PITCH: [0.8, 1] })
                        case 'nether': return playSound(dimension, center, { ID: "dig.nether_wart", VOLUME: 0.7, PITCH: [0.8, 1] })
                        default:
                            if (DEBUG) world.sendMessage(`${sound} is invaild`)
                            return
                    }
                }

                let scam = false as boolean
                system.run(() => {
                    if (!above) return
                    try {
                        above.setType(asBlock)
                        _playSound()
                        if (!isCreative) scam = setEqu(player, reduceItem(itemStack))
                    } catch {
                        try {
                            above.setPermutation(BlockPermutation.resolve(asBlock))
                            _playSound()
                            if (!isCreative) scam = setEqu(player, reduceItem(itemStack))
                        } catch {
                            const command = above.dimension.runCommand(`setblock ${above.x} ${above.y} ${above.z} ${asBlock}`)
                            if (command.successCount <= 0 && scam && !isCreative) reduceItem(itemStack, -1, player) // give item back
                        }
                    }
                })
            }
        }
    }
    farmlandCheck()

    // flint and steal + fire charge
    const fireCheck = () => {
        const itemType = itemStack.typeId
        const fireSound = FIRE_ITEM[itemType]
        if (fireSound) {
            const cache = block[BLOCKFACE_TO_DIR[blockFace]](1)!
            if (isLight(cache)) {
                suppressLight(cache, false, false, false, tick)
                const slot = player.selectedSlotIndex
                system.run(() => {
                    if (player.selectedSlotIndex !== slot) {
                        if (DEBUG) world.sendMessage(`selectedSlotIndex!==slot ; ${player.selectedSlotIndex} !== ${slot}`)
                        player.selectedSlotIndex = slot
                    }
                    const dim = cache.dimension
                    const done = () => {
                        // minecraft alr handle damage
                        // const { item, changed } = applyItemDamage(player, equ)
                        // if (changed) setEqu(player, item, "Mainhand", true)
                        playSound(dim, cache.center(), fireSound)
                        if (fireSound.REDUCE_ITEM) {
                            const equ = getEqu(player)!
                            const currItem = equ.getEquipment(EquipmentSlot.Mainhand)!
                            const newItem = reduceItem(currItem, 1)
                            equ.setEquipment(EquipmentSlot.Mainhand, newItem)
                        }
                    }
                    try {
                        const below = cache.below(1)!
                        if (
                            below.isSolid &&
                            (cache.permutation.matches('minecraft:air') || cache.permutation.matches(LIGHT_BLOCK))
                        ) {
                            cache.setType('minecraft:fire')
                            done()
                        }
                    } catch (e) { if (DEBUG) world.sendMessage(`[offhand] fire ${e}`) }
                })
            }
        }
    }

    fireCheck()
}