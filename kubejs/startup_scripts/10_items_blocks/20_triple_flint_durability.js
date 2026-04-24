// Forge 1.20.1 + KubeJS 6
// Triple durability of No Tree Punching flint tools

ItemEvents.modification(event => {
    const flintTools = [
        'notreepunching:flint_pickaxe',
        'notreepunching:flint_axe',
        'notreepunching:flint_shovel',
        'notreepunching:flint_hoe',
        'notreepunching:flint_knife',
        'notreepunching:flint_sword'
    ]

    flintTools.forEach(id => {
        event.modify(id, item => {
            if (item.maxDamage > 0) item.maxDamage = item.maxDamage * 3
        })
    })
})
