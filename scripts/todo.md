## info
this file is only for top priority todo, if something like refactor some code or simple todo put it in the file

## aitji
- [x] (light-weight) dynamic light
- [x] repair anvil (with ingot)
- [x] migrate addon manifest to format_version v3
- [x] wet powder concrete
    - [x] delay on water keep track for x second before turn in to concrete
- [x] composter (poisonous potato, rotten flesh, spider ...)
- [x] carried chest
    - [x] support other container
- [x] /README.md
- [x] offhand items
- [x] bug fix
  - [x] fix hoe/shovel cannot use with dynamic light
  - [x] fix seeds not work on farmlands
  - [x] support edge case for offhand like buckets
- [x] harvest crop
- [ ] ongoing problem ; might ship without fix this
  - [ ] (24-Mar-2026) piston is change state to air when extract it will del piston
        ; (25-Mar-2026) still doesn't idea how to fix "cleanly" tho\
        ; (26-Mar-2026) found problem! vanilla light block is pushable by piston (???) idk why they not [pop] it\
        ; (27-Mar-2026) i found workaround, how? i create `qof:light_block` that have all vanilla components but it popped on piston moving\
          \ trade off: it show error that it missing geometry because i use invaild geometry so it doesn't have a block but will inculde the resoure pack to fix that, if didn't install error just pop up once IF player enabled console gui log, great deal i take that
  - [x] player break block are showing light block particle ; after block become air it got replace to light block and minecraft decide to render it
- [x] add changelog/*.md and github action bot pull file and update it

### concern about dyp

testing pos: `157 116 266`
> larger postion will take larger bytes

#### currently limit
world dynamic properties (we using)
> store up to 1MB (1,048,576 bytes) [[total]]

entity
> ~128 KB (131,072 bytes) per actor

if data still kept grow and grow might need to store data with entity for db `qof:db`, that will be really annoying real fast... 

#### composter
0 composter take 20 bytes\
1 bytes take 43 bytes\
2 bytes take 67 bytes\
3 bytes take 91 bytes\
10 bytes take 259 bytes\
30 bytes take 739 bytes\
> this can go on inf

#### dynamic light

##### per player
standing: 627 bytes (11 dyp)\
jumping: 912 bytes (16 dyp)\
walk: 1824 bytes (32 dyp)\
running: 2223 bytes (39 dyp)\
running&jump: ~3200 bytes (~53 dyp)\
elytra: peak 7000+ bytes (90+ dyp)\
elytra+firework (any level): peak 8000+ bytes (150+ dyp)\

> item is -1.83 times of player
> if everyone have elytra and firework same time it will take 12 player to take dynamic light to limit, it still working even it hit limit but it will run in-memory instant of persistance database rn i'm ok with that tho!

## picker
- [x] update light level to new version
- [x] add mob light emit
- [x] [aitji/composter] and add composte list
- [x] entity loot drops
- [x] recipes
- [ ] add more config in manifest pack
  - [ ] offhand's settings
    - [x] update _config.js
    - [x] update _store.js
    - [x] update manifest.json
    - [ ] still need to add more tho -aitji
  - [ ] crop.js
    - [x] update _config.js
    - [x] update _store.js
    - [x] update manifest.json
    - [ ] still need to add more tho -aitji