import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = __dirname

const SLABS = { // comment = mojang alr have it
    // slab: block
    'smooth_stone':                 'smooth_stone',
    'stone':                        'stone',
    'cobblestone':                  'cobblestone',
    'mossy_cobblestone':            'mossy_cobblestone',
    // 'stone_brick':               'stone_bricks',
    'mossy_stone_brick':            'mossy_stone_bricks',
    // 'sandstone':                 'sandstone',
    'cut_sandstone':                'cut_sandstone',
    'smooth_sandstone':             'smooth_sandstone',
    // 'red_sandstone':             'red_sandstone',
    'cut_red_sandstone':            'cut_red_sandstone',
    'smooth_red_sandstone':         'smooth_red_sandstone',
    'granite':                      'granite',
    'polished_granite':             'polished_granite',
    'diorite':                      'diorite',
    'polished_diorite':             'polished_diorite',
    'andesite':                     'andesite',
    'polished_andesite':            'polished_andesite',
    'brick':                        'brick_block',
    // 'nether_brick':              'nether_brick',
    'red_nether_brick':             'red_nether_brick',
    'end_stone_brick':              'end_bricks',
    // 'quartz':                    'quartz_block',
    'smooth_quartz':                'smooth_quartz',
    // 'purpur':                    'purpur_block',
    'prismarine':                   'prismarine',
    'dark_prismarine':              'dark_prismarine',
    'prismarine_brick':             'prismarine_bricks',
    'blackstone':                   'blackstone',
    // 'polished_blackstone':       'polished_blackstone',
    'polished_blackstone_brick':    'polished_blackstone_bricks',
    // 'cobbled_deepslate':         'cobbled_deepslate',
    'polished_deepslate':           'polished_deepslate',
    'deepslate_tile':               'deepslate_tiles',
    'deepslate_brick':              'deepslate_bricks',
    // 'tuff':                      'tuff',
    // 'tuff_brick':                'tuff_bricks',
    'polished_tuff':                'polished_tuff',
    'mud_brick':                    'mud_bricks',
    // 'cut_copper':                'cut_copper',
    // 'exposed_cut_copper':        'exposed_cut_copper',
    // 'weathered_cut_copper':      'weathered_cut_copper',
    // 'oxidized_cut_copper':       'oxidized_cut_copper',
    // 'waxed_cut_copper':          'waxed_cut_copper',
    // 'waxed_exposed_cut_copper':  'waxed_exposed_cut_copper',
    // 'waxed_weathered_cut_copper':'waxed_weathered_cut_copper',
    // 'waxed_oxidized_cut_copper': 'waxed_oxidized_cut_copper',
    'bamboo_mosaic':                'bamboo_mosaic',

    'oak':                          'oak_planks',
    'spruce':                       'spruce_planks',
    'birch':                        'birch_planks',
    'jungle':                       'jungle_planks',
    'acacia':                       'acacia_planks',
    'dark_oak':                     'dark_oak_planks',
    'mangrove':                     'mangrove_planks',
    'cherry':                       'cherry_planks',
    'pale_oak':                     'pale_oak_planks',
    // 'bamboo':                    'bamboo_planks',
    'crimson':                      'crimson_planks',
    'warped':                       'warped_planks',
}

const dir = path.join(ROOT, 'slabs')
fs.mkdirSync(dir, { recursive: true })

for (const [slab, result] of Object.entries(SLABS)) {
    fs.writeFileSync(
        path.join(dir, `${slab}.json`),
        JSON.stringify({
            "format_version": "1.20.10",
            "minecraft:recipe_shaped": {
                "description": { "identifier": `minecraft:${slab}_slab_to_full_block` },
                "tags": ["crafting_table"],
                "pattern": ["x", "x"],
                "key": { "x": { "item": `minecraft:${slab}_slab` } },
                "result": { "item": `minecraft:${result}`, "count": 1 },
                "unlock": [{ "item": `minecraft:${result}` }]
            }
        }, null, 4)
    )
}