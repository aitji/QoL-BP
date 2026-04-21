import { world, system, ItemStack, BlockPermutation, EquipmentSlot, ItemLockMode, Player, InputPermissionCategory, PlayerPlaceBlockAfterEvent, GameMode, EntityDieAfterEvent, Entity, EntityComponentTypes, Container, PlayerInteractWithBlockBeforeEvent, Block, RawText } from "@minecraft/server"
import { checkRandom, RUNTIME, cache, reName, getInv, getEqu, playSound, checkPerm } from "../lib"
const {
  DEBUG, SLICE_PREFIX,
  CARRIED_CHEST: {
    CARRY_TAG, ENTITY_TYPE, CHEST_ID, DOUBLE_CHEST_SIZE,
    SLOWNESS_DURATION, SLOWNESS_AMPLIFIER, SOUND_PICK_UP,
    APPLY_IMPULSE, PLAYER_JUMP, CONTAINER_NAMETAG, MAX_DISPLAY
  }
} = RUNTIME

type Dir = 'north' | 'south' | 'east' | 'west'
const NEIGH = {
  north: { left: "west", right: "east" },
  south: { left: "east", right: "west" },
  east: { left: "north", right: "south" },
  west: { left: "south", right: "north" },
} as const satisfies Record<string, { left: Dir, right: Dir }>

export const blockInDir = (b: Block, d: Dir): Block => (
  {
    north: () => b.north(1),
    south: () => b.south(1),
    east: () => b.east(1),
    west: () => b.west(1)
  }[d]?.() ?? b
)
const isFaceChest = (b: Block, f: string) => b?.typeId === CHEST_ID && b.permutation.getState("minecraft:cardinal_direction") === f
const setJump = (player: Player, n: boolean) => {
  if (!PLAYER_JUMP.NO_JUMP_HOLD_CHEST) return
  if (DEBUG) world.sendMessage(`§7${player.name} jump=${n}`)
  try { player.inputPermissions.setPermissionCategory(InputPermissionCategory.Jump, n) }
  catch (e) {
    if (DEBUG)
      world.sendMessage(`§7Can't set jump ${player.name} to ${n}:§8 ${e}`)
  }
}

const copyInv = (inv: Container) => {
  const arr = []
  for (let i = 0; i < inv.size; i++) arr.push(inv.getItem(i))
  return arr
}

const resDouble = (block: Block) => {
  const f = block.permutation.getState("minecraft:cardinal_direction")! as Dir
  const dirs = NEIGH[f]
  if (!dirs) return null
  const left = blockInDir(block, dirs.left)
  const right = blockInDir(block, dirs.right)
  return { hasLeft: isFaceChest(left, f), hasRight: isFaceChest(right, f), left, right, facing: f }
}

const spawnInv = (player: Player) => {
  const e = player.dimension.spawnEntity(ENTITY_TYPE as any, player.location)
  e.nameTag = player.name
  return e
}

const findInv = (player: Player) => {
  const query = { type: ENTITY_TYPE, name: player.name }
  const near = player.dimension.getEntities({ ...query, location: player.location, closest: 1 })
  if (near.length) return near[0]
  for (const id of ["overworld", "nether", "the_end"]) { // todo: cringe, need entity track in cache, use this as fallback
    const found = world.getDimension(id).getEntities(query)
    if (found.length) return found[0]
  }
  return null
}

const buildCarryItem = (blockTypeId: string, player: Player, container: Container) => {
  const it = new ItemStack(blockTypeId, 1)
  it.nameTag = CONTAINER_NAMETAG

  if (!container) {
    it.setLore([`§r§7${player.name}§r§7's Carried Container`])
  } else {
    const list: Record<string, {
      localization: string,
      typeId: string
      nameTag?: string,
      amount: number
    }> = {}
    let total = 0
    for (let i = 0; i < container.size; i++) {
      const item = container.getItem(i)
      if (!item) continue

      total++

      if (!list[item.typeId]) {
        list[item.typeId] = {
          localization: item.localizationKey,
          typeId: item.typeId,
          nameTag: item.nameTag ?? undefined,
          amount: item.amount
        }
      } else list[item.typeId].amount += item.amount
    }

    const entries = Object.values(list)
    const uniqueTotal = entries.length

    const invText = entries
      .slice(0, MAX_DISPLAY)
      .map(i => {
        const name =
          i.nameTag ?? (
            i.localization?.endsWith('.name')
              ? reName(i.typeId)
              : i.localization ?? ''
          )
        const amount = i.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
        const builder: RawText = { rawtext: [{ text: '§r§7' }, { translate: name }, { text: ' §r§7x' }, { text: amount }] };
        return builder
      })

    if (invText.length === 0) invText.push({ rawtext: [{ text: `§r§7(empty container)` }] })
    if (uniqueTotal > MAX_DISPLAY) invText.push({ rawtext: [{ text: `§r§7and ${uniqueTotal - MAX_DISPLAY} more...` }] })
    it.setLore(invText)
  }

  it.lockMode = ItemLockMode.slot
  return it
}

