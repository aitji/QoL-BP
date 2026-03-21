import { BlockComponentTypes, BlockPermutation, EntityComponentTypes, EquipmentSlot, GameMode, ItemComponentTypes, ItemStack, PlayerInteractWithBlockBeforeEvent, PlayerPlaceBlockAfterEvent, system, world } from "@minecraft/server"
import { checkRandom, clamp, RUNTIME } from "../lib"
const { DEBUG, SLICE_PREFIX, COMPOSTER: { BLOCK_TYPEID, ITEMS, SOUND_FILL_SUCCESS, SOUND_FILL, SOUND_READY, DELAY_BEFORE_READY, HOPPER_TYPEID, HOPPER_INTERVAL_TICK, DATA_LOSS_DYP, PARTICLE_FILL_SUCCESS, DATA_COMPOSTER_LOCATION, SOUND_FILL_BONEMEAL } } = RUNTIME

const clamp8 = (n) => clamp(n, 0, 8)
const composterSet = new Set()
system.run(() => {
    if (!RUNTIME.COMPOSTER.ENABLED || !RUNTIME.COMPOSTER.WORK_WITH_HOPPER) return
    const raw = world.getDynamicProperty(DATA_COMPOSTER_LOCATION)
    if (raw) {
        composterSet.clear()
        for (const v of JSON.parse(raw)) composterSet.add(v)
    }

    const data = JSON.parse(world.getDynamicProperty(DATA_LOSS_DYP) ?? '{}')
    for (const key of Object.keys(data)) {
        const [dim, sx, sy, sz] = key.split(':')
        const x = +sx
        const y = +sy
        const z = +sz
        const loc = { x, y, z }
        const dimension = world.getDimension(dim)
        const block = dimension.getBlock(loc)
        if (block.typeId === BLOCK_TYPEID && block.permutation.getState('composter_fill_level') === 7) {
            const p = BlockPermutation.resolve(BLOCK_TYPEID).withState("composter_fill_level", 8)
            block.setPermutation(p)
            playSound(dimension, SOUND_READY, loc)
        }

        // ---
        const d = JSON.parse(world.getDynamicProperty(DATA_LOSS_DYP) ?? '{}')
        delete d[key]
        world.setDynamicProperty(DATA_LOSS_DYP, JSON.stringify(d))
        // ---
    }
})
// helper
const playSound = (dim, sound, loc) => dim.playSound(sound.ID, loc, { volume: checkRandom(sound.VOLUME), pitch: checkRandom(sound.PITCH) })
const setLevel = (block, level) => block.setPermutation(BlockPermutation.resolve(block.typeId).withState("composter_fill_level", clamp8(level)))
const maybeFinish = (block, playerOrDim, loc) => {
    // ---
    const key = `${playerOrDim.id.slice(10)}:${block.x}:${block.y}:${block.z}`
    const data = JSON.parse(world.getDynamicProperty(DATA_LOSS_DYP) ?? '{}')
    data[key] = 1
    world.setDynamicProperty(DATA_LOSS_DYP, JSON.stringify(data))
    // ---

    system.runTimeout(() => {
        const curr = block.dimension.getBlock(loc)
        if (curr.typeId === BLOCK_TYPEID && curr.permutation.getState('composter_fill_level') === 7) {
            const p = BlockPermutation.resolve(BLOCK_TYPEID).withState("composter_fill_level", 8)
            block.setPermutation(p)
            playSound(playerOrDim, SOUND_READY, loc)
        }

        // ---
        const d = JSON.parse(world.getDynamicProperty(DATA_LOSS_DYP) ?? '{}')
        delete d[key]
        world.setDynamicProperty(DATA_LOSS_DYP, JSON.stringify(d))
        // ---
    }, DELAY_BEFORE_READY)
}

export const composter_playerInteractWithBlock = (data) => {
    const { player, block, itemStack } = data
    if (player.isSneaking || !itemStack || block.typeId !== BLOCK_TYPEID) return

    const itemID = itemStack.typeId
    const chance = ITEMS[itemID]
    if (!chance) return

    const state = block.permutation.getState('composter_fill_level')
    if (state >= 7) return

    system.run(() => {
        const success = Math.random() <= chance
        const loc = block.center()

        playSound(player.dimension, SOUND_FILL_BONEMEAL, loc)
        if (success) {
            playSound(player.dimension, SOUND_FILL_SUCCESS, loc)
            setLevel(block, state + 1)
            player.dimension.spawnParticle(PARTICLE_FILL_SUCCESS, loc)
            if (state === 6) maybeFinish(block, player.dimension, loc)
        } else playSound(player.dimension, SOUND_FILL, loc)

        if (player.matches({ gameMode: GameMode.Creative })) return

        const equ = player.getComponent(EntityComponentTypes.Equippable)
        const slot = player.selectedSlotIndex
        if (player.selectedSlotIndex !== slot) player.selectedSlotIndex = slot
        const currItem = equ.getEquipment(EquipmentSlot.Mainhand)

        if (!currItem || currItem.typeId !== itemStack.typeId) {
            const cmd = player.runCommand(`clear @s ${itemID} 0 1`)
            const removed = cmd.successCount
            if ((!removed || removed === 0) && success) setLevel(block, state - 1)
            else if (itemID.endsWith('_stew') || itemID.endsWith('_soup')) player.runCommand(`give @s bowl 0 1`)
            return
        }

        try {
            // cannot use reduceItem() directly, speical case
            if (itemStack.amount <= 1) {
                if (itemID.endsWith('_stew') || itemID.endsWith('_soup')) equ.setEquipment(EquipmentSlot.Mainhand, new ItemStack('bowl', 1))
                else equ.setEquipment(EquipmentSlot.Mainhand, undefined)
            } else {
                const reduced = currItem.clone()
                reduced.amount -= 1
                equ.setEquipment(EquipmentSlot.Mainhand, reduced)
            }
        } catch (e) { if (DEBUG) console.warn('[composter] unknown case:', e) }
    })
}

