# TraceLens demo video

`TraceLens_Demo.mp4` is a 106-second, 1280×720, 30 fps H.264/AAC walkthrough of the live TraceLens dashboard.

## How it was made

1. **Services** — backend on `http://127.0.0.1:8000`, Vite dashboard on `http://127.0.0.1:5173`. Both returned HTTP 200 before capture.
2. **Screenshots** — `capture_shots.ps1` used headless Chrome at 1440×900 with a 12-second virtual-time budget for the eight routes (`01_overview.png` … `08_about.png`). `00_title.png` and `09_closing.png` were rendered from the HTML slates in `slates/`. `verify_pages.ps1` confirmed each route rendered the expected `<h1>` and no offline banner.
3. **Narration** — `narration.txt` holds the eight scene lines. `generate_audio.ps1` rendered one WAV per scene with the Microsoft David Desktop voice via `System.Speech.Synthesis`; WAVs are in `audio/`.
4. **Assembly** — `build_video.py` called the bundled ffmpeg binary:
   `C:\Users\ganes\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v9.0.2.exe`
   Images were scaled/padded to 1280×720, joined with 1-second crossfades, and narration was delayed to scene start times `[6, 17, 29, 40, 54, 65, 77, 88]` seconds.
5. **Test evidence** — `python -m pytest -q` from the project root: **40 passed**. The narration numbers match the verified project facts: 1,440 windows (1,200 normal / 240 anomalous), 1,008 train / 432 test, Isolation Forest F1 0.714 / AUC 0.886, MAD/IQR F1 0.769 / AUC 0.901, and example record REC-000123 with CPU +105%, memory +58%, error_rate +697%.

## Verification

Decode check:

```powershell
& 'C:\Users\ganes\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v9.0.2.exe' -v error -i 'D:\PROVISION_TRACELENS\demo\TraceLens_Demo.mp4' -f null -
```

- Exit code: `0`
- Error output: none
- Duration: `00:01:46.00` (106 seconds)
- Size: `4,340,705` bytes (4.14 MB)
- Video: `h264 (High), yuv420p, 1280×720, 30 fps`
- Audio: `aac (LC), 44100 Hz, stereo`

## Files

- `TraceLens_Demo.mp4` — final video
- `shots/` — source screenshots and a `contact_sheet.png`
- `audio/` — eight narration WAVs
- `slates/` — title and closing HTML slates
- `narration.txt`, `capture_shots.ps1`, `verify_pages.ps1`, `generate_audio.ps1`, `build_video.py` — reproducible sources

Nothing was pushed to GitHub or published.
