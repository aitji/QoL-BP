import { Block, BlockInventoryComponent, EnchantmentType, Entity, EntityComponentTypes, EntityEquippableComponent, EntityInventoryComponent, EquipmentSlot, GameMode, ItemComponentTypes, ItemDurabilityComponent, ItemStack, Player, system, world } from "@minecraft/server"
// lazy import ---
import { RUNTIME as E } from "./_store"
import * as H from "./core/helper"
import * as C from "./core/cache"

export const RUNTIME = E
export const helper = H
export const cache = C
export const pickupCooldown = H.pickupCooldown
// ---

const { DEBUG } = E
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
 * @param {Player} player
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
        player.dimension.playSound('random.break', player.location, { pitch: 0.9 })
        changed = true
    } else {
        dur.damage = newDurability
        changed = true
    }

    return { changed, item }
}

/**
 * @param {ItemStack} item
 * @param {number} amount=1 ; support negative
 * @param {Entity|null} entity=null ; if use negative number
 * @param {Boolean} ignoreCreative=false
 */
export const reduceItem = (item, amount = 1, entity = null) => {
    if (amount === 0) return item // ??
    else if (amount > 0) {
        if (item.amount <= 1) return new ItemStack("minecraft:air", 1)
        else {
            const reduceItem = item.clone()
            reduceItem.amount -= 1

            return reduceItem
        }
    } else if (amount < 0) {
        const clone = item.clone()
        const container = getInv(entity)?.container

        clone.amount = Math.abs(amount)
        container.addItem(clone)

        return clone
    } else {
        if (DEBUG) world.sendMessage(`${item?.typeId || '[??]'} add amount +${amount || '[??]'} which is ${typeof amount || '[??]'}`)
        return item
    }
}

/**
 * @param {{x:number, y:number, z:number}} loc1 
 * @param {{x:number, y:number, z:number}} loc2 
 * @returns {number}
 */
export const getDistance = (a, b) => {
    const dx = a.x - b.x
    const dy = a.y - b.y
    const dz = a.z - b.z
    return dx * dx + dy * dy + dz * dz // faster than (Math.sqrt)
}
/**
 * @param {{x:number, y:number, z:number}} loc1 
 * @param {{x:number, y:number, z:number}} loc2 
 * @param {'none'|'ceil'|'floor'|'round'} roundType
 * @returns {{x:number, y:number, z:number}}
 */
export const sumLoc = (loc1, loc2, roundType = 'none') => {
    loc1 = roundLoc(loc1, roundType)
    loc2 = roundLoc(loc2, roundType)

    return {
        x: loc1.x + loc2.x,
        y: loc1.y + loc2.y,
        z: loc1.z + loc2.z,
    }
}
/**
 * @param {{x:number, y:number, z:number}} loc1
 * @param {'none'|'ceil'|'floor'|'round'} roundType
 * @returns {{x:number, y:number, z:number}}
 */
export const roundLoc = (loc, roundType = 'none') => {
    switch (roundType) {
        case 'ceil': return { x: Math.ceil(loc.x), y: Math.ceil(loc.y), z: Math.ceil(loc.z) }
        case 'floor': return { x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) }
        case 'round': return { x: Math.round(loc.x), y: Math.round(loc.y), z: Math.round(loc.z) }
        default: return loc
    }
}

// lazy helper, for lazy dev
/**
 * @param {Entity} entity 
 * @returns {EntityEquippableComponent}
 */
export const getEqu = (entity) => entity.getComponent(EntityComponentTypes.Equippable)
/**
 * @param {Entity|Block} entity 
 * @returns {EntityInventoryComponent|BlockInventoryComponent}
 */
export const getInv = (entity) => entity.getComponent(EntityComponentTypes.Inventory)
/**
 * @param {Player|Entity} entity
 * @param {ItemStack} itemStack=[undefined] ; set to nothing
 * @param {'Mainhand'|'Offhand'|'Head'|'Body'|'Legs'|'Feet'|EquipmentSlot} slot=[Mainhand] ; common
 * @returns {Boolean} is success?
 */
export const setEqu = (entity, itemStack = undefined, slot = EquipmentSlot.Mainhand, ignoreCreative = false) => {
    if (ignoreCreative && entity instanceof Player && C.getPlayer(entity, 'gameMode') === GameMode.Creative) return

    try {
        const equ = getEqu(entity)
        equ.setEquipment(slot, itemStack)
        return true
    } catch (e) {
        if (DEBUG) world.sendMessage(`entity=${typeof entity}, itemStack=${typeof itemStack}, slot=${typeof slot}`)
        return false
    }
}

// debug tool lib
/**
 * @param {Entity|Player|ItemStack|Block} anything 
 */
export const dumpMeThatComp = (anything, boardcast = true) => {
    const all = anything.getComponents()
    const v = all.map(d => d.typeId).join(', ')
    if (boardcast && DEBUG) world.sendMessage(v)
    return v
}