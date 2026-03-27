import { world, system, EquipmentSlot, BlockPermutation, GameMode, EntityComponentTypes, Player, PlayerInteractWithBlockBeforeEvent, ItemComponentTypes, EntityEquippableComponent, Block, PlayerPlaceBlockBeforeEvent, PlayerBreakBlockBeforeEvent } from "@minecraft/server"
import { applyItemDamage, checkRandom, clamp, getEqu, reduceItem, RUNTIME, setEqu } from "../lib"
const { DEBUG, LIGHT: { LIGHT_WIKI: light, ENABLED, LIGHT_ENTITY, DECAY_LIGHT_TICK, REDUCE_LIGHT, LIGHT_RENDER_RADIUS, LIGHT_RENDER_PER_PLAYER, LIGHT_FIRE_LEVEL, LIGHT_REDUCE_LINEAR } } = RUNTIME
export const isFrame = (b) => b.permutation.matches('minecraft:frame') || b.permutation.matches('minecraft:glow_frame')

let AIR, WATER, LAVA, BASE_LIGHT
if (ENABLED) system.run(() => {
    AIR = BlockPermutation.resolve('minecraft:air')
    WATER = BlockPermutation.resolve('minecraft:water')
    LAVA = BlockPermutation.resolve('minecraft:lava')
    BASE_LIGHT = BlockPermutation.resolve('qof:light_block')
    _restoreFromDYP()
})

const lightPerm = (lv) => BASE_LIGHT.withState('qof:light_level', lv < 0 ? 0 : lv > 15 ? 15 : lv)
const clamp15 = (n) => clamp(n, 0, 15)
const dimId = (b) => b.dimension.id.split(':')[1]
const isLightable = (b, liq) => b.isAir || (liq && b.isLiquid) || b.permutation.matches('qof:light_block')
const getItemLight = (id) => id ? (light[id.split(':')[1]?.toLowerCase()]?.light || 0) : 0

const lightMap = new Map() // key: "dim:x:y:z"  val: { time, level, isWater, owner }
const frameSet = new Set() // key: "dim:x:y:z"
const entityLights = new Map() // owner id -> Set<blockKey>
const suppressedLocs = new Map() // key: "dim:x:y:z"  val: expireTick ;; no backup DYP just for visual
const SUPP_BREAK = 8 // need to be config-able

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
        } else if (dy.startsWith('supp:')) {
            const p = dy.split(':')
            const dur = world.getDynamicProperty(dy)
            if (typeof dur === 'number' && dur > 0)
                suppressedLocs.set(bKey(p[1], p[2], p[3], p[4]), system.currentTick + dur)
            world.setDynamicProperty(dy, undefined)
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
        const k = blockBKey(block)
        const exp = suppressedLocs.get(k)
        if (exp !== undefined && system.currentTick < exp) return
        if (block.isLiquid && block.permutation.getState('liquid_depth') !== 0) return
        const isWater = block.permutation.matches('minecraft:water')
        const isLava = block.permutation.matches('minecraft:lava')
        if (isLava) return
        const ownerId = force ? 'Infinity' : (owner?.id || owner?.name || owner?.nameTag || owner?.typeId || String(owner))

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
        if (blo.isLiquid || blo.isAir || blo.permutation.matches('qof:light_block')) {
            seen.add(k)
            put_light(blo, level, en, force)
        }
    }
    const dirs = ['east', 'west', 'north', 'south']
    for (let i = 0; i < dirs.length; i++) {
        try {
            let blo = block[dirs[i]](-1)?.above(0)
            for (let j = 0; j < height - 1; j++) { tryPut(blo); blo = blo?.offset({ x: 0, y: 1, z: 0 }) }
        } catch (e) { continue /** chunk unload nothing crazy*/ }
    }
    let blo = block?.above(0)
    for (let j = 0; j < height - 1; j++) {
        try {
            if (height === j) continue
            tryPut(blo); blo = blo?.offset({ x: 0, y: 1, z: 0 })
        } catch (e) { continue /** chunk unload nothing crazy*/ }
    }
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
    } catch (e) { if (DEBUG) world.sendMessage(`§7e: ${e}`) }
}

