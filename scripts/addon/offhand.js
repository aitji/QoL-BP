import { Block, BlockComponentTypes, BlockPermutation, Difficulty, Direction, EntityComponentTypes, EquipmentSlot, GameMode, ItemComponentTypes, ItemStack, LiquidType, Player, PlayerInteractWithBlockBeforeEvent, PlayerInteractWithEntityBeforeEvent, system, world } from "@minecraft/server"
import { applyItemDamage, checkRandom, getDistance, getEqu, reduceItem, roundLoc, RUNTIME, setEqu, sumLoc } from "../lib"
import { suppressLight } from "./light/core"
import { resolveCocoaPermutation } from "./harvest"
import * as cache from "../core/cache"

const { DEBUG, CARRIED_CHEST, BLOCKFACE_TO_DIR, HARVEST: { PLANT_LEVEL, COCOA_VALID_LOGS }, LIGHT: { FIRE_ITEM, LIGHT_BLOCK }, OFFHAND: { ENABLED, ALLOW_REPLACE, NEED_SNEAK, FACE_TO_TORCH_DIR, FACE_TO_NEIGHBOUR, TORCH_ID, LIGHT, PLACE_SOUND, BLOCK_INTERACTION_DELAY, ITEMBUTBLOCK, DOUBLE_SNEAK_WINDOW_MOBILE, DOUBLE_SNEAK_WINDOW_CONSOLE, DOUBLE_SNEAK_WINDOW_DEFAULT, DISALLOWED_ITEM, FOOD_DATA, CAN_ALWAYS_USE } } = RUNTIME
/**
 * @typedef {{ lastSneakTick: number, wasSneaking: boolean }} SneakState
 * @type {Map<string, SneakState>}
 */
const sneakState = new Map()
export const offhand_playerSpawn = (data) => data.initialSpawn && _initPlayer(data.player)
export const offhand_playerLeave = (data) => sneakState.delete(data.playerId)
system.run(() => { for (const player of world.getAllPlayers()) _initPlayer(player) })

/**@param {Player} player*/
function _initPlayer(player) {
    const { id } = player
    if (sneakState.has(id)) return
    sneakState.set(id, { lastSneakTick: -999, wasSneaking: false })
}

const sneakWindow = Object.freeze({
    Mobile: DOUBLE_SNEAK_WINDOW_MOBILE,
    Console: DOUBLE_SNEAK_WINDOW_CONSOLE,
    Desktop: DOUBLE_SNEAK_WINDOW_DEFAULT
})

/**@param {Player} player@param {number} now*/
export function offhand_player(player, now) {
    const { id, isSneaking } = player
    if (!sneakState.has(id)) _initPlayer(player)

    const state = sneakState.get(id)
    const plCache = cache.getPlayer(player)
    const window = sneakWindow[plCache?.platformType ?? 'Desktop']

    const justReleased = state.wasSneaking && !isSneaking
    if (justReleased) {
        const gap = now - state.lastSneakTick
        if (gap <= window) {
            swapItem(player)
            state.lastSneakTick = 0
        } else state.lastSneakTick = now
    }

    state.wasSneaking = isSneaking
}

/** @param {ItemStack | undefined} item @returns {boolean} */
function hasUnsafeProperties(item) {
    if (!item) return false
    if (item.nameTag) return true
    if (item.getLore().length > 0) return true

    const enchants = item.getComponent(ItemComponentTypes.Enchantable)
    if (enchants?.getEnchantments().length > 0) return true

    // nvm i found the way!
    // const durability = item.getComponent(ItemComponentTypes.Durability)
    // if ((durability?.damage ?? 0) > 0) return true

    // const dye = item.getComponent(ItemComponentTypes.Dyeable)
    // if (dye) {
    //     const { color: c, defaultColor: d } = dye
    //     if (c.red !== d.red || c.green !== d.green || c.blue !== d.blue) return true
    // }

    // edge case
    const isDisallow = DISALLOWED_ITEM.has(item?.typeId ?? '')
    if (isDisallow && isDisallow === true) return true

    return false
}

