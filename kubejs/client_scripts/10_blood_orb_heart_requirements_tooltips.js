// Shows heart-to-orb altar requirements in item tooltips (visible in EMI/JEI hovers too).

var HEART_HP_THRESHOLD = 20

ItemEvents.tooltip(function (event) {
    event.add('bloodmagic:weakbloodorb', [
        ' ',
        '§8Still Beating Heart conversion:',
        '§7- Any captured heart'
    ])

    event.add('bloodmagic:apprenticebloodorb', [
        ' ',
        '§8Still Beating Heart conversion:',
        '§7- Levelled heart'
    ])

    event.add('bloodmagic:magicianbloodorb', [
        ' ',
        '§8Still Beating Heart conversion:',
        '§7- Levelled heart',
        '§7- High HP stat (Hemostasis §f>= ' + HEART_HP_THRESHOLD + '§7)'
    ])

    event.add('bloodmagic:masterbloodorb', [
        ' ',
        '§8Still Beating Heart conversion:',
        '§7- Levelled heart',
        '§7- High HP stat (Hemostasis §f>= ' + HEART_HP_THRESHOLD + '§7)',
        '§7- Killed by §fWither'
    ])

    event.add('bloodmagic:archmagebloodorb', [
        ' ',
        '§8Still Beating Heart conversion:',
        '§7- Levelled heart',
        '§7- High HP stat (Hemostasis §f>= ' + HEART_HP_THRESHOLD + '§7)',
        '§7- Killed by §fEnder Dragon'
    ])

    event.add('rpgstats:still_beating_heart', [
        ' ',
        '§8Blood Orb altar tiers use this snapshot.',
        '§7Higher tiers require level, Hemostasis, and death cause.'
    ])
})
