import { world } from "@minecraft/server"
import { SETTINGS } from "./_config"

function buildRuntime() {
    let ps = {}
    try { ps = world.getPackSettings() } catch { }

    const g = (name, def) => {
        const v = ps[name]
        return (v !== undefined && typeof v === typeof def) ? v : def
    }
    const r1 = (name, def) => Math.round(g(name, def) * 10) / 10

    const S = SETTINGS
    const L = S.LIGHT
    const A = S.REPAIR_ANVIL
    const W = S.WET_POWDER_CONCRTE
    const C = S.COMPOSTER
    const CH = S.CARRIED_CHEST

    return Object.freeze({
        DEBUG: g("qol:DEBUG", S.DEBUG),
        INTERVAL_DELAY: g("qol:INTERVAL_DELAY", S.INTERVAL_DELAY),
        SLICE_PREFIX: S.SLICE_PREFIX,

        LIGHT: Object.freeze({
            ENABLED: g("qol:LIGHT.ENABLED", L.ENABLED),
            DECAY_LIGHT_TICK: g("qol:LIGHT.DECAY_LIGHT_TICK", L.DECAY_LIGHT_TICK),
            REDUCE_LIGHT: r1("qol:LIGHT.REDUCE_LIGHT", L.REDUCE_LIGHT),
            LIGHT_REDUCE_LINEAR: -g("qol:LIGHT.LIGHT_REDUCE_LINEAR", L.LIGHT_REDUCE_LINEAR),
            LIGHT_RENDER_RADIUS: g("qol:LIGHT.LIGHT_RENDER_RADIUS", L.LIGHT_RENDER_RADIUS),
            LIGHT_RENDER_PER_PLAYER: g("qol:LIGHT.LIGHT_RENDER_PER_PLAYER", L.LIGHT_RENDER_PER_PLAYER),
            LIGHT_FIRE_LEVEL: g("qol:LIGHT.LIGHT_FIRE_LEVEL", L.LIGHT_FIRE_LEVEL),

            // static
            LIGHT_WIKI: L.LIGHT_WIKI,
            LIGHT_ENTITY: L.LIGHT_ENTITY,
        }),

        REPAIR_ANVIL: Object.freeze({
            ENABLED: g("qol:REPAIR_ANVIL.ENABLED", A.ENABLED),
            REPAIR_HELD_DELAY: g("qol:REPAIR_ANVIL.REPAIR_HELD_DELAY", A.REPAIR_HELD_DELAY),

            // static
            ITEM_TYPEID: A.ITEM_TYPEID,
            REPAIRABLE_ANVIL: A.REPAIRABLE_ANVIL,
            REPAIR_SOUND: A.REPAIR_SOUND,
        }),

        WET_POWDER_CONCRTE: Object.freeze({
            ENABLED: g("qol:WET_POWDER_CONCRTE.ENABLED", W.ENABLED),
            KEEP_VELOCITY: g("qol:WET_POWDER_CONCRTE.KEEP_VELOCITY", W.KEEP_VELOCITY),
            MAX_PROCESS: g("qol:WET_POWDER_CONCRTE.MAX_PROCESS", W.MAX_PROCESS),

            // static
            ITEM_PREFIX: W.ITEM_PREFIX,
            PROCESS_DELAY: W.PROCESS_DELAY,
            TYPEID_ENDSWITH: W.TYPEID_ENDSWITH,
            DONE_PARTICLE: W.DONE_PARTICLE,
            DONE_SOUND: W.DONE_SOUND,
            BATCH_SIZE: W.BATCH_SIZE,
        }),

        COMPOSTER: Object.freeze({
            ENABLED: g("qol:COMPOSTER.ENABLED", C.ENABLED),
            WORK_WITH_HOPPER: g("qol:COMPOSTER.WORK_WITH_HOPPER", C.WORK_WITH_HOPPER),
            HOPPER_INTERVAL_TICK: g("qol:COMPOSTER.HOPPER_INTERVAL_TICK", C.HOPPER_INTERVAL_TICK),
            DELAY_BEFORE_READY: g("qol:COMPOSTER.DELAY_BEFORE_READY", C.DELAY_BEFORE_READY),

            // static
            HOPPER_TYPEID: C.HOPPER_TYPEID,
            BLOCK_TYPEID: C.BLOCK_TYPEID,
            DATA_LOSS_DYP: C.DATA_LOSS_DYP,
            DATA_COMPOSTER_LOCATION: C.DATA_COMPOSTER_LOCATION,
            PARTICLE_FILL_SUCCESS: C.PARTICLE_FILL_SUCCESS,
            SOUND_FILL_SUCCESS: C.SOUND_FILL_SUCCESS,
            SOUND_FILL_BONEMEAL: C.SOUND_FILL_BONEMEAL,
            SOUND_READY: C.SOUND_READY,
            SOUND_FILL: C.SOUND_FILL,
            VANILA_COMPOSTE: C.VANILA_COMPOSTE,
            ITEMS: C.ITEMS,
        }),

        CARRIED_CHEST: Object.freeze({
            ENABLED: g("qol:CARRIED_CHEST.ENABLED", CH.ENABLED),
            SLOWNESS_DURATION: g("qol:CARRIED_CHEST.SLOWNESS_DURATION", CH.SLOWNESS_DURATION),
            SLOWNESS_AMPLIFIER: g("qol:CARRIED_CHEST.SLOWNESS_AMPLIFIER", CH.SLOWNESS_AMPLIFIER),
            PLAYER_JUMP: Object.freeze({
                NO_JUMP_HOLD_CHEST: g("qol:CARRIED_CHEST.PLAYER_JUMP.NO_JUMP_HOLD_CHEST", CH.PLAYER_JUMP.NO_JUMP_HOLD_CHEST),
                ALLOW_JUMP_IN_WATER: g("qol:CARRIED_CHEST.PLAYER_JUMP.ALLOW_JUMP_IN_WATER", CH.PLAYER_JUMP.ALLOW_JUMP_IN_WATER),
                ALLOW_JUMP_IN_LAVA: g("qol:CARRIED_CHEST.PLAYER_JUMP.ALLOW_JUMP_IN_LAVA", CH.PLAYER_JUMP.ALLOW_JUMP_IN_LAVA),
            }),

            // static
            CARRY_TAG: CH.CARRY_TAG,
            APPLY_IMPULSE: CH.APPLY_IMPULSE,
            ENTITY_TYPE: CH.ENTITY_TYPE,
            CHEST_ID: CH.CHEST_ID,
            DOUBLE_CHEST_SIZE: CH.DOUBLE_CHEST_SIZE,
            SOUND_PICK_UP: CH.SOUND_PICK_UP,
        }),
    })
}

export const RUNTIME = buildRuntime()