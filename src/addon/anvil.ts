import { system, BlockPermutation, EntityComponentTypes, EquipmentSlot, GameMode, PlayerInteractWithBlockBeforeEvent, world, Direction } from "@minecraft/server"
import { checkRandom, reduceItem, RUNTIME, cache, getEqu, playSound } from "../lib"
const { DEBUG, REPAIR_ANVIL: { ITEM_TYPEID, REPAIRABLE_ANVIL, REPAIR_SOUND, REPAIR_HELD_DELAY } } = RUNTIME

const delay: Record<string, number> = {}
const permCache = new Map<
    string,
    Map<Direction, BlockPermutation | null>
>()
// helper
function getCache(
    typeId: string,
    direction: Direction
): BlockPermutation | null {
    let inner = permCache.get(typeId)
    if (!inner) {
        inner = new Map<Direction, BlockPermutation | null>()
        permCache.set(typeId, inner)
    }

    let perm = inner.get(direction)
    if (perm === undefined) {
        try { perm = BlockPermutation.resolve(typeId).withState('minecraft:cardinal_direction', direction) }
        catch (e) {
            if (DEBUG) console.warn('[ANVIL] failed to resolve permutation for', typeId, e)
            perm = null
        }

        inner.set(direction, perm)
    }

    return perm
}

export const anvil_playerInteractWithBlock = (data: PlayerInteractWithBlockBeforeEvent) => {
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

        const state = block.permutation.getState('minecraft:cardinal_direction') as Direction
        if (!state) return

        const slot = player.selectedSlotIndex
        system.run(() => {
            // new anvil
            const anvilPerm = getCache(nextType, state)
            if (!anvilPerm) return
            block.setPermutation(anvilPerm)

            const _playSound = () => {
                const center = block.center()
                const dim = player.dimension

                playSound(dim, center, REPAIR_SOUND)
                dim.spawnParticle("minecraft:wind_explosion_emitter", center)
            }

            if (cache.getPlayer(player, 'gameMode') === GameMode.Creative)
                return _playSound()

            // reduce item
            const equ = getEqu(player)!
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
                } else _playSound()
                return
            }

            // NOW: selectedSlotIndex === slot & currItem == itemStack
            try {
                equ.setEquipment(EquipmentSlot.Mainhand, reduceItem(itemStack))
                _playSound()
            } catch (e) { if (DEBUG) console.warn('[ANVIL] unknown case:', e) }
        })
    }
}