# KubeJS Runtime Directory

This directory is the KubeJS copy inside the generated server runtime. The source-of-truth KubeJS files live at the repository root in `kubejs/`.

Runtime layout:

- `assets/`: resource-pack content such as textures, models, and lang files.
- `data/`: datapack content such as loot tables, tags, recipes, and functions.
- `startup_scripts/`: startup-time scripts for registrations and global setup.
- `server_scripts/`: reloadable server scripts for recipes, tags, loot, worldgen, and server events.
- `client_scripts/`: client-resource scripts for JEI/EMI hiding, tooltips, and client-only presentation.
- `config/`: KubeJS config and audit dump storage.

Use `/reload` for reloadable server resources and F3+T for client resources. Startup script changes usually require a full restart.

Type-specific KubeJS logs are written under `logs/kubejs/`.
