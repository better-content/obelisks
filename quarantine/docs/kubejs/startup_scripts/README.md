# Startup Scripts Layout

These scripts run once at game startup. Keep one responsibility per file.

- `00_boot/`: shared globals/helpers only
- `10_items_blocks/`: item/block registrations and startup item tweaks
- `20_globals/`: global startup behavior toggles

Naming convention:
- Prefix with load order: `10_`, `20_`, `30_`.
- Use descriptive names by domain.
