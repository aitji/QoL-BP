import { Block, BlockComponentTypes, BlockPermutation, EntityComponentTypes, EquipmentSlot, GameMode, ItemComponentTypes, ItemStack, LiquidType, Player, PlayerInteractWithBlockBeforeEvent, system, world } from "@minecraft/server"
import { checkRandom, getDistance, RUNTIME } from "../lib"
const { DEBUG, CARRIED_CHEST, OFFHAND: { ENABLED, ALLOW_REPLACE, NEED_SNEAK, FACE_TO_TORCH_DIR, FACE_TO_NEIGHBOUR, TORCH_ID, LIGHT, PLACE_SOUND } } = RUNTIME

const DOUBLE_SNEAK_WINDOW_MOBILE = 20
const DOUBLE_SNEAK_WINDOW_DEFAULT = 12

const DYP = {
    lastSneakTick: id => `qof:lst:${id}`,
    wasSneaking: id => `qof:ws:${id}`,
}

/**
 * @typedef {{ lastSneakTick: number, wasSneaking: boolean }} SneakState
 * @type {Map<string, SneakState>}
 */
const sneakState = new Map()
export const offhand_playerSpawn = (data) => data.initialSpawn && _restorePlayerState(data.player)
export const offhand_playerLeave = (data) => sneakState.delete(data.playerId)
system.run(() => { for (const player of world.getAllPlayers()) _restorePlayerState(player) })

/**@param {Player} player*/
function _restorePlayerState(player) {
    const { id } = player
    if (sneakState.has(id)) return

    /** @type {number} */
    const lastSneakTick = player.getDynamicProperty(DYP.lastSneakTick(id)) ?? -999
    /** @type {boolean} */
    const wasSneaking = player.getDynamicProperty(DYP.wasSneaking(id)) ?? false

    sneakState.set(id, {
        lastSneakTick: (lastSneakTick),
        wasSneaking: (wasSneaking),
    })
}

/** @param {Player} player @param {Partial<SneakState>} patch */
function _writeSneakState(player, patch) {
    const state = sneakState.get(player.id)
    if (!state) return

    if (patch.lastSneakTick !== undefined) {
        state.lastSneakTick = patch.lastSneakTick
        player.setDynamicProperty(DYP.lastSneakTick(player.id), patch.lastSneakTick)
    }
    if (patch.wasSneaking !== undefined) {
        state.wasSneaking = patch.wasSneaking
        player.setDynamicProperty(DYP.wasSneaking(player.id), patch.wasSneaking)
    }
}

/**@param {Player} player@param {number} now*/
export function offhand_player(player, now) {
    const { id, isSneaking } = player
    if (!sneakState.has(id)) _restorePlayerState(player) // lazy init

    const state = sneakState.get(id)
    const window = player.clientSystemInfo.platformType === "Mobile"
        ? DOUBLE_SNEAK_WINDOW_MOBILE
        : DOUBLE_SNEAK_WINDOW_DEFAULT

    const justReleased = state.wasSneaking && !isSneaking
    if (justReleased) {
        const gap = now - state.lastSneakTick
        if (gap <= window) swapItem(player)
        _writeSneakState(player, { lastSneakTick: now })
    }

    if (state.wasSneaking !== isSneaking)
        _writeSneakState(player, { wasSneaking: isSneaking })
}

/** @param {ItemStack | undefined} item @returns {boolean} */
function hasUnsafeProperties(item) {
    if (!item) return false
    if (item.nameTag) return true

    const enchants = item.getComponent(ItemComponentTypes.Enchantable)
    if (enchants?.getEnchantments().length > 0) return true

    // const durability = item.getComponent(ItemComponentTypes.Durability)
    // if ((durability?.damage ?? 0) > 0) return true

    const dye = item.getComponent(ItemComponentTypes.Dyeable)
    if (dye) {
        const { color: c, defaultColor: d } = dye
        if (c.red !== d.red || c.green !== d.green || c.blue !== d.blue) return true
    }

    return false
}

