#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const root = process.cwd()
const chapterDir = path.join(root, 'config/ftbquests/quests/chapters')
const registryFile = "/home/gerald/.local/share/PrismLauncher/instances/Better Content-Playtest 4 - v1/minecraft/dump/registry_builtin/minecraft/item/_entries.txt"
const registry = fs.existsSync(registryFile) ? fs.readFileSync(registryFile, 'utf8') : ''
const knownItems = new Set([...registry.matchAll(/^([^\s]+)\s+raw_id=/gm)].map(m => m[1]))
const shouldValidateItems = knownItems.size > 0
for (const id of [
  'latent_chemlib:gas_capture',
  'latent_chemlib:gas_tank',
  'latent_chemlib:gas_reaction_chamber',
  'latent_chemlib:gas_release',
  'heatsync:coolant_exchanger',
  'procedural_bouquets:bouquet_grid',
  'procedural_bouquets:potted_bouquet',
  'creatingspace:basic_spacesuit_fabric',
  'creatingspace:advanced_spacesuit_fabric',
  'creatingspace:copper_oxygen_backtank',
  'creatingspace:netherite_oxygen_backtank',
  'creatingspace:mechanical_electrolyzer',
  'creatingspace:air_liquefier',
  'creatingspace:cryogenic_tank',
  'creatingspace:oxygen_sealer',
  'creatingspace:room_pressuriser',
  'creatingspace:engine_blueprint',
  'creatingspace:design_blueprint',
  'creatingspace:reinforced_copper_sheet',
  'creatingspace:monel_sheet',
  'creatingspace:inconel_sheet',
  'creatingspace:hastelloy_sheet',
  'creatingspace:combustion_chamber',
  'creatingspace:power_pack',
  'creatingspace:exhaust_pack',
  'creatingspace:rocket_engine',
  'creatingspace:rocket_casing',
  'creatingspace:rocket_controls',
  'undergarden:forgotten_upgrade_smithing_template',
  'protection_pixel:armorloadplatform',
  'protection_pixel:smallnetheritesheet',
  'protection_pixel:reinforcedfiber',
  'protection_pixel:heatresistantceramicsheet',
  'protection_pixel:alloyarmorplate',
  'protection_pixel:powerengine',
  'protection_pixel:heatoverlockingmechanism',
  'protection_pixel:equipmentkit',
  'protection_pixel:armorplatekit',
  'protection_pixel:linkplate_helmet',
  'protection_pixel:linkplate_chestplate',
  'protection_pixel:linkplate_leggings',
  'protection_pixel:linkplate_boots',
  'protection_pixel:steamectoskeleton',
  'protection_pixel:suspjetpack',
  'protection_pixel:maneuveringwing',
  'protection_pixel:workerhornet_chestplate',
  'protection_pixel:breaker_chestplate',
  'protection_pixel:typhoon_chestplate',
  'protection_pixel:closed_helmet',
  'protection_pixel:plague_helmet',
  'protection_pixel:nightdemon_helmet',
  'protection_pixel:bloodprisoner_helmet',
  'protection_pixel:anchorpoint_leggings',
  'protection_pixel:buoyancy_leggings',
  'protection_pixel:slingshot_leggings',
  'protection_pixel:wingsofprismas_chestplate',
  'tomeofblood:novice_tome_of_blood',
  'tomeofblood:apprentice_tome_of_blood',
  'tomeofblood:archmage_tome_of_blood',
  'tomeofblood:glyph_sentient_harm',
  'tomeofblood:glyph_sentient_wrath',
  'tomeofblood:living_mage_hood',
  'tomeofblood:living_mage_robes',
  'tomeofblood:living_mage_leggings',
  'tomeofblood:living_mage_boots',
  'starcatcher:starcatcher_rod',
  'starcatcher:starcatcher_guide',
  'starcatcher:starcatcher_twine',
  'starcatcher:hook',
  'starcatcher:bobber',
  'starcatcher:steady_bobber',
  'starcatcher:stone_hook',
  'starcatcher:murkwater_bait',
  'starcatcher:fish_radar',
  'starcatcher:waterlogged_satchel',
  'starcatcher:tournament_stand',
  'starcatcher:trophy_gold',
  'starcatcher:pinfish',
  'starcatcher:deepslatefish',
  'starcatcher:sculkfish',
  'starcatcher:magma_fish',
  'littlelogistics:energy_locomotive',
  'littlelogistics:energy_tug',
  'littlelogistics:vessel_charger',
  'littlelogistics:receiver_component',
  'littlelogistics:transmitter_component',
  'littlelogistics:fluid_barge',
  'littlelogistics:chest_barge',
  'apotheosis:gem_cutting_table',
  'apotheosis:salvaging_table',
  'apotheosis:simple_reforging_table',
  'apotheosis:reforging_table',
  'apotheosis:augmenting_table',
  'apotheosis:library',
  'apotheosis:ender_library',
  'apotheosis:deepshelf',
  'apotheosis:endshelf',
  'framedblocks:framed_cube',
  'framedblocks:framed_slab',
  'framedblocks:framed_stairs',
  'framedblocks:framed_slope',
  'framedblocks:framed_door',
  'framedblocks:framed_trapdoor',
  'framedblocks:framed_fence',
  'framedblocks:framed_wall',
  'wands:diamond_wand',
  'wands:netherite_wand',
  'buildinggadgets2:gadget_building',
  'buildinggadgets2:gadget_exchanging',
  'buildinggadgets2:gadget_copy_paste',
  'buildinggadgets2:gadget_cut_paste',
  'buildinggadgets2:gadget_destruction',
  'buildinggadgets2:template_manager',
  'create_sa:brass_drone',
  'sophisticatedbackpacks:feeding_upgrade',
  'sophisticatedbackpacks:alchemy_upgrade',
  'sophisticatedbackpacks:tool_swapper_upgrade'
]) knownItems.add(id)

const coinTierAliases = {
  starting: 'starting',
  copper: 'copper',
  iron: 'iron',
  tin: 'iron',
  bronze: 'brass',
  nickel: 'brass',
  silver: 'brass',
  steel: 'brass',
  brass: 'brass',
  gold: 'gold',
  osmium: 'gold',
  diamond: 'platinum',
  platinum: 'platinum',
  emerald: 'platinum',
  ruby: 'platinum',
  sapphire: 'platinum',
  topaz: 'platinum'
}
function activeTier(tier) { return coinTierAliases[tier] || 'copper' }
const tierCoins = {
  copper: ['copper'],
  iron: ['copper', 'iron'],
  brass: ['copper', 'iron', 'brass'],
  gold: ['copper', 'iron', 'brass', 'gold'],
  platinum: ['copper', 'iron', 'brass', 'gold', 'platinum']
}

const chapterGroups = {
  orientation: { id: '52D8800CDEBBF5D6', title: 'Orientation', order: 0 },
  routes: { id: '3570F9CE90E09BD1', title: 'Routes and Settlements', order: 1 },
  body: { id: '1535A2E7C7CA772B', title: 'Body and Blood', order: 2 },
  relics: { id: '6E0A7267C9728B31', title: 'Relics and Rewards', order: 3 },
  workshop: { id: '17D1B259E2B76A4F', title: 'Workshop Spine', order: 4 },
  create: { id: '4B746D4352454154', title: 'Create Systems', order: 5 },
  power: { id: '666B73C638A92906', title: 'Power and Control', order: 6 },
  worlds: { id: '3BF99559A31D6EB4', title: 'Worlds and Threats', order: 7 },
  matter: { id: '77AFAA45BDFC5D88', title: 'Magic and Matter', order: 8 },
  intelligence: { id: '410B481B7D8A23F1', title: 'Space and Intelligence', order: 9 },
  endgame: { id: '7D79E4B0E21B410D', title: 'Late Matter Branches', order: 10 },
  building: { id: '42544D4255494C44', title: 'Building Blocks', order: 11 }
}
function groupForChapter(chapter) { return (chapterGroups[chapter.group] || chapterGroups.workshop).id }
function chapterGroupsSnbt() {
  const used = new Set(chapters.map(ch => ch.group || 'workshop'))
  const groups = Object.entries(chapterGroups)
    .filter(([group]) => used.has(group))
    .map(([, g]) => `		{id:"${g.id}" order_index:${g.order} title:"${esc(g.title)}"}`)
  return `{
	chapter_groups: [
${groups.join(',\n')}
	]
}
`
}

function q(id, title, x, y, tasks, deps = [], description = []) { return { id, title, x, y, tasks, deps, description } }
function item(item, count = 1) { return { item, count } }
function itemAny(item, count = 1) { return { item, count, matchNbt: false } }
function uniqueIds(ids) { return [...new Set(ids)] }
function itemList(ids) { return uniqueIds(ids).map(id => item(id)) }
function itemAnyList(ids) { return uniqueIds(ids).map(id => itemAny(id)) }
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') }
function ftbId(seed) {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 16).toUpperCase()
}
function desc(lines) {
  const list = Array.isArray(lines) ? lines : [lines]
  return list.length ? ` description:[${list.map(line => `"${esc(line)}"`).join(',')}]` : ''
}
function itemLabel(id) {
  const explicit = {
    'minecraft:tnt': 'TNT',
    'ae2:spatial_io_port': 'Spatial IO Port',
    'kubejs:electrical_machine_casing': 'Electrical Machine Casing',
    'kubejs:electrical_machine_casing': 'Electrical Machine Casing',
    'kubejs:impossible_machine_casing': 'Impossible Machine Casing',
    'bloodmagic:blankslate': 'Blank Slate',
    'bloodmagic:reinforcedslate': 'Reinforced Slate',
    'bloodmagic:infusedslate': 'Imbued Slate',
	  'bloodmagic:demonslate': 'Demonic Slate',
	  'bloodmagic:etherealslate': 'Ethereal Slate',
	  'ticex:reconstruction_core': 'Reconstruction Core',
	  'ticex:flickering_reconstruction_core': 'Flickering Reconstruction Core',
	  'ticex:seared_rf_furnace': 'Seared RF Furnace',
	  'ticex:scorched_rf_furnace': 'Scorched RF Furnace',
    'creatingspace:basic_spacesuit_fabric': 'Basic Spacesuit Fabric',
    'creatingspace:advanced_spacesuit_fabric': 'Advanced Spacesuit Fabric',
    'creatingspace:copper_oxygen_backtank': 'Copper Oxygen Backtank',
    'creatingspace:netherite_oxygen_backtank': 'Netherite Oxygen Backtank',
    'creatingspace:mechanical_electrolyzer': 'Mechanical Electrolyzer',
    'creatingspace:air_liquefier': 'Air Liquefier',
    'creatingspace:cryogenic_tank': 'Cryogenic Tank',
    'creatingspace:oxygen_sealer': 'Oxygen Sealer',
    'creatingspace:room_pressuriser': 'Room Pressuriser',
    'creatingspace:engine_blueprint': 'Engine Blueprint',
    'creatingspace:design_blueprint': 'Design Blueprint',
    'creatingspace:reinforced_copper_sheet': 'Reinforced Copper Sheet',
    'creatingspace:monel_sheet': 'Monel Sheet',
    'creatingspace:inconel_sheet': 'Inconel Sheet',
    'creatingspace:hastelloy_sheet': 'Hastelloy Sheet',
    'creatingspace:combustion_chamber': 'Combustion Chamber',
    'creatingspace:power_pack': 'Power Pack',
    'creatingspace:exhaust_pack': 'Exhaust Pack',
    'protection_pixel:armorloadplatform': 'Armor Load Platform',
    'protection_pixel:smallnetheritesheet': 'Small Netherite Sheet',
    'protection_pixel:reinforcedfiber': 'Reinforced Fiber',
    'protection_pixel:heatresistantceramicsheet': 'Heat-Resistant Ceramic Sheet',
    'protection_pixel:alloyarmorplate': 'Alloy Armor Plate',
    'protection_pixel:powerengine': 'Power Engine',
    'protection_pixel:heatoverlockingmechanism': 'Heat Overlocking Mechanism',
    'protection_pixel:steamectoskeleton': 'Steam Ectoskeleton',
    'protection_pixel:wingsofprismas_chestplate': 'Wings of Prism AS',
    'tomeofblood:novice_tome_of_blood': 'Novice Tome of Blood',
    'tomeofblood:apprentice_tome_of_blood': 'Apprentice Tome of Blood',
    'tomeofblood:archmage_tome_of_blood': 'Archmage Tome of Blood',
    'tomeofblood:glyph_sentient_harm': 'Sentient Harm Glyph',
    'tomeofblood:glyph_sentient_wrath': 'Sentient Wrath Glyph',
    'tomeofblood:living_mage_hood': 'Living Mage Hood',
    'tomeofblood:living_mage_robes': 'Living Mage Robes',
    'tomeofblood:living_mage_leggings': 'Living Mage Leggings',
    'tomeofblood:living_mage_boots': 'Living Mage Boots',
    'starcatcher:starcatcher_rod': 'Starcatcher Rod',
    'starcatcher:starcatcher_guide': 'Starcatcher Guide',
    'starcatcher:starcatcher_twine': 'Starcatcher Twine',
    'starcatcher:hook': 'Iron Hook',
    'starcatcher:bobber': 'Bobber',
    'starcatcher:fish_radar': 'Fish Radar',
    'starcatcher:waterlogged_satchel': 'Waterlogged Satchel',
    'littlelogistics:energy_locomotive': 'Energy Locomotive',
    'littlelogistics:energy_tug': 'Energy Tug',
    'littlelogistics:vessel_charger': 'Vessel Charger',
    'apotheosis:gem_cutting_table': 'Gem Cutting Table',
    'apotheosis:reforging_table': 'Reforging Table',
    'apotheosis:library': 'Library',
    'framedblocks:framed_cube': 'Framed Cube',
    'buildinggadgets2:gadget_building': 'Building Gadget',
    'create_sa:brass_drone': 'Brass Drone'
  }
  if (explicit[id]) return explicit[id]
  const name = String(id).split(':').pop().replace(/[/.]/g, '_')
  return name.split('_').filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}
