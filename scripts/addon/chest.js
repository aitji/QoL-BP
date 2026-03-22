import { world, system, ItemStack, BlockPermutation, EquipmentSlot, ItemLockMode, Player, InputPermissionCategory, PlayerPlaceBlockAfterEvent, GameMode, EntityDieAfterEvent, Entity, EntityComponentTypes } from "@minecraft/server"
import { checkRandom, RUNTIME } from "../lib"
const { DEBUG, CARRIED_CHEST: { CARRY_TAG, ENTITY_TYPE, CHEST_ID, DOUBLE_CHEST_SIZE, SLOWNESS_DURATION, SLOWNESS_AMPLIFIER, SOUND_PICK_UP, APPLY_IMPULSE, PLAYER_JUMP, CONTAINER_NAMETAG, MAX_DISPLAY } } = RUNTIME

const NEIGH = {
  north: { left: "west", right: "east" },
  south: { left: "east", right: "west" },
  east: { left: "north", right: "south" },
  west: { left: "south", right: "north" },
}

const blockInDir = (b, d) => ({ north: () => b.north(1), south: () => b.south(1), east: () => b.east(1), west: () => b.west(1) }[d]?.() ?? b)
const isFaceChest = (b, f) => b?.typeId === CHEST_ID && b.permutation.getState("minecraft:cardinal_direction") === f
/** @returns {String} */
function reName(item) { return item?.split(":")[1]?.split('_').map(v => v[0]?.toUpperCase() + v?.slice(1)?.toLowerCase())?.join(" ") }
const setJump = (player, n) => {
  if (!PLAYER_JUMP.NO_JUMP_HOLD_CHEST) return
  if (DEBUG) world.sendMessage(`§7${player.name} jump=${n}`)
  try { player.inputPermissions.setPermissionCategory(InputPermissionCategory.Jump, n) }
  catch (e) {
    if (DEBUG)
      world.sendMessage(`§7Can't set jump ${player.name} to ${n}:§8 ${e}`)
  }
}

const copyInv = (inv) => {
  const arr = []
  for (let i = 0; i < inv.size; i++) arr.push(inv.getItem(i))
  return arr
}

const resDouble = (block) => {
  const f = block.permutation.getState("minecraft:cardinal_direction")
  const dirs = NEIGH[f]
  if (!dirs) return null
  const left = blockInDir(block, dirs.left)
  const right = blockInDir(block, dirs.right)
  return { hasLeft: isFaceChest(left, f), hasRight: isFaceChest(right, f), left, right, facing: f }
}

const spawnInv = (player) => {
  const e = player.dimension.spawnEntity(ENTITY_TYPE, player.location)
  e.nameTag = player.name
  return e
}

/**
 * @param {Player} player
 * @returns {Entity|null}
 */
const findInv = (player) => {
  const query = { type: ENTITY_TYPE, name: player.name }
  const near = player.dimension.getEntities({ ...query, location: player.location, closest: 1 })
  if (near.length) return near[0]
  for (const id of ["overworld", "nether", "the_end"]) {
    const found = world.getDimension(id).getEntities(query)
    if (found.length) return found[0]
  }
  return null
}

const buildCarryItem = (blockTypeId, player, container) => {
  const it = new ItemStack(blockTypeId, 1)
  it.nameTag = CONTAINER_NAMETAG

  if (!container) {
    it.setLore([`§r§7${player.name}§r§7's Carried Container`])
  } else {
    /**@type {{[typeId: string]: {typeId: string, nameTag: string, amount: number}}}*/
    const list = {}
    let total = 0
    for (let i = 0; i < container.size; i++) {
      const item = container.getItem(i)
      if (!item) continue

      total++

      if (!list[item.typeId]) {
        list[item.typeId] = {
          typeId: item.typeId,
          nameTag: item.nameTag ?? null,
          amount: item.amount
        }
      } else {
        list[item.typeId].amount += item.amount
      }
    }

    const entries = Object.values(list)
    const uniqueTotal = entries.length

    const invText = entries
      .slice(0, MAX_DISPLAY)
      .map(i => {
        const name = i.nameTag || reName(i.typeId) || i.typeId
        const amount = i.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
        return `§r§7${name} x${amount}`
      })

    if (invText.length === 0) invText.push(`§r§7(empty container)`)
    if (uniqueTotal > MAX_DISPLAY) invText.push(`§r§7and ${uniqueTotal - MAX_DISPLAY} more...`)
    it.setLore(invText)
  }

  it.lockMode = ItemLockMode.slot
  return it
}

