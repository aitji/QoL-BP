import { Block, BlockPermutation, Dimension, Direction, system, world } from "@minecraft/server"
import { RUNTIME } from "../../lib"

const {
    OFFHAND: { LIGHT }
} = RUNTIME

const VANILLA_REPLACEABLE = new Set([
    'minecraft:tallgrass', 'minecraft:short_grass', 'minecraft:fern',
    'minecraft:short_dry_grass', 'minecraft:tall_dry_grass',
    'minecraft:deadbush', 'minecraft:snow_layer', 'minecraft:fire',
    'minecraft:soul_fire', 'minecraft:vine', 'minecraft:nether_sprouts',
    'minecraft:crimson_roots', 'minecraft:warped_roots', 'minecraft:seagrass',
    LIGHT
])

export const isReplaceableTarget = (b: Block): boolean => b.isAir || b.isLiquid || VANILLA_REPLACEABLE.has(b.typeId)
export function hasEntityInBlock(
    dimension: Dimension,
    loc: { x: number; y: number; z: number },
    excludeId?: string
): boolean {
    try {
        const cx = loc.x + 0.5, cy = loc.y + 0.5, cz = loc.z + 0.5

        for (const e of dimension.getEntities({ location: { x: cx, y: cy, z: cz }, maxDistance: 2 })) {
            if (excludeId && e.id === excludeId) continue

            const aabb = e.getAABB()
            const center = aabb.center
            const extent = aabb.extent

            // AABB overlap: entity box vs block box [loc, loc+1]
            if (
                center.x + extent.x > loc.x && center.x - extent.x < loc.x + 1 &&
                center.y + extent.y > loc.y && center.y - extent.y < loc.y + 1 &&
                center.z + extent.z > loc.z && center.z - extent.z < loc.z + 1
            ) return true
        }
    } catch { }
    return false
}
export function yawToCardinal(yaw: number): 'north' | 'south' | 'east' | 'west' {
    const y = ((yaw % 360) + 360) % 360
    if (y >= 315 || y < 45) return 'south'
    if (y >= 45 && y < 135) return 'west'
    if (y >= 135 && y < 225) return 'north'
    return 'east'
}

const CARDINAL_TO_FACING: Record<string, number> = { north: 2, south: 3, west: 4, east: 5 }
const CARDINAL_TO_WEIRDO: Record<string, number> = { east: 0, west: 1, south: 2, north: 3 }
const CARDINAL_TO_DIR: Record<string, number> = { south: 0, west: 1, north: 2, east: 3 }
const OPPOSITE: Record<string, string> = { north: 'south', south: 'north', east: 'west', west: 'east' }
const FACE_CARDINAL: Partial<Record<Direction, string>> = {
    [Direction.North]: 'north', [Direction.South]: 'south',
    [Direction.East]: 'east', [Direction.West]: 'west',
}
const FACE_ATTACH_FACING: Record<Direction, number> = {
    [Direction.Down]: 0, [Direction.Up]: 1,
    [Direction.North]: 2, [Direction.South]: 3, [Direction.West]: 4, [Direction.East]: 5,
}
function flipFacing(blockFace: Direction, yaw: number): number {
    if (blockFace === Direction.Up) return CARDINAL_TO_FACING[yawToCardinal(yaw)]
    if (blockFace === Direction.Down) return 0
    return CARDINAL_TO_FACING[OPPOSITE[FACE_CARDINAL[blockFace]!]]
}

export const DISALLOW_PLACEMENT_BLOCK = Object.freeze(new Set([
    "minecraft:acacia_door", "minecraft:bamboo_door",
    "minecraft:birch_door", "minecraft:cherry_door",
    "minecraft:copper_door", "minecraft:crimson_door",
    "minecraft:dark_oak_door", "minecraft:exposed_copper_door",
    "minecraft:iron_door", "minecraft:jungle_door",
    "minecraft:mangrove_door", "minecraft:oxidized_copper_door",
    "minecraft:pale_oak_door", "minecraft:spruce_door",
    "minecraft:warped_door", "minecraft:waxed_copper_door",
    "minecraft:waxed_exposed_copper_door", "minecraft:waxed_oxidized_copper_door",
    "minecraft:waxed_weathered_copper_door", "minecraft:weathered_copper_door",
    "minecraft:wooden_door"
]))

