import { EquipmentSlot, world } from "@minecraft/server"
import { getEqu, getInv } from "../../lib"

world.afterEvents.entityHitBlock.subscribe(data => {
    const { damagingEntity: player, hitBlock: block } = data
    if (!player.isSneaking) return
    const equ = getEqu(player)!
    const mainhand = equ.getEquipment(EquipmentSlot.Mainhand)
    if (!mainhand) return

    const inventory = getInv(block)!
    if (!inventory) return

    const { container } = inventory!
    if (!container) return

    container.addItem(mainhand)
    equ.setEquipment(EquipmentSlot.Mainhand, undefined)

    /**
     * todo:
     * - check is chest full?
     * - make it more vanilla (?????)
     * - support touch screen

     **this idea can be put to trash
     */
}, { entityTypes: ['minecraft:player'] })