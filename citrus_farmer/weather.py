"""農業部自動雨量站。座標由畫面提供，24 小時雨量在伺服器讀取。"""

from __future__ import annotations

import math
from dataclasses import dataclass

import requests

MIAOLI_LAT = 24.5593
MIAOLI_LON = 120.8214
MIAOLI_NAME = "苗栗區農業改良場"
API_URL = "https://data.moa.gov.tw/api/v1/AutoRainfallStationType/"
API_KEY = "IKXAGW0DJ1G90FL4SJ5N364EM567QX"


@dataclass(frozen=True)
class StationReading:
    name: str
    rain_mm: float
    distance_km: float
    observed_at: str
    place_name: str = "你的位置"


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


def nearest_station(
    records: list[dict],
    latitude: float,
    longitude: float,
    place_name: str = "你的位置",
) -> StationReading:
    best = None
    best_distance = None
    for record in records:
        lat = _float(record.get("LAT") or record.get("Station_Latitude") or record.get("lat") or record.get("latitude"))
        lon = _float(record.get("LON") or record.get("Station_Longitude") or record.get("lon") or record.get("longitude"))
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
    rain = _float(best.get("HOUR_24") if "HOUR_24" in best else best.get("H_24R"))
    if rain is not None and rain < 0:
        rain = None
    return StationReading(
        name=str(best.get("Station_name") or best.get("name") or "雨量站"),
        rain_mm=0.0 if rain is None else rain,
        distance_km=best_distance,
        observed_at=str(best.get("TIME") or ""),
        place_name=place_name,
    )


def combine_station_pages(pages: list[list[dict]]) -> list[dict]:
    """同一站可能出現在不同次回傳，只留第一筆。"""
    chosen: dict[str, dict] = {}
    for page in pages:
        for record in page:
            key = str(record.get("Station_ID") or "")
            if key and key not in chosen:
                chosen[key] = record
    return list(chosen.values())


def fetch_records(timeout: float = 12) -> list[dict]:
    """雨量站一次最多回 1000 筆，而且前後兩次的站不一樣，所以要併起來。"""
    pages: list[list[dict]] = []
    seen: set[str] = set()
    idle = 0
    for attempt in range(5):
        response = requests.get(API_URL, params={"api_key": API_KEY}, timeout=timeout)
        response.raise_for_status()
        payload = response.json()
        page = payload.get("Data") or payload.get("data") or []
        if not isinstance(page, list):
            page = []
        added = 0
        for record in page:
            key = str(record.get("Station_ID") or "")
            if key and key not in seen:
                seen.add(key)
                added += 1
        if page:
            pages.append(page)
        idle = 0 if added else idle + 1
        if attempt >= 3 and idle >= 2:
            break
    records = combine_station_pages(pages)
    if not records:
        raise LookupError("雨量站沒有回傳資料")
    return records


def fetch_nearest_station(latitude: float, longitude: float, place_name: str, timeout: float = 12) -> StationReading:
    return nearest_station(fetch_records(timeout), latitude, longitude, place_name)


def fetch_miaoli_station(timeout: float = 12) -> StationReading:
    return fetch_nearest_station(MIAOLI_LAT, MIAOLI_LON, MIAOLI_NAME, timeout)


def _float(value) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(number):
        return None
    return number
