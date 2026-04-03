import { world, system, EquipmentSlot, BlockPermutation, GameMode, EntityComponentTypes, Player, PlayerInteractWithBlockBeforeEvent, ItemComponentTypes, EntityEquippableComponent, Block, PlayerPlaceBlockBeforeEvent, PlayerBreakBlockBeforeEvent, Entity } from "@minecraft/server"
import { applyItemDamage, checkRandom, clamp, getEqu, reduceItem, roundLoc, RUNTIME, setEqu, sumLoc } from "../lib"

const {
    DEBUG,
    BLOCKFACE_TO_DIR,
    LIGHT: {
        LIGHT_WIKI: light,
        ENABLED,
        LIGHT_ENTITY,
        DECAY_LIGHT_TICK,
        REDUCE_LIGHT,
        LIGHT_RENDER_RADIUS,
        LIGHT_RENDER_PER_PLAYER,
        LIGHT_FIRE_LEVEL,
        LIGHT_REDUCE_LINEAR,
        FAIL_PARTICLE,
        PARTICLE_OFFSET,
        LIGHT_BLOCK,
        SOUND_FAIL,
        FAIL_SOUND_INTERVAL,
        LIGHT_PENDING_BATCH,
        LIGHT_PLAYER_BATCH
    }
} = RUNTIME

let _pendingCursor = 0
let _playerCursor = 0

export const isFrame = (b) =>
    b.permutation.matches('minecraft:frame') || b.permutation.matches('minecraft:glow_frame')

export let AIR, WATER, LAVA, BASE_LIGHT, FIRE
if (ENABLED) system.run(() => {
    AIR = BlockPermutation.resolve('minecraft:air')
    WATER = BlockPermutation.resolve('minecraft:water')
    LAVA = BlockPermutation.resolve('minecraft:lava')
    BASE_LIGHT = BlockPermutation.resolve(LIGHT_BLOCK)
    FIRE = BlockPermutation.resolve('minecraft:fire')
    _restoreFromDYP()
})

const lightPerm = (lv) => BASE_LIGHT.withState('qof:light_level', lv < 1 ? 0 : lv > 15 ? 15 : lv)
const clamp15 = (n) => clamp(n, 0, 15)
const dimId = (b) => b.dimension.id.split(':')[1]
const isLightable = (b, liq) => b.isAir || (liq && b.isLiquid) || b.permutation.matches(LIGHT_BLOCK)
/** @param {string|undefined} id @param {Entity} en @param {number} tick */
const getItemLight = (id, en, tick) => {
    if (!id) return 0
    const found = light[id.split(':')[1]?.toLowerCase()]
    if (!found) return 0

    if (found.inLiquid !== undefined) {
        const block = en.dimension.getBlock(roundLoc(en.location, 'floor'))?.above(1)
        const inLiquid = en.isSwimming ? en.isInWater : (block?.isLiquid || block?.isWaterlogged)
        if (found.inLiquid === inLiquid) return found.light ?? 0

        if (!found.inLiquid && tick % FAIL_SOUND_INTERVAL === 0) {
            const { location: loc, dimension: dim } = en
            dim.spawnParticle(FAIL_PARTICLE, sumLoc(loc, PARTICLE_OFFSET))
            dim.playSound(SOUND_FAIL.ID, loc, { pitch: checkRandom(SOUND_FAIL.PITCH), volume: checkRandom(SOUND_FAIL.VOLUME) })
        }
        return 0
    }

    return found.light ?? 0
}

export const lightMap = new Map() // key: "dim:x:y:z"  val: { time, level, isWater, owner }
export const frameSet = new Set() // key: "dim:x:y:z"
export const entityLights = new Map() // owner id -> Set<blockKey>
export const SUPP_BREAK = 8 // need to be config-able
export const suppressedLocs = new Map() // key: "dim:x:y:z"

