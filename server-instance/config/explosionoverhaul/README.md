# Explosion Overhaul Config Helpers

These files are live mod config helpers. Keep them valid JSON; comments, trailing commas, or malformed values can make the mod fall back to defaults after restart.

## Blacklist Files (.json)

### DestroyingBlacklist.json
- **Format**: `["namespace:block_id", ...]`
- **Effect**: Blocks listed here are immune to explosion craters.

### GlassBlacklist.json
- **Format**: `["namespace:block_id", ...]`
- **Effect**: Blocks listed here won't be shattered by the glass-breaking system.

### ExplosionSourceBlacklist.json
- **Format**: `{"namespace:entity_id": "MODE"}`
- **Modes**:
  - `DEFAULT`: Standard mod behavior (crater + concussion + sounds).
  - `VANILLA`: Reverts to vanilla explosion logic for this source.
  - `NO_DESTRUCTION`: Concussions and sounds only (no crater or glass breaking).
  - `NO_DESTRUCTION_GLASSWORKS`: Like NO_DESTRUCTION, but glass still shatters.

Restart the game/server for changes to take effect.