const safeMove = (fromInv, fromI, toInv, toI) => {
  try { fromInv.moveItem(fromI, toI, toInv) }
  catch { }
}

const block2inv = (block, heldInv) => {
  const invComp = block.getComponent("minecraft:inventory")
  if (!invComp) return
  const container = invComp.container
  const heldCont = heldInv.getComponent("minecraft:inventory").container

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
  const partner = dc.hasLeft ? dc.left : dc.right

  for (let i = ourStart; i < ourEnd; i++) {
    const it = container.getItem(i)
    if (it) safeMove(container, i, heldCont, i - ourStart)
  }

  for (let i = theirStart; i < theirEnd; i++) {
    const it = container.getItem(i)
    if (!it) continue
    const relay = spawnInv(block.dimension?.getPlayers?.()[0] ?? { name: "relay", dimension: block.dimension })
    try {
      safeMove(container, i, relay.getComponent("minecraft:inventory").container, i)
      system.runTimeout(() => {
        try {
          safeMove(relay.getComponent("minecraft:inventory").container, i, partner.getComponent("minecraft:inventory").container, i - theirStart)
        } finally { relay.remove() }
      }, 1)
    } catch (e) { relay.remove() }
  }
}

const inv2block = (heldInv, block, neighbourInv) => {
  const invComp = block.getComponent("minecraft:inventory")
  if (!invComp) return
  const container = invComp.container
  const heldCont = heldInv.getComponent("minecraft:inventory").container

  if (container.size !== DOUBLE_CHEST_SIZE) {
    for (let i = 0; i < container.size; i++) safeMove(heldCont, i, container, i)
    heldInv.remove()
    return
  }

  const halfSize = DOUBLE_CHEST_SIZE / 2
  system.runTimeout(() => {
    const dest = block.getComponent("minecraft:inventory").container
    for (let i = 0; i < halfSize; i++) safeMove(heldCont, i, dest, i)
    const their = neighbourInv[0] ?? []
    for (let i = 0; i < their.length; i++) if (their[i]) dest.setItem(halfSize + i, their[i])
    heldInv.remove()
  }, 1)
}

export const chest_playerInteractWithBlock = (data) => {
  const { player, block } = data
  if (!block || !block?.getComponent("minecraft:inventory") || player.getComponent("minecraft:equippable").getEquipment(EquipmentSlot.Mainhand) || !player.isSneaking || player.hasTag(CARRY_TAG)) return
  data.cancel = true

  system.runTimeout(() => {
    try {
      const blockInv = block.getComponent("minecraft:inventory")
      if (!blockInv) return
      const blockTypeId = block.typeId
      const holdingEntity = spawnInv(player)
      holdingEntity.addTag(`type ${blockTypeId}`)
      block2inv(block, holdingEntity)
      const holdingContainer = holdingEntity.getComponent('minecraft:inventory')?.container
      const carryItem = buildCarryItem(blockTypeId, player, holdingContainer)
      player.getComponent("minecraft:equippable").setEquipment(EquipmentSlot.Mainhand, carryItem)
      player.setDynamicProperty('qof:chest.storage', JSON.stringify({ selectedSlotIndex: (player.selectedSlotIndex ?? 0), blockTypeId }))
      player.addTag(CARRY_TAG)
      setJump(player, false)
      player.dimension.playSound(SOUND_PICK_UP.ID, player.location, { volume: checkRandom(SOUND_PICK_UP.VOLUME), pitch: checkRandom(SOUND_PICK_UP.PITCH) })
      block.setType("minecraft:air")

      if (!findInv(player)) {
        player.getComponent("minecraft:equippable").setEquipment(EquipmentSlot.Mainhand)
        player.removeTag(CARRY_TAG)
        setJump(player, true)
        player.setDynamicProperty('qof:chest.storage', undefined)
      }
    } catch (e) {
      try { player.getComponent("minecraft:equippable").setEquipment(EquipmentSlot.Mainhand) } catch (_) { }
      player.removeTag(CARRY_TAG)
      setJump(player, true)
      player.setDynamicProperty('qof:chest.storage', undefined)
      if (DEBUG) world.sendMessage(`§cContainer pickup error: ${e}`)
    }
  }, 1)
}

