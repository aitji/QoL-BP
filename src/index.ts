import { system, world } from "@minecraft/server"
import { RUNTIME } from "./_store"
import * as lib from "./lib"
import * as debug from "./core/debug"
import * as heartbeat from "./core/heartbeat"
import * as cache from "./core/cache"

// light
import * as light from "./addon/light/core"
import * as light_patcher from "./addon/light/patcher"
// water
import * as concrete from "./addon/water/concrete"
import * as cauldron from "./addon/water/cauldron"

import * as anvil from "./addon/anvil"
import * as composter from "./addon/composter"
import * as chest from "./addon/chest"
import * as offhand from "./addon/offhand"
import * as harvest from "./addon/harvest"
import * as door from "./addon/door"
import * as waxedOff from "./addon/waxedOff"

// tick
system.run(() => {
    const { LIGHT, WATER_CONCRETE, CARRIED_CHEST, COMPOSTER } = RUNTIME
    system.runInterval(() => {
        const tick = system.currentTick

        if (LIGHT.ENABLED) {
            light.light_pending(tick)
            light.light_processFrames(tick)
        }

        if (WATER_CONCRETE.ENABLED) concrete.powder_pending()
        if (COMPOSTER.ENABLED && COMPOSTER.WORK_WITH_HOPPER) composter.composter_pending(tick)

        const players = world.getAllPlayers()
        for (const player of players) {
            if (LIGHT.ENABLED) light.light_player(player, tick)
            if (CARRIED_CHEST.ENABLED) chest.chest_player(player)
            offhand.offhand_player(player, tick)
        }

        if (RUNTIME.DEBUG) debug.debug_pending()
    }, RUNTIME.INTERVAL_DELAY)
})

world.afterEvents.entityDie.subscribe(data => {
    if (RUNTIME.CARRIED_CHEST.ENABLED && !world.gameRules.keepInventory) chest.chest_entityDie(data)
}, { entityTypes: ['minecraft:player'] })

world.afterEvents.entityRemove.subscribe(data => {
    if (RUNTIME.LIGHT.ENABLED) light.light_entityRemove(data)
    if (RUNTIME.WATER_CONCRETE.ENABLED) concrete.powder_entityRemove(data)

    lib.helper.helper_entityRemove(data)
})
world.afterEvents.playerPlaceBlock.subscribe(data => {
    if (RUNTIME.LIGHT.ENABLED) light.light_playerPlaceBlock(data)
    if (RUNTIME.CARRIED_CHEST.ENABLED) chest.chest_playerPlaceBlock(data)
    if (RUNTIME.COMPOSTER.ENABLED && RUNTIME.COMPOSTER.WORK_WITH_HOPPER) composter.composter_playerPlaceBlock(data)

    if (RUNTIME.DEBUG) debug.debug_playerPlaceBlock(data)
})
world.beforeEvents.playerPlaceBlock.subscribe(data => {
    if (RUNTIME.LIGHT.ENABLED) light.light_playerPlaceBlock_before(data)
})
world.beforeEvents.playerBreakBlock.subscribe(data => {
    if (RUNTIME.LIGHT.ENABLED) light.light_playerBreakBlock(data)
    if (RUNTIME.HARVEST.ENABLED) harvest.harvest_playerBreakBlock(data)
})
world.beforeEvents.playerInteractWithBlock.subscribe(data => {
    if (RUNTIME.LIGHT.ENABLED) light_patcher.light_playerInteractWithBlock(data) // patcher
    if (RUNTIME.REPAIR_ANVIL.ENABLED) anvil.anvil_playerInteractWithBlock(data)
    if (RUNTIME.COMPOSTER.ENABLED) composter.composter_playerInteractWithBlock(data)
    if (RUNTIME.CARRIED_CHEST.ENABLED) chest.chest_playerInteractWithBlock(data)
    if (RUNTIME.OFFHAND.ENABLED) offhand.offhand_playerInteractWithBlock(data)
    if (RUNTIME.DOUBLE_DOOR.ENABLED) door.door_playerInteractWithBlock(data)
    if (RUNTIME.WAXED_OF.ENABLED) waxedOff.waxedOff_playerInteractWithBlock(data)
})
world.beforeEvents.playerInteractWithEntity.subscribe(data => {
    if (RUNTIME.OFFHAND.ENABLED) offhand.offhand_playerInteractWithEntity(data)
})
world.afterEvents.entitySpawn.subscribe(data => {
    if (RUNTIME.WATER_CONCRETE.ENABLED) concrete.powder_entitySpawn(data)
})
world.afterEvents.playerSpawn.subscribe(data => {
    if (RUNTIME.OFFHAND.ENABLED) offhand.offhand_playerSpawn(data)
})
world.afterEvents.playerLeave.subscribe(data => {
    if (RUNTIME.OFFHAND.ENABLED) offhand.offhand_playerLeave(data)
})
world.afterEvents.playerSpawn.subscribe(data => {
    const { player, initialSpawn } = data
    if (initialSpawn) cache.player_init_update(player)
})
world.afterEvents.playerGameModeChange.subscribe(data => {
    cache.player_gamemode_update(data)
})

// core routes
world.beforeEvents.entityItemPickup.subscribe(data => { lib.helper.helper_entityItemPickup(data) }, { entityFilter: { type: "minecraft:player" } })
system.beforeEvents.startup.subscribe(event => { if (RUNTIME.DEBUG) debug.debug_startup(event) })
system.afterEvents.scriptEventReceive.subscribe((event) => heartbeat.heartbeat_scriptEventReceive((event)), { namespaces: ["aitji-lib"] })