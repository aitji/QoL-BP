import { world, system, EquipmentSlot, BlockPermutation, GameMode, PlayerInteractWithBlockBeforeEvent, Block, PlayerPlaceBlockBeforeEvent, PlayerBreakBlockBeforeEvent, Entity } from "@minecraft/server"
import { applyItemDamage, checkRandom, getEqu, reduceItem, RUNTIME, setEqu } from "../lib"
import { blockBKey, SUPP_BREAK, suppressedLocs } from "./light"
const { DEBUG, BLOCKFACE_TO_DIR, LIGHT: { SEEDTOBLOCK, FARMLAND_BLOCK, SOUND_SHOVEL_USE, SOUND_HOE_USE, BLOCK_INTERACTION_DELAY, FIRE_ITEM, LIGHT_BLOCK} } = RUNTIME
export const isFrame = (b) => b.permutation.matches('minecraft:frame') || b.permutation.matches('minecraft:glow_frame')

const delay = {}
/**@param {PlayerInteractWithBlockBeforeEvent} data*/
export const light_playerInteractWithBlock = (data) => {
    const { player, block, blockFace, itemStack, isFirstEvent } = data
    if (!isFirstEvent) {
        const playerDelay = delay[player.id] || 0
        if (playerDelay > system.currentTick) return
    }

    delay[player.id] = system.currentTick + BLOCK_INTERACTION_DELAY
    if (!itemStack || !block) return

    /** @type {Block?} */
    let above
    const isLight = (b) => b.permutation?.matches(LIGHT_BLOCK) ?? false
    const isAboveLight = () => { // don't perm check if unnesscery
        above = block.above(1)
        return isLight(above)
    }

    if (block.hasTag('dirt')) {
        if (!isAboveLight()) return
        system.run(() => {
            let toolUsed = false
            if (itemStack?.hasTag('minecraft:is_shovel')) {
                if (block.typeId === 'minecraft:grass_path') return
                block.setPermutation(BlockPermutation.resolve('minecraft:grass_path'))
                toolUsed = true

                player.dimension.playSound(SOUND_SHOVEL_USE.ID, block.center(), {
                    volume: checkRandom(SOUND_SHOVEL_USE.VOLUME),
                    pitch: checkRandom(SOUND_SHOVEL_USE.PITCH)
                })
            }
            if (itemStack?.hasTag('minecraft:is_hoe')) {
                if (block.typeId === 'minecraft:farmland') return
                block.setPermutation(BlockPermutation.resolve('minecraft:farmland'))
                toolUsed = true

                player.dimension.playSound(SOUND_HOE_USE.ID, block.center(), {
                    volume: checkRandom(SOUND_HOE_USE.VOLUME),
                    pitch: checkRandom(SOUND_HOE_USE.PITCH)
                })
            }

            // all logic
            if (toolUsed && !player.matches({ gameMode: GameMode.Creative })) {
                const { changed, item } = applyItemDamage(player, itemStack)
                if (changed) {
                    const equ = getEqu(player)
                    equ.setEquipment(EquipmentSlot.Mainhand, item)
                }
            }
        })
    }

    // farmland
    const blockType = block.typeId
    if (FARMLAND_BLOCK[blockType]) {
        if (!isAboveLight()) return
        const raw = SEEDTOBLOCK[itemStack?.typeId || '']
        if (!raw) return
        const { asBlock, pot, sound } = raw

        if (pot === blockType) {
            const isCreative = player.matches({ gameMode: GameMode.Creative })
            const playSound = () => {
                // if (DEBUG) world.sendMessage(`sound=${sound}`)
                const center = block.center()
                switch (sound) {
                    // make sound config-able
                    case 'nature': return player.dimension.playSound('place.grass', center, {
                        volume: 0.8,
                        pitch: checkRandom([0.8, 1])
                    })
                    case 'nether': return player.dimension.playSound('dig.nether_wart', center, {
                        volume: 0.7,
                        pitch: checkRandom([0.8, 1])
                    })
                    default:
                        if (DEBUG) world.sendMessage(`${sound} is invaild`)
                        return
                }

            }

            let scam = false
            system.run(() => {
                try {
                    above.setType(asBlock)
                    playSound()
                    if (!isCreative) scam = setEqu(player, reduceItem(itemStack))
                } catch {
                    try {
                        above.setPermutation(BlockPermutation.resolve(asBlock))
                        playSound()
                        if (!isCreative) scam = setEqu(player, reduceItem(itemStack))
                    } catch {
                        const command = above.dimension.runCommand(`setblock ${above.x} ${above.y} ${above.z} ${asBlock}`)
                        if (command.successCount <= 0 && scam && !isCreative) reduceItem(itemStack, -1, player) // give item back
                    }
                }
            })
        }
    }

    // flint and steal + fire charge
    const itemType = itemStack.typeId
    const fireSound = FIRE_ITEM[itemType]
    if (fireSound) {
        /** @type {Block} */
        const cache = block[BLOCKFACE_TO_DIR[blockFace]](1)
        if (isLight(cache)) {
            suppressedLocs.set(blockBKey(cache), system.currentTick + SUPP_BREAK)
            const equ = getEqu(player)
            const slot = player.selectedSlotIndex
            system.run(() => {
                if (player.selectedSlotIndex !== slot) {
                    if (DEBUG) world.sendMessage(`selectedSlotIndex!==slot ; ${player.selectedSlotIndex} !== ${slot}`)
                    player.selectedSlotIndex = slot

                    // double check
                    if (equ?.getEquipment(slot)?.typeId !== itemType) {
                        if (DEBUG) world.sendMessage(`typeId!==itemType ; ${equ?.getEquipment(slot)?.typeId} !== ${itemType}`)
                        return // cancel interaction
                    }
                }
                const dim = cache.dimension
                const done = () => {
                    // minecraft alr handle damage
                    // const { item, changed } = applyItemDamage(player, equ)
                    // if (changed) setEqu(player, item, "Mainhand", true)
                    dim.playSound(fireSound.ID, cache.center(), {
                        pitch: checkRandom(fireSound.PITCH),
                        volume: checkRandom(fireSound.VOLUME)
                    })
                    if (fireSound.REDUCE_ITEM) {
                        const equ = getEqu(player)
                        const currItem = equ.getEquipment(EquipmentSlot.Mainhand)
                        const newItem = reduceItem(currItem, 1)
                        equ.setEquipment(EquipmentSlot.Mainhand, newItem)
                    }
                }
                try {
                    cache.setType('minecraft:fire')
                    done()
                } catch (e) { if (DEBUG) world.sendMessage(`[light.js] fire ${e}`) }
            })
        }
    }
}