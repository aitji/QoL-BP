import { GameMode, PlatformType, Player, PlayerGameModeChangeAfterEvent, system, world } from "@minecraft/server"
/**
 * @typedef {Object} PlayerData
 * @property {string} name
 * @property {PlatformType} platformType
 * @property {GameMode} gameMode
 */

/**@type {Map<string, PlayerData>}*/
export const playerData = new Map()
export const worldData = new Set()

// internal
const typeMap = Object.freeze({
    'player': playerData,
    'world': worldData
})
system.run(() => {
    const allPlayers = world.getAllPlayers()
    for (const player of allPlayers) player_init_update(player)
})

// external
/**
 * @param {'player'|'world'} type
 * @param {string} id
 */
export const getPlayer = (player) => {
    let data = playerData.get(player.id)
    if (!data) data = player_init_update(player)
    return data
}

/**
 * @param {'player'|'world'} type
 * @param {string} id
 * @param {{}} kv
 */
export const update = (type, id, kv = {}) => {
    const cache = typeMap[type]
    if (!cache) throw new Error(`[cache.js] ${type} not in the list`)

    const prev = cache.get(id) || {}
    const next = { ...prev, ...kv }
    cache.set(id, next)
    return next
}

/**@param {Player} player*/
export const player_init_update = (player) => {
    const { id, name } = player
    const platformType = player.clientSystemInfo.platformType
    const gameMode = player.getGameMode()

    return update('player', id, {
        name,
        platformType,
        gameMode
    })
}

/**@param {PlayerGameModeChangeAfterEvent} data*/
export const player_gamemode_update = (data) => {
    const { player, toGameMode } = data
    update('player', player.id, { gameMode: toGameMode })
}