// Explains the pack's Still-Beating Heart -> typed heart -> Blood Orb progression in JEI/EMI tooltips.

ItemEvents.tooltip(function (event) {
    event.add('rpgstats:still_beating_heart', [
        Text.gray('Stores only the death level. Place in a Blood Altar to generate LP/t.'),
        Text.darkRed('Blood Orb heart keys check level only.')
    ])

    event.add('kubejs:weak_blood_heart', Text.darkRed('Blood Altar I -> Weak Blood Orb. Catalyst: Sacrificial Dagger.'))
    event.add('kubejs:apprentice_blood_heart', Text.darkRed('Blood Altar II -> Apprentice Blood Orb. Requires heart level 10.'))
    event.add('kubejs:magician_blood_heart', Text.darkRed('Blood Altar III -> Magician Blood Orb. Requires heart level 20.'))
    event.add('kubejs:master_blood_heart', Text.darkRed('Blood Altar IV -> Master Blood Orb. Requires heart level 30.'))
    event.add('kubejs:archmage_blood_heart', Text.darkRed('Blood Altar V -> Archmage Blood Orb. Requires heart level 40.'))
})
