import { system, world } from "@minecraft/server"
import { store_load, RUNTIME } from "./_store"
import "./commands.js"
import * as light from "./addon/light"
import * as anvil from "./addon/anvil"
import * as powder from "./addon/powder_concrete"
import * as composter from "./addon/composter"

// tick
system.run(() => {
    const count = store_load()
    const { DEBUG, LIGHT, REPAIR_ANVIL, WET_POWDER_CONCRTE, COMPOSTER } = RUNTIME

    world.sendMessage('§7qol loaded')
    world.sendMessage(`§8${world.getAllPlayers().map(e => ` ${e.name} = ${e.id}`).join('\n')}`)
    if (count > 0) world.sendMessage(`§8qol: restored ${count} config override(s) from DYP`)
    if (!DEBUG) world.gameRules.sendCommandFeedback = false

    // 1-tick interval
    system.runInterval(() => {
        const { LIGHT: L, WET_POWDER_CONCRTE: P } = RUNTIME

        if (L.ENABLED) {
            light.light_pending()
            light.light_processFrames()
        }
        if (P.ENABLED) {
            powder.powder_pending()
        }
        if (L.ENABLED) {
            for (const player of world.getAllPlayers()) {
                light.light_player(player)
            }
        }
    }, RUNTIME.INTERVAL_DELAY)
})

// world event
if (RUNTIME.DEBUG) world.beforeEvents.itemUse.subscribe(data => {
    const { itemStack } = data
    if (itemStack.typeId === 'minecraft:barrier') {
        world.getDynamicPropertyIds().map(dy => world.sendMessage(`§7${dy}`))
        world.clearDynamicProperties()
    }
})

world.afterEvents.entityRemove.subscribe(data => {
    if (RUNTIME.LIGHT.ENABLED) light.light_entityRemove(data)
    if (RUNTIME.WET_POWDER_CONCRTE.ENABLED) powder.powder_entityRemove(data)
})
world.afterEvents.playerPlaceBlock.subscribe(data => {
    if (RUNTIME.LIGHT.ENABLED) light.light_playerPlaceBlock(data)
})
world.beforeEvents.playerBreakBlock.subscribe(data => {
    if (RUNTIME.LIGHT.ENABLED) light.light_playerBreakBlock(data)
})
world.beforeEvents.playerInteractWithBlock.subscribe(data => {
    if (RUNTIME.REPAIR_ANVIL.ENABLED) anvil.anvil_playerInteractWithBlock(data)
    if (RUNTIME.COMPOSTER.ENABLED) composter.composter_playerInteractWithBlock(data)
})
world.afterEvents.entitySpawn.subscribe(data => {
    if (RUNTIME.WET_POWDER_CONCRTE.ENABLED) powder.powder_entitySpawn(data)
})