export const light_pending = (tick) => {
    const dead = []
    lightMap.forEach((v, k) => {
        const [dim, x, y, z] = k.split(':')
        try {
            const block = world.getDimension(dim).getBlock({ x: +x, y: +y, z: +z })
            if (!block) { dead.push(k); return }

            if (v.time < 0) {
                const lig = block.permutation.getState('qof:light_level') || 0
                if (lig <= 0) {
                    if (isLightable(block, v.isWater)) block.setPermutation(v.isWater ? WATER : AIR)
                    dead.push(k)
                    return
                }
                if (isLightable(block, v.isWater)) block.setPermutation(lightPerm(lig - LIGHT_REDUCE_LINEAR))
                v.time -= LIGHT_REDUCE_LINEAR
                return
            }

            if (isLightable(block, v.isWater)) block.setPermutation(lightPerm(v.level))
            v.time -= LIGHT_REDUCE_LINEAR

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

export const light_processFrames = (tick) => {
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

export const light_playerPlaceBlock_before = ({ block }) => suppressedLocs.set(blockBKey(block), system.currentTick + SUPP_BREAK)
/**@param {PlayerBreakBlockBeforeEvent} data*/
export const light_playerBreakBlock = (data) => {
    const { player, block } = data
    if (
        !player.matches({ gameMode: GameMode.Creative }) &&
        block.permutation.matches('qof:light_block')
    ) data.cancel = true
    suppressedLocs.set(blockBKey(block), system.currentTick + SUPP_BREAK)
}

const farmland = Object.freeze({ 'minecraft:farmland': true, 'minecraft:soul_sand': true })
/** @type {Readonly<{[k: string]: Readonly<{asBlock: string; pot: string}>}>} */
const seedToBlock = Object.freeze({ // todo: add to config
    'minecraft:wheat_seeds': Object.freeze({ asBlock: 'minecraft:wheat', pot: 'minecraft:farmland', sound: 'nature' }),
    'minecraft:carrots': Object.freeze({ asBlock: 'minecraft:carrots', pot: 'minecraft:farmland', sound: 'nature' }),
    'minecraft:potatoes': Object.freeze({ asBlock: 'minecraft:potatoes', pot: 'minecraft:farmland', sound: 'nature' }),
    'minecraft:beetroot_seeds': Object.freeze({ asBlock: 'minecraft:beetroot', pot: 'minecraft:farmland', sound: 'nature' }),
    'minecraft:nether_wart': Object.freeze({ asBlock: 'minecraft:nether_wart', pot: 'minecraft:soul_sand', sound: 'nether' }),
})

const delay = {}
/**@param {PlayerInteractWithBlockBeforeEvent} data*/
export const light_playerInteractWithBlock = (data) => {
    const { player, block, blockFace, itemStack, isFirstEvent } = data
    if (!isFirstEvent) {
        const playerDelay = delay[player.id] || 0
        if (playerDelay > system.currentTick) return
    }
    delay[player.id] = system.currentTick + 4

    if (!itemStack || !block) return

    /** @type {Block?} */
    let above
    const isAboveLight = () => { // don't perm check if unnesscery
        above = block.above(1)
        return above?.permutation?.matches('qof:light_block') ?? false
    }

    if (block.hasTag('dirt')) {
        if (!isAboveLight()) return
        system.run(() => {
            let toolUsed = false
            if (itemStack?.hasTag('minecraft:is_shovel')) {
                if (block.typeId === 'minecraft:grass_path') return
                block.setPermutation(BlockPermutation.resolve('minecraft:grass_path'))
                toolUsed = true

                player.dimension.playSound('use.grass', block.center(), { // todo: config.js
                    volume: 1.0,
                    pitch: 0.8
                })
            }
            if (itemStack?.hasTag('minecraft:is_hoe')) {
                if (block.typeId === 'minecraft:farmland') return
                block.setPermutation(BlockPermutation.resolve('minecraft:farmland'))
                toolUsed = true

                player.dimension.playSound('use.gravel', block.center(), { // todo: config.js
                    volume: 1.0,
                    pitch: 0.8
                })
            }

            // all logic
            if (toolUsed && !player.matches({ gameMode: GameMode.Creative })) {
                const { changed, item } = applyItemDamage(player, itemStack)
                if (changed) {
                    const equ = getEqu(player)
                    equ.setEquipment(EquipmentSlot.Mainhand, item)
                }
            }
        })
    }

    // farmland
    const blockType = block.typeId
    if (farmland[blockType]) {
        if (!isAboveLight()) return
        const raw = seedToBlock[itemStack?.typeId || '']
        if (!raw) return
        const { asBlock, pot, sound } = raw

        if (pot === blockType) {
            const isCreative = player.matches({ gameMode: GameMode.Creative })
            const playSound = () => {
                // if (DEBUG) world.sendMessage(`sound=${sound}`)
                const center = block.center()
                switch (sound) {
                    // make sound config-able
                    case 'nature':
                        return player.dimension.playSound('place.grass', center, {
                            volume: 0.8,
                            pitch: checkRandom([0.8, 1])
                        })
                    case 'nether':
                        return player.dimension.playSound('dig.nether_wart', center, {
                            volume: 0.7,
                            pitch: checkRandom([0.8, 1])
                        })
                    default:
                        if (DEBUG) world.sendMessage(`${sound} is invaild`)
                        return
                }

            }

            let scam = false
            system.run(() => {
                try {
                    above.setType(asBlock)
                    playSound()
                    if (!isCreative) scam = setEqu(player, reduceItem(itemStack))
                } catch {
                    try {
                        above.setPermutation(BlockPermutation.resolve(asBlock))
                        playSound()
                        if (!isCreative) scam = setEqu(player, reduceItem(itemStack))
                    } catch {
                        const command = above.dimension.runCommand(`setblock ${above.x} ${above.y} ${above.z} ${asBlock}`)
                        if (command.successCount <= 0 && scam && !isCreative) reduceItem(itemStack, -1, player) // give item back
                    }
                }
            })
        }
    }
}