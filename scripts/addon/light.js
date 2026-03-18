import { world, system, EquipmentSlot, BlockPermutation, GameMode, EntityComponentTypes, Player } from "@minecraft/server"
import { clamp } from "../lib"
import { RUNTIME } from "../_store"
const { DEBUG, LIGHT: { LIGHT_WIKI: light, ENABLED, LIGHT_ENTITY, DECAY_LIGHT_TICK, REDUCE_LIGHT, LIGHT_RENDER_RADIUS, LIGHT_RENDER_PER_PLAYER, LIGHT_FIRE_LEVEL, LIGHT_REDUCE_LINEAR } } = RUNTIME
export const isFrame = (b) => b.permutation.matches('minecraft:frame') || b.permutation.matches('minecraft:glow_frame')

let AIR, WATER, LAVA, BASE_LIGHT
if (ENABLED) system.run(() => {
    world.sendMessage(`${typeof ENABLED}, ${typeof DECAY_LIGHT_TICK}, ${typeof REDUCE_LIGHT}, ${typeof LIGHT_RENDER_RADIUS}, ${typeof LIGHT_RENDER_PER_PLAYER}, ${typeof LIGHT_FIRE_LEVEL}, ${typeof LIGHT_REDUCE_LINEAR}`)
    AIR = BlockPermutation.resolve('minecraft:air')
    WATER = BlockPermutation.resolve('minecraft:water')
    LAVA = BlockPermutation.resolve('minecraft:lava')
    BASE_LIGHT = BlockPermutation.resolve('minecraft:light_block')
    _restoreFromDYP()
})

const lightPerm = (lv) => BASE_LIGHT.withState('block_light_level', lv < 0 ? 0 : lv > 15 ? 15 : lv)
const clamp15 = (n) => clamp(n, 0, 15)
const dimId = (b) => b.dimension.id.split(':')[1]
const isLightable = (b, liq) => b.isAir || (liq && b.isLiquid) || b.permutation.matches('minecraft:light_block')
const getItemLight = (id) => id ? (light[id.split(':')[1]?.toLowerCase()]?.light || 0) : 0

const lightMap = new Map() // key: "dim:x:y:z"  val: { time, level, isWater, owner }
const frameSet = new Set() // key: "dim:x:y:z"
const entityLights = new Map() // owner id -> Set<blockKey>

const bKey = (dim, x, y, z) => `${dim}:${x}:${y}:${z}`
const blockBKey = (b) => bKey(dimId(b), b.location.x, b.location.y, b.location.z)

function _restoreFromDYP() {
    const ids = world.getDynamicPropertyIds()
    for (let i = 0; i < ids.length; i++) {
        const dy = ids[i]
        if (dy.startsWith('light:')) {
            // light:dim:x:y:z:level:isWater:owner
            const p = dy.split(':')
            const k = bKey(p[1], p[2], p[3], p[4])
            const time = world.getDynamicProperty(dy)
            if (typeof time !== 'number') { world.setDynamicProperty(dy, undefined); continue }
            lightMap.set(k, { time, level: +p[5], isWater: p[6] === 'true', owner: p[7] })
            if (p[7] && p[7] !== 'Infinity') {
                if (!entityLights.has(p[7])) entityLights.set(p[7], new Set())
                entityLights.get(p[7]).add(k)
            }
            world.setDynamicProperty(dy, undefined)
        } else if (dy.startsWith('frame:')) {
            const p = dy.split(':')
            frameSet.add(bKey(p[1], p[2], p[3], p[4]))
        } else if (dy.startsWith('chuck_unload:')) {
            // chuck_unload:light:dim:x:y:z:level:isWater:owner
            const p = dy.split(':')
            const k = bKey(p[2], p[3], p[4], p[5])
            if (!lightMap.has(k))
                lightMap.set(k, { time: DECAY_LIGHT_TICK, level: +p[6], isWater: p[7] === 'true', owner: p[8] })
            world.setDynamicProperty(dy, undefined)
        }
    }
}

function put_light(block, level, owner, force = false) {
    try {
        if (block.isLiquid && block.permutation.getState('liquid_depth') !== 0) return
        const isWater = block.permutation.matches('minecraft:water')
        const isLava = block.permutation.matches('minecraft:lava')
        if (isLava) return
        const ownerId = force ? 'Infinity' : (owner?.id || owner?.name || owner?.nameTag || owner?.typeId || String(owner))
        const k = blockBKey(block)

        if (lightMap.has(k)) {
            const e = lightMap.get(k)
            e.time = DECAY_LIGHT_TICK
            e.level = level
            return
        }

        lightMap.set(k, { time: DECAY_LIGHT_TICK, level, isWater, owner: ownerId })
        world.setDynamicProperty(`light:${k}:${level}:${isWater}:${ownerId}`, DECAY_LIGHT_TICK)

        if (ownerId !== 'Infinity') {
            if (!entityLights.has(ownerId)) entityLights.set(ownerId, new Set())
            entityLights.get(ownerId).add(k)
        }

        if (isLightable(block, isWater)) block.setPermutation(lightPerm(level))
    } catch (_) { }
}
function spreadLight(block, level, en, height = 2, force = false) {
    const seen = new Set()
    const tryPut = (blo) => {
        if (!blo) return
        const k = blockBKey(blo)
        if (seen.has(k)) return
        if (blo.isLiquid || blo.isAir || blo.permutation.matches('minecraft:light_block')) {
            seen.add(k)
            put_light(blo, level, en, force)
        }
    }
    const dirs = ['east', 'west', 'north', 'south']
    for (let i = 0; i < dirs.length; i++) {
        let blo = block[dirs[i]](-1)?.above(0)
        for (let j = 0; j < height - 1; j++) { tryPut(blo); blo = blo?.offset({ x: 0, y: 1, z: 0 }) }
    }
    let blo = block?.above(0)
    for (let j = 0; j < height - 1; j++) { tryPut(blo); blo = blo?.offset({ x: 0, y: 1, z: 0 }) }
    tryPut(block.above(height - 1))
}

