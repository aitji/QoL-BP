import { Block, BlockInventoryComponent, Dimension, EnchantmentType, Entity, EntityComponentTypes, EntityEquippableComponent, EntityInventoryComponent, EquipmentSlot, GameMode, ItemComponentTypes, ItemDurabilityComponent, ItemStack, Player, system, Vector3, world } from "@minecraft/server"
// lazy import ---
import { RUNTIME as E } from "./_store"
import * as H from "./core/helper"
import * as C from "./core/cache"

export const RUNTIME = E
export const helper = H
export const cache = C
export const pickupCooldown = H.pickupCooldown
// ---

type RoundType = 'none' | 'ceil' | 'floor' | 'round'
type EquSlot = 'Mainhand' | 'Offhand' | 'Head' | 'Body' | 'Legs' | 'Feet'

const { DEBUG } = E
export const clamp = (n: number, min: number = 0, max: number = 8) => Math.max(min, Math.min(max, Math.ceil(n)))
export const checkRandom = (arr: number | number[]) => {
    switch (typeof arr) {
        case 'object': return Math.random() * (arr[1] - arr[0]) + arr[0]
        case 'number': return arr
        default:
            console.warn("RANDOM AREN'T SET CORRECTLY")
            return 1
    }
}

export const applyItemDamage = (player: Player, item: ItemStack) => { // only for weapon, not armor
    const enchant = item?.getComponent(ItemComponentTypes.Enchantable)
    const dur = item?.getComponent(ItemComponentTypes.Durability)

    let changed = false
    if (!enchant || !dur) {
        if (DEBUG) world.sendMessage(`[lib] ${item.typeId} should be weapon that doesn't have durability or can be enchant`)
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
 */
export const reduceItem = (item: ItemStack, amount: number = 1, entity: Entity | null = null) => {
    if (amount === 0) return item // ??
    else if (amount > 0) {
        if (item.amount <= 1) return new ItemStack("minecraft:air", 1)
        else {
            const reduceItem = item.clone()
            reduceItem.amount -= 1

            return reduceItem
        }
    } else if (amount < 0) {
        if (!entity) throw Error(`[lib] reduceItem doesn't have Entity to add item`)
        const clone = item.clone()
        const container = getInv(entity)?.container

        clone.amount = Math.abs(amount)
        container?.addItem(clone)

        return clone
    } else {
        if (DEBUG) world.sendMessage(`${item?.typeId || '[??]'} add amount +${amount || '[??]'} which is ${typeof amount || '[??]'}`)
        return item
    }
}

export const getDistance = (a: Vector3, b: Vector3) => {
    const dx = a.x - b.x
    const dy = a.y - b.y
    const dz = a.z - b.z
    return dx * dx + dy * dy + dz * dz // faster than (Math.sqrt)
}

export const sumLoc = (loc1: Vector3, loc2: Vector3, roundType: RoundType = 'none') => {
    loc1 = roundLoc(loc1, roundType)
    loc2 = roundLoc(loc2, roundType)

    return {
        x: loc1.x + loc2.x,
        y: loc1.y + loc2.y,
        z: loc1.z + loc2.z,
    }
}

export const roundLoc = (loc: Vector3, roundType: RoundType = 'none') => {
    switch (roundType) {
        case 'ceil': return { x: Math.ceil(loc.x), y: Math.ceil(loc.y), z: Math.ceil(loc.z) }
        case 'floor': return { x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) }
        case 'round': return { x: Math.round(loc.x), y: Math.round(loc.y), z: Math.round(loc.z) }
        default: return loc
    }
}

export const reName = (typeId: string) => typeId
    ?.split(":")[1]
    ?.split('_')
    ?.map(v => v[0]
        ?.toUpperCase()
        + v
            ?.slice(1)
            ?.toLowerCase()
    )?.join(" ") // minecraft:trapped_chest -> Trapped Chest

// lazy helper, for lazy dev
export const getEqu = (entity: Entity) => entity.getComponent(EntityComponentTypes.Equippable)
export const getInv = (entity: Entity | Block | ItemStack) => entity.getComponent(EntityComponentTypes.Inventory)
export const setEqu = (entity: Player | Entity, itemStack: ItemStack | undefined = undefined, slot: EquSlot = EquipmentSlot.Mainhand, ignoreCreative = false) => {
    if (ignoreCreative && entity instanceof Player && C.getPlayer(entity, 'gameMode') === GameMode.Creative) return false
    if (!slot) return false

    try {
        const equ = getEqu(entity)
        if (!equ) return false
        equ.setEquipment(slot as EquipmentSlot, itemStack)
        return true
    } catch (e) {
        if (DEBUG) world.sendMessage(`entity=${typeof entity}, itemStack=${typeof itemStack}, slot=${typeof slot}`)
        return false
    }
}
export const playSound = (dimension: Dimension, location: Vector3, sounds: { ID: string, VOLUME: number | number[], PITCH: number | number[] }) => {
    const tryPlay = () => dimension.playSound(sounds.ID, location, {
        volume: checkRandom(sounds.VOLUME),
        pitch: checkRandom(sounds.PITCH)
    })

    try { tryPlay() }
    catch { system.run(() => tryPlay()) }
}

// debug tool lib
export const dumpMeThatComp = (anything: Entity | Player | ItemStack | Block, boardcast = true) => {
    const all = anything.getComponents()
    const v = all.map(d => d.typeId).join(', ')
    if (boardcast && DEBUG) world.sendMessage(v)
    return v
}