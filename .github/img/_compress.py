import os
import subprocess
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

IGNORE_DIRS = {"brand"}


def format_size(b):
    for unit in ["B", "KB", "MB", "GB"]:
        if b < 1024:
            return f"{b:.1f}{unit}"
        b /= 1024
    return f"{b:.1f}TB"  # concerning


def collect_files(root="."):
    files = []

    for d, dirs, fs in os.walk(root):
        dirs[:] = [x for x in dirs if x.lower() not in IGNORE_DIRS]

        for f in fs:
            if f.lower().endswith((".gif", ".png", ".jpg", ".jpeg", ".webp")):
                path = os.path.join(d, f)
                size = os.path.getsize(path)
                files.append((path, size))

    return files


def compress_gif_ffmpeg(inp, out):
    palette = inp + ".palette.png"

    subprocess.run([
        "ffmpeg", "-y", "-i", inp,
        "-vf", "fps=15,scale=iw:-1:flags=lanczos,palettegen=max_colors=256",
        palette
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    subprocess.run([
        "ffmpeg", "-y", "-i", inp, "-i", palette,
        "-lavfi", "fps=15,scale=iw:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer",
        out
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    if os.path.exists(palette):
        os.remove(palette)


def compress_image(inp, out):
    img = Image.open(inp)

    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    ext = os.path.splitext(out)[1].lower()

    if ext in [".jpg", ".jpeg"]:
        img.save(out, "JPEG", quality=75, optimize=True, progressive=True)
    elif ext == ".png":
        img.save(out, "PNG", optimize=True)
    else:
        img.save(out)


def process(path):
    try:
        before = os.path.getsize(path)
        tmp = path + ".tmp"

        ext = path.lower().split(".")[-1]

        if ext == "gif":
            tmp += ".gif"
            compress_gif_ffmpeg(path, tmp)
        else:
            tmp += "." + ext
            compress_image(path, tmp)

        if not os.path.exists(tmp):
            return 0, 0

        after = os.path.getsize(tmp)

        # skip if bigger (important fix)
        if after >= before:
            os.remove(tmp)
            print(f"[skip] {os.path.basename(path)} (bigger)")
            return before, before

        os.replace(tmp, path)

        print(
            f"[ok] {os.path.basename(path)} {format_size(before)} -> {format_size(after)}")
        return before, after

    except Exception as e:
        print("error:", path, e)
        return 0, 0


def main():
    files = collect_files(".")

    if not files:
        print("no files found")
        return

    print("\nfound files:\n")
    for i, (p, s) in enumerate(files):
        print(f"{i:03d} | {format_size(s)} | {p}")

    print("\nmode: (y = all, n = none, s = select)")
    mode = input("> ").strip().lower()

    selected = []

    if mode == "y":
        selected = [p for p, _ in files]

    elif mode == "s":
        for p, s in files:
            ans = input(f"{p}? (y/n): ").strip().lower()
            if ans == "y":
                selected.append(p)

    else:
        print("exit")
        return

    print(f"\nprocessing {len(selected)} files...\n")

    total_before = 0
    total_after = 0

    with ThreadPoolExecutor(max_workers=os.cpu_count()) as ex:
        for b, a in ex.map(process, selected):
            total_before += b
            total_after += a

    print("\n.......... summary ..........")
    print(f"total: {format_size(total_before)} -> {format_size(total_after)}")
    print(f"saved: {format_size(total_before - total_after)}")


main()
# total: 206.3MB -> 103.2MB
# saved: 103.1MB
