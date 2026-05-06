# Joined Client RAM Cross-Section

Output: `/home/gerald/obelisks/docs/ram_profile/joined_cross_section_reduced_stack_20260506`

Method: temporary jar disables in live Prism + server mods, dedicated server start, Prism quick-play client join, post-join smaps/heap/class histogram capture, restore jars.

| Phase | Status | Disabled | RSS MiB | Delta vs baseline MiB | Hist MiB | Heap used MiB | Atlas | EMI ms | Notes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- |
| reduced_baseline_top4 | PASS | 8 | 9138.5 |  | 2477.6 | 3090.1 | 16384x16384x4 |  | client_joined_server |
| reduced_repeat_top4 | PASS | 8 | 9767.7 |  | 3338.0 | 4495.2 | 16384x16384x4 | 9156 | client_joined_server |
| reduced_no_ars | FAIL | 12 |  |  |  |  |  |  | server_fail |
| reduced_no_bloodmagic | PASS | 14 | 10407.7 |  | 3274.4 | 5274.5 | 16384x8192x4 | 8137 | client_joined_server |
| reduced_no_malum | PASS | 12 | 10426.2 |  | 3202.1 | 5151.6 | 16384x16384x4 | 9271 | client_joined_server |
| reduced_no_occultism | PASS | 10 | 9858.7 |  | 3337.4 | 4316.1 | 16384x16384x4 | 9471 | client_joined_server |
| reduced_no_quark | PASS | 12 | 11386.7 |  | 3075.1 | 4166.3 | 16384x16384x4 | 9111 | client_joined_server |
| reduced_no_supplementaries | PASS | 10 | 9592.7 |  | 3273.8 | 4170.0 | 16384x16384x4 | 8684 | client_joined_server |
| reduced_no_amendments | PASS | 10 | 11728.0 |  | 3251.9 | 4858.5 | 16384x16384x4 | 9666 | client_joined_server |
| reduced_no_farmers_delight | FAIL | 10 |  |  |  |  |  |  | server_fail |
| reduced_no_brewin_and_chewin | FAIL | 10 |  |  |  |  | 2048x1024x4 |  | client_fatal_log_signature |
| reduced_no_delightful | PASS | 10 | 10747.4 |  | 3158.4 | 4655.0 | 16384x16384x4 | 8582 | client_joined_server |
| reduced_no_my_nethers_delight | PASS | 10 | 9677.4 |  | 3263.5 | 4346.2 | 16384x16384x4 | 9328 | client_joined_server |
| reduced_no_veggies_delight | PASS | 10 | 9873.6 |  | 3271.1 | 4477.8 | 16384x16384x4 | 9361 | client_joined_server |
| reduced_no_ubes_delight | PASS | 10 | 9931.0 |  | 3260.3 | 4575.8 | 16384x16384x4 | 9167 | client_joined_server |
| reduced_no_undergarden_delight | PASS | 10 | 9815.4 |  | 3287.0 | 4279.0 | 16384x16384x4 | 9286 | client_joined_server |
| reduced_no_chefs_delight | PASS | 10 | 9663.4 |  | 3279.6 | 4275.8 | 16384x16384x4 | 8922 | client_joined_server |
| reduced_no_collectors_reap | PASS | 10 | 10350.2 |  | 3165.8 | 3979.6 | 16384x16384x4 | 8721 | client_joined_server |
| reduced_no_corn_delight | PASS | 10 | 11298.5 |  | 3189.1 | 4215.8 | 16384x16384x4 | 8952 | client_joined_server |
| reduced_no_ends_delight | PASS | 10 | 9662.6 |  | 3272.2 | 4236.7 | 16384x16384x4 | 8587 | client_joined_server |
| reduced_no_farmers_respite | PASS | 10 | 11853.2 |  | 3182.0 | 4792.6 | 16384x16384x4 | 8890 | client_joined_server |
| reduced_no_oceans_delight | PASS | 10 | 11615.5 |  | 3188.0 | 5299.3 | 16384x16384x4 | 11300 | client_joined_server |
| reduced_no_rustic_delight | PASS | 10 | 11018.3 |  | 3177.2 | 4451.3 | 16384x16384x4 | 8607 | client_joined_server |
| reduced_no_diet | PASS | 10 | 10462.7 |  | 3187.4 | 4641.4 | 16384x16384x4 | 8799 | client_joined_server |
| reduced_no_solcarrot | PASS | 10 | 10849.9 |  | 3278.1 | 3935.8 | 16384x16384x4 | 8511 | client_joined_server |
| reduced_no_thirst | PASS | 10 | 9579.4 |  | 3276.3 | 4244.4 | 16384x16384x4 | 9042 | client_joined_server |
| reduced_no_appleskin | PASS | 10 | 11697.7 |  | 3192.7 | 5115.1 | 16384x16384x4 | 9564 | client_joined_server |
| reduced_no_cravings | PASS | 10 | 10498.1 |  | 3182.1 | 4166.7 | 16384x16384x4 | 8587 | client_joined_server |
| reduced_no_acid_vat | PASS | 10 | 11682.0 |  | 3187.7 | 5618.2 | 16384x16384x4 | 9151 | client_joined_server |
| reduced_no_btmfixes | PASS | 10 | 10407.0 |  | 3187.9 | 4844.6 | 16384x16384x4 | 9145 | client_joined_server |
| reduced_no_classselector | PASS | 10 | 11648.4 |  | 3181.8 | 5438.1 | 16384x16384x4 | 9981 | client_joined_server |
| reduced_no_computerbridge | PASS | 10 | 9932.8 |  | 3190.0 | 4133.6 | 16384x16384x4 | 9131 | client_joined_server |
| reduced_no_transmissionloss | PASS | 10 | 11454.6 |  | 3189.2 | 4353.4 | 16384x16384x4 | 9750 | client_joined_server |
| reduced_no_cursedbiomes | PASS | 10 | 11070.1 |  | 3277.7 | 3918.0 | 16384x16384x4 | 9239 | client_joined_server |
| reduced_no_fission_reactor | PASS | 10 | 10458.8 |  | 3190.8 | 4143.4 | 16384x16384x4 | 9014 | client_joined_server |
| reduced_no_gases_and_plasmas | PASS | 10 | 9855.7 |  | 3275.4 | 4405.0 | 16384x16384x4 | 9428 | client_joined_server |
| reduced_no_heatsync | PASS | 10 | 11584.0 |  | 3189.2 | 4831.7 | 16384x16384x4 | 9548 | client_joined_server |
| reduced_no_liquid_coolant | FAIL | 10 |  |  |  |  |  |  | server_fail |
| reduced_no_obelisks | PASS | 10 | 9860.9 |  | 3280.9 | 4219.1 | 16384x16384x4 | 9593 | client_joined_server |
| reduced_no_pillagercampaigns | PASS | 10 | 12747.1 |  | 3190.3 | 6594.3 | 16384x16384x4 | 9795 | client_joined_server |
| reduced_no_procedural_bouquets | PASS | 10 | 11212.6 |  | 3192.2 | 5732.2 | 16384x16384x4 | 10248 | client_joined_server |
| reduced_no_realisticores | PASS | 10 | 11054.8 |  | 3250.6 | 5410.6 | 16384x16384x4 | 9081 | client_joined_server |
| reduced_no_rpgstats | PASS | 10 | 11958.2 |  | 3243.7 | 4075.8 | 16384x16384x4 | 9203 | client_joined_server |
| reduced_no_settlementroads | PASS | 10 | 9580.3 |  | 3326.4 | 4210.7 | 16384x16384x4 | 8610 | client_joined_server |
| reduced_no_villagewalls | PASS | 10 | 11579.2 |  | 3244.1 | 4379.5 | 16384x16384x4 | 9288 | client_joined_server |
| reduced_no_compressedcreativity | PASS | 10 | 11697.6 |  | 3241.9 | 5697.4 | 16384x16384x4 | 9195 | client_joined_server |
| reduced_no_create_new_age | FAIL | 12 |  |  |  |  |  |  | server_fail |
| reduced_no_create_stuff_additions | PASS | 10 | 10100.2 |  | 3233.4 | 4185.5 | 16384x16384x4 | 8620 | client_joined_server |
| reduced_no_create_bb | PASS | 10 | 10828.0 |  | 3225.7 | 4561.5 | 16384x16384x4 | 8936 | client_joined_server |
| reduced_no_create_central_kitchen | PASS | 10 | 11141.1 |  | 3246.5 | 5611.1 | 16384x16384x4 | 9278 | client_joined_server |
| reduced_no_create_cold_sweat | PASS | 10 | 12185.3 |  | 3184.4 | 4696.0 | 16384x16384x4 | 9542 | client_joined_server |
| reduced_no_create_connected | PASS | 10 | 10681.2 |  | 3171.8 | 4265.4 | 16384x16384x4 | 8763 | client_joined_server |
| reduced_no_create_enchantment_industry | PASS | 10 | 9569.4 |  | 3272.2 | 4176.4 | 16384x16384x4 | 8687 | client_joined_server |
| reduced_no_create_more_additions | PASS | 10 | 11896.5 |  | 3252.1 | 4604.2 | 16384x16384x4 | 9653 | client_joined_server |
| reduced_no_create_power_loader | PASS | 10 | 9862.2 |  | 3313.2 | 4288.7 | 16384x16384x4 | 8953 | client_joined_server |
| reduced_no_create_things_and_misc | PASS | 10 | 9947.3 |  | 3298.4 | 4131.8 | 16384x16384x4 | 8955 | client_joined_server |
| reduced_no_create_additional_logistics | PASS | 10 | 10207.9 |  | 3289.5 | 4467.3 | 16384x16384x4 | 8892 | client_joined_server |
| reduced_no_create_addon_compatibility | PASS | 10 | 11603.5 |  | 3216.1 | 4547.3 | 16384x16384x4 | 10202 | client_joined_server |
| reduced_no_create_adv_logistics | PASS | 10 | 11700.9 |  | 3183.7 | 5372.9 | 16384x16384x4 | 8815 | client_joined_server |
| reduced_no_create_applied_kinetics | FAIL | 10 |  |  |  |  | 16384x16384x4 | 8815 | server_crash_report_created |
| reduced_no_create_big_cannons | PASS | 10 | 11268.7 |  | 3178.5 | 4680.0 | 16384x16384x4 | 9558 | client_joined_server |
| reduced_no_create_diesel_generators | PASS | 10 | 9971.2 |  | 3285.4 | 4269.9 | 16384x16384x4 | 9418 | client_joined_server |
| reduced_no_create_liquid_fuel | PASS | 10 | 9834.1 |  | 3309.3 | 4277.4 | 16384x16384x4 | 8937 | client_joined_server |
| reduced_no_create_more_drill_heads | PASS | 10 | 10667.4 |  | 3218.1 | 5394.5 | 16384x16384x4 | 9310 | client_joined_server |
| reduced_no_ae2_things | PASS | 10 | 11482.5 |  | 3218.8 | 4617.0 | 16384x16384x4 | 9148 | client_joined_server |
| reduced_no_ae2_network_analyzer | PASS | 10 | 11487.3 |  | 3221.4 | 5533.0 | 16384x16384x4 | 9418 | client_joined_server |
| reduced_no_ae_additions | PASS | 10 | 10435.4 |  | 3285.2 | 4193.6 | 16384x16384x4 | 8899 | client_joined_server |
| reduced_no_advanced_ae | PASS | 10 | 10310.8 |  | 3192.7 | 4053.5 | 16384x16384x4 | 8457 | client_joined_server |
| reduced_no_extended_ae | PASS | 10 | 11888.8 |  | 3193.9 | 4721.5 | 16384x16384x4 | 9368 | client_joined_server |
| reduced_no_mae2 | FAIL | 10 |  |  |  |  | 2048x1024x4 |  | client_fatal_log_signature |
| reduced_no_merequester | PASS | 10 | 10677.4 |  | 3290.4 | 5130.4 | 16384x16384x4 | 8730 | client_joined_server |
| reduced_no_polyeng | PASS | 10 | 11766.9 |  | 3186.1 | 4515.0 | 16384x16384x4 | 9247 | client_joined_server |