/** @param {Player} player */
function swapItem(player) {
    const equippable = player.getComponent(EntityComponentTypes.Equippable)
    const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand)
    const offhand = equippable.getEquipment(EquipmentSlot.Offhand)

    if (hasUnsafeProperties(mainhand))
        return player.sendMessage("§7Couldn't transfer item with nametag/enchantment/nbt")

    // const savedEnchants = mainhand?.getComponent(ItemComponentTypes.Enchantable)?.getEnchantments() ?? []
    const durability = mainhand?.getComponent(ItemComponentTypes.Durability)

    equippable.setEquipment(EquipmentSlot.Mainhand, offhand ?? undefined)

    if (mainhand) {
        player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 ${mainhand.typeId} ${mainhand.amount} ${durability ? durability.damage : 0}`)
        /*if (savedEnchants.length > 0) {
            system.run(() => {
                const oh = equippable.getEquipment(EquipmentSlot.Offhand)
                if (!oh) return
                const enc = oh.getComponent(ItemComponentTypes.Enchantable)
                if (!enc) return
                for (const e of savedEnchants) enc.addEnchantment(e)
            })
        }*/
    } else equippable.setEquipment(EquipmentSlot.Offhand, undefined)
}

const SUS_STEW = Object.freeze({
    // night vision
    "minecraft:poppy": 0,
    "minecraft:torchflower": 10,

    // jump boost
    "minecraft:cornflower": 1,

    // weakness
    "minecraft:orange_tulip": 2,
    "minecraft:pink_tulip": 2,
    "minecraft:red_tulip": 2,
    "minecraft:white_tulip": 2,

    // blindness
    "minecraft:azure_bluet": 3,
    "minecraft:open_eyeblossom": 11,

    // poison
    "minecraft:lily_of_the_valley": 4,

    // saturation
    "minecraft:golden_dandelion": 5,
    "minecraft:dandelion": 5,
    "minecraft:blue_orchid": 6,

    // fire resistance
    "minecraft:allium": 7,

    // regeneration
    "minecraft:oxeye_daisy": 8,

    // wither
    "minecraft:wither_rose": 9,

    // nausea
    "minecraft:closed_eyeblossom": 12
})

const susCow = new Map()

/**@param {PlayerInteractWithEntityBeforeEvent} event*/
export const offhand_playerInteractWithEntity = (event) => {
    const { player, target, itemStack } = event
    const equippable = player.getComponent(EntityComponentTypes.Equippable)
    const offhand = equippable.getEquipment(EquipmentSlot.Offhand)

    if (
        (target.typeId === "minecraft:cow" || target.typeId === "minecraft:mooshroom") &&
        offhand?.typeId === "minecraft:bucket"
    ) {
        event.cancel = true
        system.run(() => {
            player.runCommand("replaceitem entity @s slot.weapon.offhand 0 milk_bucket")
            player.playSound("mob.cow.milk", { volume: 0.5, location: player.location })
        })
        return
    }
    // maybe later -aitji
}

function canPlaceTorchOn(block) {
    if (block.isAir) return true
    // if (block.isLiquid) return false // block is alr NOT liquid
    if (block.permutation.matches(LIGHT)) return true
    const replace = ALLOW_REPLACE[block.typeId]
    if (replace === true) return true
    if (replace === false) return block.below()?.isSolid ?? false
    return false
}

const delay = {}
/**@param {PlayerInteractWithBlockBeforeEvent} data*/
export const offhand_playerInteractWithBlock = (data) => {
    const { player, isFirstEvent, block, blockFace, itemStack } = data

    if (!isFirstEvent) {
        const playerDelay = delay[player.id] || 0
        if (playerDelay > system.currentTick) return
    }
    delay[player.id] = system.currentTick + BLOCK_INTERACTION_DELAY

    const creative = cache.getPlayer(player, 'gameMode') === GameMode.Creative
    if (itemStack) {
        const typeId = itemStack?.typeId ?? ''
        const food = FOOD_DATA[typeId] // vanilla return empty in food component -.-
        const hunger = player.getComponent(EntityComponentTypes.Hunger)

        // disallow main hand always use item
        if (typeId) {
            if (CAN_ALWAYS_USE.has(typeId)) return
            if (typeId.endsWith('_boat')) return
            if (typeId.endsWith('minecart')) return
            if (typeId.endsWith('harness')) return
            if (typeId.endsWith('bundle')) return
            if (typeId.endsWith('_boots')) return
            if (typeId.endsWith('_leggings')) return
            if (typeId.endsWith('_chestplate')) return
            if (typeId.endsWith('_helmet')) return
            if (block && block.typeId === 'minecraft:jukebox' && typeId.startsWith('minecraft:music_disc_')) return
        }

        // ignore foods
        if (food) {
            if (
                creative ||
                food?.canAlwaysEat ||
                world.getDifficulty() === Difficulty.Peaceful ||
                hunger.currentValue < hunger.effectiveMax
            ) return
        }

        // shovel/hoe
        if (
            block && block?.hasTag('dirt') &&
            itemStack && (
                itemStack.hasTag('minecraft:is_shovel') ||
                itemStack.hasTag('minecraft:is_hoe') && !(
                    block.typeId === 'minecraft:farmland' ||
                    block.typeId === 'minecraft:soul_sand' ||
                    COCOA_VALID_LOGS.has(block.typeId)
                )
            )
        ) return

        if (ITEMBUTBLOCK[typeId] === true) return
        try { return !(itemStack && BlockPermutation.resolve(itemStack?.typeId) !== undefined) }
        catch { }
    }

    // handle offhand
    torchHandle(data, creative)
    fireHandle(data)
    seedsHandle(data)
    blockHandle(data)
}

/**@param {PlayerInteractWithBlockBeforeEvent} data*/
const blockHandle = (data) => { // still demo process
    const { player, block, blockFace, itemStack } = data

    const equ = getEqu(player)
    const offhandItem = equ.getEquipment(EquipmentSlot.Offhand)
    if (!offhandItem) return

    const typeId = offhandItem?.typeId
    let pass = false, permutation
    try {
        permutation = BlockPermutation.resolve(typeId)
        pass = permutation !== undefined
    } catch { pass = false }
    if (!pass) return

    const target = block[BLOCKFACE_TO_DIR[blockFace]](1)
    const distance = getDistance(sumLoc(target.location, { x: 0.5, y: 0, z: 0.5 }), player.location)

    if (distance <= 0.62) return
    system.run(() => {
        player.dimension.getBlock(target.location).setPermutation(permutation)
        const current = equ.getEquipment(EquipmentSlot.Offhand)
        if (current.amount <= 1) equ.setEquipment(EquipmentSlot.Offhand, undefined)
        if (!cache.getPlayer(player, 'gameMode') === GameMode.Creative) player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 ${typeId} ${offhandItem.amount - 1}`)
    })
}

