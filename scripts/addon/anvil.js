import { system, BlockPermutation, EntityComponentTypes, EquipmentSlot, GameMode, PlayerInteractWithBlockBeforeEvent, world } from "@minecraft/server"
import { SETTINGS } from "../_config"
import { checkRandom } from "../lib"
const { DEBUG, REPAIR_ANVIL: { ITEM_TYPEID, REPAIRABLE_ANVIL, REPAIR_SOUND, REPAIR_HELD_DELAY } } = SETTINGS

const delay = {}
/**@param {PlayerInteractWithBlockBeforeEvent} data */
export const anvil_playerInteractWithBlock = (data) => {
    const { player, itemStack, isFirstEvent, block } = data
    if (
        block &&
        itemStack && itemStack.typeId === ITEM_TYPEID &&
        !player.isSneaking
    ) {
        if (!isFirstEvent) {
            const playerDelay = delay[player.id] || 0
            if (REPAIRABLE_ANVIL.includes(block.typeId)) data.cancel = true
            if (playerDelay > system.currentTick) return
        }

        delay[player.id] = system.currentTick + REPAIR_HELD_DELAY
        const score = REPAIRABLE_ANVIL.findIndex(e => block.typeId === e)
        if (score <= -1 || score === REPAIRABLE_ANVIL.length - 1) return

        data.cancel = true

        const state = block.permutation.getState('minecraft:cardinal_direction')
        if (!state) return

        const slot = player.selectedSlotIndex
        system.run(() => {
            // new anvil
            const anvil = BlockPermutation
                .resolve(REPAIRABLE_ANVIL[score + 1])
                .withState('minecraft:cardinal_direction', state)
            block.setPermutation(anvil)

            const playSound = () => {
                const center = block.center()
                player.dimension.playSound(REPAIR_SOUND.ID, center, {
                    volume: checkRandom(REPAIR_SOUND.VOLUME),
                    pitch: checkRandom(REPAIR_SOUND.PITCH)
                })
                player.dimension.spawnParticle("minecraft:wind_explosion_emitter", center)
            }

            if (player.matches({ gameMode: GameMode.Creative }))
                return playSound()

            // reduce item
            const equ = player.getComponent(EntityComponentTypes.Equippable)
            if (player.selectedSlotIndex !== slot) player.selectedSlotIndex = slot
            const currItem = equ.getEquipment(EquipmentSlot.Mainhand)

            if (!currItem || currItem.typeId !== itemStack.typeId) {
                // fallback
                const cmd = player.runCommand(`clear @s ${ITEM_TYPEID} 0 1`)
                const isDone = cmd.successCount

                // fail to remove player item
                if (!isDone || isDone === 0) {
                    const oldAnvil = BlockPermutation
                        .resolve(REPAIRABLE_ANVIL[score])
                        .withState('minecraft:cardinal_direction', state)
                    block.setPermutation(oldAnvil)
                } else playSound()
                return
            }

            // NOW: selectedSlotIndex === slot & currItem == itemStack
            try {
                if (itemStack.amount <= 1) {
                    // clear item
                    equ.setEquipment(EquipmentSlot.Mainhand, undefined)
                } else {
                    const reduceItem = currItem.clone()
                    reduceItem.amount -= 1
                    equ.setEquipment(EquipmentSlot.Mainhand, reduceItem)
                }

                playSound()
            } catch (e) { if (DEBUG) console.warn('[ANVIL] unknown case:', e) }
        })
    }
}