function taskLabels(tasks) {
  const labels = tasks.map(t => itemLabel(t.item))
  if (labels.length <= 3) return labels.join(', ')
  return `${labels.slice(0, 3).join(', ')}, and related items`
}
function playerQuestDescription(chapterPrefix, quest) {
  const goals = taskLabels(quest.tasks)
  const reason = {
    SO: 'This helps establish a reliable foothold before longer routes and early obelisk runs.',
    MG: 'This marks one of the major progress paths that leads toward later automation and site intelligence.',
    TC: 'This expands your metallurgy setup and improves how you turn deposits into useful materials.',
    TC1: 'This starts the early Tinkers metallurgy loop with seared infrastructure and reliable molten output.',
    TC2: 'This upgrades Tinkers into scorched and foundry-scale metallurgy for more controlled material conversion.',
    TA: 'This turns Tinkers tools and armor into a practical route-ready arsenal.',
    DE: 'This connects death trophies, blood, and slate crafting into the magic progression path.',
    FB: 'This improves food, water, and recovery for longer trips away from base.',
    F1: 'This builds the first kitchen and hydration baseline for reliable survival routes.',
    FII: 'This expands food infrastructure into fermentation, preservation, and brewed supplies.',
    BRW: 'This prepares extract lines from food and drink so brewing outcomes are engineered, not random.',
    PE: 'This finishes potion work using stabilized reagent and prepared extract pipelines.',
    FC: 'This catalogs food options so route planning can match meals to risk, distance, and environment.',
    C1: 'This starts Create infrastructure after early metallurgy is in place.',
    C2: 'This adds press work, plates, mixers, and manufactured components for larger machines.',
    CB: 'This turns brass into the main Create automation material and unlocks precision manufacturing.',
    CL: 'This expands Create into fluids, packages, signals, and controlled logistics devices.',
    SH: 'This develops rotational power and heat handling for your workshop.',
    GP: 'This turns rotational infrastructure into electricity and stored power.',
    FI: 'This combines coolant, fission, gas handling, and fusion readiness.',
    CAK: 'This connects Create automation to AE2 after local site intelligence exists.',
    OC: 'This adds computer control and communication for machines, routes, and remote sites.',
    SP: 'This prepares rockets, suits, and chemistry for space-era progression.',
    AE: 'This improves local storage, crafting, and information handling for a committed base site.',
    C3: 'This improves physical logistics so materials can move between sites by rail.',
    M1: 'This advances Blood Magic and opens the next set of magic systems.',
    M2: 'This expands late magic branches after the required Blood Magic materials are available.',
    S1: 'This begins chemical processing so deposits can provide more than a single metal output.',
    S2: 'This extends pressure, gas, and late chemical materials for advanced recipes.',
    AET: 'This advances the Aether route through sky materials, machines, and dungeon rewards.',
    BS: 'This advances Blue Skies exploration through local materials, keys, and boss rewards.',
    TW: 'This advances the Twilight Forest route through maps, bosses, and trophy materials.',
    LC: 'This advances Lost Cities as a space-era ruin route for scavenging, rail corridors, and urban recovery work.',
    UG: 'This advances Undergarden exploration through local metals, food, and deep materials.',
    DD: 'This advances deep sculk exploration and unlocks late materials from dangerous depths.',
    IAF: 'This advances monster hunting through dragon materials and apex creature rewards.',
    FW: 'This supports hazardous wasteland scavenging with protection, supplies, and recovered technology.',
    AN: 'This builds Ars Nouveau source infrastructure, spell work, rituals, and late spellcasting.',
    MAL: 'This builds Malum spirit work, runewood crafting, and soul-material processing.',
    OCC: 'This builds Occultism ritual work, spirit items, storage, and mining helpers.',
    BOT: 'This builds Botania mana infrastructure, runes, terrasteel, and boss rewards.',
    THG: 'This builds Theurgy transmutation machines and alchemical material processing.',
    RELQ: 'This builds Reliquary utility tools, apothecary work, and stronger relic items.',
    ART: 'This identifies useful artifact rewards that can improve travel, survival, and combat.',
    RLC: 'This develops Relics research and high-impact adventure rewards.',
    BK: 'This points you toward the in-game documentation for the systems you are using.',
    PC: 'This turns recurring pillager pressure into authored route work: scouting, staged defense, and recovery contracts.',
	    PA: 'This advances post-AE2 branches for stronger local manufacturing and body-scale upgrades.',
	    FU: 'This builds gas handling, magnetic containment, and plasma preparation for fusion work.',
	    TEX: 'This turns Tinkers into a post-AE2 body/tool branch using quantum control, fission hardware, and late magic.',
    PP: 'This turns post-AE2 manufacturing, fission heat, and extreme-depth chemistry into powered armor and body equipment.',
    TOB: 'This turns AE2-era control, Ethereal Slate, Ars spell work, and Demon Will into a late hybrid combat-magic branch.',
    SC: 'This treats fishing as a small economy: tackle, skill catches, satchels, trophies, and fisherman trades all become useful material routes.',
    LL: 'This adds small physical logistics for barges, tugs, rail cars, and local route automation without replacing Create trains.',
    AP: 'This adds affix, gem, salvage, and enchantment systems after Blood Magic permissions are strong enough to absorb the power spike.',
    BU: 'This covers construction acceleration tools that are intentionally delayed until AE2-era material control exists.',
    FBK: 'This expands decorative block choices through framed shapes, regional palettes, and settlement materials without making decor a deep machine gate.'
  }[chapterPrefix] || 'This advances the next part of the progression path.'
  return [
    `Goal: obtain ${goals}.`,
    `Why it matters: ${reason}`,
    ...(quest.description || [])
  ]
}
function chapterDescription(ch) {
  const text = {
    SO: ['Build a stable foothold, prepare your body, and reach the first molten-material tools.', 'Follow the line from shelter and supplies into Tinkers, Nether netherrack, and the first branch exits.'],
    MG: ['Use this overview to see how the main paths connect.', 'Each major node points toward a larger progression stream.'],
    TC: ['Use Tinkers to build early metallurgy and handle molten materials.', 'The path moves from seared work into scorched tools and foundry processing.'],
    TC1: ['Build the seared metallurgy baseline.', 'Smeltery control, molten primaries, and repair loops make early routes sustainable.'],
    TC2: ['Upgrade into scorched metallurgy and foundry-scale output.', 'Alloying, fuel handling, and foundry routing turn deposits into planned materials.'],
    TA: ['Survey the Tinkers combat and utility arsenal.', 'Choose tool forms for route pressure, then package a full armory for expeditions.'],
    DE: ['Use Still-Beating Hearts and Blood Magic to begin the magic path.', 'Death trophies lead into early blood tools and slate crafting.'],
    FB: ['Improve food, water, and body preparation for longer travel.', 'Kitchen and water infrastructure make expeditions safer and more repeatable.'],
    F1: ['Build a dependable early kitchen and hydration baseline.', 'Prepared meals and clean water make difficult routes survivable.'],
    FII: ['Extend the kitchen into fermentation and preserved supplies.', 'Portable food and brewed stock support long-distance logistics.'],
    BRW: ['Build extract pipelines from prepared food identity.', 'Kettle, cooking pot, and keg outputs become reusable brewing inputs.'],
    PE: ['Engineer potion outcomes from stabilized reagent and extracts.', 'Mobility, protection, recovery, and corruption routes become deliberate choices.'],
    FC: ['Use a full food catalogue for route planning.', 'Regional, dimensional, and fermented foods stay visible as practical options.'],
    C1: ['Begin Create after early metallurgy.', 'This chapter covers andesite alloy, hand power, deployers, casings, and first sustainable power.'],
    C2: ['Build the manufactured component layer.', 'Presses, plates, mixers, saws, drills, and mechanical crafting make Create into a workshop system.'],
    CB: ['Turn brass into Create automation authority.', 'Brass sheets, precision mechanisms, funnels, arms, speed control, and links become the main automation handoff.'],
    CL: ['Build Create logistics beyond belts.', 'Fluid handling, portable interfaces, packages, stock links, and addon logistics become authored local infrastructure.'],
    SH: ['Build Create SU and heat systems.', 'Water, wind, blaze heat, diesel, solar heat, and heat transport each have a distinct role.'],
    GP: ['Build Power Grid electricity and storage.', 'Generator parts, wiring, circuits, relays, and batteries turn SU infrastructure into stored power.'],
    FI: ['Build fission and fusion readiness.', 'Coolant, reactor hardware, gas handling, AE2 control, and plasma equipment form the late power chain.'],
    CAK: ['Bridge Create automation into AE2.', 'Use this chapter after AE2 control to automate processors and expose local AE2 work to Create infrastructure.'],
    OC: ['Add OC2R computers and networking to your sites.', 'Use these tools to observe, coordinate, and control machines and routes.'],
    SP: ['Prepare for space work with suits, oxygen systems, rocket engine manufacturing, and chemical machines.', 'The flow is left to right: table, casing, survival equipment, oxygen handling, engine manufacturing, rocket body/control, chemical synthesis, then advanced suit work.'],
    AE: ['Build AE2 as local site intelligence.', 'Storage, processors, controllers, and pattern work make a base easier to operate.'],
    C3: ['Build train logistics for moving materials between sites.', 'Stations, signals, schedules, and yards make routes reliable.'],
    M1: ['Advance Blood Magic and open the first magic branches.', 'Slates mark which workstations and systems are ready to use.'],
    M2: ['Expand into stronger magic systems after the earlier slate path.', 'These branches add storage, transmutation, dimensional magic, and late Ars tools.'],
    S1: ['Start chemical processing for deposits and materials.', 'Create mixer acid and grinding-ball work turns geology into multiple useful outputs.'],
    S2: ['Extend chemical processing into pressure, gas, and late plates.', 'Use these materials for advanced synthesis and machinery.'],
    AET: ['Explore the Aether and collect sky materials and dungeon rewards.', 'Prepare for travel, keys, and gravitite progression.'],
    BS: ['Explore Blue Skies through materials, alchemy, keys, and trophies.', 'Each key path supports a different part of the dimension route.'],
    TW: ['Progress through Twilight Forest bosses and reward materials.', 'Maps, trophies, and boss drops mark your route through the dimension.'],
    LC: ['Explore Lost Cities as a space-era ruin route.', 'Use suit, oxygen, and rocket logistics before treating city scavenging as available.'],
    UG: ['Explore the Undergarden and collect its local metals and materials.', 'Food, ores, and forgotten gear support deeper route planning.'],
    DD: ['Enter deeper sculk content and collect late depth materials.', 'Prepare carefully before pursuing resonarium and soul materials.'],
    IAF: ['Hunt major creatures and collect dragon materials.', 'Dragon blood, dragonsteel, skulls, and dread materials mark major combat progress.'],
    FW: ['Scavenge hazardous wasteland materials and technology.', 'Protection, scrap, electronics, and power armor parts support late route work.'],
    AN: ['Build Ars Nouveau source and spell infrastructure.', 'Move from imbuement and apparatus work into rituals and late spell books.'],
    MAL: ['Develop Malum spirit work and soul materials.', 'Runewood, spirit jars, and crucibles support the later Malum branch.'],
    OCC: ['Develop Occultism rituals, storage, and spirit helpers.', 'Chalk, bowls, gems, miners, and Iesnium form the core path.'],
    BOT: ['Build Botania mana engineering.', 'Mana pools, spreaders, runes, terrasteel, Alfheim, and Gaia rewards form the branch.'],
    THG: ['Develop Theurgy as magical material processing.', 'Accumulators, salts, distillation, calcination, and digestion form the chain.'],
    RELQ: ['Build Reliquary utility and relic crafting.', 'Apothecary tools, Alkahestry, weapons, and chalices support specialized utility.'],
    ART: ['Track useful artifact rewards from exploration.', 'These items support mobility, survival, combat, and recovery.'],
    RLC: ['Track Relics research and high-value relic rewards.', 'Use the research table and relic finds to expand adventure tools.'],
    BK: ['Find reference books for major systems.', 'These quests point to documentation without making books the main gate.'],
	    PA: ['Advance post-AE2 branches.', 'Quantum structures, extended AE tools, source storage, and body-branch infrastructure extend late progression.'],
	    FU: ['Build fusion and plasma infrastructure.', 'Gas handling, electricity, containment, and ionization prepare the branch for fusion work.'],
	    TEX: ['Advance TiCEX as a post-AE2 Tinkers branch.', 'Reconstruction cores, RF furnaces, transmutation, Od, and Etheric materials turn late infrastructure back into tools.'],
    PP: ['Build Protection Pixel as the post-AE2 armor branch.', 'Armor platforms, quantum components, fission heat, and late plates become body-scale equipment and mobility rewards.'],
    TOB: ['Build Tome of Blood as a post-AE2 combat-magic branch.', 'AE2-era control, Ethereal Slate, Ars spell books, Demon Will weapons, and Living Armor combine into late spellcasting and hybrid armor.'],
    SC: ['Use Starcatcher as a fishing economy route.', 'Tackle, bait, fish, satchels, trophies, and Fisherman trades make water routes useful without becoming the main material faucet.'],
    PC: ['Treat Pillager Campaigns as authored overworld pressure rather than random noise.', 'Scout, defend, and recover; then convert raid pressure into contracts, coin float, and safer route planning.'],
    LL: ['Use Little Logistics for small physical route automation.', 'Barges, tugs, energy vehicles, and transmitter components support local routes before long-distance trains dominate.'],
    AP: ['Use Apotheosis as an authored combat and enchantment power branch.', 'Gem cutting, salvaging, reforging, libraries, and high shelves are strong enough to need Blood Magic tier gates.'],
    BU: ['Use building tools after AE2-era control.', 'Wands and gadgets accelerate construction once the pack can support large material edits.'],
    FBK: ['Survey building block systems in the pack.', 'Framed shapes, settlement materials, weathered blocks, regional palettes, and construction tools are shown as practical building options.']
  }[ch.prefix]
  return text || ['Follow this chapter to advance the next part of progression.']
}
const questIdMap = new Map()
const chapterIdMap = new Map()
function questFtbId(id) {
  const mapped = questIdMap.get(id)
  if (!mapped) throw new Error(`Missing generated FTB quest id for ${id}`)
  return mapped
}
function taskSnbt(chapter, quest, t, idx) {
  const count = t.count && t.count !== 1 ? ` count:${t.count}L` : ''
  const nbt = t.matchNbt === false ? ' match_nbt:false' : ''
  return `{id:"${ftbId(`task:${chapter}:${quest}:${idx}`)}" type:"item" item:"${t.item}"${count}${nbt}}`
}
const defaultFlowVisual = { shape: 'rsquare', subtitle: 'Process', size: 1.0, iconScale: 1.0 }
const visualByPrefix = {
  BK: { shape: 'none', subtitle: 'Reference', size: 0.9, iconScale: 1.0 }
}
const majorQuestSize = 1.75
const majorQuestIconScale = 1.18
const importantQuestIds = {
  SO: ['SO_MELTERY', 'SO_EXIT_TECH', 'SO_EXIT_MAGIC'],
  MG: ['MG_START', 'MG_AE2', 'MG_POST_AE2'],
  TC: ['TC_SEARED_CASE', 'TC_FOUNDRY'],
  TC1: ['TC_SEARED_CASE', 'TC_SMELTERY', 'TC_REPAIR_LOOP'],
  TC2: ['TC_FOUNDRY', 'TC_MOLTEN_LOGISTICS'],
  TA: ['TC_SHOWCASE_CORE_TOOLS', 'TC_SHOWCASE_LATE_TOOLS', 'TA_ROUTE_ARMORY'],
  DE: ['DE_HEART', 'DE_WEAK_ORB', 'DE_BLANK'],
  FB: ['FB_STOVE', 'FB_FILTER', 'FB_POTION_ENGINEERING'],
  F1: ['FB_CUTTING', 'FB_STOVE', 'FI_ROUTE_TABLE'],
  FII: ['FB_KETTLE', 'FB_KEG', 'FII_STOCKPILE'],
  BRW: ['FB_COOKED_EXTRACTS', 'FB_KETTLE_INFUSIONS', 'BRW_EXTRACTION_SUITE'],
  PE: ['FB_ADVANCED_EXTRACTS', 'FB_POTION_ENGINEERING', 'PE_EFFECT_LOADOUT'],
  FC: ['FB_SHOWCASE_FARMERS', 'FB_SHOWCASE_NETHER_END_OCEAN', 'FC_EXPEDITION_MENU'],
  C1: ['C1_ALLOY', 'C1_CASING', 'C1_CRUSHED'],
  C2: ['C2_ANDESITE_CASE', 'C2_PRESS', 'C2_CRAFTER'],
  CB: ['C2_BRASS_INGOT', 'C2_PRECISION', 'C2_BRASS'],
  CL: ['CL_FLUID_HANDLING', 'CL_PACKAGE_NETWORK', 'CL_ADDON_LOGISTICS'],
  C3: ['C3_TRACK_COUPLER', 'C3_STATION', 'C3_YARD'],
  SH: ['SH_WATER', 'SH_BLAZE', 'SH_STIRLING'],
  GP: ['GP_CASE', 'GP_BATTERY', 'GP_RELAY'],
  FI: ['FI_FISSION_ROD', 'FI_AE_CONTROL', 'FI_READY'],
  CAK: ['CAK_ENERGY_PROVIDER', 'CAK_ME_PROXY', 'CAK_PROCESSORS'],
  OC: ['OC_TRANSISTOR', 'OC_COMPUTER', 'OC_NETWORK'],
  SP: ['SP_CASE', 'SP_CHEM', 'SP_SUIT_ADV'],
  AE: ['AE_CASE', 'AE_CONTROLLER', 'AE_SPATIAL'],
  M1: ['M1_BLANK', 'M1_DEMONIC', 'M1_ETHEREAL'],
  M2: ['M2_BOTANIA_TERRA', 'M2_THEURGY', 'M2_ARS_POWER'],
  AD: ['AD_COIN', 'AD_COMPLETED', 'AD_IRON_FLOAT'],
  VE: ['VE_TRADING_POST', 'VE_COMPLETED', 'VE_BRASS_COIN_TIER'],
  PC: ['PC_SCOUT', 'PC_COMMAND_POST', 'PC_BATTLE_STANDARD'],
  S1: ['S1_MIXER', 'S1_BALLS', 'S1_SYNTHESIS_EXIT'],
  S2: ['S2_PRESSURE', 'S2_THERMO', 'S2_IRIDIUM'],
  BK: ['BK_QUEST_BOOK', 'BK_TCON', 'BK_MNA'],
  PA: ['PA_QUANTUM_STRUCTURE', 'PA_SOURCE_BRIDGE', 'PA_POWERED_ARMOR_BRANCH'],
		  TEX: ['TEX_RECONSTRUCTION', 'TEX_TRANSMUTER', 'TEX_ETHERIC'],
  PP: ['PP_PLATFORM', 'PP_POWER_ENGINE', 'PP_AS_UPGRADES'],
  TOB: ['TOB_NOVICE', 'TOB_HERETIC_ARMOR', 'TOB_ARCHMAGE'],
  SC: ['SC_ROD', 'SC_ECONOMY', 'SC_TROPHY'],
  LL: ['LL_TUG', 'LL_CHARGER', 'LL_SIGNAL'],
  AP: ['AP_GEM_CUTTING', 'AP_REFORGING', 'AP_LIBRARY'],
  BU: ['BU_WAND', 'BU_GADGET', 'BU_DESTRUCTION'],
  FBK: ['FBK_FRAMED_CORE', 'FBK_SETTLEMENT', 'FBK_REGIONAL'],
  AET: ['AET_ALTAR', 'AET_SILVER_KEY', 'AET_GOLD_KEY'],
  BS: ['BS_ALCHEMY', 'BS_BLINDING_KEY', 'BS_BOSS_TROPHY'],
  TW: ['TW_MAGIC_MAP', 'TW_LICH', 'TW_UR_GHAST'],
  LC: ['LC_SPACE_ROUTE', 'LC_RAIL_DUNGEON', 'LC_CITY_RECOVERY'],
  UG: ['UG_CLOGGRUM', 'UG_FORGOTTEN', 'UG_FORGOTTEN_ARMING'],
  DD: ['DD_HEART', 'DD_RESONARIUM', 'DD_SOUL'],
  IAF: ['IAF_BESTIARY', 'IAF_DRAGONSTEEL', 'IAF_DREAD'],
  FW: ['FW_SPACE_ROUTE', 'FW_POWER_CORE', 'FW_POWER_ARMOR'],
  AN: ['AN_IMBUEMENT', 'AN_APPARATUS', 'AN_ARCHMAGE'],
  MAL: ['MAL_ALTAR', 'MAL_SPIRIT_CRUCIBLE', 'MAL_SOUL_STEEL'],
  OCC: ['OCC_RITUAL_BOWLS', 'OCC_STORAGE', 'OCC_DIMENSIONAL_MATRIX'],
  BOT: ['BOT_MANA_POOL', 'BOT_TERRA_PLATE', 'BOT_GAIA'],
  THG: ['THG_ACCUMULATOR', 'THG_DISTILLER', 'THG_DIGESTION'],
  RELQ: ['RELQ_APOTHECARY', 'RELQ_ALKAHESTRY', 'RELQ_CHALICE'],
  ART: ['ART_HEART', 'ART_ATTRACTOR', 'ART_FIRE'],
  RLC: ['RLC_TABLE', 'RLC_MAGIC_MIRROR', 'RLC_SPACE']
}
function visualForQuest(prefix, quest) {
  const base = visualByPrefix[prefix] || defaultFlowVisual
  const title = quest.title || ''
  const isImportant = (importantQuestIds[prefix] || []).indexOf(quest.id) !== -1
  const importantSize = isImportant ? majorQuestSize : null
  const importantIconScale = isImportant ? majorQuestIconScale : null
  if (title.startsWith('Exit:')) return { ...base, shape: 'diamond', subtitle: 'Exit', size: importantSize || 1.12, iconScale: importantIconScale || base.iconScale, minWidth: 2 }
  if (/Machine Casing|Casing/.test(title)) return { ...base, shape: 'square', subtitle: 'Milestone', size: importantSize || 1.12, minWidth: 2, iconScale: importantIconScale || 0.95 }
  if (/Step \d+:/.test(title)) return { ...base, shape: 'rsquare', subtitle: title.match(/Step \d+/)?.[0] || 'Step', size: importantSize || base.size, iconScale: importantIconScale || base.iconScale, minWidth: 2 }
  if (/Permission|Gate/.test(title)) return { ...base, shape: 'diamond', subtitle: 'Milestone', size: importantSize || 1.12, iconScale: importantIconScale || base.iconScale, minWidth: 2 }
  if (/Source:|Heat Source:/.test(title)) return { ...base, shape: 'rsquare', subtitle: 'Source option', size: 1.0, minWidth: 2 }
  if (/Showcase:|Catalogue:/.test(title)) return { ...base, shape: 'octagon', subtitle: 'Showcase', size: importantSize || 1.05, iconScale: importantIconScale || base.iconScale, minWidth: 2 }
  if (/Coin|Float|Trade|Market|Contract|Delivery/.test(title)) return { ...base, shape: 'rsquare', subtitle: 'Economy', size: importantSize || base.size, iconScale: importantIconScale || base.iconScale, minWidth: 2 }
  if (/Reference|Book|Guide|Manual|Encyclopedia|Codex/.test(title)) return { ...base, shape: 'none', subtitle: 'Reference', size: importantSize || 0.9, iconScale: importantIconScale || base.iconScale }
  return { ...base, size: importantSize || base.size, iconScale: importantIconScale || base.iconScale }
}
function displayQuestTitle(title) {
  return title
    .replace(/\bPermission\b/g, 'Access')
    .replace(/\bGate\b/g, 'Milestone')
    .replace(/\bAuthority\b/g, 'Setup')
    .replace(/^No Free SU Transport$/, 'SU Transport Losses')
    .replace(/^Site Storage, Not Global Logistics$/, 'Site Storage')
    .replace(/^AE2 Control Permission$/, 'AE2 Control Access')
}
function rewards(chapter, quest, tier) {
  if (tier === 'starting') return `[{id:"${ftbId(`reward:${chapter}:${quest}:0`)}" type:"item" item:"dotcoinmod:copper_coin" count:4}]`
  const list = tierCoins[activeTier(tier)] || ['copper']
  return '[' + list.map((coin, i) => `{id:"${ftbId(`reward:${chapter}:${quest}:${i}`)}" type:"item" item:"dotcoinmod:${coin}_coin" count:4}`).join(',') + ']'
}
function questSnbt(chapterPrefix, tier, quest) {
  const deps = quest.deps?.length ? ` dependencies:[${quest.deps.map(d => `"${questFtbId(d)}"`).join(',')}]` : ''
  const text = playerQuestDescription(chapterPrefix, quest)
  const v = visualForQuest(chapterPrefix, quest)
  const minWidth = v.minWidth ? ` min_width:${v.minWidth}` : ''
  return `\t\t{id:"${questFtbId(quest.id)}"${deps} hide_dependency_lines:false hide_dependent_lines:false disable_jei:false title:"${esc(displayQuestTitle(quest.title))}" subtitle:"${esc(v.subtitle)}" icon:"${quest.tasks[0].item}" shape:"${v.shape}" size:${v.size.toFixed(2)}d icon_scale:${v.iconScale.toFixed(2)}d${minWidth}${desc(text)} x:${quest.x.toFixed(1)}d y:${quest.y.toFixed(1)}d rewards:${rewards(chapterPrefix, quest.id, tier)} tasks:[${quest.tasks.map((t, i) => taskSnbt(chapterPrefix, quest.id, t, i + 1)).join(',')}]}`
}
function chapterSnbt(ch) {
  return `{
\tdefault_hide_dependency_lines: false
\tdefault_quest_shape: "${visualByPrefix[ch.prefix]?.shape || defaultFlowVisual.shape}"
\tfilename: "${ch.filename}"
\tgroup: "${groupForChapter(ch)}"
\tid: "${chapterIdMap.get(ch.filename)}"
\torder_index: ${ch.order}
\ttitle: "${esc(ch.title)}"
\tdescription: [${chapterDescription(ch).map(line => `"${esc(line)}"`).join(',')}]
\tquests: [
${ch.quests.map(qt => questSnbt(ch.prefix, ch.tier, qt)).join('\n')}
\t]
}
`
}

