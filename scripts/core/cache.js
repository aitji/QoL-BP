import { GameMode, PlatformType, Player, PlayerGameModeChangeAfterEvent, system, world } from "@minecraft/server"
import { RUNTIME } from '../lib'
const { DEBUG } = RUNTIME

// "core/cache.js" is [ONLY] for caching globally
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
 * @param {Player|string} player string = playerId
 * @param {'name'|'platformType'|'gameMode'} get
 * @returns {PlayerData|string|PlatformType|GameMode}
 */
export const getPlayer = (player, get) => {
    const id = typeof player === 'string' ? player : player.id
    let data = playerData.get(id)

    if (!data) {
        if (typeof player === 'string') {
            if (DEBUG) console.warn('[cache.js] cannot update player data throw empy string as return')
            return ''
        }
        data = player_init_update(player)
    }

    return get ? data[get] : data
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