execute unless score counter "aitjilib" matches ..99999 run scoreboard objectives add "aitjilib" dummy
execute unless score counter "aitjilib" matches ..99999 run scoreboard players set counter "aitjilib" 80
execute unless score counter "aitjilib" matches ..99999 run scoreboard players set addon "aitjilib" 0
execute unless score counter "aitjilib" matches ..99999 run scoreboard players set heartbeat "aitjilib" 0
execute unless score counter "aitjilib" matches ..99999 run scriptevent aitji-lib:heartbeat

execute unless score heartbeat "aitjilib" matches 1 run scriptevent aitji-lib:heartbeat qof
execute unless score heartbeat "aitjilib" matches 1 run scoreboard players set heartbeat "aitjilib" 1

scoreboard players remove counter "aitjilib" 1
execute if score addon "aitjilib" matches 2.. run scoreboard players operation counter "aitjilib" += addon "aitjilib"
execute if score addon "aitjilib" matches 2.. run scoreboard players remove counter "aitjilib" 1

execute unless score api "aitjilib" matches 1 if score counter "aitjilib" matches ..0 run tellraw @a {"rawtext":[{"translate":"§c§c@aitji Library §l§cCan't§r§7 Install §cQ§fo§cF§7 Addon\n\nPlease §cenable the Beta APIs§7§cQ§fo§cF§7 to install successfully\n*If you already enabled, Please update the §cAddon§r"}]}
execute unless score api "aitjilib" matches 1 if score counter "aitjilib" matches ..0 run tellraw @a {"rawtext":[{"translate":"\n§7Addon by §caitji, pickerth-12 §7(beta-stable)\n§7Download the addon at §cgithub.com/aitji/QoF\n§7----------------------------"}]}

execute unless score api "aitjilib" matches 0 if score counter "aitjilib" matches ..0 run scoreboard players set api "aitjilib" 0
execute if score counter "aitjilib" matches ..0 run scoreboard players set counter "aitjilib" 300

scoreboard players set addon "aitjilib" 0
scoreboard players set heartbeat "aitjilib" 0
