import { system, BlockPermutation, EntityComponentTypes, EquipmentSlot, GameMode, PlayerInteractWithBlockBeforeEvent, world } from "@minecraft/server"
import { checkRandom } from "../lib"
import { RUNTIME } from "../_store"
const { DEBUG, REPAIR_ANVIL: { ITEM_TYPEID, REPAIRABLE_ANVIL, REPAIR_SOUND, REPAIR_HELD_DELAY } } = RUNTIME

const delay = {}
const permCache = new Map() // key: typeId -> Map(direction -> BlockPermutation)

// helper
function getCache(typeId, direction) {
    let inner = permCache.get(typeId)
    if (!inner) {
        inner = new Map()
        permCache.set(typeId, inner)
    }

    let perm = inner.get(direction)
    if (!perm) {
        try { perm = BlockPermutation.resolve(typeId).withState('minecraft:cardinal_direction', direction) }
        catch (e) {
            if (DEBUG) console.warn('[ANVIL] failed to resolve permutation for', typeId, e)
            perm = null
            // at this point i ask myself, why not hardcode anvil and i answer back 'why not'
        }
        inner.set(direction, perm)
    }
    return perm
}

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
            if (REPAIRABLE_ANVIL[block.typeId] || itemStack && itemStack.typeId === ITEM_TYPEID) data.cancel = true
            if (playerDelay > system.currentTick) return
        }

        delay[player.id] = system.currentTick + REPAIR_HELD_DELAY

        const currType = block.typeId
        const nextType = REPAIRABLE_ANVIL[currType]

        if (!nextType) return

        data.cancel = true

        const state = block.permutation.getState('minecraft:cardinal_direction')
        if (!state) return

        const slot = player.selectedSlotIndex
        system.run(() => {
            // new anvil
            const anvilPerm = getCache(nextType, state)
            if (!anvilPerm) return
            block.setPermutation(anvilPerm)

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
                    // revert anvil
                    const oldPerm = getCache(currType, state)
                    if (oldPerm) block.setPermutation(oldPerm)
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