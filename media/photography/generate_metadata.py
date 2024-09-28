import json
from pathlib import Path
from datetime import datetime

from PIL import Image, ExifTags

METADATA_TO_KEEP = [
    "DateTimeOriginal",
    "ExposureTime",
    "FNumber",
    "FocalLength",
    "ISOSpeedRatings",
    "LensModel",
    "Make",
    "Model",
]


def get_metadata(path):
    with Image.open(path) as img:
        metadata = {
            ExifTags.TAGS[key]: value
            for key, value in img._getexif().items()
            if key in ExifTags.TAGS and ExifTags.TAGS[key] in METADATA_TO_KEEP
        }
        for k, v in metadata.copy().items():
            if v.__class__.__name__ == "IFDRational":
                metadata[k] = float(v)
            if k == "DateTimeOriginal":
                metadata[k] = datetime.strptime(v, "%Y:%m:%d %H:%M:%S").strftime(
                    "%Y-%m-%d"
                )

        print(metadata)
        return metadata


def generate_photography_metadata():
    photography_dir = Path(".").resolve()
    json_file = Path("photography_metadata.js")

    photograph_paths = {
        path.name: get_metadata(path)
        for path in sorted(photography_dir.iterdir(), reverse=True)
        if path.is_file() and path.suffix.lower() == ".jpg"
    }
    if not photograph_paths:
        return

    print(f"Found {len(photograph_paths)} images...")

    with json_file.open("w", encoding="utf-8") as f:
        f.write(
            f"export const photography_metadata = {json.dumps(photograph_paths, indent=2)};\n"
        )

    print("Successfully saved file names to `photography_metadata.js`")


if __name__ == "__main__":
    generate_photography_metadata()