function processEntity(en, isPlayer = false) {
    try {
        const equip = en.getComponent('equippable')
        const mItem = isPlayer ? equip?.getEquipment(EquipmentSlot.Mainhand) : en.getComponent('item')?.itemStack
        const oItem = isPlayer ? equip?.getEquipment(EquipmentSlot.Offhand) : undefined

        const a = getItemLight(mItem?.typeId)
        const b = getItemLight(oItem?.typeId)
        if (!(a | b)) return

        const level = clamp15(Math.ceil(Math.hypot(a, b) * REDUCE_LIGHT))
        if (level <= 0) return

        spreadLight(en.dimension.getBlock(en.location), level, en, isPlayer ? 3 : 2)
    } catch (e) { if (DEBUG) world.sendMessage(`§7${e}`) }
}

export const light_pending = () => {
    const dead = []
    lightMap.forEach((v, k) => {
        const [dim, x, y, z] = k.split(':')
        try {
            const block = world.getDimension(dim).getBlock({ x: +x, y: +y, z: +z })
            if (!block) { dead.push(k); return }

            if (v.time < 0) {
                const lig = block.permutation.getState('block_light_level') || 0
                if (lig <= 0) {
                    if (isLightable(block, v.isWater)) block.setPermutation(v.isWater ? WATER : AIR)
                    dead.push(k)
                    return
                }
                if (isLightable(block, v.isWater)) block.setPermutation(lightPerm(lig + LIGHT_REDUCE_LINEAR))
                v.time += LIGHT_REDUCE_LINEAR
                return
            }

            if (isLightable(block, v.isWater)) block.setPermutation(lightPerm(v.level))
            v.time += LIGHT_REDUCE_LINEAR

        } catch (_) { }
    })

    for (let i = 0; i < dead.length; i++) {
        const v = lightMap.get(dead[i])
        if (v?.owner && v.owner !== 'Infinity') entityLights.get(v.owner)?.delete(dead[i])
        world.setDynamicProperty(`light:${dead[i]}:${v?.level}:${v?.isWater}:${v?.owner}`, undefined)
        lightMap.delete(dead[i])
    }
}
/**@param {Player} pl */
export const light_player = (pl) => {
    processEntity(pl, true)
    pl.dimension.getEntities({
        location: pl.location,
        maxDistance: LIGHT_RENDER_RADIUS,
        closest: LIGHT_RENDER_PER_PLAYER,
        excludeTypes: ['minecraft:xp_orb', 'minecraft:xp_bottle', 'minecraft:command_block_minecart', 'minecraft:hopper_minecart', 'minecraft:splash_potion']
    }).forEach(en => {
        if (!en) return
        if (en.typeId === 'minecraft:item'
            // || en.typeId === 'minecraft:armor_stand' // armor stand not support equippable rn
        ) return processEntity(en)

        let lightLevel = 0
        if (en.getComponent(EntityComponentTypes.OnFire)) lightLevel += LIGHT_FIRE_LEVEL * REDUCE_LIGHT

        const glowEntity = LIGHT_ENTITY[en.typeId]
        if (glowEntity) lightLevel = Math.hypot(lightLevel, glowEntity.light * REDUCE_LIGHT)
        if (lightLevel <= 0) return
        spreadLight(en.dimension.getBlock(en.location), clamp15(lightLevel), en, 2)
    })
}

export const light_entityRemove = ({ removedEntityId }) => {
    const id = String(removedEntityId)
    const keys = entityLights.get(id)
    if (!keys) return
    keys.forEach(k => {
        const [dim, x, y, z] = k.split(':')
        const dimension = world.getDimension(dim)
        const v = lightMap.get(k)
        world.setDynamicProperty(`light:${k}:${v?.level}:${v?.isWater}:${id}`, undefined)
        lightMap.delete(k)
        try { dimension.getBlock({ x, y, z }).setPermutation(AIR) }
        catch (_) { dimension.runCommand(`setblock ${x} ${y} ${z} air`) }
    })
    entityLights.delete(id)
}

export const light_playerPlaceBlock = ({ block }) => {
    if (!isFrame(block)) return
    const k = blockBKey(block)
    frameSet.add(k)
    world.setDynamicProperty(`frame:${k}`, 1)
    if (DEBUG) world.sendMessage(`§8add frame:§7 ${k}`)
}

export const light_playerBreakBlock = (data) => {
    if (!data.player.matches({ gameMode: GameMode.Creative }) && data.block.permutation.matches('minecraft:light_block'))
        data.cancel = true
}

export const light_processFrames = () => {
    const dead = []
    frameSet.forEach(k => {
        try {
            const [dim, x, y, z] = k.split(':')
            const block = world.getDimension(dim).getBlock({ x: +x, y: +y, z: +z })
            if (!block) return
            if (block.permutation.matches('minecraft:air')) { dead.push(k); return }
            const item = block.getItemStack(1)
            if (!item) return
            const typeId = item.typeId.split('minecraft:')[1]?.toLowerCase()
            const type = light[typeId]
            if (!type || typeof type.light !== 'number') return
            spreadLight(block, clamp15(Math.ceil(type.light * REDUCE_LIGHT)), Infinity, 2, true)
        } catch (_) { }
    })
    for (let i = 0; i < dead.length; i++) {
        frameSet.delete(dead[i])
        world.setDynamicProperty(`frame:${dead[i]}`, undefined)
        if (DEBUG) world.sendMessage(`§8clear frame: §7${dead[i]}`)
    }
}