/**@param {PlayerInteractWithBlockBeforeEvent} data*/
const seedsHandle = (data) => {
    const { player, block, blockFace, itemStack } = data

    const equ = getEqu(player)
    const offhandItem = equ.getEquipment(EquipmentSlot.Offhand)
    if (!offhandItem) return

    const typeId = offhandItem.typeId
    const isCocoa = typeId === 'minecraft:cocoa_beans'
    const plantEntry = Object.entries(PLANT_LEVEL).find(([, v]) => v.seed === typeId)

    if (!plantEntry && !isCocoa) return
    if (isCocoa) {
        if (!COCOA_VALID_LOGS.has(block?.typeId)) return
        if (block && itemStack && itemStack.hasTag('minecraft:is_axe') && (
            block.typeId === 'minecraft:jungle_log' ||
            block.typeId === 'minecraft:jungle_wood')
        ) return

        const target = block[BLOCKFACE_TO_DIR[blockFace]](1)
        if (!target || !(target.isAir || target.permutation.matches(LIGHT_BLOCK))) return

        data.cancel = true
        system.run(() => {
            target.setPermutation(resolveCocoaPermutation(target, 0))
            const current = equ.getEquipment(EquipmentSlot.Offhand)
            if (!current) return
            if (current.amount <= 1) equ.setEquipment(EquipmentSlot.Offhand, undefined)
            else player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 ${typeId} ${current.amount - 1}`)
        })
        return
    }
    if (blockFace !== Direction.Up) return

    const validSoil = block.typeId === 'minecraft:farmland' || block.typeId === 'minecraft:soul_sand'
    if (!validSoil) return

    const above = block.above(1)
    if (!above || !(above.isAir || above.permutation.matches(LIGHT_BLOCK))) return

    const [blockTypeId] = plantEntry
    data.cancel = true
    system.run(() => {
        above.setType(blockTypeId)
        const current = equ.getEquipment(EquipmentSlot.Offhand)
        if (!current) return
        if (current.amount <= 1) equ.setEquipment(EquipmentSlot.Offhand, undefined)
        else player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 ${typeId} ${current.amount - 1}`)
    })
}

