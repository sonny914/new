# TEST 01 · LOOK DEVELOPMENT

The first test of pipeline stage 6–8 (see `../../PIPELINE.md`): can generated video hold the Listener's identity through a bullet-time orbit if the previs supplies the camera?

## Inputs (in this folder)

| File | What it is |
|---|---|
| `source-f100.jpg` | Clean previs frame 100 (4.17 s): the face-reveal angle of the 360° freeze, 21:9 |
| `source-orbit-3s.mp4` | 72 clean previs frames, 3.75–6.75 s of the freeze orbit: south → east (face) → north → south-west (the trap), 21:9, 24 fps |

## Step 1: style frame

- **Model:** GPT Image 2.5 on Higgsfield, high quality, 2K, 21:9. The reference image was `source-f100.jpg`.
- **Brief:** keep the exact camera, composition and pose; design the Listener; frozen rain as beads; a blade of moonlight across her face through broken louvers; theatrical anime with clean ink line and two-tone cel shading; ink, slate and bone only; no orange.
- **Cost:** 5.5 credits for two variants.

| Variant | Higgsfield job | Verdict |
|---|---|---|
| A | `f259fd57-24a6-420b-8f4f-6e570edb5475` | **Chosen.** Keeps the louvered wall behind her and the diagonal blade of light across her face, as the bible's lighting rule asks. Eyes shut, band, sash, staff, beads of rain all on-model. |
| B | `bd1c4bf6-3a6c-4410-8f7a-2d3e933d488d` | Strong alternate. The band reads more clearly as lifted, and the drowned city shows through the arches. The light comes from above rather than across the face. |

Both read as the same person: short asymmetric black hair, a calm face, a high-collared slate coat. That is the Listener's first design.

## Step 2: the 3-second clip

- **Model:** Seedance 2.5, `video_edit` mode, 1080p, no generated audio.
- **Inputs:** `source-orbit-3s.mp4` as the video to edit, style frame A as the image reference.
- **Brief:** change only the rendering; keep the camera motion, timing, framing, pose and every object's position; time frozen; the bell's glow and the chain are the only orange.
- **Cost:** 80 credits.
- **Higgsfield job:** `43736a28-ec2a-4a58-802b-9287ad4688a3`

## Notes for the pipeline

- This sandbox cannot reach Higgsfield's upload or download hosts. Inputs reach Higgsfield by URL from this public repo (images) or through Higgsfield's own sandbox (videos, because GitHub serves them as `application/octet-stream`). Generated media stays in Higgsfield, referenced here by job ID.
- Higgsfield offered a generic preset for the clip prompt. It was declined: a preset would ignore the previs camera, which is the whole point of the test.