/** @param {Player} player */
function swapItem(player) {
    const equippable = player.getComponent(EntityComponentTypes.Equippable)
    const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand)
    const offhand = equippable.getEquipment(EquipmentSlot.Offhand)

    if (hasUnsafeProperties(mainhand) || hasUnsafeProperties(offhand)) return player.sendMessage("§7Couldn't transfer item with nametag/enchantment/durability/color")
    const durability = mainhand?.getComponent(ItemComponentTypes.Durability)
    equippable.setEquipment(EquipmentSlot.Mainhand, offhand ?? undefined)
    if (mainhand) player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 ${mainhand.typeId} ${mainhand.amount} ${durability ? durability.damage : 0}`)
    else equippable.setEquipment(EquipmentSlot.Offhand, undefined)
}

export const offhand_playerInteractWithEntity = (event) => {
    const { player, target } = event
    const equippable = player.getComponent(EntityComponentTypes.Equippable)
    const offhandItem = equippable.getEquipment(EquipmentSlot.Offhand)

    const isMilkable = (
        target.typeId === "minecraft:cow" ||
        target.typeId === "minecraft:mooshroom"
    )

    if (isMilkable && offhandItem?.typeId === "minecraft:bucket") {
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

const ITEMBUTBLOCK = Object.freeze({ // aka, skip item ; todo: add to config
    "minecraft:water_bucket": true,
    "minecraft:axolotl_bucket": true,
    "minecraft:cod_bucket": true,
    "minecraft:lava_bucket": true,
    "minecraft:powder_snow_bucket": true,
    "minecraft:pufferfish_bucket": true,
    "minecraft:salmon_bucket": true,
    "minecraft:tadpole_bucket": true,
    "minecraft:tropical_fish_bucket": true,
    "minecraft:bucket": true, // edge case, not a block but need to skip
    "minecraft:redstone": true,
    "minecraft:redstone_torch": true,
})

const delay = {}
/**
 * @param {PlayerInteractWithBlockBeforeEvent} data 
 * @returns 
 */
export const offhand_playerInteractWithBlock = (data) => {
    const { player, block, blockFace, isFirstEvent } = data
    if (!isFirstEvent) {
        const playerDelay = delay[player.id] || 0
        if (playerDelay > system.currentTick) return
    }
    delay[player.id] = system.currentTick + 4 // vanilla delay ;todo: make this config

    const equ = player.getComponent(EntityComponentTypes.Equippable)
    const offhandItem = equ.getEquipment(EquipmentSlot.Offhand)
    const mainhandItem = equ.getEquipment(EquipmentSlot.Mainhand)

    const reduceItem = () => {
        if (player.matches({ gameMode: GameMode.Creative })) return
        try {
            player.dimension.playSound(PLACE_SOUND.ID, block.center(), {
                volume: checkRandom(PLACE_SOUND.VOLUME),
                pitch: checkRandom(PLACE_SOUND.PITCH)
            })

            if (offhandItem.amount <= 1) equ.setEquipment(EquipmentSlot.Offhand, undefined)
            else player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 ${offhandItem.typeId} ${offhandItem.amount - 1}`)
        } catch (e) { if (DEBUG) console.warn('[OFFHAND] unknown case:', e) }
    }

    const cache = FACE_TO_NEIGHBOUR[blockFace]
    if (offhandItem?.typeId !== TORCH_ID) return
    const mainhandIsBlock = (() => {
        const typeId = mainhandItem?.typeId ?? ''
        if (ITEMBUTBLOCK[typeId] === true) return true
        const distance = getDistance(block.center(), player.location)
        if (distance < 1) return false

        try { return mainhandItem && BlockPermutation.resolve(typeId) !== undefined }
        catch { return false }
    })()
    if (block && cache.typeId !== block.typeId && mainhandIsBlock) return
    if (block.isLiquid) return

    const isSolidOrLight = block.isSolid || block.permutation.matches(LIGHT)
    if (isSolidOrLight && NEED_SNEAK[block.typeId] && !player.isSneaking) return

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
            target.setPermutation(BlockPermutation.resolve(TORCH_ID).withState('torch_facing_direction', torchDir))
        })
    }

    const replace = ALLOW_REPLACE[block.typeId]
    if (replace === undefined) return

    system.run(() => {
        if (replace === false && !(block.below()?.isSolid)) return
        if (canPlaceTorchOn(block)) block.setPermutation(BlockPermutation.resolve(TORCH_ID).withState('torch_facing_direction', 'top'))
        reduceItem()
    })
}