const safeMove = (fromInv: Container, fromI: number, toInv: Container, toI: number) => {
  try { fromInv.moveItem(fromI, toI, toInv) }
  catch { }
}

const block2inv = (block: Block, heldInv: Entity) => {
  const invComp = block.getComponent("minecraft:inventory")
  if (!invComp) return
  const container = invComp.container!
  const heldCont = heldInv.getComponent("minecraft:inventory")!.container

  if (container.size !== DOUBLE_CHEST_SIZE) {
    for (let i = 0; i < container.size; i++)
      if (container.getItem(i))
        safeMove(container, i, heldCont, i)
    return
  }

  const dc = resDouble(block)
  if (!dc) return

  const half = dc.hasLeft ? 0 : 1
  const halfSize = DOUBLE_CHEST_SIZE / 2
  const ourStart = half * halfSize
  const ourEnd = ourStart + halfSize
  const theirStart = half === 0 ? halfSize : 0
  const theirEnd = theirStart + halfSize
  const partner = dc.hasLeft ? dc.left! : dc.right! as Block

  for (let i = ourStart; i < ourEnd; i++) {
    const it = container.getItem(i)
    if (it) safeMove(container, i, heldCont, i - ourStart)
  }

  for (let i = theirStart; i < theirEnd; i++) {
    const it = container.getItem(i)
    if (!it) continue
    const relay = spawnInv(block.dimension?.getPlayers?.()[0] ?? { name: "relay", dimension: block.dimension })
    try {
      const co = relay.getComponent("minecraft:inventory")!
      safeMove(container, i, co.container, i)
      system.runTimeout(() => {
        try {
          const pInv = partner.getComponent("minecraft:inventory")!
          const pCon = pInv?.container
          if (!pCon) return

          safeMove(co.container, i, pCon, i - theirStart)
        } finally { relay.remove() }
      }, 1)
    } catch (e) { relay.remove() }
  }
}

const inv2block = (heldInv: Entity, block: Block, neighbourInv: any[]) => {
  const invComp = getInv(block)
  if (!invComp) return
  const container = invComp?.container!
  const heldCont = getInv(heldInv)?.container!

  if (container.size !== DOUBLE_CHEST_SIZE) {
    for (let i = 0; i < container.size; i++) safeMove(heldCont, i, container, i)
    heldInv.remove()
    return
  }

  const halfSize = DOUBLE_CHEST_SIZE / 2
  system.runTimeout(() => {
    const dest = getInv(block)?.container!
    for (let i = 0; i < halfSize; i++) safeMove(heldCont, i, dest, i)
    const their = neighbourInv[0] ?? []
    for (let i = 0; i < their.length; i++) if (their[i]) dest.setItem(halfSize + i, their[i])
    heldInv.remove()
  }, 1)
}

