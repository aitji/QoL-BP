import { ScoreboardObjective, ScriptEventCommandMessageAfterEvent, system, world } from "@minecraft/server"
import { RUNTIME } from "../lib"
const { DISABLED_HEARTBEAT } = RUNTIME

let lib: ScoreboardObjective
system.run(() => sendHeartbeat())

const getLib = () => {
    if (lib) return lib

    lib = world.scoreboard.getObjective("aitjilib") || world.scoreboard.addObjective("aitjilib")
    return lib
}
const sendHeartbeat = () => {
    const obj = getLib()
    obj.addScore("addon", 1)
    obj.setScore("api", 1)
}

// index call ---
export const heartbeat_scriptEventReceive = ({ id, message }: ScriptEventCommandMessageAfterEvent) => {
    if (message !== "qof" || DISABLED_HEARTBEAT) return
    if (id === "aitji-lib:heartbeat") sendHeartbeat()
}