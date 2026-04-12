import {
    Block, BlockPermutation, Direction, EquipmentSlot,
    GameMode, ItemComponentTypes, PlayerInteractWithBlockBeforeEvent, system, world
} from "@minecraft/server"
import { applyItemDamage, getDistance, getEqu, playSound, RUNTIME, sumLoc } from "../../lib"
import { suppressLight } from "../light/core"
import { resolveCocoaPermutation } from "../harvest"
import { getSpecialPermutation, hasEntityInBlock, isReplaceableTarget, resolveOrientedPermutation } from "./placement"
import * as cache from "../../core/cache"

const {
    DEBUG, CARRIED_CHEST, BLOCKFACE_TO_DIR,
    HARVEST: { PLANT_LEVEL, COCOA_VALID_LOGS },
    LIGHT: { FIRE_ITEM, LIGHT_BLOCK, SEEDTOBLOCK },
    OFFHAND: { ALLOW_REPLACE, NEED_SNEAK, FACE_TO_TORCH_DIR, FACE_TO_NEIGHBOUR, TORCH_ID, LIGHT, PLACE_SOUND }
} = RUNTIME

export function canPlaceTorchOn(block: Block) {
    if (block.isAir) return true
    if (block.permutation.matches(LIGHT)) return true
    const replace = ALLOW_REPLACE[block.typeId]
    if (replace === true) return true
    if (replace === false) return block.below()?.isSolid ?? false
    return false
}

export const torchHandle = (data: PlayerInteractWithBlockBeforeEvent, creative: boolean) => {
    const { player, block, blockFace, itemStack } = data

    const equ = getEqu(player)!
    const offhandItem = equ.getEquipment(EquipmentSlot.Offhand)

    if (!offhandItem) return

    const reduceItem = () => {
        try {
            playSound(player.dimension, block.center(), PLACE_SOUND)

            if (creative) return
            if (offhandItem && offhandItem.amount <= 1) equ.setEquipment(EquipmentSlot.Offhand, undefined)
            else player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 ${offhandItem.typeId} ${offhandItem.amount - 1}`)
        } catch (e) { if (DEBUG) console.warn('[OFFHAND] unknown case:', e) }
    }

    let blockId = TORCH_ID[offhandItem.typeId] as Boolean | string
    if (!blockId) return
    if (blockId === true) blockId = offhandItem.typeId! as string

    if (block.isLiquid) return

    const isLightBlock = block.permutation.matches(LIGHT)
    const isSolid = block.isSolid && !isLightBlock

    const isInteractive = isSolid && (
        NEED_SNEAK[block.typeId] ||
        block.typeId.endsWith('_door') ||
        block.typeId.endsWith('_trapdoor') ||
        block.typeId.endsWith('_fence_gate')
    )
    if (isInteractive && !player.isSneaking) return

    if (isLightBlock) {
        data.cancel = true
        return system.run(() => {
            reduceItem()
            block.setPermutation(BlockPermutation.resolve(blockId as string).withState('torch_facing_direction', 'top'))
        })
    }

    if (isSolid) {
        if (
            CARRIED_CHEST.ENABLED &&
            NEED_SNEAK[block.typeId] &&
            player.isSneaking &&
            block.getComponent("minecraft:inventory")?.container
        ) return

        const getNeighbour = FACE_TO_NEIGHBOUR[blockFace]
        if (!getNeighbour) return

        const torchDir = FACE_TO_TORCH_DIR[blockFace] ?? 'top'

        const target = getNeighbour(block)
        if (!target || !canPlaceTorchOn(target)) return

        data.cancel = true
        system.run(() => {
            reduceItem()
            target.setPermutation(
                BlockPermutation
                    .resolve(blockId as string)
                    .withState('torch_facing_direction', torchDir)
            )
        })
        return
    }

    // replaceable blocks
    const replace = ALLOW_REPLACE[block.typeId]
    if (replace === undefined) return

    data.cancel = true
    system.run(() => {
        if (replace === false && !(block.below()?.isSolid)) return
        if (!canPlaceTorchOn(block)) return
        block.setPermutation(BlockPermutation.resolve(blockId as string).withState('torch_facing_direction', 'top'))
        reduceItem()
    })
}

export const fireHandle = (data: PlayerInteractWithBlockBeforeEvent) => {
    const { player, block, blockFace, itemStack } = data
    const tick = system.currentTick

    let above: Block | undefined // cache above block
    const isLight = (b?: Block) => b?.permutation?.matches(LIGHT_BLOCK) ?? false
    const isAboveLight = () => { // don't perm check if unnecessary
        above = block.above(1)
        return isLight(above)
    }

    const equ = getEqu(player)!
    const cache = block[BLOCKFACE_TO_DIR[blockFace]](1)!

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
        if (isLight(cache)) suppressLight(cache, false, false, false, tick)
        if (cache && (cache.permutation.matches('minecraft:fire') || cache.permutation.matches('minecraft:soul_fire'))) return
        system.run(() => {
            const dim = cache.dimension
            const done = () => {
                if (fireSound.REDUCE_ITEM) {
                    player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 ${offhandItem.typeId} ${offhandItem.amount - 1}`)
                } else {
                    const { item, changed } = applyItemDamage(player, offhandItem)
                    if (changed) {
                        const dmg = offhandItem.getComponent(ItemComponentTypes.Durability)?.damage
                        player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 ${offhandItem.typeId} ${offhandItem.amount} ${dmg ?? 0}`)
                    }
                    playSound(dim, cache.center(), fireSound)
                }
            }
            try {
                const below = cache.below(1)!
                if (
                    below.isSolid &&
                    (cache.permutation.matches('minecraft:air') || cache.permutation.matches(LIGHT_BLOCK))
                ) {
                    cache.setType('minecraft:fire')
                    done()
                }
            } catch (e) { if (DEBUG) world.sendMessage(`[offhand] fire ${e}`) }
        })
    }
}

export const seedsHandle = (data: PlayerInteractWithBlockBeforeEvent) => {
    const { player, block, blockFace, itemStack } = data

    const equ = getEqu(player)!
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

    const [blockTypeId] = plantEntry!
    data.cancel = true
    system.run(() => {
        above.setType(blockTypeId)
        const current = equ.getEquipment(EquipmentSlot.Offhand)
        if (!current) return
        if (current.amount <= 1) equ.setEquipment(EquipmentSlot.Offhand, undefined)
        else player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 ${typeId} ${current.amount - 1}`)
    })
}