/**@param {PlayerPlaceBlockAfterEvent} data*/
export const chest_playerPlaceBlock = (data) => {
  const { player, block } = data
  if (!block || !block?.getComponent("minecraft:inventory") || !player.hasTag(CARRY_TAG)) return
  if ((JSON.parse(player.getDynamicProperty('qof:chest.storage') ?? 0).selectedSlotIndex) !== player.selectedSlotIndex) return

  const holdingEntity = findInv(player)
  if (!holdingEntity) {
    system.runTimeout(() => {
      player.sendMessage("§cCould not find saved inventory!")
      player.getComponent("minecraft:equippable").setEquipment(EquipmentSlot.Mainhand)
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
      const facing = perm.getState("minecraft:cardinal_direction")
      const dirs = NEIGH[facing]
      if (dirs) for (const dir of [dirs.left, dirs.right]) {
        const n = blockInDir(block, dir)
        if (isFaceChest(n, facing) && n.getComponent("minecraft:inventory")) neighbourSnapshots.push(copyInv(n.getComponent("minecraft:inventory").container))
      }
    }

    const loc = block.location
    const permState = {
      cardinal_direction: perm.getState("minecraft:cardinal_direction"),
      facing_direction: perm.getState("facing_direction"),
      direction: perm.getState("direction"),
      facing: perm.getState("facing"),
    }

    player.dimension.setBlockType(loc, "minecraft:air")
    if (blockTypeId === CHEST_ID) {
      const cardinal = BlockPermutation.resolve('minecraft:chest', { "minecraft:cardinal_direction": permState.cardinal_direction })
      block.setPermutation(cardinal)
    } else {
      player.dimension.setBlockType(loc, blockTypeId)
      const placed = player.dimension.getBlock(loc)
      const stateKey = permState.cardinal_direction ? "minecraft:cardinal_direction"
        : permState.facing_direction ? "facing_direction"
          : permState.direction ? "direction"
            : permState.facing ? "facing" : null
      const stateVal = permState.cardinal_direction ?? permState.facing_direction ?? permState.direction ?? permState.facing
      if (stateKey && stateVal !== null && stateVal !== undefined) placed.setPermutation(BlockPermutation.resolve(placed.typeId, { [stateKey]: stateVal }))
    }

    const finalBlock = player.dimension.getBlock(loc)
    inv2block(holdingEntity, finalBlock, neighbourSnapshots)
  } catch (e) {
    try { holdingEntity.teleport(player.location, { dimension: player.dimension }) }
    catch (_) { }

    player.sendMessage("§cCould not place the container. Inventory restored.")
  } finally {
    player.getComponent("minecraft:equippable").setEquipment(EquipmentSlot.Mainhand)
    player.removeTag(CARRY_TAG)
    setJump(player, true)
    player.setDynamicProperty('qof:chest.storage', undefined)
  }
}


/**@param {Player} player*/
export const chest_player = (player) => {
  const canJump = player.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Jump)
  const jumpSet = (n) => setJump(player, n)
  if (player.hasTag(CARRY_TAG)) {
    player.addEffect("slowness", SLOWNESS_DURATION, { showParticles: false, amplifier: SLOWNESS_AMPLIFIER })

    if (player.matches({ gameMode: GameMode.Creative })) {
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

    const data = JSON.parse(player.getDynamicProperty("qof:chest.storage") || "{}")
    const slot = data?.selectedSlotIndex
    if (data && slot === player.selectedSlotIndex) {
      const blockTypeId = data.blockTypeId
      const equ = player.getComponent("minecraft:equippable")
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

        const container = inv.getComponent(EntityComponentTypes.Inventory)?.container
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

/**@param {EntityDieAfterEvent} data*/
export const chest_entityDie = (data) => {
  const { deadEntity: player } = data
  const { location, dimension } = player
  const container = player.getComponent(EntityComponentTypes.Inventory)?.container
  if (!player.hasTag(CARRY_TAG)) return
  /** @type {Entity} */
  const inv = findInv(player)
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
      } catch (e) { if (DEBUG) world.sendMessage(`§c[chest.js] unexpected error while spawn normal container`) }
    }
  }, 1)
  player.removeTag(CARRY_TAG)
}