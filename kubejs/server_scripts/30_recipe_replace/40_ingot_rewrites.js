// priority: 0
ServerEvents.recipes(event => {
    console.log('[kubejs] >>> LOADER VERSION ACTIVE (ZZ_ingot_rewrites_loader.js) <<<');

    const IRON   = 'minecraft:iron_ingot';
    const COPPER = 'minecraft:copper_ingot';
    const BRASS  = 'create:brass_ingot';

    function toJsArray(x) {
        // Handles Java List / JS Array / null
        if (!x) return [];
        // If it's already a JS array
        if (Array.isArray(x)) return x;
        // If it's a Java List with size/get
        if (typeof x.size === 'function' && typeof x.get === 'function') {
            const out = [];
            for (let i = 0; i < x.size(); i++) out.push(String(x.get(i)));
            return out;
        }
        return [];
    }

    function dedupe(arr) {
        const seen = {};
        const out = [];
        for (let i = 0; i < arr.length; i++) {
            const v = (arr[i] || '').toString().trim();
            if (!v || seen[v]) continue;
            seen[v] = true;
            out.push(v);
        }
        return out;
    }

    function apply(list, fromItem, toItem, label) {
        list = dedupe(list);
        console.log(`[kubejs] ${label}: ${list.length} recipe ids`);
        for (let i = 0; i < Math.min(5, list.length); i++) {
            console.log(`[kubejs]   ${label}[${i}] = ${list[i]}`);
        }
        for (let i = 0; i < list.length; i++) {
            event.replaceInput({ id: list[i] }, fromItem, toItem);
        }
    }

    const cfg = JsonIO.read('kubejs/config/ingot_rewrites.json');
    console.log('[kubejs] cfg loaded keys = ' + Object.keys(cfg || {}));

    // Legacy steel rewrites are intentionally disabled. The expert progression now
    // gates machine families through tiered casings instead of becoming a steel pack.
    console.log('[kubejs] iron/copper->steel rewrites disabled by casing progression pass');
    apply(toJsArray(cfg && cfg.brassFromIron),   IRON,   BRASS, 'iron->brass');
    apply(toJsArray(cfg && cfg.brassFromCopper), COPPER, BRASS, 'copper->brass');
});