const frozenKeys = new Set()
const FROZEN_RECHECK = 20 // ~1 s at 20 tps
const bKey = (dim, x, y, z) => `${dim}:${x}:${y}:${z}`
export const blockBKey = (b) => bKey(dimId(b), b.location.x, b.location.y, b.location.z)
export const suppressLight = (block, checkLightBlock = true, cleanLight = true, needTick = false, tick = system.currentTick) => {
    if (!ENABLED) return false
    if (checkLightBlock && !block.permutation.matches(LIGHT_BLOCK)) return false

    const k = blockBKey(block)
    lightMap.delete(k)
    suppressedLocs.set(k, tick + SUPP_BREAK)

    if (!cleanLight) return true
    if (needTick) system.run(() => block.setPermutation(AIR))
    else block.setPermutation(AIR)
    return true
}

function _restoreFromDYP() {
    for (const dy of world.getDynamicPropertyIds()) {
        const p = dy.split(':')
        switch (p[0]) {
            case 'light': {
                // light:dim:x:y:z:level:isWater:owner
                const k = bKey(p[1], p[2], p[3], p[4])
                if (!lightMap.has(k))
                    lightMap.set(k, { time: 0, level: +p[5], isWater: p[6] === 'true', owner: p[7] })
                world.setDynamicProperty(dy, undefined)
                break
            }
            case 'chuck_unload': // tech debt
            case 'chunk_unload': {
                const k = bKey(p[2], p[3], p[4], p[5])
                if (!lightMap.has(k))
                    lightMap.set(k, { time: 0, level: +p[6], isWater: p[7] === 'true', owner: p[8] })
                world.setDynamicProperty(dy, undefined)
                break
            }
            case 'frame':
                // frame:dim:x:y:z
                frameSet.add(bKey(p[1], p[2], p[3], p[4]))
                break
            case 'supp':
                world.setDynamicProperty(dy, undefined)
                break
            default: break
        }
    }
}

function put_light(block, level, owner, force = false) {
    try {
        const k = blockBKey(block)
        const exp = suppressedLocs.get(k)
        if (exp !== undefined && system.currentTick < exp) return
        if (block.isLiquid && block.permutation.getState('liquid_depth') !== 0) return
        if (block.permutation.matches('minecraft:lava') || block.permutation.matches('minecraft:fire')) return

        if (lightMap.has(k)) {
            const e = lightMap.get(k)
            e.time = DECAY_LIGHT_TICK
            e.level = level
            return
        }

        const isWater = block.permutation.matches('minecraft:water')
        const ownerId = force
            ? 'Infinity'
            : (owner?.id ?? owner?.name ?? owner?.nameTag ?? owner?.typeId ?? String(owner))

        lightMap.set(k, { time: DECAY_LIGHT_TICK, level, isWater, owner: ownerId })

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
        try { if (blo.below(1).typeId === 'minecraft:grass_path') return } catch { }
        if (blo.isLiquid || blo.isAir || blo.permutation.matches(LIGHT_BLOCK)) {
            seen.add(k)
            put_light(blo, level, en, force)
        }
    }
    const dirs = ['east', 'west', 'north', 'south']
    for (let i = 0; i < dirs.length; i++) {
        try {
            let blo = block[dirs[i]](-1)
            for (let j = 0; j < height - 1; j++, blo = blo?.offset({ x: 0, y: 1, z: 0 })) tryPut(blo)
        } catch { continue }
    }

    let blo = block
    for (let j = 0; j < height - 1; j++, blo = blo?.offset({ x: 0, y: 1, z: 0 })) {
        try { tryPut(blo) } catch { continue }
    }
    tryPut(block.above(height - 1))
}
/** @param {Entity} en @param {boolean} isPlayer @param {number} tick */
function processEntity(en, isPlayer = false, tick) {
    try {
        const equip = en.getComponent('equippable')
        const mItem = isPlayer ? equip?.getEquipment(EquipmentSlot.Mainhand) : en.getComponent('item')?.itemStack
        const oItem = isPlayer ? equip?.getEquipment(EquipmentSlot.Offhand) : undefined

        const a = getItemLight(mItem?.typeId, en, tick)
        const b = getItemLight(oItem?.typeId, en, tick)
        if (!(a | b)) return

        const level = clamp15(Math.ceil(Math.hypot(a, b) * REDUCE_LIGHT))
        if (level <= 0) return

        spreadLight(en.dimension.getBlock(en.location), level, en, isPlayer ? 3 : 2)
    } catch (e) {
        if (DEBUG) world.sendMessage(`§7e: ${e}`)
    }
}