const FACING_ATTACH = Object.freeze(new Set([
    'minecraft:observer', 'minecraft:ladder',
    'minecraft:amethyst_cluster',
    'minecraft:large_amethyst_bud', 'minecraft:medium_amethyst_bud', 'minecraft:small_amethyst_bud',

    'minecraft:acacia_shelf', 'minecraft:bamboo_shelf', 'minecraft:birch_shelf',
    'minecraft:cherry_shelf', 'minecraft:crimson_shelf', 'minecraft:dark_oak_shelf',
    'minecraft:jungle_shelf', 'minecraft:mangrove_shelf', 'minecraft:oak_shelf',
    'minecraft:pale_oak_shelf', 'minecraft:spruce_shelf', 'minecraft:warped_shelf'
]))
/**
 * VERTICAL_ATTACH: like ATTACH
 * but Up=1(floor) and Down=0(ceiling) are literal.
 */
const FACING_VERTICAL_ATTACH = Object.freeze(new Set([
    'minecraft:end_rod', 'minecraft:lightning_rod',
    'minecraft:stone_button',
    'minecraft:oak_button', 'minecraft:spruce_button', 'minecraft:birch_button',
    'minecraft:jungle_button', 'minecraft:acacia_button', 'minecraft:dark_oak_button',
    'minecraft:mangrove_button', 'minecraft:cherry_button', 'minecraft:bamboo_button',
    'minecraft:crimson_button', 'minecraft:warped_button', 'minecraft:polished_blackstone_button',
]))
const FACING_OVERRIDE = new Map<string, 'flip' | 'attach' | 'vertical_attach'>()

type SupportFn = (support: Block) => boolean
const SUPPORT_RULES = new Map<string, SupportFn>()
    ; (function _buildSupport() {
        const add = (ids: string[], fn: SupportFn) => ids.forEach(id => SUPPORT_RULES.set(id, fn))
        const hasDirt = (b: Block) => b.hasTag('dirt')
        const hasMoss = (b: Block) => b.typeId === 'minecraft:moss_block'
        const hasSand = (b: Block) => b.hasTag('sand')
        const hasClayOrMoss = (b: Block) => b.typeId === 'minecraft:clay' || hasMoss(b)
        const hasKelp = (b: Block) => b.isSolid || b.typeId === 'minecraft:kelp'

        add([ // saplings + ground-cover flowers/grass
            'minecraft:oak_sapling', 'minecraft:spruce_sapling', 'minecraft:birch_sapling',
            'minecraft:jungle_sapling', 'minecraft:acacia_sapling', 'minecraft:dark_oak_sapling',
            'minecraft:mangrove_propagule', 'minecraft:cherry_sapling',
            'minecraft:short_grass', 'minecraft:fern', 'minecraft:tall_grass', 'minecraft:large_fern',
            'minecraft:poppy', 'minecraft:dandelion', 'minecraft:blue_orchid',
            'minecraft:allium', 'minecraft:azure_bluet', 'minecraft:cornflower',
            'minecraft:red_tulip', 'minecraft:orange_tulip', 'minecraft:white_tulip',
            'minecraft:pink_tulip', 'minecraft:oxeye_daisy', 'minecraft:lily_of_the_valley',
            'minecraft:wither_rose', 'minecraft:torchflower', 'minecraft:pitcher_plant',
            'minecraft:open_eyeblossom', 'minecraft:closed_eyeblossom',
        ], hasDirt)
        add(['minecraft:azalea', 'minecraft:flowering_azalea'], hasMoss)
        add(['minecraft:big_dripleaf', 'minecraft:small_dripleaf_block'], hasClayOrMoss)
        add(['minecraft:kelp'], hasKelp)
        add(['minecraft:dead_bush'], b => hasSand(b) || hasDirt(b) || b.typeId === 'minecraft:terracotta')
    })()

