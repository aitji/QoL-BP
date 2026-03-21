import { EnchantmentType, Entity, EntityComponentTypes, EntityEquippableComponent, EntityInventoryComponent, ItemComponentTypes, ItemDurabilityComponent, ItemStack, Player, system, world } from "@minecraft/server"
import { RUNTIME as E } from "./_store"
const { DEBUG } = E
export const RUNTIME = E

export const clamp = (n, min = 0, max = 8) => Math.max(min, Math.min(max, Math.ceil(n)))
export const checkRandom = (arr) => {
    switch (typeof arr) {
        case 'object': return Math.random() * (arr[1] - arr[0]) + arr[0]
        case 'number': return arr
        default:
            console.warn("RANDOM AREN'T SET CORRECTLY")
            return 1
    }
}

/**
 * @param {ItemStack} item
 * @returns {{changed: boolean, item: ItemStack}}
 */
export const applyItemDamage = (player, item) => { // only for weapon, not armor
    const enchant = item?.getComponent(ItemComponentTypes.Enchantable)
    const dur = item?.getComponent(ItemComponentTypes.Durability)

    let changed = false
    if (!enchant || !dur) {
        if (DEBUG) world.sendMessage(`[lib.js] ${item.typeId} should be weapon that doesn't have durability or can be enchant`)
        return { changed, item } // do nothing
    }

    const unbreaking = enchant.getEnchantment("unbreaking")
    if (unbreaking && unbreaking?.level) {
        if (!(Math.random() < 1 / (unbreaking.level + 1)))
            return { changed, item }
    }

    const newDurability = dur.damage + 1
    if (newDurability >= dur.maxDurability) {
        item = new ItemStack('minecraft:air', 1)
        player.dimension.playSound('random.break', player.location)
        changed = true
    } else {
        dur.damage = newDurability
        changed = true
    }

    return { changed, item }
}

/**@param {ItemStack} item*/
export const reduceItem = (item) => {
    if (item.amount <= 1) return new ItemStack("minecraft:air", 1)
    else {
        const reduceItem = item.clone()
        reduceItem.amount -= 1

        return reduceItem
    }
}

// lazy helper
/**
 * @param {Entity} entity 
 * @returns {EntityEquippableComponent}
 */
export const getEqu = (entity) => entity.getComponent(EntityComponentTypes.Equippable)
/**
 * @param {Entity} entity 
 * @returns {EntityInventoryComponent}
 */
export const getInv = (entity) => entity.getComponent(EntityComponentTypes.Inventory)