export const chest_playerInteractWithBlock = (data: PlayerInteractWithBlockBeforeEvent) => {
  const { player, block } = data
  if (checkPerm(player) === false) return
  const equ = getEqu(player)!
  if (!block || !getInv(block) || equ.getEquipment(EquipmentSlot.Mainhand) || !player.isSneaking || player.hasTag(CARRY_TAG)) return
  data.cancel = true

  system.runTimeout(() => {
    try {
      const blockInv = block.getComponent("minecraft:inventory")
      if (!blockInv) return
      const blockTypeId = block?.typeId ?? ''
      if (blockTypeId.includes('lit_')) return
      if (blockTypeId === "minecraft:jukebox") return
      const holdingEntity = spawnInv(player)
      holdingEntity.addTag(`type ${blockTypeId}`)
      block2inv(block, holdingEntity)
      const holdingContainer = holdingEntity.getComponent('minecraft:inventory')?.container!
      const carryItem = buildCarryItem(blockTypeId, player, holdingContainer)
      equ.setEquipment(EquipmentSlot.Mainhand, carryItem)
      player.setDynamicProperty('qof:chest.storage', JSON.stringify({ selectedSlotIndex: (player.selectedSlotIndex ?? 0), blockTypeId }))
      player.addTag(CARRY_TAG)
      setJump(player, false)
      playSound(player.dimension, player.location, SOUND_PICK_UP)
      block.setType("minecraft:air")

      if (!findInv(player)) {
        equ.setEquipment(EquipmentSlot.Mainhand)
        player.removeTag(CARRY_TAG)
        setJump(player, true)
        player.setDynamicProperty('qof:chest.storage', undefined)
      }
    } catch (e) {
      try { equ.setEquipment(EquipmentSlot.Mainhand) } catch (_) { }
      player.removeTag(CARRY_TAG)
      setJump(player, true)
      player.setDynamicProperty('qof:chest.storage', undefined)
      if (DEBUG) world.sendMessage(`§cContainer pickup error: ${e}`)
    }
  }, 1)
}

export const chest_playerPlaceBlock = (data: PlayerPlaceBlockAfterEvent) => {
  const { player, block } = data
  if (!block || !block?.getComponent("minecraft:inventory") || !player.hasTag(CARRY_TAG)) return
  if ((JSON.parse(player.getDynamicProperty('qof:chest.storage') as string ?? 0).selectedSlotIndex) !== player.selectedSlotIndex) return

  const holdingEntity = findInv(player)
  if (!holdingEntity) {
    system.runTimeout(() => {
      player.sendMessage("§cCould not find saved inventory!")
      getEqu(player)!.setEquipment(EquipmentSlot.Mainhand)
      player.removeTag(CARRY_TAG)
      setJump(player, true)
      player.setDynamicProperty('qof:chest.storage', undefined)
    }, 1)
    return
  }

  const blockTypeId = holdingEntity.getTags().find(t => t.startsWith("type "))?.substring(5) ?? CHEST_ID
  if (block.typeId !== blockTypeId) return
  const neighbourSnapshots = []

  try {
    const perm = block.permutation
    if (blockTypeId === CHEST_ID) {
      const facing = perm.getState("minecraft:cardinal_direction") as Dir
      const dirs = NEIGH[facing]
      if (dirs) for (const dir of [dirs.left, dirs.right]) {
        const n = blockInDir(block, dir)!
        const container = getInv(n)?.container

        if (!container) continue
        if (isFaceChest(n, facing)) neighbourSnapshots.push(copyInv(container))
      }
    }

    const loc = block.location
    const permState = {
      cardinal_direction: perm.getState("minecraft:cardinal_direction"),
      facing_direction: perm.getState("facing_direction"),
      direction: perm.getState("direction"),
      facing: perm.getState("facing_direction"),
    }

    player.dimension.setBlockType(loc, "minecraft:air")
    if (blockTypeId === CHEST_ID) {
      const cardinal = BlockPermutation.resolve('minecraft:chest', { "minecraft:cardinal_direction": permState.cardinal_direction })
      block.setPermutation(cardinal)
    } else {
      player.dimension.setBlockType(loc, blockTypeId)
      const placed = player.dimension.getBlock(loc)!
      const stateKey = permState.cardinal_direction ? "minecraft:cardinal_direction"
        : permState.facing_direction ? "facing_direction"
          : permState.direction ? "direction"
            : permState.facing ? "facing" : null
      const stateVal = permState.cardinal_direction ?? permState.facing_direction ?? permState.direction ?? permState.facing
      if (stateKey && stateVal !== null && stateVal !== undefined) placed.setPermutation(BlockPermutation.resolve(placed.typeId, { [stateKey]: stateVal }))
    }

    const finalBlock = player.dimension.getBlock(loc)!
    inv2block(holdingEntity, finalBlock, neighbourSnapshots)
  } catch (e) {
    try { holdingEntity.teleport(player.location, { dimension: player.dimension }) }
    catch (_) { }

    player.sendMessage("§cCould not place the container. Inventory restored.")
  } finally {
    getEqu(player)!.setEquipment(EquipmentSlot.Mainhand)
    player.removeTag(CARRY_TAG)
    setJump(player, true)
    player.setDynamicProperty('qof:chest.storage', undefined)
  }
}