// special block resolver
export function getSpecialPermutation(
    typeId: string,
    blockFace: Direction,
    faceLocation: { x: number; y: number; z: number },
    block: Block,
    target: Block,
    yaw: number
): BlockPermutation | null | undefined {

    // support rule
    const supportRule = SUPPORT_RULES.get(typeId)
    if (supportRule !== undefined) {
        if (blockFace !== Direction.Up) return undefined
        if (!supportRule(block)) return undefined
    }

    // lantern
    if (typeId === 'minecraft:lantern' || typeId === 'minecraft:soul_lantern')
        return BlockPermutation.resolve(typeId).withState('hanging', blockFace === Direction.Down)

    // bell
    if (typeId === 'minecraft:bell') {
        const attachment =
            blockFace === Direction.Up ? 'standing' :
                blockFace === Direction.Down ? 'hanging' : 'side'
        return BlockPermutation.resolve(typeId)
            .withState('attachment', attachment)
            .withState('direction', CARDINAL_TO_DIR[yawToCardinal(yaw)])
    }

    // slab
    if (typeId.endsWith('_slab') && !typeId.endsWith('double_slab')) {
        const half =
            blockFace === Direction.Up ? 'bottom' :
                blockFace === Direction.Down ? 'top' :
                    faceLocation.y > 0.5 ? 'top' : 'bottom'
        return BlockPermutation.resolve(typeId).withState('minecraft:vertical_half', half)
    }

    // stairs
    if (typeId.endsWith('_stairs')) {
        const weirdo = CARDINAL_TO_WEIRDO[yawToCardinal(yaw)]
        const upside =
            blockFace === Direction.Down ? true :
                blockFace === Direction.Up ? false :
                    faceLocation.y > 0.5
        return BlockPermutation.resolve(typeId)
            .withState('weirdo_direction', weirdo)
            .withState('upside_down_bit', upside)
    }

    // rails
    if (typeId.endsWith('rail')) {
        const c = yawToCardinal(yaw)
        return BlockPermutation.resolve(typeId)
            .withState('rail_direction', (c === 'north' || c === 'south') ? 1 : 0)
    }

    // dripstone
    if (typeId === 'minecraft:pointed_dripstone')
        return BlockPermutation.resolve(typeId)
            .withState('hanging', blockFace === Direction.Down)
            .withState('dripstone_thickness', 'tip')

    // vine
    if (typeId === 'minecraft:vine') {
        // bits: south=1 west=2 north=4 east=8, set the face touching the wall
        const VINE_BITS: Partial<Record<Direction, number>> = {
            [Direction.North]: 1, [Direction.South]: 4,
            [Direction.East]: 2, [Direction.West]: 8,
        }
        const bits = VINE_BITS[blockFace]
        if (bits === undefined) return undefined  // no floor/ceiling vine
        return BlockPermutation.resolve(typeId).withState('vine_direction_bits', bits)
    }

    // lichen, vein
    if (typeId === 'minecraft:glow_lichen' || typeId === 'minecraft:sculk_vein') {
        const LICHEN_BITS: Partial<Record<Direction, number>> = {
            [Direction.Up]: 1, [Direction.Down]: 2,
            [Direction.North]: 4, [Direction.South]: 16,
            [Direction.East]: 8, [Direction.West]: 32,
        }
        return BlockPermutation
            .resolve(typeId)
            .withState('multi_face_direction_bits', LICHEN_BITS[blockFace] ?? 1)
    }

    // bamboo
    if (typeId === 'minecraft:bamboo' || typeId === 'minecraft:bamboo_sapling') {
        const allowList = Object.freeze(new Set(['minecraft:bamboo', 'minecraft:bamboo_sapling']))

        const below = target.below(1)!
        if (!(below && below.hasTag('dirt') || allowList.has(below.typeId))) return undefined

        if (block.typeId === 'minecraft:bamboo' || block.typeId === 'minecraft:bamboo_sapling') {
            if (!(block.location.x === below.location.x && block.location.z === below.location.z))
                if (below.hasTag('dirt'))
                    return BlockPermutation.resolve('minecraft:bamboo_sapling')

            const belowThick = below.permutation.getState('bamboo_stalk_thickness') as string ?? 'thin'
            let thick = belowThick
            if (thick === 'thin') {
                let count = 0, cur: Block | undefined = block
                while (cur?.typeId === 'minecraft:bamboo' && count < 3) { count++; cur = cur.below() }
                if (count >= 3) thick = 'thick'
            }

            if (thick === 'thick' && belowThick === 'thin') {
                // propagate thickness downward
                system.run(() => {
                    let cur: Block | undefined = below
                    let index = 0
                    while (cur?.typeId === 'minecraft:bamboo') {
                        index++
                        const p = cur.permutation
                        if (index > 3 && p.getState('bamboo_stalk_thickness') === 'thick') break
                        cur.setPermutation(p.withState('bamboo_stalk_thickness', 'thick'))
                        cur = cur.below()
                    }
                })
            }

            return BlockPermutation.resolve('minecraft:bamboo')
                .withState('bamboo_leaf_size', thick === 'thick' ? 'large_leaves' : 'small_leaves')
                .withState('bamboo_stalk_thickness', thick)
        }

        if (block.hasTag('dirt'))
            return BlockPermutation.resolve('minecraft:bamboo_sapling')
        return undefined
    }

    // underwater
    if (typeId === 'minecraft:kelp' || typeId === 'minecraft:seagrass' || typeId === 'minecraft:sea_pickle') {
        if (!target.isLiquid) return undefined
        return BlockPermutation.resolve(typeId)
    }

    return null
}

