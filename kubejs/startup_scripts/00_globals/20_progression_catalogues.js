// Shared progression catalogue for expert-pack KubeJS scripts.
// Keep this Rhino-safe: no modern JS features beyond what KubeJS already supports.

global.BTM_COIN_TIERS = [
    { id: 'copper', item: 'createdeco:copper_coin' },
    { id: 'zinc', item: 'createdeco:zinc_coin' },
    { id: 'iron', item: 'createdeco:iron_coin' },
    { id: 'industrial_iron', item: 'createdeco:industrial_iron_coin' },
    { id: 'brass', item: 'createdeco:brass_coin' },
    { id: 'gold', item: 'createdeco:gold_coin' },
    { id: 'platinum', item: 'createdeco:netherite_coin' }
]

global.BTM_MACHINE_CASING_TIERS = [
    { id: 'seared', item: 'kubejs:seared_machine_casing', display: 'Seared Machine Casing', authority: 'TCon seared' },
    { id: 'scorched', item: 'kubejs:scorched_machine_casing', display: 'Scorched Machine Casing', authority: 'TCon scorched' },
    { id: 'andesite', item: 'kubejs:andesite_machine_casing', display: 'Andesite Machine Casing', authority: 'Create andesite' },
    { id: 'brass', item: 'kubejs:brass_machine_casing', display: 'Brass Machine Casing', authority: 'Create brass' },
    { id: 'airtight', item: 'kubejs:airtight_machine_casing', display: 'Airtight Casing', authority: 'PneumaticCraft pressure' },
    { id: 'electrical', item: 'kubejs:electrical_machine_casing', display: 'Electrical Machine Casing', authority: 'Create: Power Grid' },
    { id: 'circuited', item: 'kubejs:circuited_machine_casing', display: 'Circuited Casing', authority: 'PNCR assembly and OC2R' },
    { id: 'space', item: 'kubejs:space_machine_casing', display: 'Space Machine Casing', authority: 'Creating Space' },
    { id: 'raw_impossible', item: 'kubejs:raw_impossible_casing', display: 'Raw Impossible Casing', authority: 'Unfinished AE2 body' },
    { id: 'impossible', item: 'kubejs:impossible_machine_casing', display: 'Impossible Casing', authority: 'AE2 and final Blood Magic' }
]

global.BTM_STARTER_DEPOSITS = [
    {
        id: 'coal_measures', displayName: 'Coal Measures', tag: 'kubejs:deposit_blocks/coal_measures',
        yBand: 'surface_or_shallow_underground', dangerTier: 'early', primary: 'coal', secondary: 'iron', tertiary: null,
        primaryFluidTag: null, secondaryFluidTag: 'forge:molten_iron', tertiaryFluidTag: null,
        firstUsefulProcessingTier: 'furnace_fallback_or_create_preprocess', lateProcessingRole: 'carbon_and_trace_iron_package', notes: 'Existing TCon script maps the TCon-valid output to iron.'
    },
    {
        id: 'ironstone', displayName: 'Ironstone', tag: 'kubejs:deposit_blocks/ironstone',
        yBand: 'shallow_underground', dangerTier: 'early_mid', primary: 'iron', secondary: 'nickel', tertiary: 'chromium',
        primaryFluidTag: 'forge:molten_iron', secondaryFluidTag: 'forge:molten_nickel', tertiaryFluidTag: 'forge:molten_chromium',
        firstUsefulProcessingTier: 'melter', lateProcessingRole: 'industrial_iron_trace_metals', notes: 'Chromium is used as a confirmed molten trace stand-in for vanadium-like value.'
    },
    {
        id: 'copper_sulfide', displayName: 'Copper Sulfide', tag: 'kubejs:deposit_blocks/copper_sulfide',
        yBand: 'shallow_underground_or_hills', dangerTier: 'early_mid', primary: 'copper', secondary: 'iron', tertiary: 'gold',
        primaryFluidTag: 'forge:molten_copper', secondaryFluidTag: 'forge:molten_iron', tertiaryFluidTag: 'forge:molten_gold',
        firstUsefulProcessingTier: 'melter', lateProcessingRole: 'acid_vat_sulfide_route', notes: 'Starter copper deposit.'
    },
    {
        id: 'tin', displayName: 'Tin Vein', tag: 'kubejs:deposit_blocks/tin',
        yBand: 'hills_or_shallow_underground', dangerTier: 'early_mid', primary: 'tin', secondary: 'quartz', tertiary: 'tungsten',
        primaryFluidTag: 'forge:molten_tin', secondaryFluidTag: 'forge:molten_quartz', tertiaryFluidTag: 'forge:molten_tungsten',
        firstUsefulProcessingTier: 'melter', lateProcessingRole: 'bronze_and_late_heat_metals', notes: 'Starter bronze support without making steel the main axis.'
    },
    {
        id: 'zinc', displayName: 'Zinc Vein', tag: 'kubejs:deposit_blocks/zinc',
        yBand: 'hills', dangerTier: 'early_mid', primary: 'zinc', secondary: 'lead', tertiary: 'cadmium',
        primaryFluidTag: 'forge:molten_zinc', secondaryFluidTag: 'forge:molten_lead', tertiaryFluidTag: 'forge:molten_cadmium',
        firstUsefulProcessingTier: 'melter', lateProcessingRole: 'brass_and_chemical_trace_route', notes: 'Create brass support.'
    },
    {
        id: 'lead_zinc_vein', displayName: 'Lead-Zinc Vein', tag: 'kubejs:deposit_blocks/lead_zinc_vein',
        yBand: 'underground', dangerTier: 'mid', primary: 'lead', secondary: 'zinc', tertiary: 'silver',
        primaryFluidTag: 'forge:molten_lead', secondaryFluidTag: 'forge:molten_zinc', tertiaryFluidTag: 'forge:molten_silver',
        firstUsefulProcessingTier: 'melter', lateProcessingRole: 'electronics_and_noble_trace_route', notes: 'Supports power and OC2R progression.'
    },
    {
        id: 'quartz_vein', displayName: 'Quartz Vein', tag: 'kubejs:deposit_blocks/quartz_vein',
        yBand: 'hills_or_mountains', dangerTier: 'mid', primary: 'quartz', secondary: null, tertiary: null,
        primaryFluidTag: 'forge:molten_quartz', secondaryFluidTag: null, tertiaryFluidTag: null,
        firstUsefulProcessingTier: 'create_preprocess', lateProcessingRole: 'silicon_and_ae2_route', notes: 'Confirmed by registry only where a matching deposit tag exists.'
    },
    {
        id: 'bauxite_laterite', displayName: 'Bauxite Laterite', tag: 'kubejs:deposit_blocks/bauxite_laterite',
        yBand: 'surface_or_hills', dangerTier: 'mid', primary: 'aluminum', secondary: 'iron', tertiary: 'nickel',
        primaryFluidTag: 'forge:molten_aluminum', secondaryFluidTag: 'forge:molten_iron', tertiaryFluidTag: 'forge:molten_nickel',
        firstUsefulProcessingTier: 'melter', lateProcessingRole: 'space_alloys_and_chemistry', notes: 'Later starter-adjacent deposit for Creating Space alloys.'
    }
]
