#!/usr/bin/env kotlin

import java.awt.AlphaComposite
import java.awt.Color
import java.awt.Font
import java.awt.RenderingHints
import java.awt.image.BufferedImage
import javax.imageio.ImageIO
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import kotlin.io.path.createDirectories
import kotlin.io.path.exists
import kotlin.system.exitProcess

val root = Paths.get("").toAbsolutePath().normalize()
val forwardedArgs = args.toMutableList()
val atlasOnly = forwardedArgs.remove("--atlas-only")
val closeupsOnly = forwardedArgs.remove("--closeups-only")
val variantsOnly = forwardedArgs.remove("--variants-only")
if (forwardedArgs.contains("--fixture")) {
    System.err.println("ore_texture_gallery owns its matched normal and shader fixtures; do not pass --fixture")
    exitProcess(2)
}
if (forwardedArgs.contains("--output-dir")) {
    System.err.println("ore_texture_gallery owns its evidence directories; do not pass --output-dir")
    exitProcess(2)
}
val bootstrapIndex = forwardedArgs.indexOf("--bootstrap-mode")
val requestedBootstrap = if (bootstrapIndex >= 0) {
    val value = forwardedArgs.getOrNull(bootstrapIndex + 1) ?: run {
        System.err.println("--bootstrap-mode needs a value")
        exitProcess(2)
    }
    forwardedArgs.removeAt(bootstrapIndex + 1)
    forwardedArgs.removeAt(bootstrapIndex)
    value
} else {
    "once"
}

