# QoF – Quality of Feature

> [!NOTE]
> A Minecraft Bedrock addon that adds small vanilla-friendly features. Each module is configurable through the in-game pack settings panel. Requires **BetaAPIs** enabled under Experiments.

## Table of Contents

- [QoF – Quality of Feature](#qof--quality-of-feature)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Changelog](#changelog)
  - [Installation](#installation)
  - [Modules](#modules)
    - [Double Door](#double-door)
    - [Dynamic Light](#dynamic-light)
    - [Anvil Repairing](#anvil-repairing)
      - [Full Repairing Loop](#full-repairing-loop)
    - [Wet Concrete Powder](#wet-concrete-powder)
      - [Conversion In Action](#conversion-in-action)
    - [Composter+](#composter)
      - [Hopper Integration](#hopper-integration)
      - [Stew \& Soup Bowl Returning](#stew--soup-bowl-returning)
    - [Carrying Container](#carrying-container)
      - [Slowness and Double Chest](#slowness-and-double-chest)
    - [Offhand](#offhand)
      - [Swap and Torch Placement](#swap-and-torch-placement)
    - [Harvest](#harvest)
    - [Mob Loot+](#mob-loot)
    - [Recipe+](#recipe)
      - [Recipe Showcase](#recipe-showcase)
  - [Configuration References](#configuration-references)
  - [Known Limitations \& Notes](#known-limitations--notes)
  - [License](#license)
  - [Disclosure](#disclosure)
  - [Credits](#credits)

## Overview

- [x] Dynamic lighting
- [x] Open adjacent doors automatically with a single interaction
- [x] Repair damaged anvils
- [x] Concrete powder hardens when it touches water as an item entity
- [x] Composter accepts more items
- [x] Pick up and carry containers while preserving their contents
- [x] Swap mainhand and offhand with a double sneak, place torches and plant seeds from the offhand
- [x] Hold harvest crops with automatic seed replanting with Hoe, supports Cocoa Bean and offhand seed priority
- [x] Extra mob drops
- [x] Extra crafting and smelting recipes
- [ ] And many more to come later

## Changelog

- QoF v1.5.0 `in development`
  - `Pre-Releases` Qof [v1.4.1](https://github.com/aitji/QoF/releases/tag/v1.4.1)
- QoF [v1.4.0](https://github.com/aitji/QoF/releases/tag/v1.4.0)
  - `Pre-Releases` Qof [v1.3.4](https://github.com/aitji/QoF/releases/tag/v1.3.4)
  - `Pre-Releases` Qof [v1.3.3](https://github.com/aitji/QoF/releases/tag/v1.3.3)
  - `Pre-Releases` Qof [v1.3.2](https://github.com/aitji/QoF/releases/tag/v1.3.2)
  - `Pre-Releases` Qof [v1.3.1](https://github.com/aitji/QoF/releases/tag/v1.3.1)
- QoF [v1.3.0](https://github.com/aitji/QoF/releases/tag/v1.3.0)
  - `Pre-Releases` QoF [v1.2.3](https://github.com/aitji/QoF/releases/tag/v1.2.3)
  - `Pre-Releases` QoF [v1.2.2](https://github.com/aitji/QoF/releases/tag/v1.2.2)
  - `Pre-Releases` QoF [v1.2.1](https://github.com/aitji/QoF/releases/tag/v1.2.1)
- QoF [v1.2.0](https://github.com/aitji/QoF/releases/tag/v1.2.0)
  - `Pre-Releases` QoF [v1.1.1](https://github.com/aitji/QoF/releases/tag/v1.1.1)
- QoF [v1.1.0](https://github.com/aitji/QoF/releases/tag/v1.1.0)

## Installation

Download the `QoF` addon from one of these sources:

- GitHub: https://github.com/aitji/QoF/releases
- CurseForge: https://www.curseforge.com/minecraft-bedrock/addons/quality-of-feature
- MCPEDL: https://mcpedl.com/quality-of-feature

1. Download the latest `.mcaddon` file from the releases page.
2. Open the file, Minecraft will automatically import the addon.
3. Open or create a world.
4. Go to **Behavior Packs** and activate **QoF**.
5. In **Experiments**, enable **Beta APIs**.
6. Configure settings in the pack settings panel inside the world settings.

> [!IMPORTANT]
> **Beta APIs must be enabled**, otherwise the pack will not function.

## Modules

### Double Door

<div align="center">
  <img src=".github/img/v1.4.0/doubledoor.gif" alt="Double door opening both sides simultaneously" width="1080">
</div>

Interacting with one door automatically opens or closes the adjacent door at the same time. Works with all door types, keeping paired doors in sync without any extra input.

### Dynamic Light

<p align="center">
  <img src=".github/img/light.png" alt="Dynamic Light night walk with soul lantern" width="1080">
</p>

Held and dropped items emit light based on their type. The light smoothly fades after the source moves away or is removed. `burning entities`, `glowing entities` and `item frames` also emit light based on what they contain. Dynamic lights are processed using a **round-robin batch system** for better overall performance and exist only in memory no dynamic properties are used.

**How It Works:**

<img src=".github/img/light-fade.gif" alt="Player picks up soul lantern in mushroom cave, light fades after drop" width="1080">

> **alt-message** In a mushroom cave, a soul lantern sits on the ground emitting light. The player walks in from the right, picks it up, and the room goes dark. And then drops it back in the same spot and walks away.
>
> - When a player holds or drops a light-emitting item, a `qof:light_block` is placed at the relevant position each tick.
> - When the source is gone, the light level decreases linearly each tick until it reaches zero, then the block is restored to air or water.

<img src=".github/img/light-fire.gif" alt="Player shoots flame arrows into targets, picks up arrow, walks away" width="1080">

> **alt-message** A flaming arrow is fired into a target block. While the arrow is burning, it emits light. The player walks through the lit area, picks the arrow up, and leaves. Light disappears when the source is gone.
>
> - Nearby glowing or burning entities also emit light passively.

<img src=".github/img/light-water.gif" alt="Player holds conduit while swimming in ocean, light visible underwater" width="1080">

> **alt-message** In the open ocean, the player rows a boat while holding a lantern, making the water surface glow below. They stop, jump in, switch to a conduit, and swim deeper. The `qof:light_block` is placed inside the water itself, illuminating the seafloor and kelp.
>
> - Some items are prevented from emitting light underwater.

<div align="center">

| Item               | Reaction                        | Level |
| ------------------ | ------------------------------- | ----- |
| Campfire           | Won't emit light underwater     | 15    |
| Lantern            | Won't emit light underwater     | 15    |
| Lava Bucket        | Won't emit light underwater     | 15    |
| All Copper Lantern | Won't emit light underwater     | 15    |
|                    |                                 | <br>  |
| Torch              | Won't emit light underwater     | 14    |
| Copper Torch       | Won't emit light underwater     | 14    |
|                    |                                 | <br>  |
| Soul Campfire      | Won't emit light underwater     | 10    |
| Soul Lantern       | Won't emit light underwater     | 10    |
| Soul Torch         | Won't emit light underwater     | 10    |
|                    |                                 | <br>  |
| Redstone Torch     | Won't emit light underwater     | 7     |
|                    |                                 | <br>  |
| Sea Pickle         | **Only** emits light underwater | 6     |

</div>

<details>
  <summary><strong>Items That Emit Light</strong></summary>
  <div align="center">

| Item                           | Light Level                               |
| ------------------------------ | ----------------------------------------- |
|                                | <div align="center"><b>Level 15</b></div> |
| Beacon                         | 15                                        |
| Campfire                       | 15                                        |
| Conduit                        | 15                                        |
| Ochre Froglight                | 15                                        |
| Pearlescent Froglight          | 15                                        |
| Verdant Froglight              | 15                                        |
| Glowstone                      | 15                                        |
| Lit Pumpkin                    | 15                                        |
| Lantern                        | 15                                        |
| Lava Bucket                    | 15                                        |
| Sea Lantern                    | 15                                        |
| ShroomLight                    | 15                                        |
| Copper Lantern                 | 15                                        |
| Waxed Copper Lantern           | 15                                        |
| Exposed Copper Lantern         | 15                                        |
| Waxed Exposed Copper Lantern   | 15                                        |
| Weathered Copper Lantern       | 15                                        |
| Waxed Weathered Copper Lantern | 15                                        |
| Oxidized Copper Lantern        | 15                                        |
| Waxed Oxidized Copper Lantern  | 15                                        |
|                                | <div align="center"><b>Level 14</b></div> |
| End Rod                        | 14                                        |
| Glow Berries                   | 14                                        |
| Torch                          | 14                                        |
| Copper Torch                   | 14                                        |
|                                | <div align="center"><b>Level 10</b></div> |
| Crying Obsidian                | 10                                        |
| Soul Campfire                  | 10                                        |
| Soul Lantern                   | 10                                        |
| Soul Torch                     | 10                                        |
|                                | <div align="center"><b>Level 7</b></div>  |
| Enchanting Table               | 7                                         |
| Ender Chest                    | 7                                         |
| Glow Lichen                    | 7                                         |
| Redstone Torch                 | 7                                         |
|                                | <div align="center"><b>Level 6</b></div>  |
| Sculk Catalyst                 | 6                                         |
| Sea Pickle                     | 6                                         |
| Vault                          | 6                                         |
|                                | <div align="center"><b>Level 5</b></div>  |
| Amethyst Cluster               | 5                                         |
|                                | <div align="center"><b>Level 4</b></div>  |
| Large Amethyst Bud             | 4                                         |
| Trial Spawner                  | 4                                         |
|                                | <div align="center"><b>Level 3</b></div>  |
| Magma                          | 3                                         |
|                                | <div align="center"><b>Level 2</b></div>  |
| Medium Amethyst Bud            | 2                                         |
| Firefly Bush                   | 2                                         |
|                                | <div align="center"><b>Level 1</b></div>  |
| Brewing Stand                  | 1                                         |
| Brown Mushroom                 | 1                                         |
| Calibrated Sculk Sensor        | 1                                         |
| Dragon Egg                     | 1                                         |
| End Portal Frame               | 1                                         |
| Sculk Sensor                   | 1                                         |
| Small Amethyst Bud             | 1                                         |

</div>
</details>

<details>
  <summary><strong>Entities That Emit The Light</strong></summary>
  <div align="center">

| Entity     | Light Level |
| ---------- | ----------- |
| Glow Squid | 10          |
| Allay      | 10          |
| Vex        | 10          |
| Blaze      | 12          |
| Warden     | 6           |

</div>
</details>

### Anvil Repairing

<p align="center">
  <img src=".github/img/anvil-repair.png" alt="Anvil Repair repairing at a chipped anvil in a spruce house" width="1080">
</p>

Damaged anvils can be repaired by interacting with them while holding an iron ingot. The anvil steps up one stage per ingot consumed.

**Repair chain:**

```
Damaged Anvil  ->  Chipped Anvil  ->  Anvil
```

#### Full Repairing Loop

<img src="https://github.com/aitji/QoF/blob/behavior_packs/.github/img/repair-anvil.gif?raw=true" alt="Player repairs anvil twice, mines it, places damaged one, and walks out" width="1080">

> **alt-message** The player walks into a cozy spruce house, repairs a damaged anvil twice to bring it back to full, mines it with an iron pickaxe, places a new damaged anvil, and walks out.

> [!TIP]
> Hold the interact button to repair continuously. A short delay between repairs is applied to prevent accidental over-use.

<details>
  <summary><strong>Repairing Item & Cost</strong></summary>

| Input         | Cost          | Output         |
| ------------- | ------------- | -------------- |
| Damaged Anvil | 1x Iron_ingot | chipped_anvil  |
| chipped_anvil | 1x iron_ingot | anvil          |
| anvil         |               | not repairable |

</details>

### Wet Concrete Powder

Concrete powder items automatically convert to concrete when they enter water. The conversion happens after a short delay that scales with the stack size, and the resulting concrete item inherits the original velocity.

**How It Works:**

1. When a concrete powder item entity spawns, QoF begins tracking it.
2. Once the item enters water, a timer starts. Larger stacks wait slightly longer.
3. After the timer expires, the powder entity is removed and a concrete item entity is spawned in its place.
4. A particle and sound effect play on conversion.

The delay formula is:

$$ \text{DELAY} = BASE + \lfloor \sqrt{item_amount - 1} \cdot MULTIPLIER \rfloor $$

where `BASE` and `MULTIPLIER` are configurable in pack settings.

#### Conversion In Action

<img src=".github/img/powder-result.gif" alt="Top-down view: player throws concrete powder into water pool, allay nearby, powder converts to concrete" width="1080">

> **alt-message** Top-down view centered on a water pool with an allay floating nearby emitting soft light. The player walks in from the bottom-center and throws concrete powder into the pool. After a short delay the powder converts, and the player picks up the resulting concrete and walks off.

### Composter+

Expands the composter to accept many more item types not supported in vanilla, including mob drops, food, wool, and various materials.

**How It Works:**

1. Player interaction with supported items triggers compost fill with a per-item success chance.
2. On reaching level 7, a short delay passes before the composter becomes ready (level 8).
3. Hoppers check for composting items on a configurable interval and process one item per check.

#### Hopper Integration

<img src=".github/img/composter-work_hopper.gif" alt="Player composts string, places hopper on top, throws rotten flesh in, composter fills automatically" width="1080">

> **alt-message** The player manually composts some string _`(not in the vanilla list)`_, then places a hopper above the composter and throws in rotten flesh _`(also not in the vanilla list)`_. The hopper feeds the composter automatically until it fills and becomes ready.

#### Stew & Soup Bowl Returning

<img src=".github/img/composter-stew.gif" alt="Player composts stew and soup items, receives empty bowls back" width="1080">

> **alt-message** Stew and soup items are composted one by one. After each is consumed, an empty bowl is returned in player hand matching the vanilla eating behavior.

> [!WARNING]
> Enabling hopper integration with many composters and hoppers in a loaded area may affect performance. Tune the hopper interval setting if needed.

<details>
  <summary><strong>Additional Compostable Items (QoF Only)</strong></summary>

These are items added by QoF on top of the vanilla compost table. Vanilla items are handled by Minecraft natively and are excluded here to avoid double-processing.

<div align="center">

| Item                   | Success Chance                        |
| ---------------------- | ------------------------------------- |
|                        | <div align="center"><b>30%</b></div>  |
| podzol                 | 30%                                   |
| mycelium               | 30%                                   |
| rooted_dirt            | 30%                                   |
|                        | <div align="center"><b>50%</b></div>  |
| bamboo                 | 50%                                   |
| dead_bush              | 50%                                   |
| honeycomb              | 50%                                   |
| sugar                  | 50%                                   |
| blaze_powder           | 50%                                   |
| ghast_tear             | 50%                                   |
| string                 | 50%                                   |
| chicken                | 50%                                   |
| porkchop               | 50%                                   |
| beef                   | 50%                                   |
| mutton                 | 50%                                   |
| rabbit                 | 50%                                   |
| feather                | 50%                                   |
| ink_sac                | 50%                                   |
| glow_ink_sac           | 50%                                   |
| rabbit_hide            | 50%                                   |
| rabbit_foot            | 50%                                   |
| frog_spawn             | 50%                                   |
| cod                    | 50%                                   |
| salmon                 | 50%                                   |
| tropical_fish          | 50%                                   |
| pufferfish             | 50%                                   |
|                        | <div align="center"><b>65%</b></div>  |
| poisonous_potato       | 65%                                   |
| chorus_fruit           | 65%                                   |
| resin_clump            | 65%                                   |
| lit_pumpkin            | 65%                                   |
| rotten_flesh           | 65%                                   |
| web                    | 65%                                   |
| gunpowder              | 65%                                   |
| magma_cream            | 65%                                   |
| slime_ball             | 65%                                   |
| leather                | 65%                                   |
| phantom_membrane       | 65%                                   |
| cooked_chicken         | 65%                                   |
| cooked_porkchop        | 65%                                   |
| cooked_beef            | 65%                                   |
| cooked_mutton          | 65%                                   |
| cooked_rabbit          | 65%                                   |
| cooked_cod             | 65%                                   |
| cooked_salmon          | 65%                                   |
| golden_carrot          | 65%                                   |
| golden_dandelion       | 65%                                   |
| glistering_melon_slice | 65%                                   |
|                        | <div align="center"><b>85%</b></div>  |
| blaze_rod              | 85%                                   |
| fermented_spider_eye   | 85%                                   |
| dried_ghast            | 85%                                   |
| black_wool             | 85%                                   |
| blue_wool              | 85%                                   |
| brown_wool             | 85%                                   |
| cyan_wool              | 85%                                   |
| gray_wool              | 85%                                   |
| green_wool             | 85%                                   |
| light_blue_wool        | 85%                                   |
| light_gray_wool        | 85%                                   |
| lime_wool              | 85%                                   |
| magenta_wool           | 85%                                   |
| orange_wool            | 85%                                   |
| pink_wool              | 85%                                   |
| red_wool               | 85%                                   |
| purple_wool            | 85%                                   |
| white_wool             | 85%                                   |
| yellow_wool            | 85%                                   |
| popped_chorus_fruit    | 85%                                   |
| mushroom_stew          | 85%                                   |
| suspicious_stew        | 85%                                   |
| beetroot_soup          | 85%                                   |
| golden_apple           | 85%                                   |
|                        | <div align="center"><b>100%</b></div> |
| enchanted_golden_apple | 100%                                  |
| rabbit_stew            | 100%                                  |
| nether_star            | 100%                                  |

</div>

</details>

### Carrying Container

Allows players to pick up chests and other containers while preserving their contents. Sneaking and interacting with a container picks it up. Placing the carried item puts the container back down with all items restored.

**Behavior while Carrying:**

- [x] Slowness is applied continuously.
- [x] Jumping is disabled by default (configurable).
- [x] Jumping in water or lava can be allowed independently.
- [x] Climbing scaffolding and ladders can be allowed independently.
- [x] Players in Creative mode are exempt from jump restrictions.

Full Carry Example

<img src=".github/img/chest-flow.gif" alt="Player puts cod in barrel, picks it up, walks to composter area, places barrel on hopper" width="1080">

> **alt-message** The player walks in holding a cod, places it inside a barrel, then picks the barrel up. They carry it slowly across the scene, with slowness visible, and place it on top of a hopper. The barrel lands with its contents intact.

#### Slowness and Double Chest

<img src=".github/img/chest-slownessdouble.gif" alt="Player picks up chest near sheep, walks slowly, places it into double chest formation" width="1080">

> **alt-message** The player runs in, picks up a chest next to a black sheep, then visibly slows down while carrying it. They walk to a second chest and place theirs beside it, forming a double chest. Contents from both halves are preserved.

> [!WARNING]
> ~~Double chest support is partially implemented. Picking up one half of a double chest will attempt to preserve both halves, but edge cases may result in item loss. Always **back up world** before carrying important chests carrying them.~~ 100% working. It has been extensively tested.

<details>
  <summary><strong>Supported Containers</strong></summary>

Any block with a `minecraft:inventory` component can be picked up. Common examples include:

<div align="center">

| Container     | Chest support | Double Chest |
| ------------- | ------------- | ------------ |
| Chest         | yes           | yes          |
| Trapped Chest | yes           | yes          |
| Copper Chest  | yes           | yes`**`      |
| Barrel        | yes           | no           |
| Hopper        | yes           | no           |
| Dispenser     | yes           | no           |
| Dropper       | yes           | no           |
| Blast Furnace | yes`*`        | no           |
| Furnace       | yes`*`        | no           |
| Smoker        | yes`*`        | no           |
| Brewing Stand | yes           | no           |
| Crafter       | no            | no           |
| Shulker Box   | yes           | no           |

</div>

> [!NOTE]
> ~~(Shulker boxes, Crafter & Brewing Stand) are also inventory blocks and should work, but have not been extensively tested.~~\
> `*` For furnace items, the contents remain 100% correct, but the heat state is lost.\
> `**` Copper chests currently have a bug in Minecraft vanilla where the oxidized state of copper affects the behavior of double chests

</details>

### Offhand

<p align="center">
  <img src=".github/img/offhand.png" alt="Offhand swap and torch placement banner" width="1080">
</p>

Allows players to double-sneak to swap items between their mainhand and offhand. Additionally, torches and other light sources held in the offhand can be placed directly without switching slots. **All seed types** can now be planted directly from the offhand.

**How It Works:**

- Double sneak within a configurable time window to swap mainhand ↔ offhand.
- The sneak window gap is independently configurable for **Mobile**, **Console**, and **Windows**.
- Torches placed from the offhand correctly consume the offhand item stack.
- Seeds held in the offhand can be planted directly this also integrates with the Harvest module for auto-replanting priority.

> [!NOTE]
> Enchantments and item color cannot be transferred between hands due to API limitations that do not allow editing the offhand cleanly.

#### Swap and Torch Placement

<img src=".github/img/offhand-swap.gif" alt="Player double sneaks to swap sword and torch, places torch from offhand" width="1080">

> **alt-message** First-person view. The player is holding a `Trident` in the main hand and a `Soul Torch` in the offhand. They double-sneak, causing the `Trident` and `Soul Torch` to swap places, while another player walks across the screen.

<details>
  <summary><strong>Torch Types Supported for Offhand Placement</strong></summary>
  <div align="center">

| Item           |
| -------------- |
| Torch          |
| Redstone Torch |
| Copper Torch   |
| Soul Torch     |

</div>
</details>

### Harvest

<p align="center">
  <img src=".github/img/harvesting.gif" alt="Player harvesting wheat field with hoe" width="1080">
</p>

Allows players to harvest fully grown crops while holding any hoe. Seeds are automatically replanted after harvesting, and the hoe loses durability on each harvest to balance the automation. And **Cocoa Beans** are supported harvest them using an axe. Seeds placed in the **offhand** are prioritized for replanting over inventory seeds.

**How It Works:**

- Hold any hoe and interact with a fully grown crop to harvest it. Use an **axe** for Cocoa Bean pods.
- Seeds are automatically replanted in the same location. If seeds are in the offhand, they are used first.
- If seeds drop on the ground and the player has none in inventory, dropped seeds used for replanting are reduced by 1, with a `40 gametick` delay before the player can pick them up.
- Hoe durability loss follows the vanilla formula:

$$ \mathrm{Loss} = \mathrm{random} < \frac{1}{\mathrm{level} + 1} $$

where `level` is the hoe's `Unbreaking` enchantment level.

> [!TIP]
> Using a hoe with high Unbreaking reduces durability loss significantly on large farms.

### Mob Loot+

<p align="center">
  <img src=".github/img/mobloot.gif" alt="Mob Loot+ showcase banner" width="1080">
</p>

Adds drops to previously mobs without loot, making them more rewarding to farm.

<details>
  <summary><strong>Mob Loot Table</strong></summary>

**1. Goat drops `Raw Mutton`**

$$ P(\text{drop}) \in \langle 1,\ 2 + L \rangle, \quad L \in \langle 0,\ \text{Looting} \rangle $$

<div align="center">

| Looting Level | Min Drop | Max Drop |
| ------------- | -------- | -------- |
| None          | 1        | 2        |
| I             | 1        | 3        |
| II            | 1        | 4        |
| III           | 1        | 5        |

</div>

> **Goat on Fire** will cook `Raw Mutton` into `Cooked Mutton`

**2. Silverfish drops `String`**

$$ P(\text{drop}) = \frac{1}{5} = 20\% $$

<div align="center">

| Outcome  | Weight | Chance |
| -------- | ------ | ------ |
| Nothing  | 4      | 80%    |
| `String` | 1      | 20%    |

</div>

> Only drops when killed by a **player or pet**

**3. Sniffer drops `Moss Block`**

$$ P(\text{Drop}) = 1 $$

> Looting does not affect the drop quantity

**4. Piglin Brute drops `Gilded Blackstone`**

$$ P(\text{Drop}) \in \langle 0,\ 1 \rangle $$

> Looting does not affect the drop quantity

</details>

### Recipe+

<p align="center">
  <img src=".github/img/recipe.png" alt="Recipe+ banner showing various crafting and smelting screens" width="1080">
</p>

Adds new crafting, smelting, and stonecutter recipes for a more accessible way to obtain items.

#### Recipe Showcase

<img src=".github/img/recipe.gif" alt="Player demonstrates several new recipes at furnace, blast furnace and crafting table" width="1080">

<details>
  <summary><strong>Full Recipe List</strong></summary>

**Smelting** `(Furnace)`

<div align="center">

| Input                 | Output   | Station |
| --------------------- | -------- | ------- |
| Bamboo Block          | Charcoal | Furnace |
| Stripped Bamboo Block | Charcoal | Furnace |

</div>

**Smelting** `(Blast Furnace / Furnace)`

<div align="center">

| Input             | Output       | Station                |
| ----------------- | ------------ | ---------------------- |
| Sand              | Glass        | Blast Furnace          |
| Gilded Blackstone | Gold Ingot   | Blast Furnace, Furnace |
| Stone             | Smooth Stone | Blast Furnace          |
| Cobblestone       | Stone        | Blast Furnace          |

</div>

**Crafting** `(Crafting Table)`

<div align="center">

| Input                | Output         | Notes     |
| -------------------- | -------------- | --------- |
| 9x Charcoal          | Coal Block     | Shapeless |
| Dirt + Hanging Roots | Rooted Dirt    | Shapeless |
| Any Skull + Paper    | Banner Pattern | Shapeless |

</div>

> [!CAUTION]
> **Removed recipes**: `(rebalanced)`
>
> - Rotten Flesh -> Rabbit Hide `(Furnace / Smoker / Campfire / Soul Campfire)` — `removed` in [v1.2.2](https://github.com/aitji/QoF/releases/tag/v1.2.2)
> - Charcoal -> Coal Block `(Crafting Table)` — `removed` in [v1.2.2](https://github.com/aitji/QoF/releases/tag/v1.2.2)

**Stonecutter (Wood)**

All 11 wood types (Acacia, Birch, Cherry, Crimson, Dark Oak, Jungle, Mangrove, Oak, Pale Oak, Spruce, Warped) can be processed in the Stonecutter.

<details>
  <summary><strong>Wood Material Inputs</strong></summary>

1. Log `x4`
2. Stripped Wood `x4`
3. Wood `x4`
4. Stripped Log `x4`
5. Planks `x1`

Nether wood edge cases (Warped & Crimson):

6. Stem `x4`
7. Hyphae `x4`

</details>

<details>
  <summary><strong>Wood Result Items</strong></summary>

1. Slab `x2`
2. Stick `x2`
3. Sign `x1`
4. Door `x1`
5. Pressure Plate `x1`
6. Trapdoor `x1`
7. Fence Gate `x1`
8. Gate `x1`

Wood transfer back & forth:

9.  Stripped Wood
10. Stripped Log
11. Wood
12. Log

Nether wood edge cases:

13. Stripped Stem
14. Stripped Hyphae
15. Stem
16. Hyphae

</details>

**Crafting (Slab to Block (2 Slabs -> 1 Block))**

Two of the same slab stacked vertically craft back into their corresponding full block.

| Slab                           | Block                      |
| ------------------------------ | -------------------------- |
| Smooth Stone Slab              | Smooth Stone               |
| Stone Slab                     | Stone                      |
| Cobblestone Slab               | Cobblestone                |
| Mossy Cobblestone Slab         | Mossy Cobblestone          |
| Mossy Stone Brick Slab         | Mossy Stone Bricks         |
| Cut Sandstone Slab             | Cut Sandstone              |
| Smooth Sandstone Slab          | Smooth Sandstone           |
| Cut Red Sandstone Slab         | Cut Red Sandstone          |
| Smooth Red Sandstone Slab      | Smooth Red Sandstone       |
| Granite Slab                   | Granite                    |
| Polished Granite Slab          | Polished Granite           |
| Diorite Slab                   | Diorite                    |
| Polished Diorite Slab          | Polished Diorite           |
| Andesite Slab                  | Andesite                   |
| Polished Andesite Slab         | Polished Andesite          |
| Brick Slab                     | Brick Block                |
| Red Nether Brick Slab          | Red Nether Bricks          |
| End Stone Brick Slab           | End Stone Bricks           |
| Smooth Quartz Slab             | Smooth Quartz              |
| Prismarine Slab                | Prismarine                 |
| Dark Prismarine Slab           | Dark Prismarine            |
| Prismarine Brick Slab          | Prismarine Bricks          |
| Blackstone Slab                | Blackstone                 |
| Polished Blackstone Brick Slab | Polished Blackstone Bricks |
| Polished Deepslate Slab        | Polished Deepslate         |
| Deepslate Tile Slab            | Deepslate Tiles            |
| Deepslate Brick Slab           | Deepslate Bricks           |
| Polished Tuff Slab             | Polished Tuff              |
| Mud Brick Slab                 | Mud Bricks                 |
| Bamboo Mosaic Slab             | Bamboo Mosaic              |
| Oak Slab                       | Oak Planks                 |
| Spruce Slab                    | Spruce Planks              |
| Birch Slab                     | Birch Planks               |
| Jungle Slab                    | Jungle Planks              |
| Acacia Slab                    | Acacia Planks              |
| Dark Oak Slab                  | Dark Oak Planks            |
| Mangrove Slab                  | Mangrove Planks            |
| Cherry Slab                    | Cherry Planks              |
| Pale Oak Slab                  | Pale Oak Planks            |
| Crimson Slab                   | Crimson Planks             |
| Warped Slab                    | Warped Planks              |

> **Note** If a block is not listed here, it may already have a vanilla recipe or may not yet be included in this version (26.10).

</details>

## Configuration References

All settings are accessible through the pack settings panel in-game. No manual file editing is required.

<details>
  <summary><strong>Full Settings Table</strong></summary>
  <img src="./.github/img/settings.png" alt="full settings of manifest.json">
</details>

## Known Limitations & Notes

> [!NOTE]
> These are known behavioral constraints, not all of which will be fixed in the short term. Most stem from Bedrock scripting API limitations.

**Dynamic Light**

- `Limitations` Light blocks are placed only in air or liquid. Solid blocks are never replaced, which can cause light gaps in tight or enclosed spaces.
- `Limitations` Armor stands do not support the equippable component in the current API. Items held by armor stands do not emit dynamic light. Only item frames are supported for static placed sources.
- Very high render radius or sources-per-player values will increase tick time noticeably. Keep defaults unless your world has very few active players.

**Composter+**

- Hopper feed processes one item per interval tick. High-throughput automatic farms will be rate-limited by the hopper interval setting.
- `Limitations` We have a system that prevents custom list items from being processed when vanilla items are already being processed. However, if our custom list items are processed first and vanilla items are in the next slots, the vanilla items will be processed at the same time as ours in the hopper.

**Carrying Container**

- Only the player who picked up the container can place it back. Other players cannot interact with the carried item slot.

**Offhand**

- `Limitations` Enchantments and item color cannot be transferred between hands due to API limitations that do not allow editing the offhand cleanly.

## License

This project is licensed under the [MIT License](LICENSE).

## Disclosure

All gameplay footage, images, and GIFs were recorded using [Vibrant Visual](https://www.minecraft.net/en-us/vibrant-visuals-update) and [Action And Stuff](https://www.minecraft.net/en-us/article/let-s-play--actions---stuff).

LLMs were used to assist with wording and grammar in this documentation.\
English is not our native language. Thank you for your understanding!

## Credits

- @aitji scripting & design
- @pickerth-12 design, json & molang

```
QoF™
Copyright (c) 2026 aitji & pickerth-12 Licensed under the MIT License
Source: github.com/aitji/QoF

  README INFO
Version: v1.4.0
Last updated: 4 Apr 2026
Has README Update: True

  PACK INFO
Last Release: v1.4.0
Last Pre-Release: v1.4.1
Last Minecraft Version: 26.12
Used Dependencies: ^2.7.0-beta.1.26.14-stable
```