const foodShowcase = {
  vanilla: [
    'minecraft:apple', 'minecraft:baked_potato', 'minecraft:beetroot', 'minecraft:beetroot_soup', 'minecraft:bread',
    'minecraft:carrot', 'minecraft:chorus_fruit', 'minecraft:cod', 'minecraft:cooked_beef', 'minecraft:cooked_chicken',
    'minecraft:cooked_cod', 'minecraft:cooked_mutton', 'minecraft:cooked_porkchop', 'minecraft:cooked_rabbit',
    'minecraft:cooked_salmon', 'minecraft:cookie', 'minecraft:dried_kelp', 'minecraft:glow_berries',
    'minecraft:golden_apple', 'minecraft:golden_carrot', 'minecraft:honey_bottle', 'minecraft:melon_slice',
    'minecraft:mushroom_stew', 'minecraft:poisonous_potato', 'minecraft:porkchop', 'minecraft:potato',
    'minecraft:pufferfish', 'minecraft:pumpkin_pie', 'minecraft:rabbit', 'minecraft:rabbit_stew',
    'minecraft:rotten_flesh', 'minecraft:salmon', 'minecraft:spider_eye', 'minecraft:suspicious_stew',
    'minecraft:sweet_berries'
  ],
  farmersDelight: [
    'farmersdelight:apple_cider', 'farmersdelight:apple_pie', 'farmersdelight:apple_pie_slice',
    'farmersdelight:bacon', 'farmersdelight:bacon_and_eggs', 'farmersdelight:bacon_sandwich',
    'farmersdelight:baked_cod_stew', 'farmersdelight:barbecue_stick', 'farmersdelight:beef_patty',
    'farmersdelight:beef_stew', 'farmersdelight:bone_broth', 'farmersdelight:cake_slice',
    'farmersdelight:chicken_cuts', 'farmersdelight:chicken_sandwich', 'farmersdelight:chicken_soup',
    'farmersdelight:chocolate_pie', 'farmersdelight:chocolate_pie_slice', 'farmersdelight:cod_roll',
    'farmersdelight:cod_slice', 'farmersdelight:cooked_bacon', 'farmersdelight:cooked_chicken_cuts',
    'farmersdelight:cooked_cod_slice', 'farmersdelight:cooked_mutton_chops', 'farmersdelight:cooked_rice',
    'farmersdelight:cooked_salmon_slice', 'farmersdelight:dumplings', 'farmersdelight:egg_sandwich',
    'farmersdelight:fish_stew', 'farmersdelight:fried_egg', 'farmersdelight:fried_rice',
    'farmersdelight:fruit_salad', 'farmersdelight:glow_berry_custard', 'farmersdelight:grilled_salmon',
    'farmersdelight:ham', 'farmersdelight:hamburger', 'farmersdelight:honey_cookie',
    'farmersdelight:honey_glazed_ham', 'farmersdelight:hot_cocoa', 'farmersdelight:kelp_roll',
    'farmersdelight:kelp_roll_slice', 'farmersdelight:melon_juice', 'farmersdelight:melon_popsicle',
    'farmersdelight:minced_beef', 'farmersdelight:mixed_salad', 'farmersdelight:mushroom_rice',
    'farmersdelight:mutton_chops', 'farmersdelight:mutton_wrap', 'farmersdelight:nether_salad',
    'farmersdelight:noodle_soup', 'farmersdelight:pasta_with_meatballs', 'farmersdelight:pasta_with_mutton_chop',
    'farmersdelight:pumpkin_slice', 'farmersdelight:pumpkin_soup', 'farmersdelight:rice',
    'farmersdelight:roast_chicken', 'farmersdelight:roasted_mutton_chops', 'farmersdelight:salmon_roll',
    'farmersdelight:salmon_slice', 'farmersdelight:shepherds_pie', 'farmersdelight:smoked_ham',
    'farmersdelight:squid_ink_pasta', 'farmersdelight:steak_and_potatoes', 'farmersdelight:stuffed_potato',
    'farmersdelight:sweet_berry_cheesecake', 'farmersdelight:sweet_berry_cheesecake_slice',
    'farmersdelight:sweet_berry_cookie', 'farmersdelight:tomato_sauce', 'farmersdelight:vegetable_noodles',
    'farmersdelight:vegetable_soup'
  ],
  drinksAndFerments: [
    'farmersrespite:black_tea', 'farmersrespite:coffee', 'farmersrespite:dandelion_tea',
    'farmersrespite:gamblers_tea', 'farmersrespite:green_tea', 'farmersrespite:green_tea_cookie',
    'farmersrespite:long_apple_cider', 'farmersrespite:long_black_tea', 'farmersrespite:long_coffee',
    'farmersrespite:long_dandelion_tea', 'farmersrespite:long_gamblers_tea', 'farmersrespite:long_green_tea',
    'farmersrespite:long_purulent_tea', 'farmersrespite:long_rose_hip_tea', 'farmersrespite:long_yellow_tea',
    'farmersrespite:purulent_tea', 'farmersrespite:rose_hip_pie', 'farmersrespite:rose_hip_pie_slice',
    'farmersrespite:rose_hip_tea', 'farmersrespite:strong_apple_cider', 'farmersrespite:strong_black_tea',
    'farmersrespite:strong_coffee', 'farmersrespite:strong_gamblers_tea', 'farmersrespite:strong_green_tea',
    'farmersrespite:strong_hot_cocoa', 'farmersrespite:strong_melon_juice', 'farmersrespite:strong_purulent_tea',
    'farmersrespite:strong_rose_hip_tea', 'farmersrespite:strong_yellow_tea', 'farmersrespite:tea_curry',
    'farmersrespite:yellow_tea', 'brewinandchewin:apple_jelly', 'brewinandchewin:beer',
    'brewinandchewin:bloody_mary', 'brewinandchewin:cheesy_pasta', 'brewinandchewin:cocoa_fudge',
    'brewinandchewin:creamy_onion_soup', 'brewinandchewin:dread_nog', 'brewinandchewin:egg_grog',
    'brewinandchewin:fiery_fondue', 'brewinandchewin:flaxen_cheese_wedge',
    'brewinandchewin:glittering_grenadine', 'brewinandchewin:glow_berry_marmalade',
    'brewinandchewin:ham_and_cheese_sandwich', 'brewinandchewin:horror_lasagna',
    'brewinandchewin:jerky', 'brewinandchewin:kimchi', 'brewinandchewin:kippers',
    'brewinandchewin:mead', 'brewinandchewin:pale_jane', 'brewinandchewin:pizza',
    'brewinandchewin:pizza_slice', 'brewinandchewin:quiche', 'brewinandchewin:quiche_slice',
    'brewinandchewin:red_rum', 'brewinandchewin:rice_wine', 'brewinandchewin:saccharine_rum',
    'brewinandchewin:salty_folly', 'brewinandchewin:scarlet_cheese_wedge',
    'brewinandchewin:scarlet_pierogi', 'brewinandchewin:strongroot_ale',
    'brewinandchewin:sweet_berry_jam', 'brewinandchewin:vegetable_omelet',
    'brewinandchewin:vodka', 'brewinandchewin:withering_dross'
  ],
  fieldCrops: [
    'veggiesdelight:rice_and_vegetables', 'veggiesdelight:cauliflower_soup', 'veggiesdelight:stuffed_bellpepper',
    'veggiesdelight:garlic_bread', 'veggiesdelight:stuffed_zucchini_boat', 'veggiesdelight:pasta_with_broccoli',
    'veggiesdelight:bellpepper', 'veggiesdelight:cauliflower', 'veggiesdelight:garlic', 'veggiesdelight:sweet_potato',
    'veggiesdelight:zucchini', 'corn_delight:boiled_corn', 'corn_delight:creamy_corn_drink', 'corn_delight:caramel_popcorn',
    'corn_delight:cornbread', 'corn_delight:corn_dog', 'corn_delight:corn_soup', 'corn_delight:grilled_corn',
    'corn_delight:tortilla', 'corn_delight:creamed_corn', 'corn_delight:grilled_corn', 'corn_delight:nachos_bowl',
    'corn_delight:popcorn', 'rusticdelight:bell_pepper_soup', 'rusticdelight:coffee', 'rusticdelight:cooked_calamari',
    'rusticdelight:cooked_calamari_slice', 'rusticdelight:calamari', 'rusticdelight:fried_mushrooms',
    'delightful:marshmallow_stick', 'rusticdelight:batter', 'rusticdelight:roasted_coffee_beans',
    'rusticdelight:bell_pepper_pasta', 'rusticdelight:calamari_slice', 'rusticdelight:stuffed_bell_pepper_red',
    'rusticdelight:calamari_roll'
  ],
  delightful: [
    'delightful:acorn', 'delightful:azalea_tea', 'delightful:baklava', 'delightful:berry_matcha_latte',
    'delightful:cactus_chili', 'delightful:cantaloupe', 'delightful:cantaloupe_bread',
    'delightful:cheeseburger', 'delightful:chorus_muffin', 'delightful:coconut_curry',
    'delightful:cooked_goat', 'delightful:ender_nectar', 'delightful:glow_jam_cookie',
    'delightful:glow_jam_jar', 'delightful:marshmallow_stick',
    'delightful:matcha_gummy', 'delightful:matcha_ice_cream', 'delightful:matcha_latte',
    'delightful:mini_melon', 'delightful:mulberry_pie_slice', 'delightful:mutton_pie_slice',
    'delightful:nut_butter_and_jam_sandwich', 'delightful:passion_fruit_tart_slice',
    'delightful:rock_candy', 'delightful:salmon_and_roe_blini', 'delightful:salmonberry_milkshake',
    'delightful:salmonberry_pie', 'delightful:sinigang', 'delightful:smore',
    'delightful:source_berry_cookie', 'delightful:source_berry_gummy',
    'delightful:source_berry_ice_cream', 'delightful:source_berry_milkshake',
    'delightful:source_berry_pie_slice', 'delightful:wrapped_cantaloupe'
  ],
  netherEndOcean: [
    'mynethersdelight:egg_soup', 'mynethersdelight:bleeding_tartar', 'mynethersdelight:breakfast_sampler',
    'mynethersdelight:burnt_roll', 'mynethersdelight:crimson_stroganoff', 'mynethersdelight:deviled_egg',
    'mynethersdelight:ghasta', 'mynethersdelight:hot_cream', 'mynethersdelight:hot_wings',
    'mynethersdelight:plate_of_stuffed_hoglin_ham', 'mynethersdelight:plate_of_stuffed_hoglin_snout',
    'mynethersdelight:plate_of_stuffed_hoglin', 'mynethersdelight:sausage_and_potatoes',
    'mynethersdelight:strider_slice', 'mynethersdelight:red_loin_on_a_stick', 'mynethersdelight:hotdog_with_nether_salad',
    'mynethersdelight:hotdog_with_mixed_salad', 'mynethersdelight:spicy_noodle_soup', 'ends_delight:chorus_fruit_grain',
    'ends_delight:chorus_fruit_milk_tea', 'ends_delight:chorus_fruit_pie_slice', 'ends_delight:dragon_breath_and_chorus_soup',
    'ends_delight:dragon_breath_soda', 'ends_delight:dragon_leg_with_sauce', 'ends_delight:dragon_meat_stew',
    'ends_delight:dried_endermite_meat', 'ends_delight:end_barbecue_stick', 'ends_delight:end_mixed_salad',
    'ends_delight:enderman_gristle_stew', 'ends_delight:grilled_shulker', 'ends_delight:liquid_dragon_egg',
    'ends_delight:roasted_dragon_meat_cuts', 'ends_delight:roasted_shulker_meat', 'ends_delight:shulker_meat',
    'oceansdelight:seagrass_salad', 'oceansdelight:baked_tentacle_on_a_stick', 'oceansdelight:bowl_of_guardian_soup',
    'oceansdelight:braised_sea_pickle', 'oceansdelight:cabbage_wrapped_elder_guardian', 'oceansdelight:cut_tentacles',
    'oceansdelight:elder_guardian_roll', 'oceansdelight:elder_guardian_slice', 'oceansdelight:fugu_roll',
    'oceansdelight:guardian', 'oceansdelight:guardian_soup', 'oceansdelight:guardian_tail', 'oceansdelight:honey_fried_kelp',
    'oceansdelight:stuffed_cod', 'oceansdelight:tentacle_on_a_stick'
  ],
  regionalDelights: [
    'ubesdelight:lumpia', 'ubesdelight:ensaymada', 'ubesdelight:chicken_inasal',
    'ubesdelight:condensed_milk_bottle', 'ubesdelight:garlic_chop', 'ubesdelight:sinangag',
    'ubesdelight:halo_halo', 'ubesdelight:milk_tea_ube', 'ubesdelight:pandesal', 'ubesdelight:pandesal_ube',
    'ubesdelight:polvorone', 'ubesdelight:ube', 'ubesdelight:ube_cake_slice', 'ubesdelight:cookie_ube',
    'ubesdelight:polvorone_ube', 'ubesdelight:ube_cake_slice', 'ubesdelight:halo_halo', 'ubesdelight:milk_tea_ube',
    'ubesdelight:ensaymada_ube', 'ubesdelight:cookie_ube', 'ubesdelight:lumpia',
    'undergardendelight:blood_tomato_soup', 'undergardendelight:depth_shroom_cream_soup',
    'undergardendelight:gloomgourd_pie_slice', 'undergardendelight:scintling_stew',
    'undergardendelight:mogsteak', 'undergardendelight:gronglunch', 'undergardendelight:glitterdish',
    'undergardendelight:cooked_gloomper_cuts', 'undergardendelight:cooked_gwibling_fillet', 'undergardendelight:gronglet_roll',
    'undergardendelight:cooked_gwibling_fillet', 'undergardendelight:cooked_gwibling_fillet', 'undergardendelight:cooked_gwibling_fillet',
    'undergardendelight:droopstew', 'undergardendelight:stuffed_gloomgourd_bowl', 'undergardendelight:underbean_salad',
    'undergardendelight:dweller_meat_slice', 'undergardendelight:raw_gloomper_cuts', 'undergardendelight:raw_gwibling_fillet',
    'undergardendelight:cooked_dweller_meat_slice', 'undergardendelight:shimmerpearl', 'undergardendelight:gronglet_with_roasted_veggies',
    'undergardendelight:baked_gwibling_and_vegetables', 'undergardendelight:glitterwrap', 'undergardendelight:droopstew',
    'undergardendelight:depth_shroom_cream_soup', 'undergardendelight:stuffed_gloomgourd'
  ]
}

const tconShowcase = {
  coreTools: [
    'tconstruct:pickaxe', 'tconstruct:hand_axe', 'tconstruct:mattock', 'tconstruct:kama',
    'tconstruct:sledge_hammer', 'tconstruct:excavator', 'tconstruct:vein_hammer',
    'tconstruct:broad_axe', 'tconstruct:pickadze', 'tconstruct:war_pick'
  ],
  meleeWeapons: [
    'tconstruct:sword', 'tconstruct:dagger', 'tconstruct:cleaver', 'tconstruct:battlesign',
    'tconstruct:melting_pan', 'tconstruct:swasher', 'tconstruct:flint_and_brick', 'tconstruct:minotaur_axe',
    'tinkersweaponry:greatsword', 'tinkersweaponry:lance', 'tinkersweaponry:pike',
    'tinkers_battle_spades:battle_spade', 'additionalweaponry:butcher_knife',
    'additionalweaponry:cutlass', 'additionalweaponry:pitchfork', 'additionalweaponry:scepter',
    'additionalweaponry:sniffer_claws', 'additionalweaponry:wrench'
  ],
  rangedWeapons: [
    'tconstruct:longbow', 'tconstruct:crossbow', 'tconstruct:arrow', 'tconstruct:javelin',
    'tconstruct:shuriken', 'tconstruct:throwing_axe', 'tconstruct:crystalshot',
    'additionalweaponry:arrow_sling', 'tinkers_advanced:ionized_cannon'
  ],
  armorAndTravel: [
    'tconstruct:travelers_helmet', 'tconstruct:travelers_chestplate', 'tconstruct:travelers_leggings',
    'tconstruct:travelers_boots', 'tconstruct:travelers_shield', 'tconstruct:plate_helmet',
    'tconstruct:plate_chestplate', 'tconstruct:plate_leggings', 'tconstruct:plate_boots',
    'tconstruct:plate_shield', 'tconstruct:slime_helmet', 'tconstruct:slime_chestplate',
    'tconstruct:slime_leggings', 'tconstruct:slime_boots', 'additionalweaponry:propeller_cap'
  ],
  lateTools: [
    'tconstruct:sky_staff', 'tconstruct:earth_staff', 'tconstruct:ichor_staff', 'tconstruct:ender_staff',
    'tconstruct:fishing_rod', 'tinkers_advanced:electron_tuner',
    'tinkers_advanced:matter_manipulator'
  ]
}