val evidenceRoot = root.resolve("generated/evidence/ore-textures/in-game")
evidenceRoot.createDirectories()
val script = root.resolve("tools/kotlin/worldgen_marketing_screenshots.main.kts")
val passes = listOf(
    "normal" to "ore-gallery-normal",
    "shader" to "ore-gallery-shader",
)
val shotFiles = listOf(
    "01-sedimentary-deposits.png",
    "02-base-metal-sulfides.png",
    "03-hydrothermal-veins.png",
    "04-gem-systems.png",
    "05-strategic-deep-ores.png",
    "06-osmiridium-lava-depth.png",
)
fun createAtlas(label: String) {
    val sourceDir = evidenceRoot.resolve(label).resolve("final-corrected")
    val tileWidth = 960
    val tileHeight = 540
    val atlas = BufferedImage(tileWidth * 2, tileHeight * 3, BufferedImage.TYPE_INT_RGB)
    val graphics = atlas.createGraphics()
    graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR)
    graphics.font = Font(Font.SANS_SERIF, Font.BOLD, 20)
    shotFiles.forEachIndexed { index, fileName ->
        val source = sourceDir.resolve(fileName)
        check(source.exists()) { "missing gallery frame for atlas: $source" }
        val image = ImageIO.read(source.toFile())
        val x = (index % 2) * tileWidth
        val y = (index / 2) * tileHeight
        graphics.drawImage(image, x, y, tileWidth, tileHeight, null)
        graphics.composite = AlphaComposite.SrcOver.derive(0.72f)
        graphics.color = Color.BLACK
        graphics.fillRect(x, y + tileHeight - 36, tileWidth, 36)
        graphics.composite = AlphaComposite.SrcOver
        graphics.color = Color.WHITE
        graphics.drawString(fileName.removeSuffix(".png").substringAfter('-').replace('-', ' '), x + 14, y + tileHeight - 11)
    }
    graphics.dispose()
    ImageIO.write(atlas, "png", evidenceRoot.resolve("$label-atlas.png").toFile())
}
data class Closeup(val name: String, val scene: String, val offsetX: Int, val anchorY: Int)
val closeups = listOf(
    Closeup("coal-measures", "01-sedimentary-deposits.png", -14, 105),
    Closeup("ironstone", "01-sedimentary-deposits.png", -5, 107),
    Closeup("bauxite-laterite", "01-sedimentary-deposits.png", 5, 105),
    Closeup("phosphate-rock", "01-sedimentary-deposits.png", 14, 107),
    Closeup("copper-sulfide", "02-base-metal-sulfides.png", -14, 105),
    Closeup("nickel-sulfide", "02-base-metal-sulfides.png", -5, 107),
    Closeup("lead-zinc", "02-base-metal-sulfides.png", 5, 105),
    Closeup("sulfur-pyrite", "02-base-metal-sulfides.png", 14, 107),
    Closeup("quartz-vein", "03-hydrothermal-veins.png", -14, 105),
    Closeup("tin-ore", "03-hydrothermal-veins.png", -5, 107),
    Closeup("tin-tungsten-greisen", "03-hydrothermal-veins.png", 5, 105),
    Closeup("zinc-ore", "03-hydrothermal-veins.png", 14, 107),
    Closeup("corundum-beryl", "04-gem-systems.png", -14, 105),
    Closeup("emerald-schist-beryl", "04-gem-systems.png", -5, 107),
    Closeup("lazurite-vein", "04-gem-systems.png", 5, 105),
    Closeup("kimberlite-pipe", "04-gem-systems.png", 14, 107),
    Closeup("cupriferous-redbed", "05-strategic-deep-ores.png", -15, 105),
    Closeup("soul-black-shale", "05-strategic-deep-ores.png", -8, 107),
    Closeup("titanium-iron-oxide", "05-strategic-deep-ores.png", 0, 105),
    Closeup("uranium-ore", "05-strategic-deep-ores.png", 8, 107),
    Closeup("thorium-ore", "05-strategic-deep-ores.png", 15, 105),
    Closeup("osmiridium", "06-osmiridium-lava-depth.png", -14, 105),
)
val variantBlockIds = linkedMapOf(
    "coal-measures" to "coal_measures",
    "ironstone" to "ironstone",
    "bauxite-laterite" to "bauxite_laterite",
    "phosphate-rock" to "phosphate_rock",
    "copper-sulfide" to "copper_sulfide_ore",
    "nickel-sulfide" to "nickel_sulfide_ore",
    "lead-zinc" to "lead_zinc_vein",
    "sulfur-pyrite" to "sulfur_bearing_pyrite_ore",
    "quartz-vein" to "quartz_vein",
    "tin-ore" to "tin_ore",
    "tin-tungsten-greisen" to "tin_tungsten_greisen",
    "zinc-ore" to "zinc_ore",
    "corundum-beryl" to "corundum_beryl_gem_vein",
    "emerald-schist-beryl" to "emerald_schist_beryl_vein",
    "lazurite-vein" to "lazurite_vein",
    "kimberlite-pipe" to "kimberlite_pipe",
    "cupriferous-redbed" to "cupriferous_redbed_redstone_vein",
    "soul-black-shale" to "soul_bearing_black_shale_soulstone_vein",
    "titanium-iron-oxide" to "titanium_iron_oxide_ore",
    "uranium-ore" to "uranium_ore",
    "thorium-ore" to "thorium_ore",
    "osmiridium" to "osmiridium_lava_sulfide_ore",
)
fun createVariantSheets() {
    val textureRoot = root.resolve("generated/custom-mod-sources/realistic-ores/src/main/resources/assets/realisticores/textures/block")
    val outputDir = evidenceRoot.resolve("variant-comparisons")
    outputDir.createDirectories()
    val sheetWidth = 960
    val sheetHeight = 680
    val faceSize = 240
    val faceXs = listOf(145, 410, 675)
    val faceYs = listOf(78, 382)
    variantBlockIds.forEach { (name, blockId) ->
        val sheet = BufferedImage(sheetWidth, sheetHeight, BufferedImage.TYPE_INT_RGB)
        val graphics = sheet.createGraphics()
        graphics.color = Color(25, 25, 25)
        graphics.fillRect(0, 0, sheetWidth, sheetHeight)
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR)
        graphics.color = Color.WHITE
        graphics.font = Font(Font.SANS_SERIF, Font.BOLD, 24)
        graphics.drawString("${name.replace('-', ' ')} — south face", 20, 34)
        graphics.font = Font(Font.SANS_SERIF, Font.BOLD, 20)
        (0..2).forEach { variant -> graphics.drawString("variant $variant", faceXs[variant] + 75, 65) }
        listOf("stone" to blockId, "deepslate" to "deepslate_$blockId").forEachIndexed { row, (host, textureId) ->
            graphics.drawString(host, 18, faceYs[row] + faceSize / 2)
            (0..2).forEach { variant ->
                val texture = textureRoot.resolve("${textureId}_${variant}_south.png")
                check(texture.exists()) { "missing variant comparison texture: $texture" }
                val image = ImageIO.read(texture.toFile())
                check(image.width == 16 && image.height == 16) { "variant comparison texture is not 16x16: $texture" }
                graphics.drawImage(image, faceXs[variant], faceYs[row], faceSize, faceSize, null)
            }
        }
        graphics.dispose()
        ImageIO.write(sheet, "png", outputDir.resolve("$name.png").toFile())
    }
    val tileWidth = 480
    val tileHeight = 340
    val columns = 3
    val rows = (variantBlockIds.size + columns - 1) / columns
    val atlas = BufferedImage(tileWidth * columns, tileHeight * rows, BufferedImage.TYPE_INT_RGB)
    val graphics = atlas.createGraphics()
    graphics.color = Color(15, 15, 15)
    graphics.fillRect(0, 0, atlas.width, atlas.height)
    graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR)
    variantBlockIds.keys.forEachIndexed { index, name ->
        val image = ImageIO.read(outputDir.resolve("$name.png").toFile())
        graphics.drawImage(image, (index % columns) * tileWidth, (index / columns) * tileHeight, tileWidth, tileHeight, null)
    }
    graphics.dispose()
    ImageIO.write(atlas, "png", evidenceRoot.resolve("variant-comparisons-atlas.png").toFile())
}
fun createCloseups() {
    val sourceDir = evidenceRoot.resolve("normal/final-corrected")
    val outputDir = evidenceRoot.resolve("closeups")
    outputDir.createDirectories()
    // The gallery camera uses a 70-degree FOV; at the wall's distance each block
    // spans about 21.5 screen pixels. Keep the crop tight enough that one deposit
    // fills the frame without pulling in its neighbours.
    val cropSize = 240
    val outputSize = 960
    closeups.forEach { closeup ->
        val source = ImageIO.read(sourceDir.resolve(closeup.scene).toFile())
        val projectedX = (source.width / 2.0 - closeup.offsetX * 21.5).toInt()
        val projectedY = if (closeup.anchorY == 105) 610 else 580
        val fromX = (projectedX - cropSize / 2).coerceIn(0, source.width - cropSize)
        val fromY = (projectedY - cropSize / 2).coerceIn(0, source.height - cropSize)
        val crop = source.getSubimage(fromX, fromY, cropSize, cropSize)
        val enlarged = BufferedImage(outputSize, outputSize, BufferedImage.TYPE_INT_RGB)
        val graphics = enlarged.createGraphics()
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR)
        graphics.drawImage(crop, 0, 0, outputSize, outputSize, null)
        graphics.dispose()
        ImageIO.write(enlarged, "png", outputDir.resolve("${closeup.name}.png").toFile())
    }
    val tileSize = 480
    val columns = 4
    val rows = (closeups.size + columns - 1) / columns
    val atlas = BufferedImage(tileSize * columns, tileSize * rows, BufferedImage.TYPE_INT_RGB)
    val graphics = atlas.createGraphics()
    graphics.font = Font(Font.SANS_SERIF, Font.BOLD, 18)
    closeups.forEachIndexed { index, closeup ->
        val image = ImageIO.read(outputDir.resolve("${closeup.name}.png").toFile())
        val x = (index % columns) * tileSize
        val y = (index / columns) * tileSize
        graphics.drawImage(image, x, y, tileSize, tileSize, null)
        graphics.composite = AlphaComposite.SrcOver.derive(0.72f)
        graphics.color = Color.BLACK
        graphics.fillRect(x, y + tileSize - 34, tileSize, 34)
        graphics.composite = AlphaComposite.SrcOver
        graphics.color = Color.WHITE
        graphics.drawString(closeup.name.replace('-', ' '), x + 12, y + tileSize - 10)
    }
    graphics.dispose()
    ImageIO.write(atlas, "png", evidenceRoot.resolve("closeups-atlas.png").toFile())
}
if (variantsOnly) {
    createVariantSheets()
    println("ore texture variant comparisons written: ${evidenceRoot.resolve("variant-comparisons")}")
    exitProcess(0)
}
if (closeupsOnly) {
    createCloseups()
    println("ore texture closeups written: ${evidenceRoot.resolve("closeups")}")
    exitProcess(0)
}
if (atlasOnly) {
    passes.forEach { createAtlas(it.first) }
    println("ore texture gallery atlases written: $evidenceRoot")
    exitProcess(0)
}
val results = mutableListOf<Triple<String, Int, Path>>()
for ((passIndex, pass) in passes.withIndex()) {
    val (label, fixture) = pass
    val output = evidenceRoot.resolve(label)
    val command = listOf(
        "kotlin",
        "-J-Djava.awt.headless=false",
        script.toString(),
        "--fixture", fixture,
        "--batch-mode", "session",
        "--output-dir", output.toString(),
        "--bootstrap-mode", if (passIndex == 0 || results.firstOrNull()?.second != 0) requestedBootstrap else "never",
    ) + forwardedArgs
    val process = ProcessBuilder(command).directory(root.toFile()).inheritIO().start()
    val exit = process.waitFor()
    results += Triple(label, exit, output.resolve("latest-corrected-manifest.json"))
}

fun q(value: String): String = "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""
val complete = results.all { it.second == 0 && it.third.exists() }
val manifest = buildString {
    appendLine("{")
    appendLine("  \"schema\": \"bc.ore_texture_gallery.matched.v1\",")
    appendLine("  \"status\": ${q(if (complete) "technical-pass-pending-ai-review" else "failed")},")
    appendLine("  \"passes\": [")
    appendLine(results.joinToString(",\n") { (label, exit, path) ->
        "    {\"lighting\":${q(label)},\"exitCode\":$exit,\"manifest\":${q(path.toString())}}"
    })
    appendLine("  ]")
    appendLine("}")
}
Files.writeString(evidenceRoot.resolve("latest-manifest.json"), manifest)
if (!complete) exitProcess(1)
passes.forEach { createAtlas(it.first) }
println("matched ore texture gallery captured: $evidenceRoot")