// generic orientation resolver
export function resolveOrientedPermutation(typeId: string, blockFace: Direction, yaw: number): BlockPermutation {
    const base = BlockPermutation.resolve(typeId)

    // pillar_axis
    const axis = (blockFace === Direction.Up || blockFace === Direction.Down) ? 'y'
        : (blockFace === Direction.North || blockFace === Direction.South) ? 'z' : 'x'
    try { return base.withState('pillar_axis', axis) } catch { }

    // facing_direction
    const convention = FACING_OVERRIDE.get(typeId) ??
        (FACING_VERTICAL_ATTACH.has(typeId) ? 'vertical_attach' :
            FACING_ATTACH.has(typeId) ? 'attach' : 'flip')

    let facingDir: number
    if (convention === 'vertical_attach') {
        // floor=1 ceiling=0 sides=same
        facingDir = FACE_ATTACH_FACING[blockFace]
    } else if (convention === 'attach') {
        // observer watches where player faces
        facingDir = blockFace === Direction.Up
            ? CARDINAL_TO_FACING[yawToCardinal(yaw)]
            : FACE_ATTACH_FACING[blockFace]
    } else {
        // default: output toward player
        facingDir = flipFacing(blockFace, yaw)
    }
    try { return base.withState('facing_direction', facingDir) } catch { }

    // minecraft:cardinal_direction, FLIP
    const cardinal = FACE_CARDINAL[blockFace] !== undefined
        ? OPPOSITE[FACE_CARDINAL[blockFace]!]
        : yawToCardinal(yaw)
    try { return base.withState('minecraft:cardinal_direction', cardinal) } catch { }

    // direction, SAME (hinge/attachment direction: trapdoor, fence_gate)
    const dirCardinal = FACE_CARDINAL[blockFace]
    const dirVal = dirCardinal !== undefined
        ? CARDINAL_TO_DIR[dirCardinal]
        : CARDINAL_TO_DIR[yawToCardinal(yaw)]
    try { return base.withState('direction', dirVal) } catch { }

    return base
}