export const blockHandle = (data: PlayerInteractWithBlockBeforeEvent, creative: boolean) => {
    const { player, block, blockFace, faceLocation, itemStack } = data
    const equ = getEqu(player)!
    const offhandItem = equ.getEquipment(EquipmentSlot.Offhand)
    if (!offhandItem) return

    const typeId = offhandItem.typeId
    if (SEEDTOBLOCK[typeId]) return // handled by seedsHandle
    if (TORCH_ID[typeId]) return // handled by torchHandle

    try { if (!BlockPermutation.resolve(typeId)) return } catch { return }

    const isInteractiveBlock = (
        NEED_SNEAK[block.typeId] != null ||
        block.typeId.endsWith('_door') ||
        block.typeId.endsWith('_trapdoor') ||
        block.typeId.endsWith('_fence_gate') ||
        !!block.getComponent("minecraft:inventory")
    )
    if (isInteractiveBlock && !player.isSneaking) return

    const target = block[BLOCKFACE_TO_DIR[blockFace]](1)
    if (!target) return
    if (!isReplaceableTarget(target)) return
    const upOn = (e: number, threshold = 0.8) => e % 1 >= threshold ? Math.ceil(e) : Math.floor(e)

    // vanilla: can't place inside own hitbox
    if (getDistance(sumLoc(target.location, { x: 0.5, y: 0, z: 0.5 }), player.location) <= 0.62) return
    if (DEBUG) {
        world.sendMessage(`${target.location.x.toFixed(2)} [${upOn(target.location.x)}] === ${player.location.x.toFixed(2)} [${upOn(player.location.x)}]`)
        world.sendMessage(`${target.location.y.toFixed(2)} [${upOn(target.location.y)}] === ${(player.location.y + 1).toFixed(2)} [${upOn(player.location.y + 1)}]`)
        world.sendMessage(`${target.location.z.toFixed(2)} [${upOn(target.location.z)}] === ${player.location.z.toFixed(2)} [${upOn(player.location.z)}]`)
    }
    if (
        upOn(target.location.x) === upOn(player.location.x) &&
        target.location.y === player.location.y + 1 &&
        upOn(target.location.z) === upOn(player.location.z)
    ) return
    // vanilla: can't place inside any other entity
    if (hasEntityInBlock(player.dimension, target.location, player.id)) return

    const { y: yaw } = player.getRotation()

    const special = getSpecialPermutation(typeId, blockFace, faceLocation, block, target, yaw)
    if (special === undefined) return
    const permutation = special ?? resolveOrientedPermutation(typeId, blockFace, yaw)

    data.cancel = true
    system.run(() => {
        try {
            const targetBlock = player.dimension.getBlock(target.location)
            if (!targetBlock || !isReplaceableTarget(targetBlock)) return
            if (hasEntityInBlock(player.dimension, target.location, player.id)) return
            targetBlock.setPermutation(permutation)
            const current = equ.getEquipment(EquipmentSlot.Offhand)
            if (!current) return

            if (!creative) {
                if (current.amount <= 1) equ.setEquipment(EquipmentSlot.Offhand, undefined)
                else player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 ${typeId} ${current.amount - 1}`)
            }
        } catch (e) { if (DEBUG) world.sendMessage(`[offhand] blockHandle ${e}`) }
    })
}