import { EntityItemPickupBeforeEvent, EntityRemoveAfterEvent, system, world } from "@minecraft/server"

const COOLDOWN_ENTITY = new Map()
export const addItemCooldown = (entity, cooldown = 40) => {
    const id = entity.id
    if (COOLDOWN_ENTITY.has(id)) return
    COOLDOWN_ENTITY.set(id, system.currentTick + cooldown)
}

/** @param {EntityItemPickupBeforeEvent} data */
export const helper_entityItemPickup = (data) => {
    const id = data?.entity?.id
    if (!id) return

    const cooldown = COOLDOWN_ENTITY.get(id)
    if (!cooldown || cooldown === undefined) return
    if (system.currentTick < cooldown) return data.cancel = true

    COOLDOWN_ENTITY.delete(id)
}

/** @param {EntityRemoveAfterEvent} data */
export const helper_entityRemove = (data) => {
    COOLDOWN_ENTITY.delete(data.removedEntityId)
}