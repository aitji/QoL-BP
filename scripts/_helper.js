import { EntityItemPickupBeforeEvent, EntityRemoveAfterEvent, system, world } from "@minecraft/server"

const COOLDOWN_ENTITY = new Map()
export const addItemCooldown = (entity, cooldown = 40) => {
    if (COOLDOWN_ENTITY.get(entity.id)) return
    COOLDOWN_ENTITY.set(entity.id, system.currentTick + cooldown)
}

/** @param {EntityItemPickupBeforeEvent} data */
export const helper_entityItemPickup = (data) => {
    const { entity, item } = data
    if (COOLDOWN_ENTITY.has(entity.id)) {
        const tick = system.currentTick
        const cooldown = COOLDOWN_ENTITY.get(entity.id)
        if (tick < cooldown) data.cancel = true
        else COOLDOWN_ENTITY.delete(entity.id)
    }
}

/** @param {EntityRemoveAfterEvent} data */
export const helper_entityRemove = (data) => {
    const { removedEntityId } = data
    if (COOLDOWN_ENTITY.has(removedEntityId)) COOLDOWN_ENTITY.delete(removedEntityId)
}