const chapters = [
  {
    filename: 'starting_out', prefix: 'SO', id: 'BTM_STARTING_OUT', order: 0, title: 'Starting Out', tier: 'starting', group: 'orientation',
    description: ['This chapter is the playable tutorial spine: foothold, body, Tinkers, Nether netherrack, meltery, then exits.', 'Every quest pays 4 copper coins. Copper is useful, but village trading now asks for repeated route and quest work.'],
    quests: [
      q('SO_BACKPACK', 'Carry More', -8, 0, [item('sophisticatedbackpacks:backpack')], [], ['Distance matters here. A backpack is not luxury storage; it is what lets a scouting run become a supply line.']),
      q('SO_LIGHT', 'Make Light', -6, 0, [item('minecraft:torch', 16)], ['SO_BACKPACK'], ['Commit to a safe pocket of terrain. Darkness should be a local problem you solve with carried supplies.']),
      q('SO_LIVING_TREES', 'Living Trees', -5, -1, [item('dynamictrees:oak_seed'), item('minecraft:oak_log', 8)], ['SO_LIGHT'], ['Dynamic Trees makes timber a local living resource, not a floating block stack. Learn what nearby tree species can actually support before overbuilding.']),
      q('SO_SHELTER', 'Claim Shelter', -4, 0, [item('minecraft:white_bed')], ['SO_LIVING_TREES'], ['A bed is the first sign that this location is becoming a foothold instead of a camp.']),
      q('SO_WATER', 'Carry Water', -2, 0, [{ item: 'thirst:terracotta_water_bowl', matchNbt: false }], ['SO_BACKPACK'], ['Thirst is not a background debuff. Carry a vessel before long trips, obelisk runs, and blast mining.']),
      q('SO_SEWING', 'Body Temperature', 0, 0, [item('cold_sweat:sewing_table')], ['SO_BACKPACK'], ['Cold and heat make terrain matter. The sewing table starts the habit of preparing your body for a route.']),
      q('SO_COOKING', 'Food Is Infrastructure', 2, 0, [item('farmersdelight:cooking_pot'), item('farmersdelight:skillet')], ['SO_WATER'], ['Meals are base infrastructure. Better food means longer routes, safer retreats, and less panic after death.']),
      q('SO_TINKER', 'Tinkers Station', -6, 2, [item('tconstruct:tinker_station')], ['SO_LIVING_TREES'], ['This pack expects tool investment. Tinkers is the early crafting authority before Create takes over infrastructure.']),
      q('SO_PARTS', 'Tool Parts', -4, 2, [item('tconstruct:part_builder')], ['SO_TINKER'], ['Tool parts teach replacement and repair instead of disposable vanilla tools.']),
      q('SO_CRAFTING', 'Crafting Station', -2, 2, [item('tconstruct:crafting_station')], ['SO_TINKER'], ['Keep the workshop physical. The station is the first small piece of authored infrastructure.']),
      q('SO_REPAIR', 'Repair Mindset', 0, 2, [item('tconstruct:repair_kit')], ['SO_PARTS'], ['Do not throw tools away. Repair is part of the cost of distance and deposits.']),
      q('SO_HOOK', 'Hooks and Routes', 2, 2, [item('rehooked:wood_hook')], ['SO_BACKPACK'], ['Movement tools are route tools. They help traverse terrain; they do not erase distance.']),
      q('SO_TNT', 'Controlled Blast Mining', 4, 2, [item('minecraft:tnt')], ['SO_PARTS'], ['TNT is meant to be an early mining method. It is loud, risky, and efficient when you plan the blast.']),
      q('SO_TRADE_FLOAT', 'Sixteen Copper Coins', 6, 2, [item('dotcoinmod:copper_coin', 16)], ['SO_BACKPACK'], ['Holding copper coins unlocks village trading. Coins are a crafting system, not just money.']),
      q('SO_NETHER', 'First Nether Obelisk Run', -4, 4, [item('minecraft:netherrack', 16)], ['SO_SHELTER', 'SO_WATER', 'SO_COOKING'], ['This is a prepared raid, not a base move. Pack light, bring food and water, take netherrack, retreat successfully.']),
      q('SO_GROUT', 'Netherrack Grout', -2, 4, [item('tconstruct:grout', 8)], ['SO_NETHER', 'SO_PARTS'], ['Base grout now remembers the Nether. This is the first hard proof that obelisks feed progression.']),
      q('SO_MELTERY', 'First Meltery', 0, 4, [item('tconstruct:seared_melter'), item('tconstruct:seared_heater'), item('tconstruct:seared_faucet'), item('tconstruct:seared_basin'), item('tconstruct:seared_table')], ['SO_GROUT'], ['The meltery is the first metallurgy checkpoint. From here, ore is a material stream instead of a furnace shortcut.']),
      q('SO_EXIT_TECH', 'Exit: Tech 1', 2, 4, [item('tconstruct:seared_brick', 8)], ['SO_MELTERY'], ['You have enough seared infrastructure to enter the tech spine.']),
      q('SO_EXIT_MAGIC', 'Exit: Body and Blood', 4, 4, [item('rpgstats:still_beating_heart')], ['SO_WATER', 'SO_COOKING'], ['The body is maintained by food and water, then witnessed by death. Hearts bridge survival into Blood Magic.']),
      q('SO_EXIT_ADVENTURE', 'Exit: Routes and Villages', 6, 4, [item('minecraft:compass'), item('minecraft:map')], ['SO_TRADE_FLOAT', 'SO_NETHER'], ['Villages, maps, coins, and obelisks are the adventure economy. Start thinking in routes.'])
    ]
  },
  {
    filename: 'major_gates', prefix: 'MG', id: 'BTM_MAJOR_GATES', order: 1, title: 'Major Gates', tier: 'starting', group: 'orientation',
    description: ['A compact progress map for the pack-wide gates. This chapter is intentionally not a checklist; it shows how the parallel streams converge into AE2 local intelligence.'],
    quests: [
      q('MG_START', 'Starting Out Complete', 0, 0, [item('tconstruct:seared_melter')], ['SO_MELTERY'], ['The tutorial spine has reached molten material. From here the pack opens into parallel streams.']),
      q('MG_TCON', 'Tinkers Metallurgy Gate', 2, -2, [item('tconstruct:foundry_controller')], ['MG_START', 'TC_FOUNDRY'], ['Tinkers proves deposit interpretation and alloy authority before Create becomes the infrastructure layer.']),
      q('MG_CREATE', 'Create Manufacturing Gate', 4, -2, [item('kubejs:brass_machine_casing')], ['MG_TCON', 'C2_BRASS'], ['Create proves sequenced manufacturing, brass, presses, and manufactured casings.']),
      q('MG_POWER', 'Grid Power Gate', 6, -1, [item('kubejs:electrical_machine_casing')], ['MG_CREATE', 'GP_CASE'], ['SU and heat feed Power Grid, where rotational infrastructure becomes stored electricity. The casing is the manufacturing proof for this tier.']),
      q('MG_OC2R', 'OC2R Control Gate', 8, -1, [item('kubejs:electrical_machine_casing')], ['MG_POWER', 'OC_NETWORK'], ['OC2R is the intersite communication/control track before AE2 local intelligence. The electrical casing proves the electronics line is online.']),
      q('MG_SPACE', 'Space Logistics Gate', 10, 0, [item('kubejs:space_machine_casing')], ['MG_OC2R', 'SP_CASE'], ['Space is a logistics and chemistry commitment that consumes the earlier factory rather than replacing it. The casing is the launch-era authority item.']),
      q('MG_MAGIC', 'Blood Magic Gate', 4, 2, [item('bloodmagic:etherealslate')], ['MG_START', 'M1_ETHEREAL'], ['Magic progresses through Blood Magic slate permissions. Ethereal Slate proves the late magic stream is ready to contribute.']),
      q('MG_ECONOMY', 'Village Economy Gate', 6, 3, [item('wares:completed_delivery_agreement')], ['MG_MAGIC', 'VE_COMPLETED'], ['Coins, Wares, villages, and routes are a parallel crafting economy.']),
      q('MG_SYNTHESIS', 'Synthesis Gate', 8, 2, [item('kubejs:phosphate_flux')], ['MG_MAGIC', 'MG_ECONOMY', 'S1_SYNTHESIS_EXIT'], ['Create and PNCR synthesis turn deposits into chemical packages, feeding late materials.']),
      q('MG_AE2', 'AE2 Local Intelligence', 12, 0, [item('kubejs:impossible_machine_casing')], ['MG_SPACE', 'MG_SYNTHESIS', 'AE_CASE'], ['AE2 is the convergence point for local site intelligence, not global logistics. The casing is the final shared machine authority before hybrid branches.']),
      q('MG_POST_AE2', 'Post-AE2 Branches', 14, 0, [item('advanced_ae:quantum_structure'), item('protection_pixel:armorloadplatform'), item('tomeofblood:novice_tome_of_blood')], ['MG_AE2', 'PA_QUANTUM_STRUCTURE', 'PP_PLATFORM', 'TOB_NOVICE'], ['After AE2, progression fans into fewer stronger branches: quantum infrastructure, serious armor, and late Blood-Ars synthesis.'])
    ]
  },
  {
    filename: 'tinkers_i', prefix: 'TC1', id: 'BTM_TINKERS_I', order: 0, title: 'Tinkers I', tier: 'iron', group: 'workshop',
    description: ['Tinkers starts as practical metallurgy: seared casings, stable smeltery heat, and first molten payouts.', 'This chapter is about making early deposits trustworthy and repairable with a repeatable tool loop.'],
    quests: [
      q('TC_SEARED_CASE', 'Seared Machine Casing', 0, 0, [item('kubejs:seared_machine_casing')], ['SO_MELTERY']),
      q('TC_SMELTERY', 'Smeltery Authority', 2, 0, [item('tconstruct:smeltery_controller'), item('tconstruct:seared_fuel_tank')], ['TC_SEARED_CASE']),
      q('TC_FIRST_COPPER', 'Primary Molten Output', 4, -1, [item('minecraft:copper_ingot')], ['TC_SMELTERY']),
      q('TC_FIRST_IRON', 'Ironstone Pays Out', 4, 1, [item('minecraft:iron_ingot')], ['TC_SMELTERY']),
      q('TC_REPAIR_LOOP', 'Field Repair Loop', 6, 0, [item('tconstruct:tinkers_anvil')], ['TC_FIRST_COPPER', 'TC_FIRST_IRON'], ['A repairable tool loop is the point of early Tinkers. Keep tools alive, keep routes moving, and avoid replacing full toolsets after every risky run.'])
    ]
  },
  {
    filename: 'tinkers_ii', prefix: 'TC2', id: 'BTM_TINKERS_II', order: 1, title: 'Tinkers II', tier: 'iron', group: 'workshop',
    description: ['Scorched progression upgrades metallurgy into foundry-scale interpretation and alloy control.', 'Use this chapter to prove you can convert mixed deposits into planned outputs, not random ingot luck.'],
    quests: [
      q('TC_ALLOYER', 'Scorched Alloying', 2, -1, [item('tconstruct:scorched_alloyer')], ['TC_SMELTERY']),
      q('TC_FUEL', 'Scorched Fuel Handling', 2, 1, [item('tconstruct:scorched_fuel_tank')], ['TC_SMELTERY']),
      q('TC_FOUNDRY', 'Foundry Reads Geology', 4, 0, [item('tconstruct:foundry_controller')], ['TC_SMELTERY']),
      q('TC_MOLTEN_LOGISTICS', 'Molten Logistics', 6, 0, [item('tconstruct:scorched_drain'), item('tconstruct:scorched_chute')], ['TC_ALLOYER', 'TC_FUEL', 'TC_FOUNDRY'], ['This is the metallurgy capstone for early progression: stable heat, alloy control, and deliberate molten routing in one station set.'])
    ]
  },
  {
    filename: 'tinkers_arsenal', prefix: 'TA', id: 'BTM_TINKERS_ARSENAL', order: 2, title: 'Tinkers Arsenal', tier: 'iron', group: 'workshop',
    description: ['Toolcraft is broad on purpose. Build forms that match real route pressure, not one universal weapon template.', 'Use this chapter as a practical catalogue of options before post-AE2 Tinkers branches take over.'],
    quests: [
      q('TC_SHOWCASE_CORE_TOOLS', 'Showcase: Core Tools', 0, -3, itemAnyList(tconShowcase.coreTools), ['TC_SMELTERY'], ['Tinkers tools are material platforms. This node shows the core mining, digging, chopping, and hybrid tool forms you can build without caring which material or modifier NBT they carry.']),
      q('TC_SHOWCASE_MELEE', 'Showcase: Melee Weapons', 0, -1, itemAnyList(tconShowcase.meleeWeapons), ['TC_SMELTERY'], ['The combat catalogue is broad. Build the weapon form that matches the route, mob pressure, and reach pattern you actually need.']),
      q('TC_SHOWCASE_RANGED', 'Showcase: Ranged Weapons', 0, 1, itemAnyList(tconShowcase.rangedWeapons), ['TC_SMELTERY'], ['Ranged Tinkers tools and addon weapons give options for hostile routes before the pack becomes a gun or spell problem.']),
      q('TC_SHOWCASE_ARMOR', 'Showcase: Armor and Travel', 0, 3, itemAnyList(tconShowcase.armorAndTravel), ['TC_SMELTERY'], ['Armor, shields, slime gear, and traveller gear are part of the same toolcraft economy. Treat them as route preparation.']),
      q('TC_SHOWCASE_LATE_TOOLS', 'Showcase: Late Tool Forms', 2, 0, itemAnyList(tconShowcase.lateTools), ['TC_FOUNDRY'], ['These forms point toward later Tinkers branches and post-AE2 tool escalation. They are displayed here so the tool catalogue is visible early.']),
      q('TA_ROUTE_ARMORY', 'Route Armory', 4, 0, [item('tconstruct:travelers_helmet'), item('tconstruct:travelers_chestplate'), item('tconstruct:travelers_leggings'), item('tconstruct:travelers_boots')], ['TC_SHOWCASE_CORE_TOOLS', 'TC_SHOWCASE_MELEE', 'TC_SHOWCASE_RANGED', 'TC_SHOWCASE_ARMOR', 'TC_SHOWCASE_LATE_TOOLS'], ['The arsenal capstone is a full route kit: mining, combat, mobility, and repair options selected intentionally for your next dangerous branch.'])
    ]
  },
  {
    filename: 'death', prefix: 'DE', id: 'BTM_DEATH', order: 1, title: 'Death and Blood', tier: 'iron', group: 'body', description: ['Still-Beating Hearts are death trophies and Blood Magic keys. They should feel like ordeal evidence, not farmable reagent dust.'], quests: [
      q('DE_HEART', 'Still-Beating Heart', 0, 0, [item('rpgstats:still_beating_heart')], ['SO_EXIT_MAGIC']),
      q('DE_ALTAR', 'First Blood Altar', 2, 0, [item('bloodmagic:altar')], ['DE_HEART']),
      q('DE_WEAK_HEART', 'Blood-Touched Heart', 4, 0, [item('kubejs:weak_blood_heart')], ['DE_ALTAR']),
      q('DE_WEAK_ORB', 'Weak Blood Orb', 6, 0, [item('bloodmagic:weakbloodorb')], ['DE_WEAK_HEART']),
      q('DE_BLANK', 'Blank Slate', 8, -1, [item('bloodmagic:blankslate')], ['DE_WEAK_ORB']),
      q('DE_BODY_LOOP', 'Body Systems Matter', 8, 1, [item('farmersdelight:cooking_pot'), item('thirst:sand_filter')], ['DE_WEAK_ORB'])
    ]
  },
  {
    filename: 'food_i', prefix: 'F1', id: 'BTM_FOOD_I', order: 0, title: 'Food I', tier: 'iron', group: 'body',
    description: ['Food is route infrastructure in this pack, not decoration.', 'Build a dependable kitchen, hydrating meals, and clean water before expecting long safe expeditions.'],
    quests: [
      q('FB_CUTTING', 'Knife Work and Prep', 0, 0, [item('farmersdelight:cutting_board')], ['SO_COOKING'], ['Cutting boards turn food from found calories into prepared stock. Green tea, salmonberries, and cactus chili start becoming potion reagents here.']),
      q('FB_DOUGH', 'Staple Dough', 2, -1, [item('farmersdelight:wheat_dough')], ['FB_CUTTING'], ['Dough is the first reliable staple. It gives farming a practical purpose before automation.']),
      q('FB_CANVAS', 'Canvas and Packing', 2, 1, [item('farmersdelight:canvas')], ['FB_CUTTING'], ['Canvas ties food infrastructure to carrying, drying, and expedition packing.']),
      q('FB_CAMPFIRE_REAGENTS', 'Campfire Reagents', 2, -3, [item('minecraft:campfire'), item('kubejs:roasted_coffee_reagent'), item('kubejs:charred_blazing_chili')], ['FB_CUTTING'], ['Campfires are the crude heat step. Coffee beans and cactus chili become prepared reagent material before they become potion logic.']),
      q('FB_STOVE', 'Permanent Kitchen', 4, 0, [item('farmersdelight:stove')], ['FB_DOUGH', 'FB_CANVAS'], ['The stove marks the kitchen as infrastructure. A base that cannot cook cannot support long routes.']),
      q('FB_SOUP', 'Hydrating Meals', 6, -1, [item('farmersdelight:vegetable_soup')], ['FB_STOVE'], ['Soups are survival logistics: food and water pressure handled together.']),
      q('FB_FEAST', 'Group Expedition Stock', 6, 1, [item('farmersdelight:roast_chicken_block')], ['FB_STOVE'], ['Feasts are for team travel, recovery, and staging around dangerous deposits or obelisks.']),
      q('FB_FILTER', 'Clean Water Site', 8, -1, [item('thirst:sand_filter')], ['FB_SOUP', 'C1_CASING'], ['The sand filter is post-Create survival infrastructure. Clean water should be built, not assumed.']),
      q('FI_ROUTE_TABLE', 'Route Kitchen Table', 8, 1, [item('farmersdelight:table'), item('farmersdelight:oak_cabinet')], ['FB_FEAST', 'FB_FILTER'], ['This capstone proves the first body baseline is complete: cooked meals, hydration, storage, and repeatable prep before difficult routes.'])
    ]
  },
  {
    filename: 'food_ii', prefix: 'FII', id: 'BTM_FOOD_II', order: 2, title: 'Food II', tier: 'iron', group: 'body',
    description: ['Food II extends the kitchen into drinks, fermentation, and preserved route stock.', 'The goal is to make body supplies portable, storable, and worth carrying on every branch.'],
    quests: [
      q('FB_KETTLE', 'Kettle Drinks', 0, 0, [item('farmersrespite:kettle')], ['FB_FEAST'], ['Tea and hot drinks make body management more interesting than eating one best food forever. Kettle pouring later isolates these drinks into clean extracts.']),
      q('FB_TEA', 'Route Tea', 2, 0, [item('farmersrespite:green_tea')], ['FB_KETTLE'], ['Pack drinks alongside food. A route with prepared drinks is a different route.']),
      q('FB_KEG', 'Fermentation', 4, 0, [item('brewinandchewin:keg')], ['FB_TEA', 'C2_ANDESITE_CASE'], ['Fermentation is slow value: stronger travel food, tavern economy, village contracts, and keg-poured potion concentrates.']),
      q('FB_PRESERVED', 'Preserved Food', 6, -1, [item('brewinandchewin:jerky'), item('brewinandchewin:kimchi')], ['FB_KEG'], ['Preserved food is for distance. It belongs in backpacks, trains, ships, and outpost crates.']),
      q('FB_BREW', 'Brewed Supplies', 6, 1, [item('brewinandchewin:beer')], ['FB_KEG'], ['Brews are powerful enough to matter, but they should come from a kitchen and a route economy, not loot spam.']),
      q('FII_STOCKPILE', 'Stockpile Pantry', 8, 0, [item('farmersdelight:rice_roll_medley_block'), item('brewinandchewin:kimchi')], ['FB_PRESERVED', 'FB_BREW'], ['This capstone marks a sustainable food stockpile: meals for now, preserved food for travel, and brewed supplies for hard pushes.'])
    ]
  },
  {
    filename: 'brewing', prefix: 'BRW', id: 'BTM_BREWING', order: 3, title: 'Brewing', tier: 'iron', group: 'body',
    description: ['Brewing in this pack starts from prepared food identity, not vanilla shortcut reagents.', 'Kettles, cooking pots, and kegs produce clean extract lines that later feed final potion work.'],
    quests: [
      q('FB_COOKED_EXTRACTS', 'Cooking Pot Extracts', 0, -2, [item('kubejs:brine_extract'), item('kubejs:vision_extract'), item('kubejs:heatproof_extract')], ['FB_STOVE', 'FB_CAMPFIRE_REAGENTS'], ['The cooking pot bottles mixed biological identity. Salmonberry routes become brine, glow and carrot become vision, and chili plus magma becomes heatproofing.']),
      q('FB_EFFECT_SOURCES', 'Effect Sources', 2, -2, [item('kubejs:mashed_salmonberries'), item('kubejs:roasted_coffee_reagent'), item('kubejs:charred_blazing_chili')], ['FB_COOKED_EXTRACTS', 'FB_KETTLE'], ['Potion effects now come from prepared food identity, not vanilla shortcut reagents. Coffee means speed, rose hips mean recovery, salmonberries mean water routes, and cactus chili means fire routes.']),
      q('FB_KETTLE_INFUSIONS', 'Kettle Infusions', 4, -1, [item('kubejs:green_tea_extract'), item('kubejs:caffeine_extract'), item('kubejs:rose_hip_extract'), item('kubejs:toxic_extract')], ['FB_EFFECT_SOURCES', 'FB_KETTLE'], ['Kettle pouring isolates plant-forward effects from drinks. Tea, coffee, rose hip, yellow tea, and purulent tea become bottled extracts.']),
      q('FB_FERMENTED_CONCENTRATES', 'Fermented Concentrates', 4, 1, [item('kubejs:fermented_pomegranate_extract'), item('kubejs:brine_extract')], ['FB_EFFECT_SOURCES', 'FB_KEG'], ['Keg pouring handles slower, stronger concentrates. Red rum carries strength identity; salty folly carries brine into water-breathing routes.']),
      q('BRW_EXTRACTION_SUITE', 'Extraction Suite', 6, 0, [item('kubejs:caffeine_extract'), item('kubejs:fermented_pomegranate_extract'), item('kubejs:heatproof_extract')], ['FB_KETTLE_INFUSIONS', 'FB_FERMENTED_CONCENTRATES'], ['This capstone confirms your extract pipeline is stable enough to support repeat potion manufacturing instead of one-off brewing.'])
    ]
  },
  {
    filename: 'potion_engineering', prefix: 'PE', id: 'BTM_POTION_ENGINEERING', order: 4, title: 'Potion Engineering', tier: 'iron', group: 'body',
    description: ['Potion work is a finishing discipline: stabilized water, prepared extracts, and deliberate outcomes.', 'This chapter turns the extract pipeline into engineered buffs and controlled corrupted effects.'],
    quests: [
      q('FB_ADVANCED_EXTRACTS', 'Advanced Extracts', 0, -1, [item('kubejs:leaping_extract'), item('kubejs:featherlight_extract'), item('kubejs:melon_life_extract'), item('kubejs:turtle_guard_extract')], ['BRW_EXTRACTION_SUITE'], ['Leaping, slow falling, healing, and turtle-master routes need prepared biological sources before the brewing stand can finish them.']),
      q('FB_CORRUPT_EXTRACTS', 'Corrupt Extracts', 0, 1, [item('kubejs:weakening_extract'), item('kubejs:shadow_extract'), item('kubejs:harm_extract'), item('kubejs:slowness_extract')], ['BRW_EXTRACTION_SUITE'], ['Fermented spider eye is no longer a universal shortcut. Corrupted potion outcomes use processed weakening, shadow, harm, and slowness extracts.']),
      q('FB_POTION_ENGINEERING', 'Potion Engineering', 2, 0, [item('minecraft:brewing_stand'), item('kubejs:stabilized_reagent'), item('kubejs:caffeine_extract'), item('kubejs:vision_extract')], ['FB_ADVANCED_EXTRACTS', 'FB_CORRUPT_EXTRACTS'], ['The brewing stand is the finishing station. Water becomes awkward through stabilized reagent, then food-derived extracts finish potion effects.']),
      q('PE_ROUTE_DOSSIER', 'Route Potion Dossier', 4, -1, [item('kubejs:stabilized_reagent'), item('kubejs:leaping_extract'), item('kubejs:shadow_extract')], ['FB_POTION_ENGINEERING'], ['This marks potion literacy for expedition planning: mobility buffs, survival buffs, and hostile-effect tools are now part of route prep.']),
      q('PE_EFFECT_LOADOUT', 'Effect Loadout Board', 6, 0, [item('kubejs:caffeine_extract'), item('kubejs:heatproof_extract'), item('kubejs:turtle_guard_extract'), item('kubejs:fermented_pomegranate_extract')], ['PE_ROUTE_DOSSIER'], ['Plan effects by route. Caffeine is speed, heatproofing is lava and Nether work, turtle guard is underwater or heavy defense, and fermented pomegranate is strength. This is the practical capstone for potion engineering.'])
    ]
  },
  {
    filename: 'food_catalogue', prefix: 'FC', id: 'BTM_FOOD_CATALOGUE', order: 5, title: 'Food Catalogue', tier: 'iron', group: 'body',
    description: ['The catalogue keeps the full food graph visible so route planning can use variety instead of one optimal meal.', 'Treat these nodes as menu and ingredient atlases for settlements, expeditions, and regional supply chains.'],
    quests: [
      q('FB_SHOWCASE_VANILLA', 'Showcase: Vanilla Food', 0, -4, itemList(foodShowcase.vanilla), ['FB_STOVE'], ['This catalogue keeps the vanilla foods visible. They are simple, portable, and often the base ingredients for better route food.']),
      q('FB_SHOWCASE_FARMERS', 'Showcase: Farmers Delight Meals', 0, -2, itemList(foodShowcase.farmersDelight), ['FB_STOVE'], ['Farmer\'s Delight is the main early kitchen. Use this node as a menu of meals, slices, sandwiches, stews, rolls, and prepared ingredients.']),
      q('FB_SHOWCASE_DRINKS', 'Showcase: Drinks and Ferments', 0, 0, itemList(foodShowcase.drinksAndFerments), ['FB_KEG'], ['Drinks and fermented foods are route supplies. They support recovery, tavern contracts, and food variety beyond raw hunger value.']),
      q('FB_SHOWCASE_FIELD_CROPS', 'Showcase: Field Crop Foods', 0, 2, itemList(foodShowcase.fieldCrops), ['FB_CUTTING'], ['Vegetables, corn, peppers, coffee, and rustic foods make farming a broader material graph than wheat into bread.']),
      q('FB_SHOWCASE_DELIGHTFUL', 'Showcase: Delightful Foods', 2, -3, itemList(foodShowcase.delightful), ['FB_STOVE'], ['Delightful adds fruit, tea, sweets, and mixed foods that make route food more varied than one optimal meal.']),
      q('FB_SHOWCASE_NETHER_END_OCEAN', 'Showcase: Nether, End, and Ocean Food', 2, -1, itemList(foodShowcase.netherEndOcean), ['FB_STOVE', 'SO_NETHER'], ['Dimension and biome foods turn expeditions into new food infrastructure. Bring back ingredients, not just trophies.']),
      q('FB_SHOWCASE_REGIONAL', 'Showcase: Regional Delight Foods', 2, 1, itemList(foodShowcase.regionalDelights), ['FB_STOVE'], ['Regional foods are a reason to care about where ingredients come from. They make different bases and routes feel materially different.']),
      q('FC_EXPEDITION_MENU', 'Expedition Menu Board', 4, 0, [item('farmersdelight:tomato_sauce'), item('brewinandchewin:glow_berry_marmalade')], ['FB_SHOWCASE_VANILLA', 'FB_SHOWCASE_FARMERS', 'FB_SHOWCASE_DRINKS', 'FB_SHOWCASE_FIELD_CROPS', 'FB_SHOWCASE_DELIGHTFUL', 'FB_SHOWCASE_NETHER_END_OCEAN', 'FB_SHOWCASE_REGIONAL'], ['This catalogue capstone is a planning surface: choose food by route, climate, distance, and risk instead of defaulting to one static meal.'])
    ]
  },
  {
    filename: 'create_foundations', prefix: 'C1', id: 'BTM_CREATE_FOUNDATIONS', order: 0, title: 'Create Foundations', tier: 'tin', group: 'create', description: ['Create starts after alloying. This chapter teaches hand power, millstones, deployer assembly, first casings, and local sustainable power.'], quests: [
      q('C1_ALLOY', 'Alloyed Andesite', 0, 0, [item('create:andesite_alloy')], ['TC_FOUNDRY']),
      q('C1_CRANK', 'Hand Crank', 2, 0, [item('create:hand_crank')], ['C1_ALLOY']),
      q('C1_SHAFTS', 'Shaft and Cog Basics', 4, -2, [item('create:shaft'), item('create:cogwheel')], ['C1_CRANK'], ['Build a small rotation spine first. This is your first readable SU layout.']),
      q('C1_MILL', 'Millstone', 4, 0, [item('create:millstone')], ['C1_CRANK']),
      q('C1_DEPOT', 'Depot Workbench', 6, -2, [item('create:depot')], ['C1_MILL']),
      q('C1_DEPLOYER', 'Deployer', 6, 0, [item('create:deployer')], ['C1_MILL', 'C1_DEPOT']),
      q('C1_CASING', 'Deployed Andesite Casing', 8, 0, [item('create:andesite_casing')], ['C1_DEPLOYER']),
      q('C1_POWER_WATER', 'Water Wheel', 10, -1, [item('create:water_wheel')], ['C1_CASING']),
      q('C1_POWER_WIND', 'Windmill Bearing', 10, 1, [item('create:windmill_bearing')], ['C1_CASING']),
      q('C1_GEARBOX', 'Rotation Direction Control', 12, -2, [item('create:gearbox')], ['C1_POWER_WATER', 'C1_POWER_WIND'], ['Use gearboxes to keep compact workshops maintainable.']),
      q('C1_ENCASED_CHAIN', 'Encased Chain Drive', 12, 2, [item('create:encased_chain_drive')], ['C1_POWER_WATER', 'C1_POWER_WIND']),
      q('C1_WATER', 'Clean Water Infrastructure', 14, 0, [item('thirst:sand_filter')], ['C1_GEARBOX', 'C1_ENCASED_CHAIN']),
      q('C1_CRUSHED', 'Deposit Preprocessing', 16, -1, [item('realisticores:crushed_copper_sulfide_ore')], ['C1_WATER']),
      q('C1_FOUNDATION_CAPSTONE', 'Capstone: Starter Rotary Yard', 18, 0, [item('create:andesite_casing'), item('create:water_wheel'), item('create:windmill_bearing')], ['C1_CRUSHED'], ['Capstone: run a compact yard with deployer work, milling, and stable local SU.'])
    ]
  },
  {
    filename: 'create_components', prefix: 'C2', id: 'BTM_CREATE_COMPONENTS', order: 1, title: 'Create Components', tier: 'bronze', group: 'create', description: ['Create becomes a manufactured-component system here: andesite machine casings, presses, plates, mixers, saws, drills, and mechanical crafters.'], quests: [
      q('C2_ANDESITE_CASE', 'Andesite Machine Casing', 0, 0, [item('kubejs:andesite_machine_casing')], ['C1_CRUSHED']),
      q('C2_PRESS', 'Mechanical Press', 2, 0, [item('create:mechanical_press')], ['C2_ANDESITE_CASE']),
      q('C2_PLATES', 'Pressed or Cast Plates', 4, -1, [item('chemlib:iron_plate'), item('chemlib:copper_plate')], ['C2_PRESS']),
      q('C2_BASIN', 'Basin and Burner Setup', 4, 1, [item('create:basin'), item('create:blaze_burner')], ['C2_PRESS']),
      q('C2_MIXER', 'Mechanical Mixer', 4, 1, [item('create:mechanical_mixer')], ['C2_PRESS']),
      q('C2_SAW_DRILL', 'Industrial Contact Tools', 6, -2, [item('create:mechanical_saw'), item('create:mechanical_drill')], ['C2_ANDESITE_CASE']),
      q('C2_ENCASED_FAN', 'Encased Fan Processing', 6, 2, [item('create:encased_fan')], ['C2_BASIN']),
      q('C2_CRAFTER', 'Mechanical Crafting', 8, -1, [item('create:mechanical_crafter')], ['C2_ANDESITE_CASE']),
      q('C2_BASIN_WORK', 'Basin Processing', 8, 1, [item('create:basin'), item('create:depot')], ['C2_MIXER', 'C2_BASIN'], ['Basins and depots make Create recipes visible as physical manufacturing steps.']),
      q('C2_LINE_BALANCE', 'Line Balance and Throughput', 10, -1, [item('create:clutch'), item('create:gearshift')], ['C2_SAW_DRILL', 'C2_CRAFTER']),
      q('C2_COMPONENT_CAPSTONE', 'Capstone: Repeatable Component Line', 12, 0, [item('kubejs:andesite_machine_casing'), item('create:mechanical_press'), item('create:mechanical_mixer')], ['C2_BASIN_WORK', 'C2_LINE_BALANCE', 'C2_ENCASED_FAN'], ['Capstone: operate a repeatable line that outputs plates, mixed intermediates, and crafted parts on demand.'])
    ]
  },
  {
    filename: 'create_brass_automation', prefix: 'CB', id: 'BTM_CREATE_BRASS_AUTOMATION', order: 2, title: 'Create Brass Automation', tier: 'bronze', group: 'create', description: ['Brass is Create\'s automation alloy. This chapter separates brass manufacturing from the earlier andesite component layer.'], quests: [
      q('C2_BRASS_INGOT', 'Brass Is Create Steel', 0, 0, [item('create:brass_ingot')], ['C2_MIXER']),
      q('C2_BRASS_SHEET', 'Brass Sheet', 2, 0, [item('create:brass_sheet')], ['C2_BRASS_INGOT', 'C2_PLATES']),
      q('CB_ELECTRON_TUBE', 'Electron Tube', 4, -2, [item('create:electron_tube')], ['C2_BRASS_SHEET']),
      q('C2_PRECISION', 'Precision Mechanism', 4, -1, [item('create:precision_mechanism')], ['C2_BRASS_SHEET']),
      q('CB_FUNNEL_TUNNEL', 'Brass Routing Faces', 4, 1, [item('create:brass_funnel'), item('create:brass_tunnel')], ['C2_BRASS_SHEET']),
      q('C2_BRASS', 'Brass Machine Casing', 6, 0, [item('kubejs:brass_machine_casing')], ['C2_PRECISION', 'CB_FUNNEL_TUNNEL']),
      q('CB_ARM', 'Mechanical Arm', 8, -1, [item('create:mechanical_arm')], ['C2_BRASS']),
      q('CB_SPEED_CONTROL', 'Speed Control', 8, 1, [item('create:rotation_speed_controller')], ['C2_BRASS']),
      q('CB_FILTERS', 'Attribute and Smart Filters', 10, -2, [item('create:attribute_filter'), item('create:smart_chute')], ['CB_FUNNEL_TUNNEL']),
      q('CB_LINKS', 'Observed Automation', 10, 0, [item('create:stockpile_switch'), item('create:content_observer'), item('create:redstone_link')], ['CB_ARM', 'CB_SPEED_CONTROL']),
      q('CB_PULSE_CONTROL', 'Pulse and Interlock Control', 10, 2, [item('create:pulse_repeater'), item('create:pulse_extender')], ['CB_ELECTRON_TUBE', 'CB_LINKS']),
      q('CB_CAPSTONE', 'Capstone: Self-Regulating Brass Cell', 12, 0, [item('create:mechanical_arm'), item('create:stockpile_switch'), item('kubejs:brass_machine_casing')], ['CB_FILTERS', 'CB_PULSE_CONTROL'], ['Capstone: build a brass automation cell that routes, observes, and throttles itself under load.'])
    ]
  },
  {
    filename: 'create_fluids_and_packages', prefix: 'CL', id: 'BTM_CREATE_FLUIDS_PACKAGES', order: 3, title: 'Create Fluids and Packages', tier: 'silver', group: 'create', description: ['This chapter collects Create logistics that are not trains: fluids, portable interfaces, packaging, stock links, and logistics addon devices.'], quests: [
      q('CL_FLUID_HANDLING', 'Fluid Handling', 0, 0, [item('create:fluid_pipe'), item('create:mechanical_pump')], ['C2_ANDESITE_CASE']),
      q('CL_TANK_AND_SPOUT', 'Tanks, Drains, and Spouts', 2, -1, [item('create:fluid_tank'), item('create:item_drain'), item('create:spout')], ['CL_FLUID_HANDLING']),
      q('CL_HOSE_PULLEY', 'Hose Pulley and Bulk Transfer', 2, 1, [item('create:hose_pulley')], ['CL_FLUID_HANDLING']),
      q('CL_PORTABLE_INTERFACES', 'Portable Interfaces', 4, -2, [item('create:portable_storage_interface'), item('create:portable_fluid_interface')], ['CL_HOSE_PULLEY', 'C2_BRASS']),
      q('CL_PACKAGE_NETWORK', 'Package Network', 4, 0, [item('create:packager'), item('create:repackager'), item('create:stock_link')], ['CL_PORTABLE_INTERFACES', 'C2_BRASS']),
      q('CL_PACKAGE_FROGPORT', 'Package Frogport', 4, 2, [item('create:package_frogport')], ['CL_PACKAGE_NETWORK']),
      q('CL_STOCK_CONTROL', 'Stock Control', 6, -1, [item('create:stock_ticker'), item('create:redstone_requester')], ['CL_PACKAGE_NETWORK']),
      q('CL_FACTORY_GAUGE', 'Factory Gauge', 6, 1, [item('create:factory_gauge')], ['CL_STOCK_CONTROL']),
      q('CL_CONNECTED_CONTROL', 'Connected Kinetics', 8, -1, [item('create_connected:kinetic_battery'), item('create_connected:brake'), item('create_connected:linked_transmitter')], ['C2_BRASS']),
      q('CL_ADDON_LOGISTICS', 'Addon Logistics Devices', 8, 1, [item('createadditionallogistics:package_editor'), item('createadditionallogistics:package_accelerator'), item('createadditionallogistics:network_monitor')], ['CL_STOCK_CONTROL', 'CL_CONNECTED_CONTROL']),
      q('CL_CONTENT_FILTERS', 'Package Content Filters', 10, 0, [item('createadvlogistics:package_content_filter')], ['CL_ADDON_LOGISTICS', 'CL_PACKAGE_FROGPORT']),
      q('CL_CAPSTONE', 'Capstone: Routed Parcel District', 12, 0, [item('create:packager'), item('create:stock_ticker'), item('createadvlogistics:package_content_filter')], ['CL_CONTENT_FILTERS', 'CL_FACTORY_GAUGE'], ['Capstone: run a visible fluid-plus-package district with stock requests, filters, and recoverable routing.'])
    ]
  },
{
    filename: 'su_heat', prefix: 'SH', id: 'BTM_SU_HEAT', order: 4, title: 'SU and Heat', tier: 'brass', group: 'create', description: ['Build Create rotational power and heat systems before the electrical grid.'], quests: [
      q('SH_WATER', 'Water Wheel Source', 0, 0, [item('create:water_wheel')], ['C1_POWER_WATER'], ['Water wheels are the first stable rotational source for real workshop load.']),
      q('SH_WIND', 'Windmill Source', 2, -1, [item('create:windmill_bearing')], ['SH_WATER', 'C1_POWER_WIND'], ['Windmills scale cleanly when your base footprint grows.']),
      q('SH_TRANSMISSION', 'SU Transport Losses', 2, 1, [item('create:shaft'), item('create:gearbox'), item('create:belt_connector')], ['SH_WATER'], ['Distance has cost. Keep generation close to consumers or pay for readable transmission hardware.']),
      q('SH_BLAZE', 'Blaze Burner Heat', 4, 0, [item('create:blaze_burner')], ['SH_WIND', 'C2_MIXER'], ['Blaze burners are process heat infrastructure, not just a mixer upgrade.']),
      q('SH_DIESEL', 'Diesel Engine Source', 6, -2, [item('createdieselgenerators:diesel_engine')], ['SH_BLAZE', 'C2_BRASS'], ['Diesel converts fluid logistics into dense rotational power.']),
      q('SH_REFINING', 'Diesel Refining', 8, -2, [item('createdieselgenerators:distillation_controller')], ['SH_DIESEL'], ['Refining turns one engine recipe into an industrial chain.']),
      q('SH_HEAT_PIPE', 'Heat Pipe Network', 6, 2, [item('heatsync:heat_pipe')], ['SH_BLAZE', 'C2_BRASS'], ['Heat pipes make thermal work visible and routable instead of implicit.']),
      q('SH_COOLANT', 'Coolant Exchanger', 8, 1, [item('heatsync:coolant_exchanger')], ['SH_HEAT_PIPE'], ['Coolant exchange turns stored heat into fluid logistics and back again.']),
      q('SH_EXIT_GRID', 'Exit: Electrical Grid', 12, 0, [item('powergrid:conductive_casing')], ['SH_REFINING', 'SH_COOLANT'], ['You now understand SU generation, transmission, and heat well enough to build a grid.'])
    ]
  },
  {
    filename: 'grid_power', prefix: 'GP', id: 'BTM_GRID_POWER', order: 0, title: 'Grid Power', tier: 'gold', group: 'power', description: ['Turn rotational infrastructure into electricity and stored power.'], quests: [
      q('GP_CONDUCTIVE', 'Conductive Casing', 0, 0, [item('powergrid:conductive_casing')], ['SH_EXIT_GRID']),
      q('GP_CASE', 'Electrical Machine Casing', 2, 0, [item('kubejs:electrical_machine_casing')], ['GP_CONDUCTIVE']),
      q('GP_HOUSING', 'Generator Housing', 4, -2, [item('powergrid:generator_housing')], ['GP_CASE']),
      q('GP_ROTOR', 'Induction Rotor', 4, 0, [item('powergrid:generator_induction_rotor')], ['GP_CASE']),
      q('GP_COMMUTATOR', 'Commutator', 4, 2, [item('powergrid:generator_commutator')], ['GP_CASE']),
      q('GP_WIRE', 'Wires and Connectors', 6, -1, [item('powergrid:wire_connector'), item('powergrid:wire')], ['GP_HOUSING', 'GP_ROTOR']),
      q('GP_CIRCUIT', 'Integrated Circuit', 6, 1, [item('powergrid:integrated_circuit')], ['GP_COMMUTATOR', 'GP_WIRE']),
      q('GP_RELAY', 'Relay Control', 8, 1, [item('powergrid:redstone_relay')], ['GP_CIRCUIT'], ['Relays make the grid controllable instead of just powered.']),
      q('GP_BATTERY', 'Battery Storage', 10, 0, [item('powergrid:battery')], ['GP_RELAY', 'GP_WIRE'], ['A battery is the capstone of a local grid: generation, distribution, control, and storage.']),
      q('GP_TELEMETRY', 'OC2R Telemetry Tie-In', 12, 0, [item('oc2r:network_connector'), item('create:stressometer')], ['GP_BATTERY'], ['OC2R should observe and coordinate the grid without teleporting items or replacing routes.'])
    ]
  },
  {
    filename: 'latent_chemlib', prefix: 'FI', id: 'BTM_LATENT_CHEMLIB', order: 1, title: 'Latent ChemLib', tier: 'platinum', group: 'power', description: ['Build chemical containment, high-energy matter handling, and periodic-table traversal.'], quests: [
      q('FI_COOLANT', 'Liquid Coolant Exchanger', 0, 0, [item('heatsync:coolant_exchanger')], ['GP_BATTERY']),
      q('FI_CAPTURE', 'Gas Capture', 2, -1, [item('latent_chemlib:gas_capture')], ['FI_COOLANT', 'S1_SYNTHESIS_EXIT'], ['Volatile ChemLib matter must be captured before it can become a production lane.']),
      q('FI_TANK', 'Chemical Containment', 4, -1, [item('latent_chemlib:gas_tank')], ['FI_CAPTURE']),
      q('FI_RELEASE', 'Controlled Release', 6, 1, [item('latent_chemlib:gas_release')], ['FI_TANK']),
      q('FI_AE_CONTROL', 'AE2 Control Access', 8, 0, [item('kubejs:impossible_machine_casing')], ['AE_CONTROLLER'], ['High-energy matter needs local intelligence and controlled automation.']),
      q('FI_REACTION', 'Reaction Chamber', 10, 0, [item('latent_chemlib:gas_reaction_chamber')], ['FI_AE_CONTROL', 'FI_TANK'], ['The reaction chamber is the bridge from power engineering into periodic-table traversal.']),
      q('FI_READY', 'Latent Matter Readiness', 12, 0, [item('latent_chemlib:gas_reaction_chamber'), item('powergrid:battery')], ['FI_REACTION'], ['You now have coolant, containment, high-energy handling, and AE2 control ready for ChemLib traversal.'])
    ]
  },
  {
    filename: 'oc2r', prefix: 'OC', id: 'BTM_OC2R', order: 1, title: 'OC2R', tier: 'silver', group: 'power', description: ['OC2R is the preferred intersite communication layer. It should coordinate routes and machines without becoming item teleportation.'], quests: [
      q('OC_TRANSISTOR', 'Transistor', 0, -1, [item('oc2r:transistor')], ['GP_BATTERY']),
      q('OC_COMPUTER', 'Local Computer', 2, 0, [item('oc2r:computer')], ['OC_TRANSISTOR']),
      q('OC_NETWORK', 'Wired Site Communication', 4, 0, [item('oc2r:network_hub'), item('oc2r:network_connector')], ['OC_COMPUTER']),
      q('OC_CREATE_BRIDGE', 'Create Device Bridge', 6, -2, [item('create:speedometer'), item('create:stressometer'), item('oc2r:network_connector')], ['OC_NETWORK'], ['ComputerBridge exposes Create machines to OC2R. It is intersite communication and observability, not item teleportation.']),
      q('OC_ROBOT', 'Authored Field Work', 6, -1, [item('oc2r:robot')], ['OC_NETWORK']),
      q('OC_ROUTE_LOGIC', 'Route Logic', 6, 1, [item('oc2r:redstone_interface'), item('oc2r:network_interface_card')], ['OC_NETWORK'])
    ]
  },
  {
    filename: 'space', prefix: 'SP', id: 'BTM_SPACE', order: 0, title: 'Creating Space', tier: 'gold', group: 'intelligence', description: ['Creating Space is a major logistics commitment: suit up, build rockets, route materials, and unlock chemical synthesis.'], quests: [
      q('SP_TABLE', 'Rocket Engineer Table', 0, 0, [item('creatingspace:rocket_engineer_table')], ['OC_NETWORK'], [
        'Use this as the dedicated space workbench. Place it near your OC2R and Create manufacturing area because the following steps need mechanical crafting, sequenced assembly, pressing, cutting, fluids, and reusable staging space.',
        'Before moving on, reserve room for a rocket parts line instead of treating this as a single crafting table.'
      ]),
      q('SP_CASE', 'Space Machine Casing', 2, 0, [item('kubejs:space_machine_casing')], ['SP_TABLE'], [
        'This is the pack gate for space-era machines. If a recipe asks for this casing, it belongs after Create brass, Power Grid, and OC2R control.',
        'Craft extra casings before starting rocket work; later machines and synthesis blocks should consume them repeatedly.'
      ]),
      q('SP_BASIC_FABRIC', 'Basic Suit Fabric', 4, -2, [item('creatingspace:basic_spacesuit_fabric')], ['SP_CASE'], [
        'Make this with Create sequenced assembly. The fabric is not just armor cloth; it proves you can run a repeatable deploy-and-press line for survival equipment.',
        'Inspect the recipe before batch crafting because suit pieces and oxygen equipment both pull from this material family.'
      ]),
      q('SP_SUIT_BASIC', 'Basic Spacesuit', 6, -2, [item('creatingspace:basic_spacesuit_helmet'), item('creatingspace:basic_spacesuit_leggings'), item('creatingspace:basic_spacesuit_boots')], ['SP_BASIC_FABRIC'], [
        'Build the helmet, leggings, and boots as a minimum away-from-Earth suit kit. The quest intentionally omits a chestplate because oxygen backtanks fill that body role.',
        'Do not launch with only the suit pieces; the next oxygen node is part of the same survival checklist.'
      ]),
      q('SP_OXYGEN_TANK', 'Oxygen Backtank', 6, 0, [item('creatingspace:copper_oxygen_backtank')], ['SP_BASIC_FABRIC'], [
        'Craft a copper oxygen backtank with mechanical crafting. This is your first portable oxygen source and should be kept filled before any no-oxygen route.',
        'Treat oxygen as expedition stock like food and water: make a refill plan, not just one tank.'
      ]),
      q('SP_ELECTROLYZER', 'Mechanical Electrolyzer', 4, 2, [item('creatingspace:mechanical_electrolyzer')], ['SP_CASE'], [
        'Build this before relying on oxygen infrastructure. It turns the space branch into a fluid-processing branch rather than a simple armor checklist.',
        'Place it where water, rotation, and fluid pipes can be maintained without crossing your main workshop paths.'
      ]),
      q('SP_AIR_LIQUEFIER', 'Air Liquefier', 6, 2, [item('creatingspace:air_liquefier')], ['SP_ELECTROLYZER'], [
        'The air liquefier starts cryogenic fluid handling. It is a preparation step for oxygen, hydrogen, methane, and CO2 logistics later.',
        'Leave access for tanks and pipes; cramped placement makes space fuel work painful.'
      ]),
      q('SP_CRYO_TANK', 'Cryogenic Storage', 8, 2, [item('creatingspace:cryogenic_tank')], ['SP_AIR_LIQUEFIER'], [
        'Use cryogenic tanks as physical buffers for cold fluids. This keeps the space branch bounded: fluids live in tanks and pipes, not invisible global storage.',
        'Make at least one spare tank before scaling chemical synthesis or fuel handling.'
      ]),
      q('SP_ENGINE_BLUEPRINT', 'Engine Blueprint', 8, -2, [item('creatingspace:engine_blueprint'), item('creatingspace:design_blueprint')], ['SP_SUIT_BASIC', 'SP_OXYGEN_TANK'], [
        'Engine recipes use blueprint-style sequenced assembly. Keep the blueprint route readable because it carries NBT through several stages.',
        'If EMI shows partial-NBT ingredients, follow the shown recipe path exactly instead of substituting a fresh blank blueprint.'
      ]),
      q('SP_ALLOY_SET', 'Rocket Alloy Sheets', 10, -3, [item('creatingspace:reinforced_copper_sheet'), item('creatingspace:monel_sheet'), item('creatingspace:inconel_sheet'), item('creatingspace:hastelloy_sheet')], ['SP_ENGINE_BLUEPRINT'], [
        'These alloys define rocket part quality. Reinforced copper is the simple entry; Monel, Inconel, and Hastelloy represent higher heat and corrosion resistance.',
        'Make sheets through pressing and keep the alloy chain documented in your workshop. Space should feel like metallurgy plus Create, not a one-off recipe.'
      ]),
      q('SP_ENGINE_PACKS', 'Engine Subassemblies', 10, -1, [item('creatingspace:combustion_chamber'), item('creatingspace:power_pack'), item('creatingspace:exhaust_pack')], ['SP_ALLOY_SET'], [
        'Assemble combustion, power, and exhaust packs before the engine itself. These are the real rocket manufacturing steps.',
        'Expect multiple sequenced assembly passes. A failed or mismatched blueprint usually means the wrong material level or exhaust path was selected.'
      ]),
      q('SP_ENGINE', 'Rocket Engine', 12, -1, [item('creatingspace:rocket_engine')], ['SP_ENGINE_PACKS'], [
        'The final engine combines the power and exhaust assemblies through the blueprint path. This is the point where the space line becomes a serious manufactured product.',
        'Make only one first, verify it works, then scale after the recipe path is stable.'
      ]),
      q('SP_CASING', 'Rocket Casing', 12, 1, [item('creatingspace:rocket_casing')], ['SP_ALLOY_SET'], [
        'Rocket casing turns alloy sheet production into a vehicle body. Keep casing production separate from engine production so shortages are visible.',
        'This is also the checkpoint that moon aluminum and cobalt routes are becoming relevant.'
      ]),
      q('SP_CONTROLS', 'Rocket Controls', 14, 1, [item('creatingspace:rocket_controls')], ['SP_ENGINE'], [
        'Rocket controls connect Create control hardware to the vehicle. You should already have redstone links, electron tubes, and sturdy sheet production automated or at least repeatable.',
        'Controls are not power by themselves; they are the navigation and operation layer.'
      ]),
      q('SP_PRESSURE', 'Sealed Room Support', 14, 3, [item('creatingspace:oxygen_sealer'), item('creatingspace:room_pressuriser')], ['SP_CRYO_TANK'], [
        'Build sealing and pressurising blocks before depending on off-world bases. The goal is a survivable room, not just a suit.',
        'Test the room locally with tanks and pipes before moving materials through a dimension route.'
      ]),
      q('SP_CHEM', 'Chemical Synthesizer', 16, 0, [item('creatingspace:chemical_synthesizer')], ['SP_CASING', 'SP_CONTROLS', 'SP_PRESSURE'], [
        'The Chemical Synthesizer is the exit into space-era synthesis. It connects rocket progress back into the matter graph and unlocks later AE2 and fusion preparation.',
        'Place it near cryogenic storage and the Create/PNCR chemistry area, because future recipes should bridge those systems.'
      ]),
      q('SP_ADV_FABRIC', 'Advanced Suit Fabric', 18, -1, [item('creatingspace:advanced_spacesuit_fabric')], ['SP_CHEM'], [
        'Advanced suit fabric upgrades the survival kit using late space materials. It should be produced as a controlled batch, not hand-crafted one piece at a time.',
        'This is the material checkpoint before advanced armor and higher-risk routes.'
      ]),
      q('SP_SUIT_ADV', 'Advanced Spacesuit', 20, 0, [item('creatingspace:advanced_spacesuit_helmet'), item('creatingspace:advanced_spacesuit_leggings'), item('creatingspace:advanced_spacesuit_boots'), item('creatingspace:netherite_oxygen_backtank')], ['SP_ADV_FABRIC'], [
        'Upgrade to the advanced suit and netherite oxygen backtank before treating space as routine travel.',
        'This is the chapter capstone: you now have suit protection, portable oxygen, room support, rocket manufacturing, and chemical synthesis online.'
      ])
    ]
  },
  {
    filename: 'ae2', prefix: 'AE', id: 'BTM_AE2', order: 1, title: 'AE2 Local Intelligence', tier: 'diamond', group: 'intelligence', description: ['AE2 is local intelligence for a committed site. Storage and autocrafting improve a base, but trains and routes still move matter.'], quests: [
      q('AE_CHARGER', 'Certus Preparation', 0, -1, [item('ae2:charger')], ['SP_CHEM']),
      q('AE_INSCRIBER', 'Processor Fabrication', 0, 1, [item('ae2:inscriber')], ['SP_CHEM']),
      q('AE_CASE', 'Impossible Machine Casing', 2, 0, [item('kubejs:impossible_machine_casing')], ['AE_CHARGER', 'AE_INSCRIBER']),
      q('AE_CONTROLLER', 'Local Controller', 4, 0, [item('ae2:controller')], ['AE_CASE']),
      q('AE_DRIVE', 'Site Storage, Not Global Logistics', 6, -1, [item('ae2:drive')], ['AE_CONTROLLER']),
      q('AE_CRAFTING', 'Local Pattern Work', 6, 1, [item('ae2:crafting_unit'), item('ae2:molecular_assembler')], ['AE_CONTROLLER']),
      q('AE_SPATIAL', 'Spatial Field Work', 8, 0, [item('ae2:spatial_io_port')], ['AE_DRIVE', 'AE_CRAFTING'])
    ]
  },


  {
    filename: 'create_applied_kinetics', prefix: 'CAK', id: 'BTM_CREATE_APPLIED_KINETICS', order: 6, title: 'Create Applied Kinetics', tier: 'diamond', group: 'create', description: ['Create Applied Kinetics is a post-AE2 bridge. It lets Create machinery participate in local AE2 intelligence without replacing physical logistics.'], quests: [
      q('CAK_ENERGY_PROVIDER', 'Create Energy Provider', 0, 0, [item('createappliedkinetics:energy_provider')], ['AE_CONTROLLER', 'C2_BRASS']),
      q('CAK_ME_PROXY', 'ME Proxy', 2, 0, [item('createappliedkinetics:me_proxy')], ['CAK_ENERGY_PROVIDER']),
      q('CAK_PRINTED_CIRCUITS', 'Sequenced Printed Circuits', 4, -1, [item('ae2:printed_logic_processor'), item('ae2:printed_calculation_processor'), item('ae2:printed_engineering_processor')], ['CAK_ME_PROXY']),
      q('CAK_PROCESSORS', 'Sequenced Processors', 6, -1, [item('ae2:logic_processor'), item('ae2:calculation_processor'), item('ae2:engineering_processor')], ['CAK_PRINTED_CIRCUITS']),
      q('CAK_CREATE_LINE', 'Create Processor Line', 4, 1, [item('create:deployer'), item('create:mechanical_press'), item('create:depot')], ['CAK_ME_PROXY']),
      q('CAK_LOCAL_INTELLIGENCE', 'Local Intelligence Factory', 8, 0, [item('createappliedkinetics:me_proxy'), item('ae2:pattern_provider'), item('create:stock_link')], ['CAK_PROCESSORS', 'CAK_CREATE_LINE'], ['This is local site automation. It should make one base smarter without becoming intersite teleport logistics.'])
    ]
  },
  {
    filename: 'create_rail_logistics', prefix: 'C3', id: 'BTM_CREATE_RAIL_LOGISTICS', order: 5, title: 'Create Rail Logistics', tier: 'silver', group: 'create', description: ['Create III is physical logistics: Steam n Rails, stations, signals, conductors, rail yards, and authored intersite movement.'], quests: [
      q('C3_TRACK_COUPLER', 'Track Coupler', 0, 0, [item('railways:track_coupler')], ['C2_BRASS', 'CL_PORTABLE_INTERFACES'], ['Couplers make trains into planned logistics instead of minecart clutter.']),
      q('C3_CONDUCTOR', 'Conductor Tools', 2, -1, [item('railways:conductor_whistle'), item('railways:black_conductor_cap')], ['C3_TRACK_COUPLER'], ['The conductor layer is for authored train work and route maintenance.']),
      q('C3_BUFFER', 'Rail Yard Hardware', 2, 1, [item('railways:big_buffer')], ['C3_TRACK_COUPLER'], ['Buffers and yards make train stations physical places.']),
      q('C3_STATION', 'Train Station', 4, 0, [item('create:track_station')], ['C3_CONDUCTOR', 'C3_BUFFER'], ['Stations turn distance into named infrastructure. A station is a site commitment.']),
      q('C3_SIGNAL', 'Signals and Observers', 6, -1, [item('create:track_signal'), item('create:track_observer')], ['C3_STATION'], ['Signals make routes authored and safe instead of improvised rail lines.']),
      q('C3_SCHEDULE', 'Schedules and Controls', 6, 1, [item('create:schedule'), item('create:controls')], ['C3_STATION'], ['Schedules are physical logistics logic. This is not teleportation; trains must still move matter.']),
      q('C3_TRACK_SWITCH', 'Track Switching', 8, -2, [item('create:track_switch')], ['C3_SIGNAL']),
      q('C3_COUPLER_SYSTEM', 'Coupler Dispatch Control', 8, 2, [item('railways:track_coupler'), item('create:redstone_link')], ['C3_SCHEDULE']),
      q('C3_YARD', 'Rail Yard', 10, 0, [item('railways:big_buffer'), item('create:track_signal'), item('create:track_station')], ['C3_TRACK_SWITCH', 'C3_COUPLER_SYSTEM'], ['A rail yard is the first serious intersite logistics build. It should look like infrastructure.']),
      q('C3_FREIGHT_INTERFACE', 'Freight Interfaces', 12, -1, [item('create:portable_storage_interface'), item('create:portable_fluid_interface')], ['C3_YARD']),
      q('C3_OC_DISPATCH', 'OC2R Dispatch Layer', 12, 1, [item('oc2r:redstone_interface'), item('create:track_signal')], ['C3_YARD', 'OC_ROUTE_LOGIC'], ['OC2R observes and coordinates train routes. It does not replace the train.']),
      q('C3_CAPSTONE', 'Capstone: Intersite Freight Loop', 14, 0, [item('create:track_station'), item('create:schedule'), item('oc2r:redstone_interface')], ['C3_FREIGHT_INTERFACE', 'C3_OC_DISPATCH'], ['Capstone: operate a bidirectional freight loop with station logic, safe signaling, and dispatch visibility.'])
    ]
  },
  {
    filename: 'magic_ii', prefix: 'M2', id: 'BTM_MAGIC_II', order: 2, title: 'Magic II Power Branches', tier: 'diamond', group: 'matter', description: ['Magic II surfaces the stronger side-magic branches after Blood Magic permissions are already proven.'], quests: [
      q('M2_OCCULT_STORAGE', 'Occult Storage Permission', 0, -2, [item('occultism:storage_controller')], ['M1_DEMONIC'], ['Occult storage is useful, but it must not become an early infinite-storage substitute.']),
      q('M2_BOTANIA_TERRA', 'Terrestrial Plate', 0, 0, [item('botania:terra_plate')], ['M2_OCCULT_STORAGE', 'M1_BOTANIA'], ['Botania engineering starts after Demonic Slate permission.']),
      q('M2_ALFHEIM', 'Alfheim Portal', 2, 0, [item('botania:alfheim_portal')], ['M2_BOTANIA_TERRA'], ['Dimensional magic has to be a constructed commitment.']),
      q('M2_FORGE', 'Forbidden Forge', 0, 2, [item('forbidden_arcanus:hephaestus_forge')], ['M2_BOTANIA_TERRA', 'M1_DEMONIC'], ['Forbidden and Arcanus belongs after Demonic Slate permission, not early utility work.']),
      q('M2_THEURGY', 'Theurgy Accumulator', 2, 2, [item('theurgy:sal_ammoniac_accumulator')], ['M2_FORGE'], ['Theurgy is matter transmutation, so it belongs near late magic and synthesis rather than early ore solving.']),
      q('M2_HEXCAST', 'Hex Focus and Staff', 4, -1, [item('hexcasting:focus'), item('hexcasting:staff/oak')], ['M2_THEURGY', 'M1_ETHEREAL'], ['Programmable magic waits for Ethereal Slate permission.']),
      q('M2_MNA', 'Mana and Artifice Runeforge', 4, 1, [item('mna:runeforge'), item('mna:manaweaver_wand')], ['M2_THEURGY', 'M1_ETHEREAL'], ['Mana and Artifice is late magical infrastructure, not a side-door around Blood Magic.']),
      q('M2_ARS_POWER', 'Ars Addon Power', 6, 0, [item('ars_elemental:advanced_prism'), item('ars_creo:starbuncle_wheel'), item('ars_caelum:ritual_conjure_island_starter')], ['M2_HEXCAST', 'M2_MNA', 'M1_ETHEREAL'], ['Late Ars branches are allowed to be powerful after Blood Magic says yes.'])
    ]
  },
  {
    filename: 'synthesis_ii', prefix: 'S2', id: 'BTM_SYNTHESIS_II', order: 3, title: 'Synthesis II', tier: 'platinum', group: 'matter', description: ['Synthesis II extends Chemlib through PNCR pressure, gas handling, and late plates. Create remains the visible bulk chemistry surface.'], quests: [
      q('S2_PRESSURE', 'Pressure Chemistry', 0, 0, [item('pneumaticcraft:pressure_chamber_interface'), item('kubejs:pressure_seal')], ['S1_SYNTHESIS_EXIT'], ['Sealed chemistry starts when pressure, seals, and chamber infrastructure are online.']),
      q('S2_THERMO', 'Thermo Plant Gases', 2, -1, [item('pneumaticcraft:thermopneumatic_processing_plant'), item('chemlib:sulfur_dioxide')], ['S2_PRESSURE'], ['Gas chemistry is a pressure-and-temperature commitment, not a crafting grid shortcut.']),
      q('S2_ASSEMBLY', 'Chemical Assembly', 2, 1, [item('pneumaticcraft:assembly_controller'), item('pneumaticcraft:assembly_platform')], ['S2_PRESSURE'], ['PNCR assembly makes boards and sealed parts authored factory products.']),
      q('S2_URANIUM', 'Uranium Plate', 4, -2, [item('chemlib:uranium_plate')], ['S2_THERMO'], ['Lava-depth and deep synthesis materials become engineered plates.']),
      q('S2_THORIUM', 'Thorium Plate', 4, 0, [item('chemlib:thorium_plate')], ['S2_THERMO'], ['Thorium is a late matter-routing material, not furnace ore.']),
      q('S2_IRIDIUM', 'Iridium Plate', 4, 2, [item('chemlib:iridium_plate')], ['S2_ASSEMBLY'], ['Iridium should represent serious chemistry and extreme-resource commitment.']),
      q('S2_RUTHENIUM', 'Ruthenium Plate', 6, 0, [item('chemlib:ruthenium_plate')], ['S2_URANIUM', 'S2_THORIUM', 'S2_IRIDIUM'], ['Ruthenium is a capstone signal for advanced chemical interpretation.'])
    ]
  },

  {
    filename: 'aether', prefix: 'AET', id: 'BTM_AETHER', order: 0, title: 'The Aether', tier: 'gold', group: 'worlds', description: ['Sky routes, dungeon keys, and gravitite rewards. The Aether is an expedition branch, not a replacement overworld.'], quests: [
      q('AET_ENTRY', 'Sky Route Kit', 0, 0, [item('aether:book_of_lore')], ['AD_IRON_FLOAT'], ['Treat Aether entry as a packed route: food, water, fall safety, and retreat plan.']),
      q('AET_ALTAR', 'Altar Work', 2, -1, [item('aether:altar')], ['AET_ENTRY']),
      q('AET_FREEZER', 'Freezer Work', 2, 1, [item('aether:freezer')], ['AET_ENTRY']),
      q('AET_AMBROSIUM', 'Ambrosium Stock', 4, -1, [item('aether:ambrosium_shard')], ['AET_ALTAR']),
      q('AET_ZANITE', 'Zanite Route', 4, 1, [item('aether:zanite_gemstone')], ['AET_FREEZER']),
      q('AET_BRONZE_KEY', 'Bronze Dungeon Key', 6, -1, [item('aether:bronze_dungeon_key')], ['AET_AMBROSIUM', 'AET_ZANITE']),
      q('AET_SILVER_KEY', 'Silver Dungeon Key', 8, 0, [item('aether:silver_dungeon_key')], ['AET_BRONZE_KEY']),
      q('AET_GRAVITITE', 'Enchanted Gravitite', 10, -1, [item('aether:enchanted_gravitite')], ['AET_SILVER_KEY']),
      q('AET_GOLD_KEY', 'Gold Dungeon Key', 12, 0, [item('aether:gold_dungeon_key')], ['AET_GRAVITITE'])
    ]
  },
  {
    filename: 'blue_skies', prefix: 'BS', id: 'BTM_BLUE_SKIES', order: 1, title: 'Blue Skies', tier: 'gold', group: 'worlds', description: ['A separate adventure world with keys, materials, alchemy, and boss trophies.'], quests: [
      q('BS_JOURNAL', 'Blue Journal', 0, 0, [item('blue_skies:blue_journal')], ['AD_IRON_FLOAT']),
      q('BS_MATERIALS', 'Sky Materials', 2, -1, [item('blue_skies:aquite'), item('blue_skies:charoite')], ['BS_JOURNAL']),
      q('BS_ALCHEMY', 'Alchemy Table', 2, 1, [item('blue_skies:alchemy_table')], ['BS_JOURNAL']),
      q('BS_TURQUOISE', 'Turquoise Stonework', 4, -1, [item('blue_skies:turquoise_stone')], ['BS_MATERIALS']),
      q('BS_BLINDING_KEY', 'Blinding Key', 6, -2, [item('blue_skies:blinding_key')], ['BS_TURQUOISE']),
      q('BS_NATURE_KEY', 'Nature Key', 6, 0, [item('blue_skies:nature_key')], ['BS_ALCHEMY']),
      q('BS_POISON_KEY', 'Poison Key', 6, 2, [item('blue_skies:poison_key')], ['BS_ALCHEMY']),
      q('BS_BOSS_TROPHY', 'Boss Trophies', 8, 0, [item('blue_skies:summoner_trophy'), item('blue_skies:arachnarch_trophy')], ['BS_BLINDING_KEY', 'BS_NATURE_KEY', 'BS_POISON_KEY'])
    ]
  },
  {
    filename: 'twilight_forest', prefix: 'TW', id: 'BTM_TWILIGHT_FOREST', order: 2, title: 'Twilight Forest', tier: 'gold', group: 'worlds', description: ['A readable boss-ladder chapter for Twilight Forest progression.', 'Direct portal creation is disabled; treat this as a Creating Space rocket-route expedition world, not an early flower-and-diamond shortcut.'], quests: [
      q('TW_MAGIC_MAP', 'Magic Map', 0, 0, [item('twilightforest:magic_map')], ['SP_SUIT_ADV'], [
        'Twilight Forest access is via the Creating Space rocket graph after the advanced suit and netherite oxygen backtank.',
        'The ordinary Twilight portal is disabled so Twilight stays a later route branch instead of an early alternate overworld.'
      ]),
      q('TW_NAGA', 'Naga Scale', 2, -1, [item('twilightforest:naga_scale')], ['TW_MAGIC_MAP']),
      q('TW_LICH', 'Lich Trophy', 4, -1, [item('twilightforest:lich_trophy')], ['TW_NAGA']),
      q('TW_MAZE', 'Maze Map', 4, 1, [item('twilightforest:maze_map')], ['TW_NAGA']),
      q('TW_CARMINITE', 'Carminite', 6, -1, [item('twilightforest:carminite')], ['TW_LICH']),
      q('TW_FIERY_BLOOD', 'Fiery Blood', 6, 1, [item('twilightforest:fiery_blood')], ['TW_MAZE']),
      q('TW_YETI', 'Alpha Yeti Fur', 8, 1, [item('twilightforest:alpha_yeti_fur')], ['TW_FIERY_BLOOD']),
      q('TW_UR_GHAST', 'Ur-Ghast Trophy', 10, 0, [item('twilightforest:ur_ghast_trophy')], ['TW_CARMINITE', 'TW_YETI'])
    ]
  },
  {
    filename: 'undergarden', prefix: 'UG', id: 'BTM_UNDERGARDEN', order: 3, title: 'The Undergarden', tier: 'gold', group: 'worlds', description: ['A deep hostile ecology branch with its own metals, food pressure, and forgotten gear.'], quests: [
      q('UG_DEPTHROCK', 'Depthrock Route', 0, 0, [item('undergarden:depthrock')], ['AD_IRON_FLOAT']),
      q('UG_GLOOMGOURD', 'Gloomgourd Food', 2, 1, [item('undergarden:gloomgourd')], ['UG_DEPTHROCK']),
      q('UG_CLOGGRUM', 'Cloggrum Ingot', 2, -1, [item('undergarden:cloggrum_ingot')], ['UG_DEPTHROCK']),
      q('UG_FROSTSTEEL', 'Froststeel Ingot', 4, -1, [item('undergarden:froststeel_ingot')], ['UG_CLOGGRUM']),
      q('UG_UTHERIUM', 'Utherium Crystal', 6, -2, [item('undergarden:utherium_crystal')], ['UG_FROSTSTEEL']),
      q('UG_REGALIUM', 'Regalium Crystal', 6, 0, [item('undergarden:regalium_crystal')], ['UG_FROSTSTEEL']),
      q('UG_FORGOTTEN', 'Forgotten Ingot', 8, -1, [item('undergarden:forgotten_ingot')], ['UG_UTHERIUM', 'UG_REGALIUM']),
      q('UG_FORGOTTEN_ARMING', 'Forgotten Arming', 10, 0, [item('undergarden:forgotten_upgrade_smithing_template')], ['UG_FORGOTTEN'])
    ]
  },
  {
    filename: 'deeper_darker', prefix: 'DD', id: 'BTM_DEEPER_DARKER', order: 4, title: 'Deeper and Darker', tier: 'platinum', group: 'worlds', description: ['Late deep-threat work: gloomslate, sculk materials, reinforced shards, and resonarium.'], quests: [
      q('DD_GLOOMSLATE', 'Gloomslate', 0, 0, [item('deeperdarker:gloomslate')], ['FI_FISSION_ROD']),
      q('DD_SCULK_STONE', 'Sculk Stone', 2, -1, [item('deeperdarker:sculk_stone')], ['DD_GLOOMSLATE']),
      q('DD_HEART', 'Heart of the Deep', 4, 0, [item('deeperdarker:heart_of_the_deep')], ['DD_SCULK_STONE']),
      q('DD_ECHO_SHARD', 'Reinforced Echo Shard', 6, -1, [item('deeperdarker:reinforced_echo_shard')], ['DD_HEART']),
      q('DD_RESONARIUM', 'Resonarium', 8, -1, [item('deeperdarker:resonarium')], ['DD_ECHO_SHARD']),
      q('DD_RESONARIUM_PLATE', 'Resonarium Plate', 8, 1, [item('deeperdarker:resonarium_plate')], ['DD_ECHO_SHARD']),
      q('DD_SOUL', 'Soul Crystal', 10, 0, [item('deeperdarker:soul_crystal')], ['DD_RESONARIUM', 'DD_RESONARIUM_PLATE'])
    ]
  },
  {
    filename: 'ice_and_fire', prefix: 'IAF', id: 'BTM_ICE_AND_FIRE', order: 5, title: 'Ice and Fire', tier: 'platinum', group: 'worlds', description: ['Apex monster trophies and dragon materials. This branch is intentionally late and dangerous.'], quests: [
      q('IAF_BESTIARY', 'Bestiary', 0, 0, [item('iceandfire:bestiary')], ['AD_IRON_FLOAT']),
      q('IAF_DRAGONBONE', 'Dragonbone', 2, 0, [item('iceandfire:dragonbone')], ['IAF_BESTIARY']),
      q('IAF_FIRE_BLOOD', 'Fire Dragon Blood', 4, -2, [item('iceandfire:fire_dragon_blood')], ['IAF_DRAGONBONE']),
      q('IAF_ICE_BLOOD', 'Ice Dragon Blood', 4, 0, [item('iceandfire:ice_dragon_blood')], ['IAF_DRAGONBONE']),
      q('IAF_LIGHTNING_BLOOD', 'Lightning Dragon Blood', 4, 2, [item('iceandfire:lightning_dragon_blood')], ['IAF_DRAGONBONE']),
      q('IAF_DRAGONSTEEL', 'Dragonsteel Set', 6, 0, [item('iceandfire:dragonsteel_fire_ingot'), item('iceandfire:dragonsteel_ice_ingot'), item('iceandfire:dragonsteel_lightning_ingot')], ['IAF_FIRE_BLOOD', 'IAF_ICE_BLOOD', 'IAF_LIGHTNING_BLOOD']),
      q('IAF_SKULL', 'Dragon Skull Trophy', 8, -1, [item('iceandfire:dragon_skull_fire')], ['IAF_DRAGONSTEEL']),
      q('IAF_DREAD', 'Dread Shard', 10, 0, [item('iceandfire:dread_shard')], ['IAF_SKULL'])
    ]
  },
  {
    filename: 'lost_cities', prefix: 'LC', id: 'BTM_LOST_CITIES', order: 6, title: 'Lost Cities', tier: 'platinum', group: 'worlds', description: ['Lost Cities is a space-era ruin and scavenging route.', 'It has no ordinary crafting entry item, so the chapter is gated by the Creating Space rocket graph and uses route-prep checkpoints.'], quests: [
      q('LC_SPACE_ROUTE', 'Space-Era City Route', 0, 0, [item('creatingspace:netherite_oxygen_backtank')], ['SP_SUIT_ADV'], [
        'Do not treat Lost Cities as an early world preset. Enter it only after advanced space survival is online.',
        'Pack oxygen, food, water, blocks, lights, and return logistics before committing to a city route.'
      ]),
      q('LC_MAP_STOCK', 'Urban Mapping Stock', 2, -1, [item('minecraft:map'), item('minecraft:compass')], ['LC_SPACE_ROUTE'], [
        'Cities are navigation problems. Bring maps and a compass so routes through buildings, subways, and streets stay readable.'
      ]),
      q('LC_RAIL_DUNGEON', 'Rail Dungeon Scouting', 4, -1, [item('minecraft:rail'), item('minecraft:minecart')], ['LC_MAP_STOCK'], [
        'Lost Cities rail corridors are physical logistics opportunities. Scout them as route infrastructure, not just loot tunnels.'
      ]),
      q('LC_MEDICAL_CACHE', 'Recovery Cache', 4, 1, [item('minecraft:golden_apple'), item('farmersdelight:roast_chicken_block')], ['LC_SPACE_ROUTE'], [
        'Urban scavenging has long sightlines, vertical danger, and recovery risk. Stage food and healing before deep building clears.'
      ]),
      q('LC_CITY_LOOT', 'City Chest Recovery', 6, 0, [item('dotcoinmod:gold_coin'), item('minecraft:chest')], ['LC_RAIL_DUNGEON', 'LC_MEDICAL_CACHE'], [
        'World loot and coins are part of the crafting economy. Treat recovered city loot as a resource stream that still has to be hauled home.'
      ]),
      q('LC_CITY_RECOVERY', 'Recovered City Infrastructure', 8, 0, [item('minecraft:iron_bars'), item('minecraft:chain'), item('minecraft:lantern')], ['LC_CITY_LOOT'], [
        'Bring back durable city materials for outposts, rail stops, and defensive routes. The value is not only the chest contents.'
      ])
    ]
  },
  {
    filename: 'fallout_wastelands', prefix: 'FW', id: 'BTM_FALLOUT_WASTELANDS', order: 7, title: 'Fallout Wastelands', tier: 'platinum', group: 'worlds', description: ['Hazard-route scavenging: anti-rad protection, scrap electronics, weapons, and power armor.', 'The direct Wasteland portal frame and igniter are disabled; access comes from the Creating Space rocket graph.'], quests: [
      q('FW_SPACE_ROUTE', 'Wasteland Rocket Route', 0, 0, [item('creatingspace:rocket_controls'), item('creatingspace:netherite_oxygen_backtank')], ['SP_SUIT_ADV'], [
        'Use the Creating Space route graph for Wasteland access after advanced suit survival is online.',
        'The direct portal frame and igniter are intentionally absent from JEI/EMI so the route source stays clear.'
      ]),
      q('FW_RAD_SUIT', 'Anti-Rad Suit', 2, 0, [item('fallout_wastelands_:antiradsuit_helmet'), item('fallout_wastelands_:antiradsuit_chestplate')], ['FW_SPACE_ROUTE']),
      q('FW_SCRAP', 'Wasteland Scrap', 4, -1, [item('fallout_wastelands_:dented_can'), item('fallout_wastelands_:copperwires')], ['FW_RAD_SUIT']),
      q('FW_FOOD', 'Packaged Food', 4, 1, [item('fallout_wastelands_:cram'), item('fallout_wastelands_:canned_beef')], ['FW_RAD_SUIT']),
      q('FW_ELECTRONICS', 'Advanced Electronics', 6, -1, [item('fallout_wastelands_:advanced_motherboard'), item('fallout_wastelands_:advanced_motor')], ['FW_SCRAP']),
      q('FW_WEAPON', 'Wasteland Weapon', 6, 1, [item('fallout_wastelands_:chinesepistol')], ['FW_SCRAP']),
      q('FW_POWER_CORE', 'Power Core', 8, 0, [item('fallout_wastelands_:bas_ecore')], ['FW_ELECTRONICS', 'FW_WEAPON']),
      q('FW_POWER_ARMOR', 'Power Armor Frame', 10, 0, [item('fallout_wastelands_:apa_1_chestplate'), item('fallout_wastelands_:apa_1_helmet')], ['FW_POWER_CORE'])
    ]
  },
  {
    filename: 'ars_nouveau', prefix: 'AN', id: 'BTM_ARS_NOUVEAU', order: 4, title: 'Ars Nouveau', tier: 'diamond', group: 'matter', description: ['The practical magic powerhouse, separated from the Blood Magic permission skeleton.'], quests: [
      q('AN_IMBUEMENT', 'Imbuement Chamber', 0, 0, [item('ars_nouveau:imbuement_chamber')], ['M1_ARS']),
      q('AN_SOURCE_JAR', 'Source Jar', 2, -1, [item('ars_nouveau:source_jar')], ['AN_IMBUEMENT']),
      q('AN_APPARATUS', 'Enchanting Apparatus', 2, 1, [item('ars_nouveau:enchanting_apparatus')], ['AN_IMBUEMENT']),
      q('AN_ARCANE_CORE', 'Arcane Core', 4, 0, [item('ars_nouveau:arcane_core')], ['AN_APPARATUS']),
      q('AN_RITUALS', 'Ritual Brazier', 6, -1, [item('ars_nouveau:ritual_brazier')], ['AN_ARCANE_CORE']),
      q('AN_APPRENTICE', 'Apprentice Spell Book', 6, 1, [item('ars_nouveau:apprentice_spell_book')], ['AN_ARCANE_CORE']),
      q('AN_WILDEN', 'Wilden Tribute', 8, -1, [item('ars_nouveau:wilden_tribute')], ['AN_RITUALS']),
      q('AN_ARCHMAGE', 'Archmage Spell Book', 10, 0, [item('ars_nouveau:archmage_spell_book')], ['AN_APPRENTICE', 'AN_WILDEN', 'M1_ETHEREAL'])
    ]
  },
  {
    filename: 'malum', prefix: 'MAL', id: 'BTM_MALUM', order: 5, title: 'Malum', tier: 'diamond', group: 'matter', description: ['Spirit capture, runewood, and soul-stained steel as a dedicated magic-material branch.'], quests: [
      q('MAL_ALTAR', 'Spirit Altar', 0, 0, [item('malum:spirit_altar')], ['M1_MALUM']),
      q('MAL_RUNEWOOD', 'Runewood Growth', 2, 1, [item('malum:runewood_sapling')], ['MAL_ALTAR']),
      q('MAL_SPIRIT_JAR', 'Spirit Jar', 2, -1, [item('malum:spirit_jar')], ['MAL_ALTAR']),
      q('MAL_WORKBENCH', 'Runic Workbench', 4, 0, [item('malum:runic_workbench')], ['MAL_RUNEWOOD', 'MAL_SPIRIT_JAR']),
      q('MAL_SPIRIT_CRUCIBLE', 'Spirit Crucible', 6, -1, [item('malum:spirit_crucible')], ['MAL_WORKBENCH']),
      q('MAL_SPIRIT_FABRIC', 'Spirit Fabric', 6, 1, [item('malum:spirit_fabric')], ['MAL_WORKBENCH']),
      q('MAL_SOUL_STEEL', 'Soul-Stained Steel', 8, 0, [item('malum:soul_stained_steel_ingot')], ['MAL_SPIRIT_CRUCIBLE', 'MAL_SPIRIT_FABRIC'])
    ]
  },
  {
    filename: 'occultism', prefix: 'OCC', id: 'BTM_OCCULTISM', order: 6, title: 'Occultism', tier: 'diamond', group: 'matter', description: ['Ritual apparatus, storage, iesnium, and dimensional matrix work.', 'Spirit miners are hidden in this pack so Occultism supports rituals and storage without becoming a passive mining bypass.'], quests: [
      q('OCC_CHALK', 'Impure White Chalk', 0, 0, [item('occultism:chalk_white_impure')], ['M1_OCCULT']),
      q('OCC_RITUAL_BOWLS', 'Ritual Bowls', 2, -1, [item('occultism:sacrificial_bowl'), item('occultism:golden_sacrificial_bowl')], ['OCC_CHALK']),
      q('OCC_ATTUNED_GEM', 'Spirit-Attuned Gem', 4, -1, [item('occultism:spirit_attuned_gem')], ['OCC_RITUAL_BOWLS']),
      q('OCC_STORAGE', 'Storage Controller', 6, -2, [item('occultism:storage_controller')], ['OCC_ATTUNED_GEM', 'M2_OCCULT_STORAGE']),
      q('OCC_IESNIUM', 'Iesnium Ingot', 8, -1, [item('occultism:iesnium_ingot')], ['OCC_STORAGE']),
      q('OCC_DIMENSIONAL_MATRIX', 'Dimensional Matrix', 10, 0, [item('occultism:dimensional_matrix')], ['OCC_IESNIUM'])
    ]
  },
  {
    filename: 'botania', prefix: 'BOT', id: 'BTM_BOTANIA', order: 7, title: 'Botania', tier: 'diamond', group: 'matter', description: ['Mana engineering, runes, terrasteel, Alfheim, and Gaia in one readable branch.'], quests: [
      q('BOT_LEXICON', 'Lexica Botania', 0, 0, [item('botania:lexicon')], ['M1_BOTANIA']),
      q('BOT_MANA_POOL', 'Mana Pool', 2, -1, [item('botania:mana_pool')], ['BOT_LEXICON']),
      q('BOT_SPREADER', 'Mana Spreader', 2, 1, [item('botania:mana_spreader')], ['BOT_LEXICON']),
      q('BOT_RUNIC_ALTAR', 'Runic Altar', 4, 0, [item('botania:runic_altar')], ['BOT_MANA_POOL', 'BOT_SPREADER']),
      q('BOT_TERRA_PLATE', 'Terrestrial Plate', 6, -1, [item('botania:terra_plate')], ['BOT_RUNIC_ALTAR', 'M2_BOTANIA_TERRA']),
      q('BOT_TERRASTEEL', 'Terrasteel Ingot', 6, 1, [item('botania:terrasteel_ingot')], ['BOT_TERRA_PLATE']),
      q('BOT_ALFHEIM', 'Alfheim Portal', 8, -1, [item('botania:alfheim_portal')], ['BOT_TERRASTEEL', 'M2_ALFHEIM']),
      q('BOT_GAIA', 'Gaia Reward', 10, 0, [item('botania:gaia_ingot'), item('botania:gaia_head')], ['BOT_ALFHEIM'])
    ]
  },
  {
    filename: 'theurgy', prefix: 'THG', id: 'BTM_THEURGY', order: 8, title: 'Theurgy', tier: 'platinum', group: 'matter', description: ['A magical matter-transmutation chain alongside Create/PNCR synthesis.'], quests: [
      q('THG_ACCUMULATOR', 'Sal Ammoniac Accumulator', 0, 0, [item('theurgy:sal_ammoniac_accumulator')], ['M2_THEURGY']),
      q('THG_SALT', 'Alchemical Salt', 2, -1, [item('theurgy:alchemical_salt_mineral')], ['THG_ACCUMULATOR']),
      q('THG_DISTILLER', 'Distiller', 4, -1, [item('theurgy:distiller')], ['THG_SALT']),
      q('THG_CALCINATION', 'Calcination Oven', 4, 1, [item('theurgy:calcination_oven')], ['THG_SALT']),
      q('THG_LIQUEFACTION', 'Liquefaction Cauldron', 6, -1, [item('theurgy:liquefaction_cauldron')], ['THG_DISTILLER']),
      q('THG_INCUBATOR', 'Incubator', 6, 1, [item('theurgy:incubator')], ['THG_CALCINATION']),
      q('THG_DIGESTION', 'Digestion Vat', 8, 0, [item('theurgy:digestion_vat')], ['THG_LIQUEFACTION', 'THG_INCUBATOR'])
    ]
  },
  {
    filename: 'reliquary', prefix: 'RELQ', id: 'BTM_RELIQUARY', order: 0, title: 'Reliquary', tier: 'diamond', group: 'relics', description: ['Strong utility relics and alchemical tools get a visible branch instead of accidental loot creep.'], quests: [
      q('RELQ_MORTAR', 'Apothecary Mortar', 0, 0, [item('reliquary:apothecary_mortar')], ['M1_BLANK']),
      q('RELQ_APOTHECARY', 'Apothecary Cauldron', 2, -1, [item('reliquary:apothecary_cauldron')], ['RELQ_MORTAR']),
      q('RELQ_TORCH', 'Interdiction Torch', 2, 1, [item('reliquary:interdiction_torch')], ['RELQ_MORTAR']),
      q('RELQ_HANDGUN', 'Handgun Line', 4, -1, [item('reliquary:handgun')], ['RELQ_APOTHECARY']),
      q('RELQ_ALKAHESTRY', 'Alkahestry', 4, 1, [item('reliquary:alkahestry_altar'), item('reliquary:alkahestry_tome')], ['RELQ_APOTHECARY', 'M1_DEMONIC']),
      q('RELQ_GRENADE', 'Holy Hand Grenade', 6, -1, [item('reliquary:holy_hand_grenade')], ['RELQ_HANDGUN']),
      q('RELQ_CHALICE', 'Emperor Chalice', 8, 0, [item('reliquary:emperor_chalice')], ['RELQ_ALKAHESTRY', 'RELQ_GRENADE'])
    ]
  },
  {
    filename: 'artifacts', prefix: 'ART', id: 'BTM_ARTIFACTS', order: 1, title: 'Artifacts', tier: 'gold', group: 'relics', description: ['Exploration artifact categories that affect routes, bodies, and extraction.'], quests: [
      q('ART_VISION', 'Night Vision Goggles', 0, -1, [item('artifacts:night_vision_goggles')], ['AD_COMPLETED']),
      q('ART_MOBILITY', 'Cloud in a Bottle', 0, 1, [item('artifacts:cloud_in_a_bottle')], ['AD_COMPLETED']),
      q('ART_HEART', 'Crystal Heart', 2, 0, [item('artifacts:crystal_heart')], ['ART_VISION', 'ART_MOBILITY']),
      q('ART_DEFENSE', 'Obsidian Skull', 4, -1, [item('artifacts:obsidian_skull')], ['ART_HEART']),
      q('ART_UTILITY', 'Universal Attractor', 4, 1, [item('artifacts:universal_attractor')], ['ART_HEART']),
      q('ART_FIRE', 'Fire Gauntlet', 6, 0, [item('artifacts:fire_gauntlet')], ['ART_DEFENSE', 'ART_UTILITY']),
      q('ART_UMBRELLA', 'Route Umbrella', 8, 0, [item('artifacts:umbrella')], ['ART_FIRE'])
    ]
  },
  {
    filename: 'relics', prefix: 'RLC', id: 'BTM_RELICS', order: 2, title: 'Relics', tier: 'platinum', group: 'relics', description: ['High-impact adventure relics, separated from ordinary loot.'], quests: [
      q('RLC_TABLE', 'Researching Table', 0, 0, [item('relics:researching_table')], ['AD_COMPLETED']),
      q('RLC_QUIVER', 'Arrow Quiver', 2, -1, [item('relics:arrow_quiver')], ['RLC_TABLE']),
      q('RLC_MIRROR', 'Magic Mirror', 2, 1, [item('relics:magic_mirror')], ['RLC_TABLE']),
      q('RLC_ENDER_HAND', 'Ender\'s Hand', 4, -1, [item('relics:enders_hand')], ['RLC_QUIVER']),
      q('RLC_ELYTRA', 'Elytra Booster', 4, 1, [item('relics:elytra_booster')], ['RLC_MIRROR']),
      q('RLC_SHADOW', 'Shadow Glaive', 6, -1, [item('relics:shadow_glaive')], ['RLC_ENDER_HAND']),
      q('RLC_SPACE', 'Space Dissector', 8, 0, [item('relics:space_dissector')], ['RLC_ELYTRA', 'RLC_SHADOW'])
    ]
  },
  {
    filename: 'starcatcher', prefix: 'SC', id: 'BTM_STARCATCHER', order: 3, title: 'Starcatcher Fishing', tier: 'brass', group: 'routes', description: ['Starcatcher is a fishing minigame and reward economy.', 'Use it for water-route rewards, fish sale loops, satchels, and trophies rather than bulk ore replacement.'], quests: [
      q('SC_ROD', 'Starcatcher Rod', 0, 0, [item('starcatcher:starcatcher_rod')], ['FB_STOVE'], ['The rod starts the system. Fishing is a route activity: bring food, water, and time, then convert catches into trade value.']),
      q('SC_TWINE', 'Tackle Materials', 2, -1, [item('starcatcher:starcatcher_twine'), item('starcatcher:hook'), item('starcatcher:bobber')], ['SC_ROD'], ['Tackle upgrades control the fishing loop. Keep spare hooks, bobbers, bait, and twine with your route supplies.']),
      q('SC_BAIT', 'Bait Choices', 4, -1, [item('starcatcher:murkwater_bait'), item('starcatcher:dripstone_bait'), item('starcatcher:sculk_bait')], ['SC_TWINE'], ['Bait makes the minigame a material system. Different environments and ingredients should point toward different catches.']),
      q('SC_CATCHES', 'Route Catches', 4, 1, [item('starcatcher:pinfish'), item('starcatcher:deepslatefish'), item('starcatcher:magma_fish')], ['SC_ROD'], ['Fish are proof of water routes. Sell selected fish to Fishermen for copper coins or keep them as food and collection targets.']),
      q('SC_ECONOMY', 'Fisherman Economy', 6, 0, [item('starcatcher:fish_radar'), item('starcatcher:waterlogged_satchel')], ['SC_BAIT', 'SC_CATCHES'], ['Fishermen now sell tackle and buy selected catches for coins. This makes fishing a side economy like Wares or village contracts.']),
      q('SC_TROPHY', 'Tournament Display', 8, 0, [item('starcatcher:tournament_stand'), item('starcatcher:trophy_gold')], ['SC_ECONOMY'], ['Trophies make the system visible at a base or settlement. Use them to mark fishing routes and completed collections.'])
    ]
  },
  {
    filename: 'little_logistics', prefix: 'LL', id: 'BTM_LITTLE_LOGISTICS', order: 4, title: 'Little Logistics', tier: 'gold', group: 'power', description: ['Little Logistics is small physical route automation.', 'It sits after Create rail basics and electricity so barges and tugs support routes without replacing trains.'], quests: [
      q('LL_TUG', 'Energy Tug', 0, 0, [item('littlelogistics:energy_tug')], ['C3_STATION', 'GP_BATTERY']),
      q('LL_BARGES', 'Cargo Barges', 2, -1, [item('littlelogistics:chest_barge'), item('littlelogistics:fluid_barge')], ['LL_TUG']),
      q('LL_CHARGER', 'Vessel Charger', 2, 1, [item('littlelogistics:vessel_charger')], ['LL_TUG', 'GP_BATTERY']),
      q('LL_LOCOMOTIVE', 'Small Rail Power', 4, -1, [item('littlelogistics:energy_locomotive')], ['LL_CHARGER']),
      q('LL_SIGNAL', 'Route Signals', 4, 1, [item('littlelogistics:receiver_component'), item('littlelogistics:transmitter_component')], ['LL_CHARGER', 'OC_NETWORK']),
      q('LL_ROUTE', 'Local Route Network', 6, 0, [item('littlelogistics:energy_tug'), item('littlelogistics:receiver_component'), item('littlelogistics:transmitter_component')], ['LL_BARGES', 'LL_SIGNAL'], ['Use this for river, coast, and short-haul outpost service. Create trains remain the heavy intersite logistics answer.'])
    ]
  },
  {
    filename: 'apotheosis', prefix: 'AP', id: 'BTM_APOTHEOSIS', order: 3, title: 'Apotheosis', tier: 'diamond', group: 'relics', description: ['Apotheosis is a combat, affix, salvage, and enchantment branch.', 'It is parented to Blood Magic tiers so its power spike supports adventure without becoming early gear inflation.'], quests: [
      q('AP_GEM_CUTTING', 'Gem Cutting', 0, 0, [item('apotheosis:gem_cutting_table')], ['M1_IMBUED']),
      q('AP_SALVAGE', 'Salvage Table', 2, -1, [item('apotheosis:salvaging_table')], ['AP_GEM_CUTTING']),
      q('AP_SIMPLE_REFORGE', 'Simple Reforging', 2, 1, [item('apotheosis:simple_reforging_table')], ['AP_GEM_CUTTING']),
      q('AP_REFORGING', 'Full Reforging', 4, 0, [item('apotheosis:reforging_table'), item('apotheosis:augmenting_table')], ['AP_SALVAGE', 'AP_SIMPLE_REFORGE', 'M1_DEMONIC']),
      q('AP_LIBRARY', 'Enchantment Library', 6, -1, [item('apotheosis:library'), item('apotheosis:ender_library')], ['AP_REFORGING']),
      q('AP_SHELVES', 'Late Shelves', 8, 0, [item('apotheosis:deepshelf'), item('apotheosis:endshelf')], ['AP_LIBRARY', 'M1_ETHEREAL'])
    ]
  },
  {
    filename: 'building_block_systems', prefix: 'FBK', id: 'BTM_BUILDING_BLOCK_SYSTEMS', order: 0, title: 'Building Block Systems', tier: 'copper', group: 'building', description: ['A map of building-block sources and palette systems.', 'Decorative blocks are allowed shallow graph depth, with trades as a side-load rather than a full machine spine.'], quests: [
      q('FBK_FRAMED_CORE', 'Framed Block Core', 0, 0, [item('framedblocks:framed_cube'), item('framedblocks:framed_slab'), item('framedblocks:framed_stairs')], ['SO_CRAFTING'], ['Framed Blocks let one material take many shapes. Treat them as a palette multiplier, not a progression shortcut.']),
      q('FBK_FRAMED_SHAPES', 'Framed Shapes', 2, -1, [item('framedblocks:framed_slope'), item('framedblocks:framed_door'), item('framedblocks:framed_trapdoor')], ['FBK_FRAMED_CORE']),
      q('FBK_SETTLEMENT', 'Settlement Materials', 2, 1, [item('supplementaries:crystal_display'), item('minecraft:lantern'), item('minecraft:chain')], ['FBK_FRAMED_CORE', 'VE_TRADING_POST']),
      q('FBK_WEATHERED', 'Weathered Materials', 4, -1, [item('immersive_weathering:charred_planks'), item('minecraft:mossy_stone_bricks')], ['FBK_SETTLEMENT']),
      q('FBK_REGIONAL', 'Regional Palettes', 4, 1, [item('natures_spirit:travertine'), item('natures_spirit:chert'), item('natures_spirit:pink_sand')], ['FBK_SETTLEMENT'], ['Regional blocks make terrain and travel matter for architecture. Different outposts should have different local palettes.']),
      q('FBK_ROUTE_BUILDING', 'Route-Readable Builds', 6, 0, [item('framedblocks:framed_fence'), item('framedblocks:framed_wall')], ['FBK_WEATHERED', 'FBK_REGIONAL'])
    ]
  },
  {
    filename: 'building_tools', prefix: 'BU', id: 'BTM_BUILDING_TOOLS', order: 1, title: 'Building Tools', tier: 'platinum', group: 'building', description: ['Mass-construction tools are post-AE2 utilities.', 'They accelerate committed builds after storage, local intelligence, and material production can support large edits.'], quests: [
      q('BU_WAND', 'Late Building Wand', 0, 0, [item('wands:diamond_wand'), item('wands:netherite_wand')], ['PA_QUANTUM_CORE']),
      q('BU_GADGET', 'Building Gadget', 2, -1, [item('buildinggadgets2:gadget_building'), item('buildinggadgets2:gadget_exchanging')], ['BU_WAND', 'PA_QUANTUM_CORE']),
      q('BU_TEMPLATE', 'Template Manager', 4, -1, [item('buildinggadgets2:template_manager')], ['BU_GADGET']),
      q('BU_COPY', 'Copy and Cut Gadgets', 4, 1, [item('buildinggadgets2:gadget_copy_paste'), item('buildinggadgets2:gadget_cut_paste')], ['BU_GADGET', 'OC_NETWORK']),
      q('BU_DRONE', 'Create Drone Helper', 6, 0, [item('create_sa:brass_drone')], ['BU_COPY', 'PA_QUANTUM_CORE']),
      q('BU_DESTRUCTION', 'Destruction Gadget', 8, 0, [item('buildinggadgets2:gadget_destruction')], ['BU_DRONE', 'SP_CHEM'], ['Destructive mass edits are last because they can erase local block economy if they arrive too early.'])
    ]
  },
  {
    filename: 'books', prefix: 'BK', id: 'BTM_BOOKS', order: 2, title: 'Reference Books', tier: 'copper', group: 'orientation', description: ['Books are references, not gates. This chapter gives players obvious places to find documentation without making guidebooks the progression key.'], quests: [
      q('BK_QUEST_BOOK', 'Quest Book', 0, 0, [item('ftbquests:book')], ['SO_BACKPACK'], ['Use the quest book as the authored graph. It is allowed to explain; it should not be the mechanical gate.']),
      q('BK_TCON', 'Tinkers Encyclopedia', 2, -1, [item('tconstruct:encyclopedia')], ['BK_QUEST_BOOK', 'SO_TINKER'], ['Tinkers documentation belongs near the repair and metallurgy spine.']),
      q('BK_PATCHOULI', 'Patchouli Guides', 2, 1, [item('patchouli:guide_book')], ['BK_QUEST_BOOK'], ['Patchouli guide books vary by mod/NBT, so this is a loose reference checkpoint rather than a hard mod gate.']),
      q('BK_MNA', 'Codex Arcana', 4, 1, [item('mna:guide_book')], ['BK_PATCHOULI', 'M2_MNA'], ['Mana and Artifice documentation is late because the mod itself is late.'])
    ]
  },

  {
    filename: 'post_ae2', prefix: 'PA', id: 'BTM_POST_AE2', order: 0, title: 'Post-AE2 Branches', tier: 'platinum', group: 'endgame', description: ['Post-AE2 fans into a few strong branches: quantum manufacturing, extended local intelligence, bounded storage, source-AE hybrid, and powered body infrastructure.'], quests: [
      q('PA_QUANTUM_STRUCTURE', 'Quantum Structure', 0, 0, [item('advanced_ae:quantum_structure')], ['AE_SPATIAL']),
      q('PA_REACTION', 'Reaction Chamber', 2, -1, [item('advanced_ae:reaction_chamber')], ['PA_QUANTUM_STRUCTURE']),
      q('PA_QUANTUM_CORE', 'Quantum Core', 2, 1, [item('advanced_ae:quantum_core')], ['PA_QUANTUM_STRUCTURE']),
      q('PA_QUANTUM_CRAFTING', 'Quantum Crafting Branch', 4, -2, [item('advanced_ae:quantum_crafter'), item('advanced_ae:quantum_accelerator')], ['PA_REACTION', 'PA_QUANTUM_CORE']),
      q('PA_MULTI_THREAD', 'Parallel Pattern Work', 6, -2, [item('advanced_ae:quantum_multi_threader')], ['PA_QUANTUM_CRAFTING']),
      q('PA_EXTENDED_AE', 'Extended Local Intelligence', 4, 0, [item('expatternprovider:ex_drive'), item('expatternprovider:ex_interface'), item('expatternprovider:ex_pattern_provider')], ['PA_QUANTUM_CORE']),
      q('PA_MATRIX', 'Assembler Matrix', 6, 0, [item('expatternprovider:assembler_matrix_frame'), item('expatternprovider:assembler_matrix_crafter')], ['PA_EXTENDED_AE']),
      q('PA_DEEP_STORAGE', 'Bounded Deep Storage', 4, 2, [item('ae2additions:super_cell_housing'), item('ae2additions:super_cell_1024k')], ['PA_QUANTUM_CORE']),
      q('PA_DISK_STORAGE', 'Disk Storage Branch', 6, 2, [item('ae2additions:disk_item_1024k')], ['PA_DEEP_STORAGE']),
      q('PA_SOURCE_BRIDGE', 'Source-AE Bridge', 8, 0, [item('arseng:me_source_jar'), item('arseng:source_acceptor'), item('arseng:source_cell_housing')], ['PA_MATRIX', 'M1_ETHEREAL']),
      q('PA_PORTABLE_SOURCE', 'Portable Source Cell', 10, 0, [item('arseng:portable_source_cell_64k')], ['PA_SOURCE_BRIDGE']),
      q('PA_BODY_BASE', 'Quantum Body Base', 8, 2, [item('advanced_ae:quantum_upgrade_base')], ['PA_DEEP_STORAGE', 'S1_SYNTHESIS_EXIT']),
      q('PA_LAVA_CARD', 'Lava-Depth Body Reward', 10, 1, [item('advanced_ae:lava_immunity_card')], ['PA_BODY_BASE']),
      q('PA_REGEN_CARD', 'Regeneration Body Reward', 10, 3, [item('advanced_ae:regeneration_card')], ['PA_BODY_BASE']),
      q('PA_MAGNET_CARD', 'Magnetic Field Reward', 12, 2, [item('advanced_ae:magnet_card')], ['PA_BODY_BASE']),
      q('PA_POWERED_ARMOR_BRANCH', 'Powered Armor Branch', 14, 2, [item('protection_pixel:armorloadplatform')], ['PA_LAVA_CARD', 'PA_REGEN_CARD', 'PA_MAGNET_CARD']),
      q('PA_BLOOD_SOURCE_BRANCH', 'Blood-Source Branch', 14, -1, [item('tomeofblood:novice_tome_of_blood')], ['PA_SOURCE_BRIDGE', 'PA_QUANTUM_CORE', 'M1_ETHEREAL'], ['Tome of Blood is the late combat-magic branch: source, LP, Demon Will, and AE2-era control feed the same spell body.']),
      q('PA_BODY_LOGISTICS', 'Body Logistics Upgrades', 14, 4, [item('sophisticatedbackpacks:feeding_upgrade'), item('sophisticatedbackpacks:alchemy_upgrade'), item('sophisticatedbackpacks:tool_swapper_upgrade')], ['PA_BODY_BASE', 'PA_QUANTUM_CORE'], ['Feeding, alchemy, and tool swapping are strong body automation. They stay post-AE2 so travel preparation remains a real decision earlier.'])
    ]
  },

	  {
	    filename: 'ticex', prefix: 'TEX', id: 'BTM_TICEX', order: 2, title: 'Tinkers Construct EX', tier: 'platinum', group: 'endgame', description: ['TiCEX is late Tinkers work, not early tool progression.', 'Start after AE2, quantum manufacturing, fission hardware, and late Blood Magic are already online.'], quests: [
	      q('TEX_RECONSTRUCTION', 'Reconstruction Core', 0, 0, [item('ticex:reconstruction_core')], ['AE_CONTROLLER', 'PA_QUANTUM_CORE', 'FI_FISSION_ROD', 'M1_ETHEREAL']),
	      q('TEX_FLICKERING', 'Flickering Reconstruction Core', 2, 0, [item('ticex:flickering_reconstruction_core')], ['TEX_RECONSTRUCTION']),
	      q('TEX_SEARED_RF', 'Seared RF Furnace', 4, -1, [item('ticex:seared_rf_furnace')], ['TEX_FLICKERING']),
	      q('TEX_SCORCHED_RF', 'Scorched RF Furnace', 4, 1, [item('ticex:scorched_rf_furnace')], ['TEX_FLICKERING']),
	      q('TEX_TRANSMUTER', 'Fluid Transmuter', 6, 0, [item('ticex:fluid_transmuter')], ['TEX_SEARED_RF', 'TEX_SCORCHED_RF']),
	      q('TEX_OD', 'Od Material', 8, -1, [item('ticex:od_ingot')], ['TEX_TRANSMUTER']),
	      q('TEX_ETHERIC', 'Etheric Material', 8, 1, [item('ticex:etheric_ingot')], ['TEX_TRANSMUTER']),
	      q('TEX_CARDBOARD', 'Cardboard Core', 10, 0, [item('ticex:cardboard_core')], ['TEX_OD', 'TEX_ETHERIC'])
	    ]
	  },
  {
    filename: 'protection_pixel', prefix: 'PP', id: 'BTM_PROTECTION_PIXEL', order: 3, title: 'Protection Pixel', tier: 'platinum', group: 'endgame', description: ['Protection Pixel is the post-AE2 armor and body-equipment branch.', 'It starts from quantum manufacturing, fission heat, late Blood Magic, and extreme-depth plates, then fans into mobility, environmental, and combat equipment.'], quests: [
      q('PP_PLATFORM', 'Armor Load Platform', 0, 0, [item('protection_pixel:armorloadplatform')], ['PA_QUANTUM_CORE', 'FI_FISSION_ROD', 'M1_ETHEREAL']),
      q('PP_SMALL_NETHERITE', 'Small Netherite Sheet', 2, -2, [item('protection_pixel:smallnetheritesheet')], ['PP_PLATFORM']),
      q('PP_REINFORCED_FIBER', 'Reinforced Fiber', 2, 0, [item('protection_pixel:reinforcedfiber')], ['PP_PLATFORM']),
      q('PP_CERAMIC', 'Heat Ceramic Sheet', 2, 2, [item('protection_pixel:heatresistantceramicsheet')], ['PP_PLATFORM']),
      q('PP_ALLOY_PLATE', 'Alloy Armor Plate', 4, -1, [item('protection_pixel:alloyarmorplate')], ['PP_SMALL_NETHERITE', 'PP_REINFORCED_FIBER']),
      q('PP_POWER_ENGINE', 'Power Engine', 4, 1, [item('protection_pixel:powerengine')], ['PP_CERAMIC', 'FI_FISSION_ROD']),
      q('PP_HEAT_OVERLOCK', 'Heat Overlock Mechanism', 6, 1, [item('protection_pixel:heatoverlockingmechanism')], ['PP_POWER_ENGINE']),
      q('PP_KITS', 'Armor and Equipment Kits', 6, -1, [item('protection_pixel:equipmentkit'), item('protection_pixel:armorplatekit')], ['PP_ALLOY_PLATE', 'PP_POWER_ENGINE']),
      q('PP_LINKPLATE', 'Link-Plate Armor', 8, -2, [item('protection_pixel:linkplate_helmet'), item('protection_pixel:linkplate_chestplate'), item('protection_pixel:linkplate_leggings'), item('protection_pixel:linkplate_boots')], ['PP_KITS']),
      q('PP_EXOSKELETON', 'Steam Ectoskeleton', 8, 0, [item('protection_pixel:steamectoskeleton')], ['PP_KITS', 'PP_POWER_ENGINE']),
      q('PP_MOBILITY', 'Powered Mobility', 10, -1, [item('protection_pixel:suspjetpack'), item('protection_pixel:maneuveringwing')], ['PP_EXOSKELETON']),
      q('PP_COMBAT_CHEST', 'Combat Chestplates', 10, 1, [item('protection_pixel:workerhornet_chestplate'), item('protection_pixel:breaker_chestplate'), item('protection_pixel:typhoon_chestplate')], ['PP_KITS']),
      q('PP_ENV_HELMETS', 'Environmental Helmets', 12, -2, [item('protection_pixel:closed_helmet'), item('protection_pixel:plague_helmet'), item('protection_pixel:nightdemon_helmet'), item('protection_pixel:bloodprisoner_helmet')], ['PP_LINKPLATE']),
      q('PP_ROUTE_LEGS', 'Route Leggings', 12, 0, [item('protection_pixel:anchorpoint_leggings'), item('protection_pixel:buoyancy_leggings'), item('protection_pixel:slingshot_leggings')], ['PP_LINKPLATE']),
      q('PP_AS_UPGRADES', 'AS Upgrade Line', 14, 0, [item('protection_pixel:wingsofprismas_chestplate')], ['PP_HEAT_OVERLOCK', 'PP_COMBAT_CHEST'])
    ]
  },
  {
    filename: 'tome_of_blood', prefix: 'TOB', id: 'BTM_TOME_OF_BLOOD', order: 4, title: 'Tome of Blood', tier: 'platinum', group: 'endgame', description: ['Tome of Blood is the post-AE2 Blood Magic and Ars Nouveau combat branch.', 'It starts after source-AE work, Ethereal Slate, and quantum manufacturing, then turns Demon Will weapons and Living Armor into late spellcasting tools.'], quests: [
      q('TOB_NOVICE', 'Novice Tome of Blood', 0, 0, [item('tomeofblood:novice_tome_of_blood')], ['PA_SOURCE_BRIDGE', 'PA_QUANTUM_CORE', 'AN_ARCHMAGE', 'M1_ETHEREAL'], ['This is the entry conversion. The book proves that Ars source work, Blood Magic LP, and AE2-era manufacturing are now part of one combat-magic branch.']),
      q('TOB_APPRENTICE', 'Apprentice Tome of Blood', 2, -1, [item('tomeofblood:apprentice_tome_of_blood')], ['TOB_NOVICE'], ['Upgrade the tome after the novice bridge is stable. The recipe keeps the Ars spell-book ladder visible instead of replacing it.']),
      q('TOB_HERETIC_ARMOR', 'Living Mage Armor', 2, 1, [item('tomeofblood:living_mage_hood'), item('tomeofblood:living_mage_robes'), item('tomeofblood:living_mage_leggings'), item('tomeofblood:living_mage_boots')], ['TOB_NOVICE'], ['Convert Living Armor into mage armor when the body branch has quantum manufacturing and late source work behind it.']),
      q('TOB_SENTIENT_HARM', 'Sentient Harm Glyph', 4, -1, [item('tomeofblood:glyph_sentient_harm')], ['TOB_APPRENTICE'], ['This glyph makes Demon Will part of spell combat. It belongs after the tome entry, not as an early Blood Magic side reward.']),
      q('TOB_SENTIENT_WRATH', 'Sentient Wrath Glyph', 4, 1, [item('tomeofblood:glyph_sentient_wrath')], ['TOB_HERETIC_ARMOR', 'TOB_SENTIENT_HARM'], ['Wrath is the branch escalation: Will weapons, source spell work, and nuclear-era components become a high-impact area combat option.']),
      q('TOB_ARCHMAGE', 'Archmage Tome of Blood', 6, 0, [item('tomeofblood:archmage_tome_of_blood')], ['TOB_SENTIENT_WRATH'], ['The archmage tome is the capstone. It should feel like a late hybrid instrument, not a cheap spell-book conversion.'])
    ]
  },
	  {
	    filename: 'magic_i', prefix: 'M1', id: 'BTM_MAGIC_I', order: 0, title: 'Magic I', tier: 'tin', group: 'matter', description: ['Blood Magic is the permission spine. Slates unlock side magic branches; guidebooks are not the gate unless a mod gives no better surface.'], quests: [
      q('M1_BLANK', 'Blank Slate Permission', 0, 0, [item('bloodmagic:blankslate')], ['DE_WEAK_ORB']),
      q('M1_HEXEREI', 'Hexerei Gate', 2, -1, [item('hexerei:mixing_cauldron')], ['M1_BLANK']),
      q('M1_MALUM', 'Malum Gate', 2, 1, [item('malum:spirit_altar')], ['M1_BLANK']),
      q('M1_RUNEWOOD', 'Living Runewood', 4, 2, [item('malum:runewood_sapling'), item('malum:azure_runewood_sapling')], ['M1_MALUM'], ['Dynamic Trees for Malum makes Runewood part of the living world instead of static decoration.']),
      q('M1_REINFORCED', 'Reinforced Slate Permission', 4, 0, [item('bloodmagic:reinforcedslate')], ['M1_HEXEREI', 'M1_MALUM']),
      q('M1_ARS', 'Ars Entry', 6, -1, [item('ars_nouveau:imbuement_chamber')], ['M1_REINFORCED']),
      q('M1_APPARATUS', 'Enchanting Apparatus', 6, 1, [item('ars_nouveau:enchanting_apparatus')], ['M1_ARS']),
      q('M1_RITUALS', 'Ritual Brazier', 8, -1, [item('ars_nouveau:ritual_brazier')], ['M1_APPARATUS']),
      q('M1_NATURE', 'Nature Aura Entry', 8, 1, [item('naturesaura:offering_table')], ['M1_REINFORCED']),
      q('M1_IMBUED', 'Imbued Slate Permission', 10, 0, [item('bloodmagic:infusedslate')], ['M1_RITUALS']),
      q('M1_OCCULT', 'Occultism Chalk', 12, -1, [item('occultism:chalk_white_impure')], ['M1_IMBUED']),
      q('M1_GOETY', 'Goety Dark Altar', 12, 1, [item('goety:dark_altar')], ['M1_IMBUED']),
      q('M1_DEMONIC', 'Demonic Slate Permission', 14, 0, [item('bloodmagic:demonslate')], ['M1_OCCULT', 'M1_GOETY']),
      q('M1_BOTANIA', 'Botania Engineering Gate', 16, -1, [item('botania:runic_altar')], ['M1_DEMONIC']),
      q('M1_ETHEREAL', 'Ethereal Slate Permission', 18, 0, [item('bloodmagic:etherealslate')], ['M1_BOTANIA']),
      q('M1_PSI_HEX', 'Programmable Magic', 20, 0, [item('psi:programmer'), item('hexalia:hex_focus')], ['M1_ETHEREAL'])
    ]
  },
  {
    filename: 'adventuring', prefix: 'AD', id: 'BTM_ADVENTURING', order: 0, title: 'Adventuring, Coins, and Wares', tier: 'copper', group: 'routes', description: ['Adventure is a grindable progression lane. Coins, contracts, villages, and routes give useful work when the next factory is unclear.'], quests: [
      q('AD_ROUTE', 'Route Supplies', 0, 0, [item('minecraft:compass'), item('minecraft:map')], ['SO_EXIT_ADVENTURE']),
      q('AD_COIN', 'First Market Float', 2, 0, [item('dotcoinmod:copper_coin', 16)], ['AD_ROUTE']),
      q('AD_TRADING_POST', 'Village Trading Post', 4, -1, [item('tradingpost:trading_post')], ['AD_COIN']),
      q('AD_WARES_TABLE', 'Wares Delivery Table', 4, 1, [item('wares:delivery_table')], ['AD_COIN']),
      q('AD_CONTRACT', 'Contract As Crafting', 6, 0, [item('wares:delivery_agreement')], ['AD_TRADING_POST', 'AD_WARES_TABLE']),
      q('AD_PACKAGE', 'Physical Package', 8, -1, [item('wares:package')], ['AD_CONTRACT']),
      q('AD_COMPLETED', 'Completed Delivery', 8, 1, [item('wares:completed_delivery_agreement')], ['AD_PACKAGE']),
      q('AD_CURSED_REGIONS', 'Cursed Regions', 10, -1, [item('minecraft:compass'), item('minecraft:shield')], ['AD_COMPLETED'], ['Cursed Biomes adds dangerous regional laws. Treat cursed territory as an extraction/adventure route, not background ambience.']),
      q('AD_IRON_FLOAT', 'Iron Coin Float', 12, 0, [item('dotcoinmod:iron_coin', 4)], ['AD_CURSED_REGIONS'])
    ]
  },
  {
    filename: 'village_economy', prefix: 'VE', id: 'BTM_VILLAGE_ECONOMY', order: 1, title: 'Villages, Wares, and Settlement Rewards', tier: 'tin', group: 'routes',
    description: ['Villager trading and Wares contracts are part of the expert item graph. This chapter teaches coins as a crafting surface and keeps decorative depth shallow through trade sideloads.'],
    quests: [
      q('VE_TRADING_POST', 'Centralized Trades', 0, 0, [item('tradingpost:trading_post')], ['AD_TRADING_POST'], ['Villages matter because people and routes matter. A trading post is a local market, not a magic converter.']),
      q('VE_WARES_BOX', 'Cardboard Logistics', 2, -1, [item('wares:cardboard_box')], ['AD_TRADING_POST', 'AD_WARES_TABLE'], ['Wares packages are physical goods. Treat them like small logistics contracts.']),
      q('VE_AGREEMENT', 'Delivery Agreement', 2, 1, [item('wares:delivery_agreement')], ['AD_CONTRACT'], ['Contracts should consume and produce coin value without falling back to emeralds.']),
      q('VE_COMPLETED', 'Completed Contract', 4, 0, [item('wares:completed_delivery_agreement')], ['VE_TRADING_POST', 'VE_WARES_BOX', 'VE_AGREEMENT'], ['A completed delivery is proof of route work. It belongs in the same mental category as crafting components.']),
      q('VE_BOUQUETS', 'Procedural Bouquets', 6, -1, [item('procedural_bouquets:bouquet_grid'), item('procedural_bouquets:potted_bouquet')], ['VE_COMPLETED'], ['Decorative systems can have shallow graph depth. Bouquets stay because they are a small custom settlement reward, not a massive block-variant library.']),
      q('VE_VILLAGE_WALLS', 'Fortified Village', 8, 1, [item('minecraft:stone_bricks'), item('minecraft:spruce_log')], ['VE_COMPLETED'], ['Village Walls turns settlement defense into local infrastructure. The wall itself is commanded/world work, but the materials should still be physical.']),
      q('VE_SETTLEMENT_ROADS', 'Settlement Roads', 10, 1, [item('minecraft:dirt_path'), item('minecraft:gravel'), item('minecraft:stone_bricks')], ['VE_VILLAGE_WALLS'], ['Settlement Roads makes routes visible in the world. Roads and bridges support distance; they do not erase it.']),
      q('VE_IRON_COIN_TIER', 'Iron Coin Float', 12, -1, [item('dotcoinmod:iron_coin', 8)], ['VE_COMPLETED'], ['Higher coins come from harder chapters, loot, and combat loops. They should not be convertible downward or upward in bulk.']),
      q('VE_BRASS_COIN_TIER', 'Brass Coin Float', 14, -1, [item('dotcoinmod:brass_coin', 8)], ['VE_IRON_COIN_TIER'], ['Brass coin trades are where villages begin supporting workshop recovery, logistics, and settlement upgrades.'])
    ]
  },
  {
    filename: 'pillager_campaigns', prefix: 'PC', id: 'BTM_PILLAGER_CAMPAIGNS', order: 2, title: 'Pillager Campaigns', tier: 'iron', group: 'routes',
    description: ['Pillager Campaigns is authored overworld pressure, not random nuisance spawning.', 'This branch converts patrol defense into route prep, settlement hardening, and economy recovery work.'],
    quests: [
      q('PC_SCOUT', 'Campaign Scout Kit', 0, 0, [item('minecraft:spyglass'), item('minecraft:crossbow')], ['AD_CURSED_REGIONS'], ['Scout before you fight. A spyglass and ranged tool turn patrol contact into readable terrain decisions instead of panic melee.']),
      q('PC_SIGNAL', 'Alarm and Muster', 2, -1, [item('minecraft:bell'), item('minecraft:goat_horn')], ['PC_SCOUT'], ['Use audible alarm points near roads and gates so campaign hits trigger response, not confusion.']),
      q('PC_BANNER', 'Captain Banner Capture', 2, 1, [item('minecraft:white_banner'), item('minecraft:ominous_banner')], ['PC_SCOUT'], ['Captains mark successful interception. Treat banners as route intelligence markers in your settlement, not trophy clutter.']),
      q('PC_COMMAND_POST', 'Command Post', 4, 0, [item('minecraft:cartography_table'), item('minecraft:lectern'), item('minecraft:barrel')], ['PC_SIGNAL', 'PC_BANNER', 'VE_TRADING_POST'], ['A command post is a real place: maps, records, and stock. Campaign pressure should be answered by infrastructure, not just better armor.']),
      q('PC_RECOVERY', 'Recovery Contract Loop', 6, -1, [item('wares:delivery_agreement'), item('wares:completed_delivery_agreement')], ['PC_COMMAND_POST'], ['After a campaign hit, route recovery should return value. Contracts and deliveries make defense part of settlement economics.']),
      q('PC_BATTLE_STANDARD', 'Battle Standard Economy', 8, 0, [item('dotcoinmod:iron_coin', 16), item('dotcoinmod:brass_coin', 4), item('wares:completed_delivery_agreement')], ['PC_RECOVERY', 'SC_ECONOMY'], ['Capstone: pillager pressure now feeds your broader route economy. You can scout, defend, recover, and reinvest without breaking the pack\'s physical logistics rules.'])
    ]
  },
  {
    filename: 'synthesis_i', prefix: 'S1', id: 'BTM_SYNTHESIS_I', order: 1, title: 'Acid Chemistry', tier: 'gold', group: 'matter', description: ['Acid chemistry is where deposits stop being ore and become chemical packages. Create mixers combine crushed deposits, solvent choice, and grinding-ball media.'], quests: [
      q('S1_MIXER', 'Acid Mixer', 0, 0, [item('create:mechanical_mixer'), item('create:basin')], ['C2_BRASS', 'TC_FOUNDRY']),
      q('S1_BALLS', 'Grinding Media', 2, 0, [item('kubejs:brass_grinding_ball'), item('kubejs:steel_grinding_ball')], ['S1_MIXER']),
      q('S1_SOLVENTS', 'Solvent Set', 4, 0, [item('chemlib:ethanol_bucket'), item('chemlib:acetic_acid_bucket'), item('chemlib:sulfuric_acid_bucket')], ['S1_BALLS']),
      q('S1_SAMPLE', 'Chemical Interpretation', 6, -1, [item('chemlib:copper'), item('chemlib:copper_ii_sulfate'), item('chemlib:sulfur')], ['S1_SOLVENTS']),
      q('S1_PLATINUM', 'Mountain-Depth Plate Reward', 6, 1, [item('chemlib:platinum_plate')], ['S1_SOLVENTS']),
      q('S1_SYNTHESIS_EXIT', 'Exit: Matter Routing', 8, 0, [item('chemlib:osmium_plate')], ['S1_SAMPLE', 'S1_PLATINUM'])
    ]
  }
]

