export const SETTINGS = {
    DEBUG: true,
    INTERVAL_DELAY: 0, // delay for each interval
    LIGHT: {
        ENABLED: true,
        DECAY_LIGHT_TICK: 3, // before light when off time
        REDUCE_LIGHT: 0.7, // lightLevel * REDUCE_LIGHT
        LIGHT_REDUCE_LINEAR: -1,
        LIGHT_RENDER_RADIUS: 32, // max distance light render around player
        LIGHT_RENDER_PER_PLAYER: 12, // max light entity(item) render per player
        LIGHT_FIRE_LEVEL: 10, // this will be reduce by REDUCE_LIGHT
        LIGHT_WIKI: {
            // light 15
            "beacon": { light: 15 }, "campfire": { light: 15 },
            "conduit": { light: 15 }, "ochre_froglight": { light: 15 },
            "pearlescent_froglight": { light: 15 }, "verdant_froglight": { light: 15 },
            "glowstone": { light: 15 }, "lit_pumpkin": { light: 15 },
            "lantern": { light: 15 }, "lava_bucket": { light: 15 },
            "sea_lantern": { light: 15 }, "shroomlight": { light: 15 },
            "copper_lantern": { light: 15 }, "waxed_copper_lantern": { light: 15 },
            "exposed_copper_lantern": { light: 15 }, "waxed_exposed_copper_lantern": { light: 15 },
            "weathered_copper_lantern": { light: 15 }, "waxed_weathered_copper_lantern": { light: 15 },
            "oxidized_copper_lantern": { light: 15 }, "waxed_oxidized_copper_lantern": { light: 15 },

            // light 14
            "end_rod": { light: 14 }, "glow_berries": { light: 14 },
            "torch": { light: 14 }, "copper_torch": { light: 14 },

            // light 10
            "crying_obsidian": { light: 10 }, "soul_campfire": { light: 10 },
            "soul_lantern": { light: 10 }, "soul_torch": { light: 10 },

            // light 7
            "enchanting_table": { light: 7 }, "ender_chest": { light: 7 },
            "glow_lichen": { light: 7 }, "redstone_torch": { light: 7 },

            // light 6
            "sculk_catalyst": { light: 6 }, "sea_pickle": { light: 6, inLiquid: true },
            "vault": { light: 6 },

            // light 5
            "amethyst_cluster": { light: 5 },

            // light 4
            "large_amethyst_bud": { light: 4 },
            "trial_spawner": { light: 4 },

            // light 3
            "magma": { light: 3 },

            // light 2
            "medium_amethyst_bud": { light: 2 }, "firefly_bush": { light: 2 },

            // light 1
            "brewing_stand": { light: 1 }, "brown_mushroom": { light: 1 },
            "calibrated_sculk_sensor": { light: 1 }, "dragon_egg": { light: 1 },
            "end_portal_frame": { light: 1 }, "sculk_sensor": { light: 1 },
            "small_amethyst_bud": { light: 1 },
        },
        LIGHT_ENTITY: {
            "minecraft:glow_squid": { light: 10 },
            "minecraft:allay": { light: 10 },
            "minecraft:vex": { light: 10 },
            "minecraft:blaze": { light: 12 },
            "minecraft:warden": { light: 6 },
        }
    },
    REPAIR_ANVIL: {
        ENABLED: true,
        ITEM_TYPEID: 'minecraft:iron_ingot',
        REPAIR_HELD_DELAY: 7, // delay when player held press to repair anvil (ticks)
        REPAIRABLE_ANVIL: ['minecraft:damaged_anvil', 'minecraft:chipped_anvil', 'minecraft:anvil'], // last index will be unFixable
        REPAIR_SOUND: {
            ID: 'smithing_table.use',
            VOLUME: 1.0,
            PITCH: 1.0
        }
    },
    WET_POWDER_CONCRTE: {
        ENABLED: true,
        ITEM_PREFIX: "minecraft:",
        SLICE_PREFIX: "minecraft:".length, // 10
        PROCESS_DELAY: 4, // how long before item vanish (tick)
        KEEP_VELOCITY: true, // kept VELOCITY after touch water
        TYPEID_ENDSWITH: "_concrete_powder", // maybe don't touch this
        DONE_PARTICLE: "minecraft:water_evaporation_bucket_emitter",
        DONE_SOUND: {
            ID: "mob.happy_ghast.harness_unequip",
            PITCH: [1.6, 1.8],
            VOLUME: 0.8
        },
        MAX_PROCESS: 12,
        BATCH_SIZE: 12 // max entity that will get process
    },
    COMPOSTER: {
        ENABLED: true,
        BLOCK_TYPEID: "minecraft:composter",
        DELAY_BEFORE_READY: 20, // tick
        SOUND_FILL_SUCCESS: {
            ID: "block.composter.fill_success",
            VOLUME: 1.0,
            PITCH: [0.2, 0.9] // random from 0.2 to 0.9
        },
        SOUND_READY: {
            ID: "block.composter.ready",
            VOLUME: 1.0,
            PITCH: 1.0
        },
        SOUND_FILL: {
            ID: "block.composter.ready",
            VOLUME: 1.0,
            PITCH: 0.8
        },
        ITEMS: {
            // chance is max 1 (0.3, 0.5, 0.65, 0.85, 1.0)
            // smelt item +0.2(tier)

            // botany
            'minecraft:podzol': 0.3,
            'minecraft:mycelium': 0.3,
            'minecraft:rooted_dirt': 0.3,
            'minecraft:bamboo': 0.5,
            'minecraft:dead_bush': 0.5,
            'minecraft:honeycomb': 0.5,
            'minecraft:poisonous_potato': 0.65, // same as potato
            'minecraft:chorus_fruit': 0.65,
            'minecraft:resin_clump': 0.65,
            'minecraft:sugar': 0.50,
            'minecraft:lit_pumpkin': 0.65,

            // lysosome inactived
            'minecraft:rotten_flesh': 0.65,
            'minecraft:string': 0.5,
            'minecraft:web': 0.65,
            'minecraft:gunpowder': 0.65,
            'minecraft:blaze_powder': 0.5,
            'minecraft:blaze_rod': 0.85,
            'minecraft:magma_cream': 0.65,
            'minecraft:slime_ball': 0.65,
            'minecraft:ghast_tear': 0.5,
            'minecraft:fermented_spider_eye': 0.85,
            'minecraft:dried_ghast': 0.85,

            // wool
            'minecraft:black_wool': 0.85,
            'minecraft:blue_wool': 0.85,
            'minecraft:brown_wool': 0.85,
            'minecraft:cyan_wool': 0.85,
            'minecraft:gray_wool': 0.85,
            'minecraft:green_wool': 0.85,
            'minecraft:light_blue_wool': 0.85,
            'minecraft:light_gray_wool': 0.85,
            'minecraft:lime_wool': 0.85,
            'minecraft:magenta_wool': 0.85,
            'minecraft:orange_wool': 0.85,
            'minecraft:pink_wool': 0.85,
            'minecraft:red_wool': 0.85,
            'minecraft:purple_wool': 0.85,
            'minecraft:white_wool': 0.85,
            'minecraft:yellow_wool': 0.85,

            // passive mob loot
            'minecraft:chicken': 0.5,
            'minecraft:porkchop': 0.5,
            'minecraft:beef': 0.5,
            'minecraft:mutton': 0.5,
            'minecraft:rabbit': 0.5,
            'minecraft:feather': 0.5,
            'minecraft:ink_sac': 0.5,
            'minecraft:glow_ink_sac': 0.5,
            'minecraft:rabbit_hide': 0.5,
            'minecraft:rabbit_foot': 0.5,
            'minecraft:frog_spawn': 0.5,
            'minecraft:leather': 0.65,
            'minecraft:phantom_membrane': 0.65,
            'minecraft:cod': 0.5,
            'minecraft:salmon': 0.5, // referenced as grass block
            'minecraft:tropical_fish': 0.5,
            'minecraft:pufferfish': 0.5,

            // ooked
            'minecraft:cooked_chicken': 0.65,
            'minecraft:cooked_pork': 0.65,
            'minecraft:cooked_rabbit': 0.65,
            'minecraft:cooked_cod': 0.65,
            'minecraft:cooked_salmon': 0.65,
            'minecraft:cooked_salmon': 0.65,

            'minecraft:golden_carrot': 0.65,
            'minecraft:glistering_melon_slice': 0.65,
            'minecraft:popped_chorus_fruit': 0.85,
            'minecraft:suspicious_stew': 0.85,
            'minecraft:beetroot_soup': 0.85,
            'minecraft:golden_carrot': 0.85,
            'minecraft:golden_apple': 0.85,
            'minecraft:enchanted_golden_apple': 1,
            'minecraft:rabbit_stew': 1,
            'minecraft:nether_star': 1,
        }
    }
}