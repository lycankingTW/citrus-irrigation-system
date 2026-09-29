"""農民版灌溉決策。日期全部寫死，不用「今天」。"""

from datetime import date

from citrus_farmer.model import IrrigationInput, calculate, effective_rain
from citrus_farmer.weather import nearest_station

FIXED = date(2026, 1, 15)


def _base(**overrides) -> IrrigationInput:
    values = dict(
        on_date=FIXED,
        plant_age=8,
        plant_density=400,
        density_level="low",
        soil_type="loam",
        root="normal",
        situation="general",
        moisture="normal",
        rainfall_mm=0,
        system="drip",
        stage_mode="fruit",
    )
    values.update(overrides)
    return IrrigationInput(**values)


def test_fruit_normal_no_rain_does_not_irrigate():
    result = calculate(_base())
    assert result.irrigate is False
    assert result.headline == "今天先不用灌"
    assert result.liters_per_plant == 0


def test_slightly_dry_one_dose_returns_under_ram():
    result = calculate(_base(moisture="dry"))
    assert result.irrigate is True
    assert result.soil_gain_mm == 10
    assert round(result.liters_per_plant) == 291
    assert round(result.tons_per_fen, 1) == 11.3
    assert result.deficit_after <= result.ram
    assert result.shortfall_mm == 0


def test_very_dry_still_one_dose_and_still_short():
    result = calculate(_base(moisture="very_dry"))
    assert result.irrigate is True
    assert result.soil_gain_mm == 10
    assert round(result.liters_per_plant) == 291
    assert result.shortfall_mm > 0
    assert result.deficit_after > result.ram


def test_sprinkler_uses_more_water_than_drip():
    drip = calculate(_base(moisture="dry", system="drip"))
    sprinkler = calculate(_base(moisture="dry", system="sprinkler"))
    assert sprinkler.liters_per_plant > drip.liters_per_plant
    assert sprinkler.tons_per_fen > drip.tons_per_fen
    assert round(sprinkler.liters_per_plant) == 364
    assert round(sprinkler.tons_per_fen, 1) == 14.1


def test_wet_waits_longer_than_normal():
    wet = calculate(_base(moisture="wet"))
    normal = calculate(_base(moisture="normal"))
    assert wet.irrigate is False
    assert normal.irrigate is False
    assert wet.days_until is not None and normal.days_until is not None
    assert wet.days_until > normal.days_until


def test_prebud_normal_does_not_recommend_a_dose():
    result = calculate(_base(stage_mode="prebud", moisture="normal"))
    assert result.irrigate is False
    assert result.stage_name == "萌芽前"
    assert result.liters_per_plant == 0
    assert round(result.liters_per_plant) != 291


def test_effective_rain_thresholds():
    assert effective_rain(2, 100) == 0
    assert effective_rain(3, 100) == 0
    held = calculate(_base(moisture="normal", rainfall_mm=10))
    assert held.effective_rain == 7


def test_second_call_does_not_read_previous_deficit():
    first = calculate(_base(moisture="very_dry"))
    second = calculate(_base(moisture="normal"))
    assert first.irrigate is True
    assert second.irrigate is False
    assert second.initial_deficit == 0.90 * second.ram
    assert second.initial_deficit != first.deficit_after


def test_hillside_normal_does_not_irrigate_and_ram_is_higher():
    general = calculate(_base(situation="general", moisture="normal"))
    hillside = calculate(_base(situation="hillside", moisture="normal"))
    assert hillside.irrigate is False
    assert hillside.ram > general.ram


def test_age_and_spacing_do_not_change_dose_liters_when_both_irrigate():
    older = calculate(_base(moisture="dry", plant_age=20, density_level="low"))
    younger = calculate(_base(moisture="dry", plant_age=8, density_level="high"))
    assert older.irrigate and younger.irrigate
    assert round(older.liters_per_plant) == round(younger.liters_per_plant) == 291


def test_nearest_station_picks_closest_record():
    records = [
        {"Station_name": "遠站", "Station_Latitude": "25.2", "Station_Longitude": "121.5", "H_24R": "8", "TIME": "t1"},
        {"Station_name": "近站", "Station_Latitude": "24.56", "Station_Longitude": "120.82", "H_24R": "1.5", "TIME": "t2"},
    ]
    station = nearest_station(records, 24.5593, 120.8214)
    assert station.name == "近站"
    assert station.rain_mm == 1.5
