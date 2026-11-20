# TraceLens demo video

`TraceLens_Demo.mp4` is a 106-second, 1280×720, 30 fps H.264/AAC walkthrough of the
**current live TraceLens site**, including the new public landing page.

## Scenes

| Scene | Source page |
|---|---|
| Title | `slates/title.html` |
| 01 Overview | `/` — new public landing page |
| 02 Data | `/how-it-works` |
| 03 Detection | `/technology` |
| 04 Investigation | `/research` |
| 05 Explainability | `/judge` — guided judge mode |
| 06 Experiments | `/demo` — demo access |
| 07 Reports | `/about` |
| 08 About | `/app/overview` — live analyst workspace |
| Closing | `slates/closing.html` |

## How it is made

1. **Source** — the live site at `https://tracelensproject.netlify.app` with the
   hosted free-tier API proxied through `/api`. The API seeds labelled synthetic
   demo data on each fresh deploy, so the workspace is never empty.
2. **Screenshots** — `capture_shots.py` drives headless Chrome with Selenium at
   1440×900. It sets a demo session in `sessionStorage` before opening the
   analyst workspace. Outputs land in `shots/`.
3. **Narration** — `narration.txt` holds the eight scene lines. `generate_audio.ps1`
   renders one WAV per scene with the Microsoft David Desktop voice into `audio/`.
4. **Assembly** — `build_video.py` uses the bundled imageio ffmpeg binary to scale
   and pad images to 1280×720, join them with 1-second crossfades, and mix the
   narration at offsets `[6, 17, 29, 40, 54, 65, 77, 88]` seconds.

## Verification

```powershell
& 'C:\Users\ganes\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v9.0.2.exe' -v error -i 'D:\PROVISION_TRACELENS\demo\TraceLens_Demo.mp4' -f null -
```

Decode check exits `0` with no error output. Duration is 106 seconds; file size is
about 4.2 MB. Public links:

- Live site: https://tracelensproject.netlify.app/
- Video: https://github.com/ganeshkrishnareddy/TraceLens/blob/main/demo/TraceLens_Demo.mp4

All datasets shown in the public site and the video are labelled synthetic
demonstration data.