/**@param {PlayerInteractWithBlockBeforeEvent} data*/
const fireHandle = (data) => {
    const { player, block, blockFace, itemStack } = data
    const tick = system.currentTick

    /** @type {Block?} */
    let above // cache above block
    const isLight = (b) => b.permutation?.matches(LIGHT_BLOCK) ?? false
    const isAboveLight = () => { // don't perm check if unnesscery
        above = block.above(1)
        return isLight(above)
    }

    const equ = getEqu(player)
    const cache = block[BLOCKFACE_TO_DIR[blockFace]](1)

    // fix vanilla consumed wired durability
    if (
        cache && (cache.permutation.matches('minecraft:fire') || cache.permutation.matches('minecraft:soul_fire')) &&
        itemStack && itemStack.typeId === 'minecraft:flint_and_steel'
    ) data.cancel = true

    const offhandItem = equ.getEquipment(EquipmentSlot.Offhand)
    if (!offhandItem) return
    const itemType = offhandItem.typeId
    const fireSound = FIRE_ITEM[itemType]
    if (fireSound) {
        /** @type {Block} */
        if (isLight(cache)) suppressLight(cache, false, false, false, tick)
        if (cache && (cache.permutation.matches('minecraft:fire') || cache.permutation.matches('minecraft:soul_fire'))) return
        system.run(() => {
            const dim = cache.dimension
            const done = () => {
                if (fireSound.REDUCE_ITEM) {
                    // const currItem = equ.getEquipment(EquipmentSlot.Offhand)
                    // const newItem = reduceItem(currItem, 1)
                    // equ.setEquipment(EquipmentSlot.Offhand, newItem)
                    player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 ${offhandItem.typeId} ${offhandItem.amount - 1}`)
                } else {
                    const { item, changed } = applyItemDamage(player, offhandItem)
                    // if (changed) setEqu(player, item, "Offhand", true)
                    if (changed) {
                        const dmg = offhandItem.getComponent(ItemComponentTypes.Durability)?.damage
                        player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 ${offhandItem.typeId} ${offhandItem.amount} ${dmg ?? 0}`)
                    }
                    dim.playSound(fireSound.ID, cache.center(), {
                        pitch: checkRandom(fireSound.PITCH),
                        volume: checkRandom(fireSound.VOLUME)
                    })
                }
            }
            try {
                const below = cache.below(1)
                if (
                    below.isSolid &&
                    (cache.permutation.matches('minecraft:air') || cache.permutation.matches(LIGHT_BLOCK))
                ) {
                    cache.setType('minecraft:fire')
                    done()
                }
            } catch (e) { if (DEBUG) world.sendMessage(`[offhand.js] fire ${e}`) }
        })
    }
}

/**@param {PlayerInteractWithBlockBeforeEvent} data*/
const torchHandle = (data, creative) => {
    const { player, block, blockFace, itemStack } = data

    const equ = player.getComponent(EntityComponentTypes.Equippable)
    const offhandItem = equ.getEquipment(EquipmentSlot.Offhand)
    const mainhandItem = equ.getEquipment(EquipmentSlot.Mainhand)

    const reduceItem = () => {
        try {
            player.dimension.playSound(PLACE_SOUND.ID, block.center(), {
                volume: checkRandom(PLACE_SOUND.VOLUME),
                pitch: checkRandom(PLACE_SOUND.PITCH)
            })

            if (creative) return
            if (offhandItem.amount <= 1) equ.setEquipment(EquipmentSlot.Offhand, undefined)
            else player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 ${offhandItem.typeId} ${offhandItem.amount - 1}`)
        } catch (e) { if (DEBUG) console.warn('[OFFHAND] unknown case:', e) }
    }

    const cache = FACE_TO_NEIGHBOUR[blockFace]
    let blockId = TORCH_ID[offhandItem?.typeId]
    if (!blockId) return
    if (blockId === true) blockId = offhandItem.typeId

    if (block && cache.typeId !== block.typeId) return
    if (block.isLiquid) return

    const isLightBlock = block.permutation.matches(LIGHT)
    const isSolidOrLight = (block.isSolid || isLightBlock) && !isLightBlock
    if (isSolidOrLight && NEED_SNEAK[block.typeId] && !player.isSneaking) return

    if (isLightBlock) {
        data.cancel = true
        return system.run(() => {
            reduceItem()
            block.setPermutation(BlockPermutation.resolve(blockId).withState('torch_facing_direction', 'top'))
        })
    }

    if (isSolidOrLight) {
        if (CARRIED_CHEST.ENABLED && NEED_SNEAK[block.typeId] && player.isSneaking && block.getComponent("minecraft:inventory")?.container) return
        data.cancel = true
        const getNeighbour = cache
        if (!getNeighbour) return
        const torchDir = FACE_TO_TORCH_DIR[blockFace] ?? 'top'

        return system.run(() => {
            const target = getNeighbour(block)
            if (!target || !canPlaceTorchOn(target)) return
            reduceItem()
            target.setPermutation(BlockPermutation.resolve(blockId).withState('torch_facing_direction', torchDir))
        })
    }

    const replace = ALLOW_REPLACE[block.typeId]
    if (replace === undefined) return

    system.run(() => {
        if (replace === false && !(block.below()?.isSolid)) return
        if (canPlaceTorchOn(block)) block.setPermutation(BlockPermutation.resolve(blockId).withState('torch_facing_direction', 'top'))
        reduceItem()
    })
}