# Minecraft Screenshot Composition Rules

These rules govern polished pack screenshots. Diagnostic captures are evidence,
not marketing images, and do not pass merely because they prove that rendering
works.

## Subject And Composition

- Give every image one unmistakable subject: a terrain silhouette, biome
  transition, landmark, cavern, or dimension vista.
- Build visible foreground, midground, and background layers. Use nearby terrain,
  foliage, architecture, or elevation changes to establish depth without blocking
  the subject.
- Prefer a thirds intersection for the focal landmark. Use centered framing only
  for intentional symmetry or monumentality.
- Show scale with recognizable blocks, trees, structures, mobs, or a distant
  player. Do not fill the entire frame with undifferentiated terrain.
- Use rivers, ridges, roads, cave openings, coastlines, and light paths as leading
  lines toward the subject.
- Avoid a centered horizon, excessive empty sky, clipped landmarks, obstructing
  foliage, and multiple elements competing as the primary subject.
- Show biome transitions only when both environments remain legible and their
  boundary contributes useful contrast.

## Worldgen Shot Set

- World generation is the primary subject. Builds, machines, mobs, and players
  may establish scale or context but must not displace it.
- Use only verified pack environments. Suitable candidates include Tectonic
  Overworld terrain, geological and deep-lava terrain, Dimensional Font sites,
  Aether, Undergarden, Otherside, Lost Cities, and Fallout Wastelands.
- Prefer variety over dimension completeness. A first set should include a grand
  landscape, a vertical or cavernous scene, a structure in its landscape, a
  hostile environment, and an environment with a distinct color palette.
- Do not modify generated terrain for a shot presented as natural worldgen. If a
  scene is staged or altered, disclose that status with the capture metadata.

## Storefront Style

- Capture at 16:9 and at least 1920x1080. Higher-resolution masters are preferred.
- Use one large focal feature, a strong silhouette, and tonal separation that
  remains understandable at thumbnail size.
- Each gallery image must show a materially different environment or worldgen
  idea. Do not spend adjacent slots on minor variants of the same vista.
- Leave enough calm space for the landscape to read, but do not add text or logos
  to the raw master.

## Social Style

- Compose a protected central region that survives both 1:1 and 4:5 crops.
- Keep the subject and essential leading lines out of the outer 20 percent of the
  frame unless separate compositions are captured for each aspect ratio.
- Review the actual crops. A wide master is not social-safe merely because it can
  be center-cropped.
- Favor bold silhouettes, strong color separation, and fewer small details for
  mobile-size readability.

## Camera, Light, And Shaders

- Use a moderate 55-70 degree field of view. Use wider or narrower framing only
  when the subject requires it and distortion does not become distracting. The
  deterministic `worldgen_marketing_screenshots` lane is an intentional fixed
  80-degree exception; record that value and reject any capture that deviates.
- Keep the horizon level unless a deliberate dramatic angle clearly improves the
  image.
- Use side-lit sunrise or sunset for terrain relief and clear daylight for colorful
  biomes. Use fog, storms, caves, or night only when the subject remains readable.
- Enable shaders and select the intended shader pack before capture. For the
  current baseline, use Complementary Reimagined.
- Allow chunks, shadows, exposure, reflections, and shader compilation to settle
  before taking a frame.
- Reject crushed shadows, clipped highlights, excessive bloom, unstable exposure,
  unreadable fog, reflection-dominated water, broken shadows, or unloaded chunks.
- Capture several nearby camera and lighting variants, but shortlist only frames
  with a meaningfully different composition.

## Clean Frame And Reproducibility

- Hide the HUD, crosshair, hand, chat, prompts, menus, debug overlays, selection
  outlines, notifications, and onboarding UI.
- Treat disconnect screens, main/pause/loading menus, onboarding prompts, and
  low-entropy non-world frames as capture failures. Keep their raw image and
  rejection sidecar as evidence; never promote them to a final candidate.
- Marketing captures must be recapturable from a deterministic shot manifest.
  Record the world seed or server world identity, dimension, biome, coordinates,
  camera facing, field of view, time, weather, shader pack, shader preset,
  Minecraft `options.txt` source, Distant Horizons config source, and whether the
  terrain was altered.
- Use the corrected client graphics profile for polished captures. The
  disposable client must receive the intended `options.txt`, shader options file,
  current Oculus shader selection, and Distant Horizons config before launch; do
  not rely on launcher defaults or freshly generated options.
- Distant Horizons must finish the shot's LOD work before capture when DH reports
  a finite completion signal. Enable DH generation progress logging for
  screenshot runtimes, wait through a minimum settle period, and prefer a quiet
  window where DH logs and DH LOD storage stop changing. Record the settle
  duration, quiet-window duration, timeout, and observed DH evidence in the
  sidecar.
- DH can pin a small nonzero tail such as `DH is generating chunks. 32 left`
  indefinitely while still rendering a usable still frame. The screenshot lane may
  accept this only as an explicit `low-tail-stable` DH gate: the observed tail
  must remain at or below the configured low-tail threshold for the configured
  duration, and the sidecar must record the threshold, latest tail count, and
  bounded-tail duration. Do not collapse this into the normal `stable` status.
- If the DH quiet-window and bounded low-tail gates both time out, reject the
  frame. A fixed sleep alone is not enough for publishable marketing captures.
- Keep the full-resolution clean master before cropping or color adjustment. Do
  not stretch, generatively extend, or materially repaint world geometry.
- Store runtime captures under `generated/` or `/tmp`. Separate raw masters,
  shortlist candidates, AI reviews, and final exports.
- Image directories may contain images and their review sidecars only. Never put
  helper source, `.class` files, logs, crash reports, or other runtime debris in
  them.
- Use descriptive stable names such as
  `overworld-river-valley-sunset-wide-01.png` rather than capture timestamps alone.

## Mandatory AI Review

Every shortlisted image and every final derivative must pass review by a
vision-capable AI. AI review is a publication gate, not optional advice.

Give the reviewer the full-resolution image, intended style and crop, intended
primary subject, dimension, shader pack, and terrain-alteration status. Require
the reviewer to return:

- the primary subject it perceives;
- 1-5 scores for composition, depth, lighting, terrain readability, thumbnail
  clarity, and crop safety;
- detected UI, prompts, rendering faults, unloaded chunks, exposure defects,
  clutter, or misleading content;
- a pass or fail decision and concrete recapture guidance.

An image passes only when the AI identifies the intended primary subject, detects
no prohibited UI or technical artifact, and assigns at least 4/5 to every relevant
category. Storefront images require at least 4/5 thumbnail clarity. Social images
must separately pass the intended 1:1 and 4:5 crops.

A failed image must be recomposed or recaptured and reviewed again. Manual opinion
cannot waive a failed AI gate. Cropping or color adjustment creates a new
derivative that needs its own final review.

Save a machine-readable sidecar beside each reviewed candidate. It must record:

- image path and content hash;
- intended style, subject, and crop;
- capture metadata;
- rubric version;
- reviewer and model identifier;
- timestamp, category scores, findings, recapture advice, and pass/fail result.

## Final Acceptance

A publishable screenshot must satisfy all of the following:

- shaders and the named shader pack are confirmed active through configuration or
  log evidence;
- the worldgen subject is recognizable within one second at thumbnail size;
- the frame has one focal point, visible depth, and readable highlights and
  shadows;
- no UI, setup artifact, rendering fault, or misleading feature claim is visible;
- its target aspect ratios preserve the subject and composition;
- the final exported file has a passing AI-review sidecar.
