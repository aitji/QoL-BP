export const SETTINGS = Object.freeze({
    DEBUG: true,
    DISABLED_COMMANDFEEDBACK: false,
    DISABLED_HEARTBEAT: false,
    INTERVAL_DELAY: 1, // delay for each interval
    SLICE_PREFIX: "minecraft:".length, // 10
    BLOCKFACE_TO_DIR: Object.freeze({
        Up: 'above',
        Down: 'below',
        North: 'north',
        South: 'south',
        East: 'east',
        West: 'west',
    }),

    LIGHT: Object.freeze({
        ENABLED: true,
        DECAY_LIGHT_TICK: 3, // before light when off time
        REDUCE_LIGHT: 7, // lightLevel * REDUCE_LIGHT
        LIGHT_REDUCE_LINEAR: 2,
        LIGHT_RENDER_RADIUS: 32, // max distance light render around player
        LIGHT_RENDER_PER_PLAYER: 12, // max light entity(item) render per player
        LIGHT_FIRE_LEVEL: 10, // this will be reduce by REDUCE_LIGHT
        FAIL_SOUND_INTERVAL: 30,
        FAIL_PARTICLE: "minecraft:water_evaporation_bucket_emitter",
        SOUND_FAIL: Object.freeze({
            ID: "cauldron_drip.water.pointed_dripstone",
            VOLUME: 1,
            PITCH: Object.freeze([0.8, 1.0])
        }),
        PARTICLE_OFFSET: Object.freeze({ x: -.5, y: 0, z: -.5 }),

        // vanilla bug patched ---
        /** @type {Readonly<{[k: string]: Readonly<{asBlock: string; pot: string}>}>} */
        SEEDTOBLOCK: Object.freeze({
            'minecraft:wheat_seeds': Object.freeze({ asBlock: 'minecraft:wheat', pot: 'minecraft:farmland', sound: 'nature' }),
            'minecraft:carrot': Object.freeze({ asBlock: 'minecraft:carrots', pot: 'minecraft:farmland', sound: 'nature' }),
            'minecraft:potato': Object.freeze({ asBlock: 'minecraft:potatoes', pot: 'minecraft:farmland', sound: 'nature' }),
            'minecraft:beetroot_seeds': Object.freeze({ asBlock: 'minecraft:beetroot', pot: 'minecraft:farmland', sound: 'nature' }),
            'minecraft:nether_wart': Object.freeze({ asBlock: 'minecraft:nether_wart', pot: 'minecraft:soul_sand', sound: 'nether' }),
        }),
        FARMLAND_BLOCK: Object.freeze({ 'minecraft:farmland': true, 'minecraft:soul_sand': true }),
        SOUND_SHOVEL_USE: Object.freeze({
            ID: "use.grass",
            VOLUME: 1.0,
            PITCH: 0.8
        }),
        SOUND_HOE_USE: Object.freeze({
            ID: "use.gravel",
            VOLUME: 1.0,
            PITCH: 0.8
        }),
        BLOCK_INTERACTION_DELAY: 4, // tick
        FIRE_ITEM: Object.freeze({
            "minecraft:flint_and_steel": Object.freeze({
                ID: "fire.ignite",
                VOLUME: 1.0,
                PITCH: [0.8, 1.2]
            }),
            "minecraft:fire_charge": Object.freeze({
                ID: "mob.ghast.fireball",
                VOLUME: 1.0,
                PITCH: 1.0,
                REDUCE_ITEM: true
            }),
        }),
        // ---
        LIGHT_WIKI: Object.freeze({
            // light 15
            "beacon": Object.freeze({ light: 15 }), "campfire": Object.freeze({ light: 15, inLiquid: false }),
            "conduit": Object.freeze({ light: 15 }), "ochre_froglight": Object.freeze({ light: 15 }),
            "pearlescent_froglight": Object.freeze({ light: 15 }), "verdant_froglight": Object.freeze({ light: 15 }),
            "glowstone": Object.freeze({ light: 15 }), "lit_pumpkin": Object.freeze({ light: 15 }),
            "lantern": Object.freeze({ light: 15, inLiquid: false }), "lava_bucket": Object.freeze({ light: 15, inLiquid: false }),
            "sea_lantern": Object.freeze({ light: 15 }), "shroomlight": Object.freeze({ light: 15 }),
            "copper_lantern": Object.freeze({ light: 15, inLiquid: false }), "waxed_copper_lantern": Object.freeze({ light: 15, inLiquid: false }),
            "exposed_copper_lantern": Object.freeze({ light: 15, inLiquid: false }), "waxed_exposed_copper_lantern": Object.freeze({ light: 15, inLiquid: false }),
            "weathered_copper_lantern": Object.freeze({ light: 15, inLiquid: false }), "waxed_weathered_copper_lantern": Object.freeze({ light: 15, inLiquid: false }),
            "oxidized_copper_lantern": Object.freeze({ light: 15, inLiquid: false }), "waxed_oxidized_copper_lantern": Object.freeze({ light: 15, inLiquid: false }),

            // light 14
            "end_rod": Object.freeze({ light: 14 }), "glow_berries": Object.freeze({ light: 14 }),
            "torch": Object.freeze({ light: 14, inLiquid: false }), "copper_torch": Object.freeze({ light: 14, inLiquid: false }),

            // light 10
            "crying_obsidian": Object.freeze({ light: 10 }), "soul_campfire": Object.freeze({ light: 10, inLiquid: false }),
            "soul_lantern": Object.freeze({ light: 10, inLiquid: false }), "soul_torch": Object.freeze({ light: 10, inLiquid: false }),

            // light 7
            "enchanting_table": Object.freeze({ light: 7 }), "ender_chest": Object.freeze({ light: 7 }),
            "glow_lichen": Object.freeze({ light: 7 }), "redstone_torch": Object.freeze({ light: 7, inLiquid: false }),

            // light 6
            "sculk_catalyst": Object.freeze({ light: 6 }), "sea_pickle": Object.freeze({ light: 6, inLiquid: true }),
            "vault": Object.freeze({ light: 6 }),

            // light 5
            "amethyst_cluster": Object.freeze({ light: 5 }),

            // light 4
            "large_amethyst_bud": Object.freeze({ light: 4 }),
            "trial_spawner": Object.freeze({ light: 4 }),

            // light 3
            "magma": Object.freeze({ light: 3 }),

            // light 2
            "medium_amethyst_bud": Object.freeze({ light: 2 }), "firefly_bush": Object.freeze({ light: 2 }),

            // light 1
            "brewing_stand": Object.freeze({ light: 1 }), "brown_mushroom": Object.freeze({ light: 1 }),
            "calibrated_sculk_sensor": Object.freeze({ light: 1 }), "dragon_egg": Object.freeze({ light: 1 }),
            "end_portal_frame": Object.freeze({ light: 1 }), "sculk_sensor": Object.freeze({ light: 1 }),
            "small_amethyst_bud": Object.freeze({ light: 1 }),
        }),
        LIGHT_ENTITY: Object.freeze({
            "minecraft:glow_squid": Object.freeze({ light: 10 }),
            "minecraft:allay": Object.freeze({ light: 10 }),
            "minecraft:vex": Object.freeze({ light: 10 }),
            "minecraft:blaze": Object.freeze({ light: 12 }),
            "minecraft:warden": Object.freeze({ light: 6 }),
        })
    }),
    REPAIR_ANVIL: Object.freeze({
        ENABLED: true,
        ITEM_TYPEID: 'minecraft:iron_ingot',
        REPAIR_HELD_DELAY: 7, // delay when player held press to repair anvil (ticks)
        REPAIRABLE_ANVIL: Object.freeze({
            'minecraft:damaged_anvil': 'minecraft:chipped_anvil',
            'minecraft:chipped_anvil': 'minecraft:anvil',
            'minecraft:anvil': null
        }), // last index will be unFixable
        REPAIR_SOUND: Object.freeze({
            ID: 'smithing_table.use',
            VOLUME: 1.0,
            PITCH: 1.0
        })
    }),
    WET_POWDER_CONCRETE: Object.freeze({
        ENABLED: true,
        ITEM_PREFIX: "minecraft:",
        PROCESS_DELAY: 4, // how long before item vanish (tick)
        KEEP_VELOCITY: true, // kept VELOCITY after touch water
        SLOW_BASE: 60,
        SLOW_MULTIPLIER: 10,
        TYPEID_ENDSWITH: "_concrete_powder", // maybe don't touch this
        DONE_PARTICLE: "minecraft:water_evaporation_bucket_emitter",
        DONE_SOUND: Object.freeze({
            ID: "mob.happy_ghast.harness_unequip",
            PITCH: Object.freeze([1.6, 1.8]),
            VOLUME: 0.8
        }),
        MAX_PROCESS: 12,
        BATCH_SIZE: 12 // max entity that will get process
    }),
    COMPOSTER: Object.freeze({
        ENABLED: true,
        WORK_WITH_HOPPER: true, // this might slow down the game when have too many...
        HOPPER_INTERVAL_TICK: 8, // tick
        HOPPER_TYPEID: "minecraft:hopper",
        BLOCK_TYPEID: "minecraft:composter",
        DELAY_BEFORE_READY: 17, // tick
        DATA_LOSS_DYP: "qof.composter.timeout",
        DATA_COMPOSTER_LOCATION: "qof:composterSet", // for hopper
        PARTICLE_FILL_SUCCESS: "minecraft:crop_growth_emitter",
        SOUND_FILL_SUCCESS: Object.freeze({
            ID: "block.composter.fill_success",
            VOLUME: 1.3,
            PITCH: 1.0 // random from 0.2 to 0.9
        }),
        SOUND_FILL_BONEMEAL: Object.freeze({
            ID: "item.bone_meal.use",
            VOLUME: 2.0,
            PITCH: Object.freeze([0.9, 1.1])
        }),
        SOUND_READY: Object.freeze({
            ID: "block.composter.ready",
            VOLUME: 1.0,
            PITCH: 1.0
        }),
        SOUND_FILL: Object.freeze({
            ID: "block.composter.fill",
            VOLUME: 1.3,
            PITCH: 0.8
        }),
        /*VANILA_COMPOSTE: Object.freeze(new Set([
            // 30%
            "minecraft:beetroot_seeds",
            "minecraft:bush",
            "minecraft:cactus_flower",
            "minecraft:dried_kelp",
            "minecraft:firefly_bush",
            "minecraft:grass_block",
            "minecraft:glow_berries",
            "minecraft:hanging_roots",
            "minecraft:kelp",
            "minecraft:acacia_leaves",
            "minecraft:azalea_leaves",
            "minecraft:birch_leaves",
            "minecraft:cherry_leaves",
            "minecraft:dark_oak_leaves",
            "minecraft:jungle_leaves",
            "minecraft:mangrove_leaves",
            "minecraft:oak_leaves",
            "minecraft:spruce_leaves",
            "minecraft:leaf_litter",
            "minecraft:mangrove_propagule",
            "minecraft:mangrove_roots",
            "minecraft:melon_seeds",
            "minecraft:moss_carpet",
            "minecraft:pale_hanging_moss",
            "minecraft:pale_moss_carpet",
            "minecraft:pink_petals",
            "minecraft:pitcher_pod",
            "minecraft:pumpkin_seeds",
            "minecraft:acacia_sapling",
            "minecraft:birch_sapling",
            "minecraft:cherry_sapling",
            "minecraft:dark_oak_sapling",
            "minecraft:jungle_sapling",
            "minecraft:oak_sapling",
            "minecraft:pale_oak_sapling",
            "minecraft:spruce_sapling",
            "minecraft:seagrass",
            "minecraft:short_grass",
            "minecraft:short_dry_grass",
            "minecraft:small_dripleaf_block",
            "minecraft:sweet_berries",
            "minecraft:tall_dry_grass",
            "minecraft:torchflower_seeds",
            "minecraft:wheat_seeds",
            "minecraft:wildflowers",

            // 50%
            "minecraft:cactus",
            "minecraft:dried_kelp_block",
            "minecraft:azalea_leaves_flowered",
            "minecraft:glow_lichen",
            "minecraft:melon_slice",
            "minecraft:nether_sprouts",
            "minecraft:sugar_cane",
            "minecraft:tall_grass",
            "minecraft:twisting_vines",
            "minecraft:vines",
            "minecraft:weeping_vines",

            // 65%
            "minecraft:apple",
            "minecraft:azalea",
            "minecraft:beetroot",
            "minecraft:big_dripleaf",
            "minecraft:carrot",
            "minecraft:cocoa_beans",
            "minecraft:fern",
            "minecraft:allium",
            "minecraft:azure_bluet",
            "minecraft:blue_orchid",
            "minecraft:cornflower",
            "minecraft:dandelion",
            "minecraft:closed_eyeblossom",
            "minecraft:open_eyeblossom",
            "minecraft:golden_dandelion",
            "minecraft:lily_of_the_valley",
            "minecraft:oxeye_daisy",
            "minecraft:poppy",
            "minecraft:orange_tulip",
            "minecraft:pink_tulip",
            "minecraft:red_tulip",
            "minecraft:white_tulip",
            "minecraft:wither_rose",
            "minecraft:lilac",
            "minecraft:peony",
            "minecraft:rose_bush",
            "minecraft:sunflower",
            "minecraft:chorus_flower",
            "minecraft:spore_blossom",
            "minecraft:large_fern",
            "minecraft:waterlily",
            "minecraft:melon",
            "minecraft:melon_block",
            "minecraft:moss_block",
            "minecraft:brown_mushroom",
            "minecraft:red_mushroom",
            "minecraft:mushroom_stem",
            "minecraft:crimson_fungus",
            "minecraft:warped_fungus",
            "minecraft:nether_wart",
            "minecraft:pale_moss_block",
            "minecraft:potato",
            "minecraft:pumpkin",
            "minecraft:carved_pumpkin",
            "minecraft:crimson_roots",
            "minecraft:warped_roots",
            "minecraft:sea_pickle",
            "minecraft:shroomlight",
            "minecraft:spore_blossom",
            "minecraft:wheat",

            // 85%
            "minecraft:baked_potato",
            "minecraft:bread",
            "minecraft:cookie",
            "minecraft:flowering_azalea",
            "minecraft:hay_bale",
            "minecraft:brown_mushroom_block",
            "minecraft:red_mushroom_block",
            "minecraft:nether_wart_block",
            "minecraft:warped_wart_block",
            "minecraft:pitcher_plant",
            "minecraft:torchflower",

            // 100%
            "minecraft:cake",
            "minecraft:pumpkin_pie",
        ])),*/ // didn't use anymore
        ITEMS: Object.freeze({
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
            'minecraft:salmon': 0.5,
            'minecraft:tropical_fish': 0.5,
            'minecraft:pufferfish': 0.5,

            // ooked (or cooked)
            'minecraft:cooked_chicken': 0.65,
            'minecraft:cooked_porkchop': 0.65,
            'minecraft:cooked_beef': 0.65,
            'minecraft:cooked_mutton': 0.65,
            'minecraft:cooked_rabbit': 0.65,
            'minecraft:cooked_cod': 0.65,
            'minecraft:cooked_salmon': 0.65,

            'minecraft:golden_carrot': 0.65,
            'minecraft:glistering_melon_slice': 0.65,
            'minecraft:popped_chorus_fruit': 0.85,
            'minecraft:mushroom_stew': 0.85,
            'minecraft:suspicious_stew': 0.85,
            'minecraft:beetroot_soup': 0.85,
            'minecraft:golden_apple': 0.85,
            'minecraft:enchanted_golden_apple': 1,
            'minecraft:rabbit_stew': 1,
            'minecraft:nether_star': 1,
        })
    }),
    CARRIED_CHEST: Object.freeze({
        ENABLED: true,
        CARRY_TAG: "carrying",
        MAX_DISPLAY: 5,
        APPLY_IMPULSE: Object.freeze({ // only apply via player in water *won't effect [creative] gamemode
            ENABLED: true,
            VECTOR: Object.freeze({ x: 0, y: -0.008, z: 0 }) // if posstive will make player swim up easier
        }),
        PLAYER_JUMP: Object.freeze({
            NO_JUMP_HOLD_CHEST: false, // lock player from jumpping when holding chest
            ALLOW_JUMP_IN_WATER: true,
            ALLOW_JUMP_IN_LAVA: true,
            ALLOW_JUMP_IN_SCAFFOLDING: true,
            ALLOW_JUMP_IN_LADDER: true
        }),
        ENTITY_TYPE: "qof:chest",
        CHEST_ID: "minecraft:chest",
        CONTAINER_NAMETAG: "§r§fCarried Container",
        DOUBLE_CHEST_SIZE: 54, // don't edit
        SLOWNESS_DURATION: .5 * 20, // player holding chest will apply slowness effect how long? (tick)
        SLOWNESS_AMPLIFIER: 2, // level of slowness when player holding chest
        SOUND_PICK_UP: Object.freeze({
            ID: "armor.equip_leather",
            VOLUME: 1.0,
            PITCH: 0.8
        })
    }),
    OFFHAND: Object.freeze({
        ENABLED: true,
        DOUBLE_SNEAK_WINDOW_MOBILE: 20,
        DOUBLE_SNEAK_WINDOW_CONSOLE: 16,
        DOUBLE_SNEAK_WINDOW_DEFAULT: 12,
        FACE_TO_TORCH_DIR: Object.freeze({
            Up: 'top',
            Down: 'top',
            North: 'south',
            South: 'north',
            East: 'west',
            West: 'east',
        }),
        FACE_TO_NEIGHBOUR: Object.freeze({
            Up: (b) => b.above(),
            Down: (b) => b.below(),
            North: (b) => b.north(),
            South: (b) => b.south(),
            East: (b) => b.east(),
            West: (b) => b.west(),
        }),
        ALLOW_REPLACE: Object.freeze({
            'minecraft:short_grass': true,
            'minecraft:short_dry_grass': true,
            'minecraft:bush': true,
            'minecraft:deadbush': true,
            'minecraft:fern': true,
            'minecraft:nether_sprouts': true,
            'minecraft:vine': true,
            'minecraft:glow_lichen': true,

            // 2 block tall need neig check
            'minecraft:tall_grass': false,
            'minecraft:large_fern': false,
        }),
        NEED_SNEAK: Object.freeze({ // o(1) search
            'minecraft:crafting_table': true,
            'minecraft:crafter': true,
            'minecraft:barrel': true,
            'minecraft:furnace': true,
            'minecraft:lit_furnace': true,
            'minecraft:blast_furnace': true,
            'minecraft:lit_blast_furnace': true,
            'minecraft:smoker': true,
            'minecraft:lit_smoker': true,
            'minecraft:smithing_table': true,
            'minecraft:noteblock': true,
            // dev
            'minecraft:command_block': true,
            'minecraft:chain_command_block': true,
            'minecraft:repeating_command_block': true,
        }),
        TORCH_ID: Object.freeze({
            "minecraft:torch": true,
            "minecraft:redstone_torch": true,
            "minecraft:copper_torch": true,
            "minecraft:soul_torch": true
        }),

        DISALLOWED_ITEM: Object.freeze(new Set([
            // bundle
            'minecraft:bundle',
            'minecraft:black_bundle',
            'minecraft:blue_bundle',
            'minecraft:brown_bundle',
            'minecraft:cyan_bundle',
            'minecraft:gray_bundle',
            'minecraft:green_bundle',
            'minecraft:light_blue_bundle',
            'minecraft:light_gray_bundle',
            'minecraft:lime_bundle',
            'minecraft:magenta_bundle',
            'minecraft:orange_bundle',
            'minecraft:pink_bundle',
            'minecraft:red_bundle',
            'minecraft:purple_bundle',
            'minecraft:white_bundle',
            'minecraft:yellow_bundle',
        
            // shulker_box
            'minecraft:undyed_shulker_box',
            'minecraft:black_shulker_box',
            'minecraft:blue_shulker_box',
            'minecraft:brown_shulker_box',
            'minecraft:cyan_shulker_box',
            'minecraft:gray_shulker_box',
            'minecraft:green_shulker_box',
            'minecraft:light_blue_shulker_box',
            'minecraft:light_gray_shulker_box',
            'minecraft:lime_shulker_box',
            'minecraft:magenta_shulker_box',
            'minecraft:orange_shulker_box',
            'minecraft:pink_shulker_box',
            'minecraft:red_shulker_box',
            'minecraft:purple_shulker_box',
            'minecraft:white_shulker_box',
            'minecraft:yellow_shulker_box',
        
            // potions
            'minecraft:potion',
            'minecraft:lingering_potion',
            'minecraft:splash_potion',
            'minecraft:ominous_bottle',
        
            // dyeable leathers
            'minecraft:leather_horse_armor',
            'minecraft:leather_helmet',
            'minecraft:leather_chestplate',
            'minecraft:leather_leggings',
            'minecraft:leather_boots',
            'minecraft:wolf_armor',

            // fish in bucket (size&color))
            "minecraft:axolotl_bucket",
            "minecraft:cod_bucket",
            "minecraft:pufferfish_bucket",
            "minecraft:salmon_bucket",
            "minecraft:tadpole_bucket",
            "minecraft:tropical_fish_bucket",

            // bee
            "minecraft:bee_nest",
            "minecraft:beehive",

            // others
            'minecraft:arrow', // tripped arrow, sadly this inculding the normal arrow too
            'minecraft:banner',
            'minecraft:bed',
            'minecraft:goat_horn',
            'minecraft:suspicious_stew',
            'minecraft:bow',
            'minecraft:crossbow', // will lost arrow if swap
            // 'minecraft:enchanted_book', // alr have enchant
            'minecraft:fishing_rod',
            'minecraft:firework_rocket',
            'minecraft:firework_star',
            'minecraft:shield', // banner can be put on a shield
            "minecraft:filled_map",
            "minecraft:empty_map", // empty locator map will lost

            // dev
            "minecraft:command_block",
            "minecraft:chain_command_block",
            "minecraft:repeating_command_block",
        ])),
        LIGHT: 'qof:light_block',
        LIGHT_DEV: 'qof:light_block_dev',
        PLACE_SOUND: Object.freeze({
            ID: "dig.wood", // new version might be chnage to "place.wood"
            VOLUME: 1.0,
            PITCH: 0.8
        }),
        BLOCK_INTERACTION_DELAY: 4, // tick
        ITEMBUTBLOCK: Object.freeze({
            "minecraft:water_bucket": true,
            "minecraft:axolotl_bucket": true,
            "minecraft:cod_bucket": true,
            "minecraft:lava_bucket": true,
            "minecraft:powder_snow_bucket": true,
            "minecraft:pufferfish_bucket": true,
            "minecraft:salmon_bucket": true,
            "minecraft:tadpole_bucket": true,
            "minecraft:tropical_fish_bucket": true,
            "minecraft:bucket": true,

            "minecraft:redstone": true,
            "minecraft:redstone_torch": true,
        })
    }),
    HARVEST: Object.freeze({
        ENABLED: true,
        LOSS_SEED: true,
        DURABILITY: true,

        PLANT_LEVEL: Object.freeze({
            "minecraft:wheat": Object.freeze({ level: 7, seed: "minecraft:wheat_seeds" }),
            "minecraft:carrots": Object.freeze({ level: 7, seed: "minecraft:carrot" }),
            "minecraft:potatoes": Object.freeze({ level: 7, seed: "minecraft:potato" }),
            "minecraft:beetroot": Object.freeze({ level: 7, seed: "minecraft:beetroot_seeds" }),
            "minecraft:nether_wart": Object.freeze({ level: 3, seed: "minecraft:nether_wart" }),
        }),
    })
})