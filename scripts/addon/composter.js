import { BlockPermutation, EntityComponentTypes, EquipmentSlot, GameMode, ItemStack, PlayerInteractWithBlockBeforeEvent, system, world } from "@minecraft/server"
import { SETTINGS } from "../_config"
import { checkRandom, clamp } from "../lib"
const { DEBUG, COMPOSTER: { BLOCK_TYPEID, ITEMS, SOUND_FILL_SUCCESS, SOUND_FILL, SOUND_READY, DELAY_BEFORE_READY } } = SETTINGS
const clamp8 = (n) => clamp(n, 0, 8)

/**@param {PlayerInteractWithBlockBeforeEvent} data*/
export const composter_playerInteractWithBlock = (data) => {
    const { player, block, itemStack } = data

    if (
        !player.isSneaking &&
        itemStack &&
        block.typeId === BLOCK_TYPEID
    ) {
        const itemID = itemStack.typeId
        const chance = ITEMS[itemID]
        if (!chance) return

        const roll = Math.random()

        const result = roll <= chance
        const state = block.permutation.getState('composter_fill_level')
        const location = block.center()
        const slot = player.selectedSlotIndex
        if (state >= 7) return

        system.run(() => {
            if (result) {
                player.dimension.playSound(SOUND_FILL_SUCCESS.ID, player.location, { volume: checkRandom(SOUND_FILL_SUCCESS.VOLUME), pitch: checkRandom(SOUND_FILL_SUCCESS.PITCH) })

                const composter = BlockPermutation
                    .resolve(block.typeId)
                    .withState("composter_fill_level", clamp8(state + 1))
                block.setPermutation(composter)
                player.dimension.spawnParticle('minecraft:crop_growth_emitter', location)

                if (state === 6) system.runTimeout(() => {
                    const currBlock = block.dimension.getBlock(location)
                    if (
                        currBlock.typeId === BLOCK_TYPEID &&
                        currBlock.permutation.getState('composter_fill_level') === 7
                    ) {
                        const composter = BlockPermutation
                            .resolve(BLOCK_TYPEID)
                            .withState("composter_fill_level", 8)
                        block.setPermutation(composter)

                        player.dimension.playSound(SOUND_READY.ID, player.location, { volume: checkRandom(SOUND_READY.VOLUME), pitch: checkRandom(SOUND_READY.PITCH) })
                    }
                }, DELAY_BEFORE_READY)

            } else player.dimension.playSound(SOUND_FILL.ID, player.location, { volume: checkRandom(SOUND_FILL.VOLUME), pitch: checkRandom(SOUND_FILL.PITCH) })

            if (player.matches({ gameMode: GameMode.Creative })) return

            // reduce item
            const equ = player.getComponent(EntityComponentTypes.Equippable)
            if (player.selectedSlotIndex !== slot) player.selectedSlotIndex = slot
            const currItem = equ.getEquipment(EquipmentSlot.Mainhand)

            if (!currItem || currItem.typeId !== itemStack.typeId) {
                // fallback
                const cmd = player.runCommand(`clear @s ${itemID} 0 1`)
                const isDone = cmd.successCount

                // fail to remove player item
                if ((!isDone || isDone === 0) && result) {
                    const composter = BlockPermutation
                        .resolve(block.typeId)
                        .withState("composter_fill_level", clamp8(state - 1))
                    block.setPermutation(composter)
                } else {
                    if (itemID.endsWith('_stew') || itemID.endsWith('_soup'))
                        player.runCommand(`give @s bowl 0 1`)
                }
                return
            }

            // NOW: selectedSlotIndex === slot & currItem == itemStack
            try {
                if (itemStack.amount <= 1) {
                    // clear item
                    if (itemID.endsWith('_stew') || itemID.endsWith('_soup')) equ.setEquipment(EquipmentSlot.Mainhand, new ItemStack('bowl', 1))
                    else equ.setEquipment(EquipmentSlot.Mainhand, undefined)
                } else {
                    const reduceItem = currItem.clone()
                    reduceItem.amount -= 1
                    equ.setEquipment(EquipmentSlot.Mainhand, reduceItem)
                }
            } catch (e) { if (DEBUG) console.warn('[composter] unknown case:', e) }
        })
    }
}