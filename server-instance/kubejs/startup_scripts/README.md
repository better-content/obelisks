# Startup Scripts Layout

These scripts run once at game startup. This runtime copy should match the source tree after sync; make lasting edits in root `kubejs/startup_scripts/`.

- `00_boot/`: shared globals/helpers only
- `10_items_blocks/`: item/block registrations and startup item tweaks
- `20_globals/`: global startup behavior toggles

Naming convention:

- Prefix with load order: `10_`, `20_`, `30_`.
- Use descriptive names by domain.
