import { EntityComponentTypes, Player, world, ItemStack, system, EntitySpawnAfterEvent, EntityRemoveAfterEvent } from "@minecraft/server"
import { checkRandom, playSound, RUNTIME } from "../../lib"
const {
    DEBUG,
    SLICE_PREFIX,
    WATER_CONCRETE: {
        TYPEID_ENDSWITH, ITEM_PREFIX,
        KEEP_VELOCITY, BATCH_SIZE, PROCESS_DELAY,
        DONE_PARTICLE, DONE_SOUND, SLOW_BASE, SLOW_MULTIPLIER
    }
} = RUNTIME
const queue = new Map() // Map<id, { readyAt, color, amount, dimensionId, location, velocity }>

const wetDelay = (amount: number) => SLOW_BASE + Math.floor(Math.sqrt(amount - 1) * SLOW_MULTIPLIER)
export const powder_entityRemove = ({ removedEntityId }: EntityRemoveAfterEvent) => queue.delete(removedEntityId)
export const powder_entitySpawn = ({ entity }: EntitySpawnAfterEvent) => {
    if (entity?.typeId !== "minecraft:item") return
    if (!entity?.isValid) return
    if (entity.dimension.id === "minecraft:nether") return

    const component = entity?.getComponent(EntityComponentTypes.Item)
    const itemStack = component?.itemStack
    if (!itemStack) return

    const { typeId } = itemStack
    if (!typeId.endsWith(TYPEID_ENDSWITH) || !typeId.startsWith(ITEM_PREFIX)) return

    const color = typeId.slice(SLICE_PREFIX).split(TYPEID_ENDSWITH)[0]
    if (!color) return

    if (DEBUG) world.sendMessage(`§7spawn: ${color} x${itemStack.amount}`)

    queue.set(entity.id, {
        color,
        amount: itemStack.amount,
        readyAt: null,
        dimensionId: entity.dimension.id,
        location: null,
        velocity: null,
    })
}

let batchOffset = 0

export const powder_pending = () => {
    const now = system.currentTick
    const ids = [...queue.keys()]
    const total = ids.length
    if (total === 0) return

    const start = batchOffset % total
    const end = Math.min(start + BATCH_SIZE, total)
    batchOffset = end >= total ? 0 : end

    for (let i = start; i < end; i++) {
        const id = ids[i]
        const entry = queue.get(id)

        const entity = world.getEntity(id)
        if (!entity) { queue.delete(id); continue }

        if (entry.readyAt === null) {
            if (!entity.isInWater) continue
            entry.readyAt = now + wetDelay(entry.amount)
            if (DEBUG) world.sendMessage(`| wet delay ${(wetDelay(entry.amount) / 20).toFixed(2)}s.`)
            entry.location = { ...entity.location }
            entry.velocity = entity.getVelocity()
            continue
        }

        if (now < entry.readyAt) {
            entry.location = { ...entity.location }
            entry.velocity = entity.getVelocity()
            continue
        }

        queue.delete(id)

        const { color, amount, dimensionId, location, velocity } = entry
        const dimension = world.getDimension(dimensionId)

        system.runTimeout(() => {
            if (!entity.isValid) return
            const concrete = dimension.spawnItem(
                new ItemStack(`${ITEM_PREFIX}${color}_concrete`, amount),
                location
            )

            dimension.spawnParticle(DONE_PARTICLE, concrete.location)
            playSound(dimension, concrete.location, DONE_SOUND)

            if (KEEP_VELOCITY) concrete.applyImpulse({ x: velocity.x, y: velocity.y, z: velocity.z })
            try { entity.remove() }
            catch {
                try { entity.kill() }
                catch {
                    // cannot remove entity ; try to remove concrete
                    try { concrete.remove() }
                    catch {
                        try { concrete.kill() }
                        catch { /** nvm then ; you lucky -.- */ }
                    }
                }
            }
        }, PROCESS_DELAY)
    }
}