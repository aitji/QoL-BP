import { BlockComponentTypes, EquipmentSlot, PlayerInteractWithBlockBeforeEvent, system } from "@minecraft/server"
import { applyItemDamage, dumpMeThatComp, getEqu, playSound, RUNTIME, setEqu } from "../lib"
import * as cache from "../core/cache"
const {
    DEBUG,
    OFFHAND: { BLOCK_INTERACTION_DELAY }
} = RUNTIME

const delay: Record<string, number> = {}
export const waxedOff_playerInteractWithBlock = (data: PlayerInteractWithBlockBeforeEvent) => {
    const { block, player, itemStack, isFirstEvent } = data
    if (!isFirstEvent) {
        const playerDelay = delay[player.id] || 0
        if (playerDelay > system.currentTick) return
    }
    delay[player.id] = system.currentTick + BLOCK_INTERACTION_DELAY

    if (
        block && itemStack &&
        itemStack.hasTag('minecraft:is_axe') &&
        block.typeId.endsWith('_sign')
    ) {
        const sign = block.getComponent(BlockComponentTypes.Sign)
        if (!sign) return
        if (!sign.isWaxed) return

        const slot = player.selectedSlotIndex
        system.run(() => {
            const { changed, item } = applyItemDamage(player, itemStack)

            if (changed) {
                if (slot !== player.selectedSlotIndex) player.selectedSlotIndex = slot

                const equ = getEqu(player)!
                const curItem = equ.getEquipment(EquipmentSlot.Mainhand)

                if (
                    curItem &&
                    curItem.typeId === itemStack.typeId &&
                    curItem.nameTag === itemStack.nameTag
                ) setEqu(player, item, "Mainhand", true)
            }

            const dim = player.dimension
            const center = block.center()

            sign.setWaxed(false)
            playSound(dim, center, { ID: "copper.wax.off", VOLUME: 1.0, PITCH: [0.8, 1.2] })
            dim.spawnParticle("minecraft:wind_explosion_emitter", center)
        })
    }
}