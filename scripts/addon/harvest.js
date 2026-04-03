import { world, system, EquipmentSlot, ItemDurabilityComponent, ItemStack, EntityEquippableComponent, EntityInventoryComponent, Container, BlockPermutation, Block, PlayerBreakBlockBeforeEvent, EntityComponentTypes, Player, GameMode } from "@minecraft/server"
import { applyItemDamage, reduceItem, RUNTIME, helper } from "../lib"
const { DEBUG, HARVEST: { LOSS_SEED, PLANT_LEVEL, DURABILITY, COCOA_VALID_LOGS, COCOA_DIRECTIONS } } = RUNTIME

/**@param {Block} block@param {number} originalDir*/
export const resolveCocoaPermutation = (block, originalDir) => {
    const { location, dimension } = block

    const tryDir = (dir) => {
        const { x, z } = COCOA_DIRECTIONS[dir]
        const neighbour = dimension.getBlock({ x: location.x + x, y: location.y, z: location.z + z })
        return COCOA_VALID_LOGS.has(neighbour?.typeId) ? dir : null
    }

    const resolvedDir = tryDir(originalDir)
        ?? COCOA_DIRECTIONS.find(({ dir }) => tryDir(dir) !== null)?.dir // sadge o(n)
        ?? originalDir

    return BlockPermutation.resolve('minecraft:cocoa', { 'direction': resolvedDir, 'age': 0 })
}

/**@param {Player} player@param {string} seed@param {EntityEquippableComponent} equippable*/
const consumeOffhand = (player, seed, equippable) => {
    const offhandItem = equippable?.getEquipment(EquipmentSlot.Offhand)
    if (!offhandItem || offhandItem.typeId !== seed) return false

    const newAmount = offhandItem.amount - 1
    if (newAmount <= 0) player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 air`)
    else player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 ${seed} ${newAmount}`)
    return true
}

/**@param {PlayerBreakBlockBeforeEvent} data*/
export const harvest_playerBreakBlock = (data) => {
    const { player, itemStack, block } = data
    if (!itemStack) return
    if (player.matches({ gameMode: GameMode.Creative })) return

    const isHoe = itemStack.typeId.endsWith("_hoe")
    const isAxe = itemStack.typeId.endsWith("_axe")

    if (isHoe || isAxe) {
        if (isAxe && block?.typeId !== 'minecraft:cocoa') return

        const equippable = player.getComponent(EntityComponentTypes.Equippable)
        let item = equippable?.getEquipment(EquipmentSlot.Mainhand)
        if (block) {
            const { typeId, location, dimension } = block

            const level = PLANT_LEVEL[typeId]?.level ?? (typeId === 'minecraft:cocoa' ? 2 : NaN)
            const seed = PLANT_LEVEL[typeId]?.seed ?? (typeId === 'minecraft:cocoa' ? 'minecraft:cocoa_beans' : NaN)

            const growth = block.permutation.getState("growth") ?? block.permutation.getState("age")
            const originalDir = block.permutation.getState("direction") ?? 0

            if (!level) return
            if (growth >= level) {
                system.run(() => {
                    if (DURABILITY) {
                        const { changed, item: newItem } = applyItemDamage(player, item)
                        if (changed) equippable?.setEquipment(EquipmentSlot.Mainhand, newItem)
                    }

                    const offhandItem = (!isAxe && typeId !== 'minecraft:cocoa') && equippable?.getEquipment(EquipmentSlot.Offhand)
                    const offhandEntry = offhandItem && Object.entries(PLANT_LEVEL).find(([, v]) => v.seed === offhandItem.typeId)

                    const swapTypeId = offhandEntry?.[0]
                    const plantTypeId = (isHoe && swapTypeId === 'minecraft:cocoa') ? typeId : (swapTypeId ?? typeId)
                    const plantSeed = (isHoe && swapTypeId === 'minecraft:cocoa') ? seed : (offhandEntry?.[1]?.seed ?? seed)

                    const apply = () => {
                        const target = dimension.getBlock(location)
                        if (plantTypeId === 'minecraft:cocoa') target.setPermutation(resolveCocoaPermutation(target, originalDir))
                        else target.setPermutation(BlockPermutation.resolve(plantTypeId))
                    }

                    if (!LOSS_SEED) return apply()
                    if (consumeOffhand(player, plantSeed, equippable)) return apply()

                    const container = player.getComponent(EntityComponentTypes.Inventory).container
                    const slot = container.find(new ItemStack(plantSeed, 1))
                    if (slot !== undefined) {
                        const currItem = container.getItem(slot)
                        const newItem = reduceItem(currItem)
                        container.setItem(slot, newItem)
                        apply()
                    } else {
                        const itemEntity = dimension.getEntities({ type: 'minecraft:item', maxDistance: 2, location })

                        for (const en of itemEntity) {
                            const enItem = en.getComponent(EntityComponentTypes.Item)?.itemStack
                            if (!enItem || !en?.isValid) continue

                            if (enItem?.typeId === plantSeed) {
                                const newItem = reduceItem(enItem)
                                if (!newItem || newItem.typeId === 'minecraft:air') continue
                                try {
                                    const newEn = dimension.spawnItem(newItem, location)
                                    helper.pickupCooldown(newEn.id)
                                    newEn.applyImpulse(en.getVelocity())
                                } catch { /** cannot apply vec to "air" */ }

                                try { en.remove() }
                                catch {
                                    try { en.kill() }
                                    catch (_) { if (DEBUG) world.sendMessage(`[harvest.js] cannot remove ${plantSeed} ${_}`) }
                                } finally { return apply() }
                            }
                        }
                    }
                })
            } else if (!player.isSneaking) data.cancel = true
        }
    }
}