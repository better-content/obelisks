# Chemlib Plate Route Coverage

This pass adds `kubejs/server_scripts/40_recipe_add/65_chemlib_plate_manufacturing_routes.js`.

## Purpose

Several progression gates use Chemlib plates as extreme-band or advanced manufacturing materials. The recipe graph cannot depend on those plates unless the plates are consistently manufacturable.

## Added Create Pressing Routes

The script adds Create pressing from `#forge:ingots/<material>` to:

- `chemlib:iridium_plate`
- `chemlib:osmium_plate`
- `chemlib:palladium_plate`
- `chemlib:platinum_plate`
- `chemlib:rhodium_plate`
- `chemlib:ruthenium_plate`
- `chemlib:thorium_plate`
- `chemlib:uranium_plate`

Each route is guarded by a non-empty ingot tag condition.

## Added TCon Casting Routes

TCon plate casting is added only where molten support was confirmed or already represented by existing recipes:

- `forge:molten_iridium` -> `chemlib:iridium_plate`
- `forge:molten_osmium` -> `chemlib:osmium_plate`
- `forge:molten_platinum` -> `chemlib:platinum_plate`
- `forge:molten_uranium` -> `chemlib:uranium_plate`

Both reusable plate casts and single-use plate casts are supported.

## Not Invented

No molten fluids were invented for:

- palladium
- rhodium
- ruthenium
- thorium

Those materials currently receive Create pressing routes only. Add TCon casting later only if matching molten fluid tags become available.

## Validation

- `node --check kubejs/server_scripts/40_recipe_add/65_chemlib_plate_manufacturing_routes.js`
