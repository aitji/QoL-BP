from PIL import Image
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer
import os
import time
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_FOLDER_NAME = 'input'
INPUT_DIR = os.path.join(BASE_DIR, INPUT_FOLDER_NAME)
OUTPUT_DIR = BASE_DIR

CROP_LEFT = 689
CROP_TOP = 226
CROP_RIGHT = 1240
CROP_BOTTOM = 493

SUPPORTED = {".png", ".jpg", ".jpeg"}
KEEP_FILES = {".py", ".cmd"}
KEEP_DIRS = {INPUT_FOLDER_NAME}


def _to_str(path: str | bytes | bytearray | memoryview) -> str:
    if isinstance(path, str):
        return path
    return bytes(path).decode()


def output_path(src: str) -> str:
    rel = os.path.relpath(src, INPUT_DIR)
    filename = os.path.splitext(rel)[0] + ".png"
    return os.path.join(OUTPUT_DIR, filename)


def crop_and_save(src: str, dst: str) -> None:
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    img = Image.open(src)
    cropped = img.crop((CROP_LEFT, CROP_TOP, CROP_RIGHT, CROP_BOTTOM))
    cropped.save(dst, "PNG", optimize=True)
    print(f"[SAVED]   {dst}")


class ImageHandler(FileSystemEventHandler):
    def _is_image(self, path: str) -> bool:
        return os.path.splitext(path)[1].lower() in SUPPORTED

    def on_created(self, event):
        path = _to_str(event.src_path)
        if not event.is_directory and self._is_image(path):
            print(f"[ADDED]   {path}")
            time.sleep(0.1)
            try:
                crop_and_save(path, output_path(path))
            except Exception as e:
                print(f"[ERROR]   {e}")

    def on_modified(self, event):
        path = _to_str(event.src_path)
        if not event.is_directory and self._is_image(path):
            print(f"[CHANGED] {path}")
            time.sleep(0.1)
            try:
                crop_and_save(path, output_path(path))
            except Exception as e:
                print(f"[ERROR]   {e}")

    def on_deleted(self, event):
        path = _to_str(event.src_path)
        if not event.is_directory and self._is_image(path):
            dst = output_path(path)
            if os.path.exists(dst):
                os.remove(dst)
                print(f"[REMOVED] {dst}")

    def on_moved(self, event):
        if not event.is_directory:
            src = _to_str(event.src_path)
            dst_path = _to_str(event.dest_path)

            old_dst = output_path(src)
            if self._is_image(src) and os.path.exists(old_dst):
                os.remove(old_dst)
                print(f"[REMOVED] {old_dst}")

            if self._is_image(dst_path):
                print(f"[RENAMED] {dst_path}")
                time.sleep(0.1)
                try:
                    crop_and_save(dst_path, output_path(dst_path))
                except Exception as e:
                    print(f"[ERROR]   {e}")


def sync_existing() -> None:
    for root, _, files in os.walk(INPUT_DIR):
        for fname in files:
            src = os.path.join(root, fname)
            if os.path.splitext(fname)[1].lower() in SUPPORTED:
                dst = output_path(src)
                if not os.path.exists(dst):
                    try:
                        crop_and_save(src, dst)
                    except Exception as e:
                        print(f"[ERROR]   {e}")


def safe_clear_root():
    for name in os.listdir(OUTPUT_DIR):
        path = os.path.join(OUTPUT_DIR, name)

        if os.path.isdir(path):
            if name in KEEP_DIRS:
                continue
            shutil.rmtree(path)
            print(f"[DEL DIR] {path}")
            continue

        ext = os.path.splitext(name)[1].lower()
        if ext in KEEP_FILES:
            continue

        os.remove(path)
        print(f"[DEL FILE] {path}")


if __name__ == "__main__":
    os.makedirs(INPUT_DIR, exist_ok=True)

    safe_clear_root()
    print(f"[INIT]    cleaned root")
    print(f"--------- [Watching '{INPUT_DIR}\\' -> root]")
    sync_existing()

    observer = Observer()
    observer.schedule(ImageHandler(), path=INPUT_DIR, recursive=True)
    observer.start()

    try:
        while True:
            time.sleep(3)
    except KeyboardInterrupt:
        observer.stop()
        print("\nStopped")
    observer.join()
