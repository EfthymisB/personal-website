import sys
from pathlib import Path
from PIL import Image
from PIL.ExifTags import GPSTAGS, TAGS


def key_from_value(dict, value):
    for k, v in dict.items():
        if v == value:
            return k


def decimal_to_dms(decimal):
    degrees = int(decimal)
    remainder = abs(decimal - degrees) * 60
    minutes = int(remainder)
    seconds = (remainder - minutes) * 60
    return (abs(degrees), minutes, seconds)


def add_gps_info(image_path, latitude, longitude):
    dms_lat = decimal_to_dms(abs(latitude))
    lat_ref = "N" if latitude >= 0 else "S"

    dms_lon = decimal_to_dms(abs(longitude))
    lon_ref = "E" if longitude >= 0 else "W"

    gps_info = {
        key_from_value(GPSTAGS, "GPSVersionID"): b"\x02\x02\x00\x00",
        key_from_value(GPSTAGS, "GPSLatitudeRef"): lat_ref.encode("utf-8"),
        key_from_value(GPSTAGS, "GPSLatitude"): dms_lat,
        key_from_value(GPSTAGS, "GPSLongitudeRef"): lon_ref.encode("utf-8"),
        key_from_value(GPSTAGS, "GPSLongitude"): dms_lon,
    }

    img = Image.open(image_path)
    exif_data = img.getexif()

    exif_data[key_from_value(TAGS, "GPSInfo")] = gps_info

    img.save(image_path, exif=exif_data.tobytes())
    print(f"GPS info added to {image_path}")


def main():
    if len(sys.argv) != 4:
        print("Usage: python my_script.py <longitude> <latitude> <image_path>")
        sys.exit(1)

    lat = float(sys.argv[1])
    lon = float(sys.argv[2])
    image_path = Path(sys.argv[3])

    add_gps_info(image_path, lat, lon)


if __name__ == "__main__":
    main()
