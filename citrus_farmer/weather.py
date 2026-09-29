"""農業部自動氣象站。只在伺服器讀取，不做瀏覽器定位。"""

from __future__ import annotations

import math
from dataclasses import dataclass

import requests

MIAOLI_LAT = 24.5593
MIAOLI_LON = 120.8214
MIAOLI_NAME = "苗栗區農業改良場"
API_URL = "https://data.moa.gov.tw/api/v1/AutoWeatherStationType/"
API_KEY = "IKXAGW0DJ1G90FL4SJ5N364EM567QX"


@dataclass(frozen=True)
class StationReading:
    name: str
    rain_mm: float
    distance_km: float
    observed_at: str


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def nearest_station(records: list[dict], latitude: float, longitude: float) -> StationReading:
    best = None
    best_distance = None
    for record in records:
        lat = _float(record.get("Station_Latitude") or record.get("lat") or record.get("latitude"))
        lon = _float(record.get("Station_Longitude") or record.get("lon") or record.get("longitude"))
        if lat is None or lon is None:
            continue
        distance = haversine_km(latitude, longitude, lat, lon)
        if distance >= 500:
            continue
        if best_distance is None or distance < best_distance:
            best = record
            best_distance = distance
    if best is None or best_distance is None:
        raise LookupError("附近沒有測站")
    rain = _float(best.get("H_24R"))
    return StationReading(
        name=str(best.get("Station_name") or best.get("name") or "農業氣象站"),
        rain_mm=0.0 if rain is None else rain,
        distance_km=best_distance,
        observed_at=str(best.get("TIME") or ""),
    )


def fetch_miaoli_station(timeout: float = 12) -> StationReading:
    response = requests.get(API_URL, params={"api_key": API_KEY}, timeout=timeout)
    response.raise_for_status()
    payload = response.json()
    records = payload.get("Data") or payload.get("data") or []
    if not isinstance(records, list) or not records:
        raise LookupError("氣象站沒有回傳資料")
    return nearest_station(records, MIAOLI_LAT, MIAOLI_LON)


def _float(value) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(number):
        return None
    return number