export const composter_playerPlaceBlock = (data) => {
    const { block, dimension } = data
    if (!block || block.typeId !== BLOCK_TYPEID) return
    const value = `${dimension.id.substring(SLICE_PREFIX)}:${block.x}:${block.y}:${block.z}`
    composterSet.add(value)
    world.setDynamicProperty(DATA_COMPOSTER_LOCATION, JSON.stringify([...composterSet]))
}

let trackTick = system.currentTick + HOPPER_INTERVAL_TICK
export const composter_pending = () => {
    if (trackTick > system.currentTick) return
    trackTick = system.currentTick + HOPPER_INTERVAL_TICK
    let changed = false

    for (const v of composterSet) {
        const [dim, xs, ys, zs] = v.split(':')
        const x = +xs, y = +ys, z = +zs
        const dimension = world.getDimension(dim)
        const block = dimension.getBlock({ x, y, z })
        if (!block || !block.isValid) continue
        if (block.isAir || block.typeId !== BLOCK_TYPEID) { composterSet.delete(v); changed = true; continue }

        const state = block.permutation.getState('composter_fill_level')
        if (state >= 7) continue

        const hopper = block.above(1)
        if (!hopper || !hopper.isValid || hopper.isAir || hopper.typeId !== HOPPER_TYPEID) continue

        if (hopper.getRedstonePower() > 0) continue
        const perm = hopper.permutation
        if (perm.getState("powered_bit") || perm.getState("facing_direction") !== 0) continue

        const container = hopper.getComponent(BlockComponentTypes.Inventory)?.container
        if (!container) continue

        let foundBowl = {
            slot: -1,
            amount: 0
        }

        let firstChanceItem = -1
        let bowlSlot = -1
        let emptySlot = -1
        let firstStewSlot = -1

        for (let i = 0; i < container.size; i++) {
            const item = container.getItem(i)

            if (!item) {
                if (emptySlot === -1) emptySlot = i
                continue
            }

            const com = item.getComponent(ItemComponentTypes.Compostable)
            if (com?.compostingChance) return

            if (firstChanceItem === -1) {
                const isStew = item.typeId.endsWith('_stew') || item.typeId.endsWith('_soup')
                const chance = isStew ? ITEMS[item.typeId] : ITEMS[item.typeId]

                if (isStew) {
                    foundBowl.amount += 1
                    if (foundBowl.slot === -1) foundBowl.slot = i
                    if (firstStewSlot === -1) firstStewSlot = i
                    firstChanceItem = i
                } else if (chance) firstChanceItem = i
            }

            if (bowlSlot === -1 && item.typeId === 'minecraft:bowl' && item.amount < 64) bowlSlot = i
        }

        if (firstChanceItem === -1) return

        const item = container.getItem(firstChanceItem)
        const itemID = item.typeId
        const chance = ITEMS[itemID]
        const success = Math.random() <= chance
        const loc = block.center()
        const isStew = itemID.endsWith('_stew') || itemID.endsWith('_soup')

        if (item.amount > 1) container.setItem(firstChanceItem, new ItemStack(itemID, item.amount - 1))
        else {
            container.setItem(firstChanceItem, undefined)

            if (isStew) {
                const targetBowlSlot = bowlSlot !== -1 && bowlSlot !== firstChanceItem ? bowlSlot : emptySlot
                if (targetBowlSlot !== -1) {
                    const existing = container.getItem(targetBowlSlot)
                    container.setItem(
                        targetBowlSlot,
                        new ItemStack('minecraft:bowl', existing ? existing.amount + 1 : 1)
                    )
                }
            }
        }

        playSound(dimension, SOUND_FILL_BONEMEAL, loc)
        if (success) {
            playSound(dimension, SOUND_FILL_SUCCESS, loc)
            setLevel(block, state + 1)
            if (state === 6) maybeFinish(block, dimension, loc)
        } else playSound(dimension, SOUND_FILL, loc)
    }

    if (changed) world.setDynamicProperty(DATA_COMPOSTER_LOCATION, JSON.stringify([...composterSet]))
}