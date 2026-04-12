import { Entity, EntityItemPickupBeforeEvent, EntityRemoveAfterEvent, system, world } from "@minecraft/server"
const COOLDOWN_ENTITY = new Map()

// anyone call
export const pickupCooldown = (entity: Entity, cooldown = 40) => {
    const id = entity.id
    if (COOLDOWN_ENTITY.has(id)) return
    COOLDOWN_ENTITY.set(id, system.currentTick + cooldown)
}

// index call
export const helper_entityItemPickup = (data: EntityItemPickupBeforeEvent) => {
    const id = data?.entity?.id
    if (!id) return

    const cooldown = COOLDOWN_ENTITY.get(id)
    if (!cooldown || cooldown === undefined) return
    if (system.currentTick < cooldown) return data.cancel = true

    COOLDOWN_ENTITY.delete(id)
}

export const helper_entityRemove = (data: EntityRemoveAfterEvent) => {
    COOLDOWN_ENTITY.delete(data.removedEntityId)
}