const allQuestIds = new Set()
const allDeps = []
const missingItems = []
const graphWarnings = []
for (const ch of chapters) {
  chapterIdMap.set(ch.filename, ftbId(`chapter:${ch.filename}`))
  let importantCount = 0
  for (const quest of ch.quests) {
    if (allQuestIds.has(quest.id)) throw new Error(`Duplicate quest id ${quest.id}`)
    allQuestIds.add(quest.id)
    questIdMap.set(quest.id, ftbId(`quest:${ch.filename}:${quest.id}`))
    if ((importantQuestIds[ch.prefix] || []).indexOf(quest.id) !== -1) importantCount++
    for (const dep of quest.deps || []) allDeps.push({ quest: quest.id, dep })
    for (const t of quest.tasks) if (shouldValidateItems && !knownItems.has(t.item)) missingItems.push(`${quest.id}: ${t.item}`)
  }
  if (importantCount < 1) graphWarnings.push(`${ch.filename}: no large target node configured`)
  if (importantCount > 3) graphWarnings.push(`${ch.filename}: ${importantCount} large nodes configured; cap is 3`)
}
const missingDeps = allDeps.filter(d => !allQuestIds.has(d.dep))
if (missingDeps.length) throw new Error(`Missing dependency refs:\n${missingDeps.map(d => `${d.quest} -> ${d.dep}`).join('\n')}`)
if (missingItems.length) throw new Error(`Missing item ids:\n${missingItems.join('\n')}`)

