import { world, system, EquipmentSlot, ItemDurabilityComponent, ItemStack, EntityEquippableComponent, EntityInventoryComponent, Container, BlockPermutation, Block, PlayerBreakBlockBeforeEvent, EntityComponentTypes, Player } from "@minecraft/server"
import { applyItemDamage, reduceItem, RUNTIME } from "../lib"
const { DEBUG, CROP: { LOSS_SEED, PLANT_LEVEL } } = RUNTIME

/**@param {PlayerBreakBlockBeforeEvent} data*/
export const crop_playerBreakBlock = (data) => {
    const { player, itemStack, block } = data
    if (!itemStack) return

    if (itemStack.typeId.endsWith("_hoe")) {
        const equippable = player.getComponent(EntityComponentTypes.Equippable)
        let item = equippable?.getEquipment(EquipmentSlot.Mainhand)
        if (block) {
            const { typeId, location, dimension } = block
            const level = PLANT_LEVEL[typeId]?.level || NaN
            const seed = PLANT_LEVEL[typeId]?.seed || NaN
            let growth = block.permutation.getState("growth") || block.permutation.getState("age")
            if (!level) return
            if (growth >= level) {
                system.run(() => {
                    const { changed, item: newItem } = applyItemDamage(player, item)
                    if (changed) equippable?.setEquipment(EquipmentSlot.Mainhand, newItem)
                    const apply = () => dimension.getBlock(location).setPermutation(BlockPermutation.resolve(typeId))

                    if (!LOSS_SEED) return apply()
                    const container = player.getComponent(EntityComponentTypes.Inventory).container
                    const slot = container.find(new ItemStack(seed, 1))
                    if (slot) {
                        const currItem = container.getItem(slot)
                        const newItem = reduceItem(currItem)
                        container.setItem(slot, newItem)
                        apply()
                    } else {
                        const itemEntity = dimension.getEntities({ type: 'minecraft:item', maxDistance: 2, location })

                        for (const en of itemEntity) {
                            const enItem = en.getComponent(EntityComponentTypes.Item)?.itemStack
                            if (!enItem || !en?.isValid) continue

                            if (enItem?.typeId === seed) {
                                const newItem = reduceItem(enItem)
                                try {
                                    const newEn = dimension.spawnItem(newItem, location)
                                    newEn.applyImpulse(en.getVelocity())
                                } catch { /** cannot apply vec to "air" */ }

                                try { en.remove() }
                                catch {
                                    try { en.kill() }
                                    catch (_) { if (DEBUG) world.sendMessage(`[crop.js] cannot remove ${seed} ${_}`) }
                                } finally { return apply() }
                            }
                        }
                    }
                })
            } else if (!player.isSneaking) data.cancel = true
        }
    }
}