export const chest_player = (player: Player) => {
  const canJump = player.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Jump)
  const jumpSet = (n: boolean) => setJump(player, n)
  if (player.hasTag(CARRY_TAG)) {
    player.addEffect("slowness", SLOWNESS_DURATION, { showParticles: false, amplifier: SLOWNESS_AMPLIFIER })

    if (cache.getPlayer(player, 'gameMode') === GameMode.Creative) {
      if (!canJump) jumpSet(true)
    } else {
      let allowJump = false
      if (!PLAYER_JUMP.NO_JUMP_HOLD_CHEST || APPLY_IMPULSE.ENABLED) {
        // water
        if (PLAYER_JUMP.ALLOW_JUMP_IN_WATER && player.isInWater) {
          allowJump = true
          if (APPLY_IMPULSE.ENABLED) player.applyImpulse(APPLY_IMPULSE.VECTOR)
        }

        // lava
        const { location } = player
        const block = player.dimension.getBlock(location)
        if (PLAYER_JUMP.ALLOW_JUMP_IN_LAVA) {
          if (
            block?.typeId === 'minecraft:lava' ||
            block?.typeId === 'minecraft:flowing_lava'
          ) allowJump = true
        }

        // scaffolding
        if (PLAYER_JUMP.ALLOW_JUMP_IN_SCAFFOLDING) {
          if (
            block?.typeId === 'minecraft:scaffolding'
          ) allowJump = true
        }
        if (PLAYER_JUMP.ALLOW_JUMP_IN_LADDER) {
          if (
            block?.typeId === 'minecraft:ladder'
          ) allowJump = true
        }
      }

      if (allowJump !== canJump) jumpSet(allowJump)
    }

    const data = JSON.parse(player.getDynamicProperty("qof:chest.storage") as string || "{}")
    const slot = data?.selectedSlotIndex
    if (data && slot === player.selectedSlotIndex) {
      const blockTypeId = data.blockTypeId
      const equ = getEqu(player)!
      const item = equ.getEquipment(EquipmentSlot.Mainhand)

      if (item && (item.typeId !== blockTypeId || item.nameTag !== CONTAINER_NAMETAG)) {
        if (!player.hasTag("qof.chest.alert")) {
          player.sendMessage(`§cHotbar Slot #${slot + 1} need to be empty.`)
        }
        player.addTag('qof.chest.alert')
        return
      }

      if (!item || item.typeId !== blockTypeId || item.nameTag !== CONTAINER_NAMETAG) {
        player.selectedSlotIndex = slot
        const inv = findInv(player)
        if (!inv) {
          player.removeTag(CARRY_TAG)
          player.sendMessage(`§cCould not find saved inventory!`)
          return
        }

        const container = getInv(inv)?.container!
        const carryItem = buildCarryItem(blockTypeId, player, container)
        equ.setEquipment(EquipmentSlot.Mainhand, carryItem)
        player.removeTag('qof.chest.alert')
      }
    }
  } else {
    if (!canJump) jumpSet(true)
    player.removeTag('qof.chest.alert')
  }
}

export const chest_entityDie = (data: EntityDieAfterEvent) => {
  const player = data.deadEntity as Player

  const { location, dimension } = player
  const container = getInv(player)?.container!
  if (!player.hasTag(CARRY_TAG)) return
  const inv = findInv(player)!
  if (!inv) return player.removeTag(CARRY_TAG)
  inv.teleport(location, { dimension })
  inv.kill()

  system.runTimeout(() => {
    container.clearAll()

    const entities = dimension.getEntities({ maxDistance: 3, type: "minecraft:item", location, closest: DOUBLE_CHEST_SIZE + (container.size + 6) })
    for (const en of entities) {
      if (!en || !en.isValid) continue
      const item = en.getComponent(EntityComponentTypes.Item)?.itemStack
      if (!item || !item?.nameTag) continue
      if (item?.nameTag === CONTAINER_NAMETAG) try {
        const drop = new ItemStack(item?.typeId, (item?.amount || 1))
        dimension.spawnItem(drop, location)
        en.remove()
      } catch (e) { if (DEBUG) world.sendMessage(`§c[chest] unexpected error while spawn normal container`) }
    }
  }, 1)
  player.removeTag(CARRY_TAG)
}