let _pendingKeys = []
let _pendingKeysSize = 0

export const light_pending = (tick) => {
    const mapSize = lightMap.size
    if (mapSize === 0) { _pendingCursor = 0; return }

    if (_pendingKeys.length === 0 || Math.abs(_pendingKeysSize - mapSize) > Math.max(10, mapSize * 0.1)) {
        _pendingKeys = Array.from(lightMap.keys())
        _pendingKeysSize = mapSize
        _pendingCursor = _pendingCursor % (_pendingKeys.length || 1)
    }

    const total = _pendingKeys.length
    const budget = Math.min(LIGHT_PENDING_BATCH, total)
    const dead = []
    const tryThaw = (tick % FROZEN_RECHECK) === 0

    for (let i = 0; i < budget; i++) {
        const idx = (_pendingCursor + i) % total
        const k = _pendingKeys[idx]

        const v = lightMap.get(k)
        if (!v) continue

        const isFrozen = frozenKeys.has(k)

        if (isFrozen && !tryThaw) {
            v.time -= LIGHT_REDUCE_LINEAR
            continue
        }

        const [dim, x, y, z] = k.split(':')
        try {
            const block = world.getDimension(dim).getBlock({ x: +x, y: +y, z: +z })
            if (!block) {
                frozenKeys.add(k)
                if (!isFrozen) v.time -= LIGHT_REDUCE_LINEAR
                continue
            }

            if (isFrozen) frozenKeys.delete(k)

            if (v.time < 0) {
                const lig = block.permutation.getState('qof:light_level') ?? 0
                if (lig <= 0) {
                    if (isLightable(block, v.isWater)) block.setPermutation(v.isWater ? WATER : AIR)
                    dead.push(k)
                    continue
                }
                if (isLightable(block, v.isWater)) block.setPermutation(lightPerm(lig - LIGHT_REDUCE_LINEAR))
                v.time -= LIGHT_REDUCE_LINEAR
                continue
            }

            if (isLightable(block, v.isWater)) block.setPermutation(lightPerm(v.level))
            v.time -= LIGHT_REDUCE_LINEAR
        } catch { }
    }

    _pendingCursor = (_pendingCursor + budget) % total

    for (let i = 0; i < dead.length; i++) {
        const k = dead[i]
        const v = lightMap.get(k)
        if (v?.owner && v.owner !== 'Infinity') entityLights.get(v.owner)?.delete(k)
        frozenKeys.delete(k)
        lightMap.delete(k)
        _pendingKeys.length = 0
    }
}

const _excludedTypes = new Set([
    'minecraft:xp_orb', 'minecraft:xp_bottle',
    'minecraft:command_block_minecart', 'minecraft:hopper_minecart',
    'minecraft:splash_potion'
])

let _entityQueue = []
let _entityTick = -1

function _buildEntityQueue(players, tick) {
    if (_entityTick === tick) return
    _entityTick = tick

    const seen = new Set()
    _entityQueue = []

    for (const pl of players) {
        const nearby = pl.dimension.getEntities({
            location: pl.location,
            maxDistance: LIGHT_RENDER_RADIUS,
            closest: LIGHT_RENDER_PER_PLAYER,
        })
        for (const en of nearby) {
            if (!en || _excludedTypes.has(en.typeId)) continue
            if (seen.has(en.id)) continue
            seen.add(en.id)
            _entityQueue.push(en)
        }
    }

    if (_entityQueue.length > 0)
        _playerCursor = _playerCursor % _entityQueue.length
    else
        _playerCursor = 0
}

