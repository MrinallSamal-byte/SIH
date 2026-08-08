"""Extracts and verifies GPS + timestamp EXIF metadata from claim photos."""

from __future__ import annotations

import io
import math
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

import piexif
from PIL import Image

MAX_GPS_DISTANCE_KM = 0.5

@dataclass
class ExifResult:
    gps_lat: Optional[float]
    gps_lng: Optional[float]
    timestamp: Optional[datetime]
    camera_make: Optional[str]
    camera_model: Optional[str]
    gps_verified: bool
    timestamp_verified: bool

def _dms_to_decimal(dms_tuple, ref: bytes) -> Optional[float]:
    """Convert EXIF DMS rational tuple → signed decimal degrees."""
    try:
        degrees   = dms_tuple[0][0] / dms_tuple[0][1]
        minutes   = dms_tuple[1][0] / dms_tuple[1][1]
        seconds   = dms_tuple[2][0] / dms_tuple[2][1]
        decimal   = degrees + minutes / 60 + seconds / 3600
        if ref in (b"S", b"W"):
            decimal = -decimal
        return decimal
    except (IndexError, ZeroDivisionError, TypeError):
        return None

def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in kilometres."""
    R = 6371.0
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    Δφ = math.radians(lat2 - lat1)
    Δλ = math.radians(lng2 - lng1)
    a = math.sin(Δφ / 2) ** 2 + math.cos(φ1) * math.cos(φ2) * math.sin(Δλ / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def _parse_exif_datetime(raw: bytes) -> Optional[datetime]:
    """Parse EXIF datetime string b'YYYY:MM:DD HH:MM:SS'."""
    try:
        return datetime.strptime(raw.decode("ascii", errors="replace"), "%Y:%m:%d %H:%M:%S")
    except (ValueError, AttributeError):
        return None

def extract_and_verify(
    image_bytes: bytes,
    claimed_lat: float,
    claimed_lng: float,
    disaster_cutoff: datetime,
) -> ExifResult:
    """Parse EXIF from *image_bytes* and verify GPS + timestamp."""
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    timestamp: Optional[datetime] = None
    camera_make: Optional[str] = None
    camera_model: Optional[str] = None

    try:
        exif_dict = piexif.load(image_bytes)

        gps_data = exif_dict.get("GPS", {})
        if gps_data:
            lat_dms = gps_data.get(piexif.GPSIFD.GPSLatitude)
            lat_ref = gps_data.get(piexif.GPSIFD.GPSLatitudeRef)
            lng_dms = gps_data.get(piexif.GPSIFD.GPSLongitude)
            lng_ref = gps_data.get(piexif.GPSIFD.GPSLongitudeRef)
            if lat_dms and lat_ref and lng_dms and lng_ref:
                gps_lat = _dms_to_decimal(lat_dms, lat_ref)
                gps_lng = _dms_to_decimal(lng_dms, lng_ref)

        zeroth = exif_dict.get("0th", {})
        exif_ifd = exif_dict.get("Exif", {})
        raw_dt = (
            exif_ifd.get(piexif.ExifIFD.DateTimeOriginal)
            or zeroth.get(piexif.ImageIFD.DateTime)
        )
        if raw_dt:
            timestamp = _parse_exif_datetime(raw_dt)

        make_raw  = zeroth.get(piexif.ImageIFD.Make)
        model_raw = zeroth.get(piexif.ImageIFD.Model)
        camera_make  = make_raw.decode("utf-8",  errors="replace").strip("\x00") if make_raw  else None
        camera_model = model_raw.decode("utf-8", errors="replace").strip("\x00") if model_raw else None

    except Exception:
        pass

    gps_verified = False
    if gps_lat is not None and gps_lng is not None:
        dist = _haversine_km(gps_lat, gps_lng, claimed_lat, claimed_lng)
        gps_verified = dist <= MAX_GPS_DISTANCE_KM

    timestamp_verified = False
    if timestamp is not None:
        timestamp_verified = timestamp >= disaster_cutoff

    return ExifResult(
        gps_lat=gps_lat,
        gps_lng=gps_lng,
        timestamp=timestamp,
        camera_make=camera_make,
        camera_model=camera_model,
        gps_verified=gps_verified,
        timestamp_verified=timestamp_verified,
    )
