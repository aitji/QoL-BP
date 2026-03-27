import { DisplaySlotId, ScoreboardObjective, system, world } from "@minecraft/server"
import { RUNTIME } from "./_store"

import * as light from "./addon/light"
import * as anvil from "./addon/anvil"
import * as powder from "./addon/powder_concrete"
import * as composter from "./addon/composter"
import * as chest from "./addon/chest"
import * as offhand from "./addon/offhand"
import * as crop from "./addon/crop"

// helper (mostly debug)
/** @type {ScoreboardObjective} */
let dyp
const score = (k, v) => { try { dyp.setScore(k, v) } catch { dyp.addScore(k, v) } }
// ---

// tick
system.run(() => {
    world.scoreboard.getObjective("aitjilib").setScore("api", 1) // heartbeat beta-api checker (use in mcfunction)

    const { DEBUG, DISABLED_COMMANDFEEDBACK } = RUNTIME
    if (DISABLED_COMMANDFEEDBACK) world.gameRules.sendCommandFeedback = false
    if (DEBUG) {
        system.beforeEvents.watchdogTerminate.subscribe((d) => {
            d.cancel = true // if you pc small remove this code ;p

            const msg = `§co7... §7${d.terminateReason}`
            console.warn(msg)
            world.sendMessage(msg)
        })

        dyp = world.scoreboard.getObjective('dyp')
        if (!dyp) dyp = world.scoreboard.addObjective('dyp', 'Dynamic Props')
        world.scoreboard.setObjectiveAtDisplaySlot(DisplaySlotId.Sidebar, { objective: dyp })

        world.sendMessage('§7qof loaded')
        world.sendMessage(`§8${world.getAllPlayers().map(e => ` ${e.name} = ${e.id} §7(${e.clientSystemInfo.platformType})`).join('\n')}`)
    }

    // interval
    const { LIGHT, WET_POWDER_CONCRTE, CARRIED_CHEST, COMPOSTER } = RUNTIME
    system.runInterval(() => {
        const tick = system.currentTick

        if (LIGHT.ENABLED) {
            light.light_pending(tick)
            light.light_processFrames(tick)
        }

        if (WET_POWDER_CONCRTE.ENABLED) powder.powder_pending()
        if (COMPOSTER.ENABLED && COMPOSTER.WORK_WITH_HOPPER) composter.composter_pending()

        for (const player of world.getAllPlayers()) {
            if (LIGHT.ENABLED) light.light_player(player, tick)
            if (CARRIED_CHEST.ENABLED) chest.chest_player(player)
            offhand.offhand_player(player, tick)
        }

        if (DEBUG) { // show dyp
            world.scoreboard.removeObjective("dyp")
            dyp = world.scoreboard.addObjective("dyp", "Dynamic Props")
            world.scoreboard.setObjectiveAtDisplaySlot(DisplaySlotId.Sidebar, { objective: dyp })

            const ids = world.getDynamicPropertyIds()
            const bytes = world.getDynamicPropertyTotalByteCount()

            score("§eTotal props", ids.length)
            score("§eTotal bytes", bytes)

            for (const id of ids) {
                const val = world.getDynamicProperty(id)
                const display = `§7${id.slice(0, 16)}`

                score(
                    display,
                    typeof val === "number" ? val
                        : typeof val === "boolean" ? (val ? 1 : 0)
                            : typeof val === "string" ? val.length
                                : typeof val === "object" ? 1
                                    : -1
                )
            }
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

world.afterEvents.entityDie.subscribe(data => {
    if (RUNTIME.CARRIED_CHEST.ENABLED && !world.gameRules.keepInventory) chest.chest_entityDie(data)
}, { entityTypes: ['minecraft:player'] })

world.afterEvents.entityRemove.subscribe(data => {
    if (RUNTIME.LIGHT.ENABLED) light.light_entityRemove(data)
    if (RUNTIME.WET_POWDER_CONCRTE.ENABLED) powder.powder_entityRemove(data)
})
world.afterEvents.playerPlaceBlock.subscribe(data => {
    if (RUNTIME.LIGHT.ENABLED) light.light_playerPlaceBlock(data)
    if (RUNTIME.CARRIED_CHEST.ENABLED) chest.chest_playerPlaceBlock(data)
    if (RUNTIME.COMPOSTER.ENABLED && RUNTIME.COMPOSTER.WORK_WITH_HOPPER) composter.composter_playerPlaceBlock(data)
})
world.beforeEvents.playerPlaceBlock.subscribe(data => {
    if (RUNTIME.LIGHT.ENABLED) light.light_playerPlaceBlock_before(data)
})
world.beforeEvents.playerBreakBlock.subscribe(data => {
    if (RUNTIME.LIGHT.ENABLED) light.light_playerBreakBlock(data)
    if (RUNTIME.CROP.ENABLED) crop.crop_playerBreakBlock(data)
})
world.beforeEvents.playerInteractWithBlock.subscribe(data => {
    if (RUNTIME.LIGHT.ENABLED) light.light_playerInteractWithBlock(data)
    if (RUNTIME.REPAIR_ANVIL.ENABLED) anvil.anvil_playerInteractWithBlock(data)
    if (RUNTIME.COMPOSTER.ENABLED) composter.composter_playerInteractWithBlock(data)
    if (RUNTIME.CARRIED_CHEST.ENABLED) chest.chest_playerInteractWithBlock(data)
    if (RUNTIME.OFFHAND.ENABLED) offhand.offhand_playerInteractWithBlock(data)
})
world.beforeEvents.playerInteractWithEntity.subscribe(data => {
    if (RUNTIME.OFFHAND.ENABLED) offhand.offhand_playerInteractWithEntity(data)
})
world.afterEvents.entitySpawn.subscribe(data => {
    if (RUNTIME.WET_POWDER_CONCRTE.ENABLED) powder.powder_entitySpawn(data)
})
world.afterEvents.playerSpawn.subscribe(data => {
    if (RUNTIME.OFFHAND.ENABLED) offhand.offhand_playerSpawn(data)
})
world.afterEvents.playerLeave.subscribe(data => {
    if (RUNTIME.OFFHAND.ENABLED) offhand.offhand_playerLeave(data)
})

// beta apis heartbeat
system.afterEvents.scriptEventReceive.subscribe(({ id, message }) => {
    if (message !== "qof") return
    if (RUNTIME.DISABLED_HEARTBEAT) return // script will never responed to mcfunction
    const lib = world.scoreboard.getObjective("aitjilib")

    switch (id) {
        case 'aitji-lib:heartbeat':
            lib.addScore('addon', 1)
            lib.setScore('api', 1)
        default: return
    }
}, { namespaces: ["aitji-lib"] })