/** @param {Player} pl @param {number} tick */
export const light_player = (pl, tick) => {
    processEntity(pl, true, tick)

    const players = [...world.getPlayers()]
    _buildEntityQueue(players, tick)

    const total = _entityQueue.length
    if (total === 0) return

    const budget = Math.min(LIGHT_PLAYER_BATCH, total)

    for (let i = 0; i < budget; i++) {
        const en = _entityQueue[(_playerCursor + i) % total]
        if (!en) continue

        if (en.typeId === 'minecraft:item') {
            processEntity(en, false, tick)
            continue
        }

        let lightLevel = 0
        if (en.getComponent(EntityComponentTypes.OnFire)) lightLevel += LIGHT_FIRE_LEVEL * REDUCE_LIGHT

        const glowEntity = LIGHT_ENTITY[en.typeId]
        if (glowEntity) lightLevel = Math.hypot(lightLevel, glowEntity.light * REDUCE_LIGHT)
        if (lightLevel <= 0) continue

        spreadLight(en.dimension.getBlock(en.location), clamp15(lightLevel), en, 2)
    }

    _playerCursor = (_playerCursor + budget) % total
}

export const light_entityRemove = ({ removedEntityId }) => {
    const id = String(removedEntityId)
    const keys = entityLights.get(id)
    if (!keys) return

    for (const k of keys) {
        const [dim, x, y, z] = k.split(':')
        lightMap.delete(k)
        frozenKeys.delete(k)
        try {
            world.getDimension(dim).getBlock({ x: +x, y: +y, z: +z })?.setPermutation(AIR)
        } catch {
            world.getDimension(dim).runCommand(`setblock ${x} ${y} ${z} air`)
        }
    }
    entityLights.delete(id)
    _pendingKeys.length = 0
}

export const light_playerPlaceBlock = ({ block }) => {
    if (!isFrame(block)) return
    const k = blockBKey(block)
    frameSet.add(k)
    world.setDynamicProperty(`frame:${k}`, 1)
    if (DEBUG) world.sendMessage(`§8add frame:§7 ${k}`)
}

export const light_processFrames = (_tick) => {
    const dead = []

    for (const k of frameSet) {
        try {
            const [dim, x, y, z] = k.split(':')
            const block = world.getDimension(dim).getBlock({ x: +x, y: +y, z: +z })
            if (!block || block.permutation.matches('minecraft:air')) { dead.push(k); continue }

            const item = block.getItemStack(1)
            if (!item) continue

            const typeId = item.typeId.split('minecraft:')[1]?.toLowerCase()
            const type = light[typeId]
            if (!type || typeof type.light !== 'number') continue

            spreadLight(block, clamp15(Math.ceil(type.light * REDUCE_LIGHT)), Infinity, 2, true)
        } catch { }
    }

    for (let i = 0; i < dead.length; i++) {
        const k = dead[i]
        frameSet.delete(k)
        world.setDynamicProperty(`frame:${k}`, undefined)
        if (DEBUG) world.sendMessage(`§8clear frame: §7${k}`)
    }
}

export const light_playerPlaceBlock_before = ({ block }) => suppressedLocs.set(blockBKey(block), system.currentTick + SUPP_BREAK)
/** @param {PlayerBreakBlockBeforeEvent} data */
export const light_playerBreakBlock = (data) => {
    const { player, block } = data
    if (!player.matches({ gameMode: GameMode.Creative }) && block.permutation.matches(LIGHT_BLOCK))
        data.cancel = true
    suppressedLocs.set(blockBKey(block), system.currentTick + SUPP_BREAK)
}