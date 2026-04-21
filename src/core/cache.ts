import { Dimension, GameMode, PlatformType, Player, PlayerGameModeChangeAfterEvent, PlayerLeaveAfterEvent, PlayerPermissionLevel, PlayerSpawnAfterEvent, system, world } from "@minecraft/server"
import { RUNTIME } from "../_store" // "cache" got use in "lib" as lazy import, use setting from store directly
const { DEBUG } = RUNTIME

const PlayerDataShape = {
    name: '' as string,
    platformType: '' as PlatformType,
    gameMode: '' as GameMode,
    permissionLevel: 0 as PlayerPermissionLevel
}
const WorldDataShape = {
    gamerule: { keepInventory: false as boolean }
}

export type PlayerData = typeof PlayerDataShape
export type WorldData = typeof WorldDataShape
export type CacheData = keyof PlayerData

export const playerDataKeys = Object.keys(PlayerDataShape) as (keyof PlayerData)[]
export const worldDataKeys = Object.keys(WorldDataShape) as (keyof WorldData)[]

// maps, "core/cache" is [ONLY] for caching globally
export const playerData = new Map<string, PlayerData>()
export const worldData = new Map<string, WorldData>()

let cachedPlayers: Player[] = []
const cachedDimensions = new Map<string, Dimension>()

// map typing fix
const typeMap = {
    player: playerData,
    world: worldData
} as const

// helper type
type TypeMap = typeof typeMap
type CacheType = keyof TypeMap
type CacheValue<T extends CacheType> = TypeMap[T] extends Map<any, infer V> ? V : never

// internal
system.run(() => {
    const allPlayers = world.getAllPlayers()
    cachedPlayers = allPlayers

    for (const player of allPlayers)
        player_init_update(player)
})

// external routes
export const player_init_update = (player: Player) => {
    const { id, name, playerPermissionLevel } = player
    const platformType = player.clientSystemInfo.platformType
    const gameMode = player.getGameMode()

    return update('player', id, {
        name,
        platformType,
        gameMode,
        permissionLevel: playerPermissionLevel
    })
}

export const player_gamemode_update = (data: PlayerGameModeChangeAfterEvent) => {
    const { player, toGameMode } = data
    update('player', player.id, { gameMode: toGameMode })
}

export const player_track_start = (data: PlayerSpawnAfterEvent) => {
    const { player, initialSpawn } = data
    if (!initialSpawn) return
    if (!cachedPlayers.includes(player)) cachedPlayers.push(player)
}

export const player_track_stop = (data: PlayerLeaveAfterEvent) => {
    const { playerId } = data
    cachedPlayers = cachedPlayers.filter(p => p.id !== playerId)
}

// modules call
export const update = <T extends CacheType>
    (type: T, id: string, kv: Partial<CacheValue<T>>) => {
    const cache = typeMap[type] as Map<string, CacheValue<T>>

    const prev = cache.get(id)
    const next = { ...(prev || {}), ...kv } as CacheValue<T>

    cache.set(id, next)
    return next
}

export const getPlayer = (player: Player | string, get?: CacheData | string) => {
    const id = typeof player === 'string' ? player : player.id
    let data = playerData.get(id)

    if (!data) {
        if (typeof player === 'string') {
            if (DEBUG) console.warn('[cache] cannot update player data throw empy string as return')
            return ''
        }
        data = player_init_update(player)
    }

    return get ? data[get as CacheData] : data
}

export const getCachedPlayers = (): Player[] => cachedPlayers
export const getCachedDimension = (dimensionId: string): Dimension | null => {
    if (cachedDimensions.has(dimensionId)) return cachedDimensions.get(dimensionId)!

    try {
        const dim = world.getDimension(dimensionId)
        cachedDimensions.set(dimensionId, dim)
        return dim
    } catch (e) {
        if (DEBUG) console.warn(`[cache] dimension "${dimensionId}" not found`)
        return null
    }
}