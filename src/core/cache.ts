import { GameMode, PlatformType, Player, PlayerGameModeChangeAfterEvent, system, world } from "@minecraft/server"
import { RUNTIME } from "../_store" // "cache" got use in "lib" as lazy import, use setting from store directly
const { DEBUG } = RUNTIME

export type CacheData = 'name' | 'platformType' | 'gameMode'
export type PlayerData = {
    name: string
    platformType: PlatformType
    gameMode: GameMode
}

type WorldData = {
    gamerule: { keepInventory: boolean }
}

// maps, "core/cache" is [ONLY] for caching globally
export const playerData = new Map<string, PlayerData>()
export const worldData = new Map<string, WorldData>()

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
    for (const player of allPlayers) player_init_update(player)
})

// external
export const getPlayer = (player: Player | string, get?: CacheData) => {
    const id = typeof player === 'string' ? player : player.id
    let data = playerData.get(id)

    if (!data) {
        if (typeof player === 'string') {
            if (DEBUG) console.warn('[cache] cannot update player data throw empy string as return')
            return ''
        }
        data = player_init_update(player)
    }

    return get ? data[get] : data
}

export const update = <T extends CacheType>
    (type: T, id: string, kv: Partial<CacheValue<T>>) => {
    const cache = typeMap[type] as Map<string, CacheValue<T>>

    const prev = cache.get(id)
    const next = { ...(prev || {}), ...kv } as CacheValue<T>

    cache.set(id, next)
    return next
}

export const player_init_update = (player: Player) => {
    const { id, name } = player
    const platformType = player.clientSystemInfo.platformType
    const gameMode = player.getGameMode()

    return update('player', id, {
        name,
        platformType,
        gameMode
    })
}

export const player_gamemode_update = (data: PlayerGameModeChangeAfterEvent) => {
    const { player, toGameMode } = data
    update('player', player.id, { gameMode: toGameMode })
}