"""Assemble the TraceLens demo video with the bundled imageio ffmpeg binary."""
from __future__ import annotations

import subprocess
from pathlib import Path

FFMPEG = Path(
    r"C:\Users\ganes\AppData\Local\Programs\Python\Python312\Lib\site-packages"
    r"\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v9.0.2.exe"
)
DEMO = Path(r"D:\PROVISION_TRACELENS\demo")
SHOTS = DEMO / "shots"
AUDIO = DEMO / "audio"
OUTPUT = DEMO / "TraceLens_Demo.mp4"

PAGES = [
    "01_overview.png",
    "02_data.png",
    "03_detection.png",
    "04_investigation.png",
    "05_explainability.png",
    "06_experiments.png",
    "07_reports.png",
    "08_about.png",
]
IMAGES = ["00_title.png", *PAGES, "09_closing.png"]
DURATIONS = [6, 12, 13, 12, 15, 12, 13, 12, 12, 8]
TRANSITION = 1
AUDIO_OFFSETS_MS = [6000, 17000, 29000, 40000, 54000, 65000, 77000, 88000]

# Cumulative xfade offsets derived from the segment durations above.
offsets = []
elapsed = DURATIONS[0]
for duration in DURATIONS[1:]:
    offsets.append(elapsed - TRANSITION)
    elapsed += duration - TRANSITION
TOTAL_SECONDS = elapsed
assert TOTAL_SECONDS == 106, TOTAL_SECONDS


def build_filter() -> str:
    parts: list[str] = []
    for idx, duration in enumerate(DURATIONS):
        parts.append(
            f"[{idx}:v]scale=1280:720:force_original_aspect_ratio=decrease,"
            f"pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,"
            f"trim=duration={duration},setpts=PTS-STARTPTS[v{idx}]"
        )

    prev = "v0"
    for number, offset in enumerate(offsets, start=1):
        label = f"x{number}"
        parts.append(
            f"[{prev}][v{number}]xfade=transition=fade:duration={TRANSITION}:"
            f"offset={offset}[{label}]"
        )
        prev = label
    parts.append(f"[{prev}]format=yuv420p[vout]")

    audio_inputs = range(len(IMAGES), len(IMAGES) + len(AUDIO_OFFSETS_MS))
    for channel, (idx, offset_ms) in enumerate(zip(audio_inputs, AUDIO_OFFSETS_MS)):
        parts.append(
            f"[{idx}:a]aresample=44100,aformat=channel_layouts=stereo,"
            f"adelay={offset_ms}:all=1[a{channel}]"
        )

    mix_inputs = "".join(f"[a{i}]" for i in range(len(AUDIO_OFFSETS_MS)))
    parts.append(
        f"{mix_inputs}amix=inputs={len(AUDIO_OFFSETS_MS)}:duration=longest:"
        f"normalize=0,apad,atrim=duration={TOTAL_SECONDS},"
        f"afade=t=in:st=0:d=0.6,afade=t=out:st=105:d=1,"
        f"asetpts=PTS-STARTPTS[aout]"
    )
    return ";".join(parts)


def main() -> None:
    args: list[str] = ["-y"]
    for image, duration in zip(IMAGES, DURATIONS):
        args += [
            "-loop",
            "1",
            "-framerate",
            "30",
            "-t",
            str(duration),
            "-i",
            str(SHOTS / image),
        ]
    for number in range(1, len(AUDIO_OFFSETS_MS) + 1):
        args += ["-i", str(AUDIO / f"{number:02d}_scene.wav")]

    args += [
        "-filter_complex",
        build_filter(),
        "-map",
        "[vout]",
        "-map",
        "[aout]",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "22",
        "-pix_fmt",
        "yuv420p",
        "-r",
        "30",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        "-t",
        str(TOTAL_SECONDS),
        str(OUTPUT),
    ]

    print(f"Rendering {OUTPUT} ({TOTAL_SECONDS}s, xfade offsets {offsets})")
    subprocess.run([str(FFMPEG), *args], check=True)


if __name__ == "__main__":
    main()
