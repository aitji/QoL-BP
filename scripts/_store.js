// call this "shadow-db" btw
import { world } from "@minecraft/server"
import { SETTINGS as DEFAULTS } from "./_config"

const PREFIX = "qol:cfg:"

// helpers
const deepClone = (obj) => JSON.parse(JSON.stringify(obj))
const getPath = (obj, path) => path.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj)

function setPath(obj, path, value) {
    const keys = path.split('.')
    let cur = obj
    for (let i = 0; i < keys.length - 1; i++) {
        if (cur[keys[i]] == null || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {}
        cur = cur[keys[i]]
    }
    cur[keys[keys.length - 1]] = value
}

export let RUNTIME = deepClone(DEFAULTS) // **IN MEMORY
let _loaded = false

export function store_load() {
    if (_loaded) return
    _loaded = true

    const ids = world.getDynamicPropertyIds()
    let count = 0

    for (const id of ids) {
        if (!id.startsWith(PREFIX)) continue
        const path = id.slice(PREFIX.length)
        const raw = world.getDynamicProperty(id)
        if (raw == null) continue

        try {
            const value = JSON.parse(String(raw))
            const current = getPath(RUNTIME, path)

            if (current !== undefined && typeof value !== typeof current) continue

            setPath(RUNTIME, path, value)
            count++
        } catch (_) { /* malformed DYP, ignore */ }
    }

    return count
}

/**
 * @param {string} path
 * @param {boolean | number | string} value
 * @returns {{ ok: boolean, oldValue: boolean | number | string, newValue: boolean | number | string }}
 */
export function store_set(path, value) {
    const oldValue = getPath(RUNTIME, path)
    if (oldValue === undefined) return { ok: false, reason: `unknown path: ${path}` }

    // type coercion + guard
    let coerced = value
    if (typeof oldValue === 'boolean') {
        if (typeof value === 'boolean') coerced = value
        else if (value === 'true') coerced = true
        else if (value === 'false') coerced = false
        else return { ok: false, reason: `expected boolean for ${path}` }
    } else if (typeof oldValue === 'number') {
        coerced = Number(value)
        if (isNaN(coerced)) return { ok: false, reason: `expected number for ${path}` }
    } else if (typeof oldValue === 'string') coerced = String(value)
    else return { ok: false, reason: `${path} is not a primitive — cannot set via command` }

    setPath(RUNTIME, path, coerced)
    world.setDynamicProperty(`${PREFIX}${path}`, JSON.stringify(coerced))

    return { ok: true, oldValue, newValue: coerced }
}

export function store_reset(path) {
    const defVal = getPath(DEFAULTS, path)
    if (defVal === undefined) return { ok: false, reason: `unknown path: ${path}` }

    setPath(RUNTIME, path, deepClone(defVal))
    world.setDynamicProperty(`${PREFIX}${path}`, undefined)
    return { ok: true, value: defVal }
}

export function store_resetAll() {
    const ids = world.getDynamicPropertyIds()
    for (const id of ids)
        if (id.startsWith(PREFIX))
            world.setDynamicProperty(id, undefined)

    RUNTIME = deepClone(DEFAULTS)
    return { ok: true }
}

/**@returns {Array<{ path: string, value: *, default: * }>}*/
export function store_listOverrides() {
    const overrides = []
    _walk(DEFAULTS, RUNTIME, '', overrides)
    return overrides
}

function _walk(def, run, prefix, out) {
    for (const k of Object.keys(def)) {
        const path = prefix ? `${prefix}.${k}` : k
        const d = def[k]
        const r = run[k]

        if (d !== null && typeof d === 'object' && !Array.isArray(d))
            _walk(d, r ?? {}, path, out)
        else if (
            typeof d === 'boolean' ||
            typeof d === 'number' ||
            typeof d === 'string'
        ) if (d !== r) out.push({ path, value: r, default: d })
    }
}