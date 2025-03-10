import json
import urllib.request

from datetime import datetime
from pathlib import Path
from time import sleep

from PIL import Image
from PIL.ExifTags import GPSTAGS, TAGS

METADATA_TO_KEEP = [
    "DateTimeOriginal",
    "ExposureTime",
    "FNumber",
    "FocalLength",
    "GPSInfo",
    "ISOSpeedRatings",
    "LensModel",
    "Make",
    "Model",
]


def key_from_value(dict, value):
    for k, v in dict.items():
        if v == value:
            return k


def dms_to_decimal(ref, dms):
    decimal = dms[0] + dms[1] / 60.0 + dms[2] / 3600.0
    return -decimal if ref in ("S", "W") else decimal


def get_location_geocode_xyz_from_gps_info(gps_info):
    """Get clean city/town using Geocode.xyz API (free, no API key required)"""

    print("  Getting location from Geocode.xyz API...")

    latitude = dms_to_decimal(
        gps_info[key_from_value(GPSTAGS, "GPSLatitudeRef")],
        gps_info[key_from_value(GPSTAGS, "GPSLatitude")],
    )
    longtitude = dms_to_decimal(
        gps_info[key_from_value(GPSTAGS, "GPSLongitudeRef")],
        gps_info[key_from_value(GPSTAGS, "GPSLongitude")],
    )
    req = urllib.request.Request(f"https://geocode.xyz/{latitude},{longtitude}?json=1")

    i = 0
    while i < 8:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode("utf-8"))
            if "Throttled" not in data["city"]:
                break
        i += 1
        sleep(1.1)
        print(f"    Waiting for Geocode.xyz API... ({i}/8)")
    else:
        print("    Failed to get location from Geocode.xyz API.")
        return "Somewhere"

    return list(map(str.strip, data.get("region").split(",")))


def get_metadata(path):
    print(f"Processing {path}...")
    with Image.open(path) as img:
        metadata = dict()
        for key, value in img._getexif().items():
            if key not in TAGS or TAGS[key] not in METADATA_TO_KEEP:
                continue

            tag = TAGS[key]
            if tag == "GPSInfo":
                metadata[tag] = get_location_geocode_xyz_from_gps_info(value)
                continue

            metadata[tag] = value

        for k, v in metadata.copy().items():
            if v.__class__.__name__ == "IFDRational":
                metadata[k] = float(v)
            if k == "DateTimeOriginal":
                metadata[k] = datetime.strptime(v, "%Y:%m:%d %H:%M:%S").strftime(
                    "%Y-%m-%d"
                )

        print(f"  {metadata}")
        return metadata


def generate_photography_metadata():
    photography_dir = Path(".").resolve()
    json_file = Path("photography_metadata.js")

    photograph_data_per_path = {
        path.name: get_metadata(path)
        for path in sorted(photography_dir.iterdir(), reverse=True)
        if path.is_file() and path.suffix.lower() == ".jpg"
    }
    if not photograph_data_per_path:
        return

    print(f"Processing {len(photograph_data_per_path)} images...")

    with json_file.open("w", encoding="utf-8") as f:
        f.write(
            f"export const photography_metadata = {json.dumps(photograph_data_per_path, indent=2)};\n"
        )

    print(
        f"Successfully extracted metadata for {len(photograph_data_per_path)} images in `photography_metadata.js`"
    )


if __name__ == "__main__":
    generate_photography_metadata()