for (const ch of chapters) {
  const localIds = new Set(ch.quests.map(quest => quest.id))
  const edges = new Map(ch.quests.map(quest => [quest.id, new Set()]))
  for (const quest of ch.quests) {
    for (const dep of quest.deps || []) {
      if (!localIds.has(dep)) continue
      edges.get(quest.id).add(dep)
      edges.get(dep).add(quest.id)
    }
  }

  const seen = new Set()
  const components = []
  for (const quest of ch.quests) {
    if (seen.has(quest.id)) continue
    const stack = [quest.id]
    const component = []
    seen.add(quest.id)
    while (stack.length) {
      const id = stack.pop()
      component.push(id)
      for (const next of edges.get(id) || []) {
        if (seen.has(next)) continue
        seen.add(next)
        stack.push(next)
      }
    }
    components.push(component)
  }
  if (components.length > 1) {
    const summary = components.map(component => component.join(',')).join(' | ')
    throw new Error(`${ch.filename} has disconnected local quest graph components: ${summary}`)
  }
}
if (graphWarnings.length) console.warn(`Quest graph warnings:\n${graphWarnings.join('\n')}`)

for (const ch of chapters) fs.writeFileSync(path.join(chapterDir, `${ch.filename}.snbt`), chapterSnbt(ch))
fs.writeFileSync(path.join(root, 'config/ftbquests/quests/chapter_groups.snbt'), chapterGroupsSnbt())
console.log(`generated ${chapters.length} quest chapters, ${allQuestIds.size} quests`)
