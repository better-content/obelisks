# Cyclic Dependency Audit

Date: 2026-05-13

Scope: immersion-first casing, PNCR, AE2/Impossible, Tome of Blood, and Realistic Ores identity output changes.

## Findings Fixed

- `kubejs:electrical_machine_casing` referenced `powergrid:zinc_sheet`, but the current recipe surface exposes zinc plate material through `#forge:plates/zinc`. This made the electrical casing recipe depend on an unproduced item ID. The casing now uses the zinc plate tag.
- PNC pressure chamber shell blocks were intended to start at Airtight tier, but the broad replacement gate did not match their actual inputs. Dedicated recipes now produce:
  - `pneumaticcraft:pressure_chamber_wall`
  - `pneumaticcraft:pressure_chamber_glass`
  - `pneumaticcraft:pressure_chamber_interface`
  from `kubejs:airtight_machine_casing` plus normal PNC shell materials.

## Reachability Notes

- Airtight casing remains reachable before pressure chamber recipes. It needs Brass, compressed iron from Create pressing, pressure tube from compressed iron and glass, pressure seal, and the Create-built compressor core.
- PNCR printed circuit boards remain after pressure chamber bootstrap. Circuited casing can then consume PNCR transistor and printed circuit board without a loop back into Circuited.
- Electrical casing is before Power Grid block gates. It uses Power Grid parts that are currently produced without Electrical casing: capacitor, integrated circuit, conductive casing, and zinc plates.
- Space casing is before Creating Space block gates. Its ingredients are rocket casing, inconel sheet, hastelloy ingot, titanium thermal plate, and Circuited casing; none require Space casing.
- Raw Impossible casing depends on Space casing plus AE2 pre-controller processor/material work. AE2 charger/processor paths remain available before Impossible casing.
- Impossible casing is finalized by Blood Magic altar from Raw Impossible casing. Tome of Blood parts depend on Impossible casing, final Blood, final Ars, and AE2 controller-tier infrastructure, so the Tome remains a post-AE2 capstone rather than a prerequisite.
- Realistic Ores identity outputs have direct deposit splashing routes as well as higher-control mixing routes. The direct routes prevent hard-band outputs such as titanium thermal plate, fissile salt blend, mountain beryl lens, and kimberlite diamond seed from depending only on themselves through ChemLib side products.

## Watchpoints

- If Creating Space later moves oxygen, inconel, hastelloy, or rocket casing behind `creatingspace:air_liquefier` or `creatingspace:chemical_synthesizer`, the Space casing recipe must be rechecked.
- If AE2 processor generation is changed away from Create Applied Kinetics sequenced assembly, Raw Impossible casing must be rechecked for a controller or Impossible dependency.
- If PNC pressure chamber components are made more expensive, preserve the ordering: Airtight casing first, pressure chamber second, PNCR boards/processors third, Circuited casing fourth.
