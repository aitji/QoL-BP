import { system, world } from "@minecraft/server"
import { RUNTIME } from "./_store"

import * as light from "./addon/light"
import * as anvil from "./addon/anvil"
import * as powder from "./addon/powder_concrete"
import * as composter from "./addon/composter"
import * as chest from "./addon/chest"

// tick
system.run(() => {
    world.scoreboard.getObjective("aitjilib").setScore("api", 1)

    const { DEBUG } = RUNTIME
    world.sendMessage('§7qol loaded')
    world.sendMessage(`§8${world.getAllPlayers().map(e => ` ${e.name} = ${e.id}`).join('\n')}`)
    if (!DEBUG) world.gameRules.sendCommandFeedback = false

    // interval
    system.runInterval(() => {
        const { LIGHT, WET_POWDER_CONCRTE, CARRIED_CHEST, COMPOSTER } = RUNTIME

        if (LIGHT.ENABLED) {
            light.light_pending()
            light.light_processFrames()
        }

        if (WET_POWDER_CONCRTE.ENABLED) powder.powder_pending()
        if (COMPOSTER.ENABLED && COMPOSTER.WORK_WITH_HOPPER) composter.composter_pending()

        for (const player of world.getAllPlayers()) {
            if (LIGHT.ENABLED) light.light_player(player)
            if (CARRIED_CHEST.ENABLED) chest.chest_player(player)
        }
    }, RUNTIME.INTERVAL_DELAY)
})

// debug: barrier clears dynamic properties
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
    if (RUNTIME.CARRIED_CHEST.ENABLED) chest.chest_playerPlaceBlock(data)
    if (RUNTIME.COMPOSTER.ENABLED && RUNTIME.COMPOSTER.WORK_WITH_HOPPER) composter.composter_playerPlaceBlock(data)
})
world.beforeEvents.playerBreakBlock.subscribe(data => {
    if (RUNTIME.LIGHT.ENABLED) light.light_playerBreakBlock(data)
})
world.beforeEvents.playerInteractWithBlock.subscribe(data => {
    if (RUNTIME.REPAIR_ANVIL.ENABLED) anvil.anvil_playerInteractWithBlock(data)
    if (RUNTIME.COMPOSTER.ENABLED) composter.composter_playerInteractWithBlock(data)
    if (RUNTIME.CARRIED_CHEST.ENABLED) chest.chest_playerInteractWithBlock(data)
})
world.afterEvents.entitySpawn.subscribe(data => {
    if (RUNTIME.WET_POWDER_CONCRTE.ENABLED) powder.powder_entitySpawn(data)
})

// beta apis check from another of my project
system.beforeEvents.watchdogTerminate.subscribe((d) => (d.cancel = true))
system.afterEvents.scriptEventReceive.subscribe(({ id, message }) => {
    if (message !== "qol") return
    const lib = world.scoreboard.getObjective("aitjilib")

    switch (id) {
        case 'aitji-lib:heartbeat':
            lib.addScore(`addon`, 1)
            lib.setScore("api", 1)
        default: return
    }
}, { namespaces: ["aitji-lib"] })