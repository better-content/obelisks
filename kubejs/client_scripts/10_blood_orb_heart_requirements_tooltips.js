// Explains the pack's Still-Beating Heart -> typed heart -> Blood Orb progression in JEI/EMI tooltips.

ItemEvents.tooltip(function (event) {
    event.add('rpgstats:still_beating_heart', [
        Text.gray('Use with the correct catalyst in the offhand to channel a typed heart.'),
        Text.darkRed('Blood Orbs are made from typed hearts, not bulk heart farming.')
    ])

    event.add('kubejs:weak_blood_heart', Text.darkRed('Blood Altar I -> Weak Blood Orb. Catalyst: Sacrificial Dagger.'))
    event.add('kubejs:apprentice_blood_heart', Text.darkRed('Blood Altar II -> Apprentice Blood Orb. Catalyst: Weak Blood Orb.'))
    event.add('kubejs:magician_blood_heart', Text.darkRed('Blood Altar III -> Magician Blood Orb. Requires a levelled, hemostatic death.'))
    event.add('kubejs:master_blood_heart', Text.darkRed('Blood Altar IV -> Master Blood Orb. Requires a wither death.'))
    event.add('kubejs:archmage_blood_heart', Text.darkRed('Blood Altar V -> Archmage Blood Orb. Requires an End ordeal.'))
})
