import {
    CommandPermissionLevel,
    CustomCommandParamType,
    CustomCommandStatus,
    system,
    world,
} from "@minecraft/server"
import { store_set, store_reset, store_resetAll, store_listOverrides, RUNTIME } from "./_store"

// helper
const ADDON_PATH = {
    "dynamic-light": "LIGHT.ENABLED",
    "repair-anvil": "REPAIR_ANVIL.ENABLED",
    "concrete-powder": "WET_POWDER_CONCRTE.ENABLED",
    "composter": "COMPOSTER.ENABLED",
}
const fmt = {
    ok: (msg) => `§a[Q§fo§aL]§r ${msg}`,
    err: (msg) => `§c[Q§fo§cL]§r ${msg}`,
    info: (msg) => `§7[Q§fo§7L]§r ${msg}`,
    val: (v) => typeof v === 'boolean'
        ? (v ? '§aON§r' : '§cOFF§r')
        : `§e${v}§r`,
}

const getRuntimeValue = (path) => path.split('.').reduce((o, k) => (o != null ? o[k] : undefined), RUNTIME)
system.beforeEvents.startup.subscribe(({ customCommandRegistry }) => {
    // share enum
    customCommandRegistry.registerEnum("qol:addon", [
        "dynamic-light",
        "repair-anvil",
        "concrete-powder",
        "composter",
    ])

    // qol:toggle [addon] [true|false]
    customCommandRegistry.registerCommand(
        {
            name: "qol:toggle",
            description: "Enable or disable a QoL addon",
            permissionLevel: CommandPermissionLevel.GameDirectors,
            cheatsRequired: false,
            mandatoryParameters: [
                { name: "qol:addon", type: CustomCommandParamType.Enum },
            ],
            optionalParameters: [
                { name: "toggle", type: CustomCommandParamType.Boolean },
            ],
        },
        (origin, addon, toggle) => {
            const path = ADDON_PATH[addon]
            if (!path) return {
                status: CustomCommandStatus.Failure,
                message: `Unknown addon: ${addon}`,
            }

            const current = getRuntimeValue(path)

            // if no toggle arg, flip
            const next = toggle !== undefined ? toggle : !current

            const result = store_set(path, next)
            if (!result.ok) return {
                status: CustomCommandStatus.Failure,
                message: result.reason,
            }

            // notify everyone
            system.run(() => world.sendMessage(fmt.ok(`${addon} = ${fmt.val(next)}`)))
            return {
                status: CustomCommandStatus.Success,
                message: `${addon} is now ${next ? 'enabled' : 'disabled'}`,
            }
        }
    )

    // qol:reset [path]
    customCommandRegistry.registerCommand(
        {
            name: "qol:reset",
            description: "Reset a config path (or ALL settings) back to defaults",
            permissionLevel: CommandPermissionLevel.GameDirectors,
            cheatsRequired: false,
            optionalParameters: [
                { name: "qol:configPath", type: CustomCommandParamType.Enum },
            ],
        },
        (origin, path) => {
            if (!path) {
                // reset everything
                store_resetAll()
                system.run(() => world.sendMessage(fmt.ok("All QoL settings reset to defaults.")))
                return {
                    status: CustomCommandStatus.Success,
                    message: "All settings reset to defaults",
                }
            }

            const result = store_reset(path)
            if (!result.ok) return {
                status: CustomCommandStatus.Failure,
                message: result.reason,
            }

            system.run(() => world.sendMessage(fmt.ok(`${path} reset = ${fmt.val(result.value)}`)))
            return {
                status: CustomCommandStatus.Success,
                message: `${path} reset to ${result.value}`,
            }
        }
    )

    // qol:list
    customCommandRegistry.registerCommand(
        {
            name: "qol:list",
            description: "List all QoL settings currently overriding defaults",
            permissionLevel: CommandPermissionLevel.GameDirectors,
            cheatsRequired: false,
        },
        (_origin) => {
            const overrides = store_listOverrides()

            system.run(() => {
                if (overrides.length === 0) {
                    world.sendMessage(fmt.info("No overrides, all settings are at defaults."))
                    return
                }

                const lines = overrides
                    .map(o => `  §7${o.path}§r = ${fmt.val(o.value)} §8(default: ${o.default})§r`)
                    .join('\n')
                world.sendMessage(fmt.info(`Active overrides (${overrides.length}):\n${lines}`))
            })

            return {
                status: CustomCommandStatus.Success,
                message: `${overrides.length} override(s)`,
            }
        }
    )
})