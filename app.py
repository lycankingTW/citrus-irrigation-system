from __future__ import annotations

import base64
from datetime import date
from pathlib import Path

import streamlit as st

from citrus_farmer.model import (
    SOIL_NAMES,
    STAGE_PRESETS,
    STAGE_SENTENCE,
    IrrigationInput,
    IrrigationResult,
    calculate,
)
from citrus_farmer.weather import fetch_miaoli_station, fetch_nearest_station

LOGO_PATH = Path(__file__).resolve().parent / "images" / "logo.png"

st.set_page_config(page_title="今天要不要灌水", page_icon="🌱", layout="centered")

SOIL_OPTIONS = [
    ("砂土", "sand"),
    ("砂壤土", "sandyLoam"),
    ("壤土", "loam"),
    ("坋壤土", "siltLoam"),
    ("黏壤土", "clayLoam"),
    ("坋黏土", "siltClay"),
    ("黏土", "clay"),
]
ROOT_OPTIONS = [("淺，約 40 公分", "shallow"), ("一般，約 60 公分", "normal"), ("深，約 90 公分", "deep")]
SITUATION_OPTIONS = [
    ("平地一般果園", "general"),
    ("土層比較淺", "shallow"),
    ("山坡地，水不夠", "hillside"),
]
MOISTURE_OPTIONS = [
    ("還濕", "wet"),
    ("普通", "normal"),
    ("有點乾", "dry"),
    ("很乾、葉子軟", "very_dry"),
]
SYSTEM_OPTIONS = [
    ("滴灌，最省水", "drip"),
    ("微噴，用水量中等", "microSprinkler"),
    ("噴灌，最耗水", "sprinkler"),
]
STAGE_OPTIONS = [("照今天自動判斷", "auto")] + [
    (preset["name"], key) for key, preset in STAGE_PRESETS.items()
]
DENSITY_OPTIONS = [("約 300 株，種得比較開", 300), ("約 400 株，常見距離", 400), ("約 600 株，種得比較密", 600), ("自己填", 0)]
def _logo_src() -> str:
    encoded = base64.b64encode(LOGO_PATH.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def _apply_theme() -> None:
    """隱藏 Streamlit 預設介面，並套上農民版的綠色版面。"""
    st.markdown(
        """
        <style>
            #MainMenu, header, footer { visibility: hidden; }
            [data-testid="stToolbar"],
            [data-testid="stDecoration"],
            [data-testid="stHeader"],
            [data-testid="stAppDeployButton"] { display: none !important; }
            [data-testid="stStatusWidget"] { visibility: hidden; }

            html, body, [data-testid="stAppViewContainer"] {
                background: #f3f6f1;
            }
            .block-container {
                max-width: 760px;
                padding-top: 0;
                padding-bottom: 3rem;
            }
            .hero {
                background: linear-gradient(160deg, #1b5e20 0%, #0d3d14 100%);
                color: white;
                margin: 0 -1rem 1.25rem;
                padding: 28px 24px 24px;
                border-radius: 0 0 28px 28px;
                display: flex;
                gap: 18px;
                align-items: center;
            }
            .hero img {
                width: 96px;
                height: 96px;
                border-radius: 50%;
                background: white;
                object-fit: cover;
                flex: 0 0 96px;
                box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
            }
            .hero .org {
                margin: 0;
                opacity: 0.88;
                font-size: 0.95rem;
                letter-spacing: 0.04em;
            }
            .hero h1 {
                margin: 4px 0 6px;
                font-size: 2rem;
                line-height: 1.25;
                color: white;
            }
            .hero .lead {
                margin: 0;
                font-size: 1.05rem;
                opacity: 0.95;
            }
            [data-testid="stVerticalBlockBorderWrapper"] {
                background: white;
                border: 1px solid #d7e3d8 !important;
                border-radius: 18px !important;
                box-shadow: 0 8px 24px rgba(27, 94, 32, 0.08);
                padding: 4px 8px 8px;
                margin-bottom: 14px;
            }
            h3, [data-testid="stHeading"] h3 {
                color: #1b5e20;
            }
            button[data-testid="stBaseButton-primary"] {
                background: #1b5e20;
                border: none;
                color: white;
                min-height: 60px;
                border-radius: 14px;
                font-size: 1.25rem;
                font-weight: 800;
            }
            button[data-testid="stBaseButton-primary"]:hover {
                background: #0d3d14;
                color: white;
            }
            button[data-testid="stBaseButton-secondary"] {
                border: 2px solid #1b5e20;
                color: #1b5e20;
                background: white;
                min-height: 48px;
                border-radius: 12px;
                font-weight: 700;
            }
            .result-card {
                border-radius: 18px;
                padding: 22px 18px;
                margin: 8px 0 16px;
            }
            .result-card.need {
                background: #fff3e0;
                border: 3px solid #e65100;
            }
            .result-card.ok {
                background: #e8f5e9;
                border: 3px solid #2e7d32;
            }
            .result-card h2 {
                margin: 0 0 8px;
                font-size: 2rem;
            }
            .result-card .figure {
                font-size: 2.6rem;
                font-weight: 800;
                line-height: 1.1;
                margin: 6px 0;
            }
            .result-card .figure span {
                font-size: 1.15rem;
                font-weight: 700;
            }
            .result-card p { margin: 8px 0 0; font-size: 1.08rem; }
            .note {
                background: #fff8e1;
                border-radius: 12px;
                padding: 10px 12px;
                margin-top: 10px;
            }
            @media (max-width: 640px) {
                .hero { flex-direction: column; align-items: flex-start; padding: 22px 18px; }
                .hero h1 { font-size: 1.7rem; }
            }
        </style>
        """,
        unsafe_allow_html=True,
    )


def _render_header() -> None:
    st.markdown(
        f"""
        <div class="hero">
            <img src="{_logo_src()}" alt="苗栗區農業改良場">
            <div>
                <p class="org">苗栗區農業改良場</p>
                <h1>今天要不要灌水</h1>
                <p class="lead">選果園狀況和今天的雨量，看每株幾公升、一分地幾噸。</p>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

_LOCATE = st.components.v2.component(
    "farmer_geolocation",
    html='<button type="button" class="locate">用我的位置讀測站</button>',
    css="""
    button.locate {
        width: 100%;
        min-height: 48px;
        border: 0;
        border-radius: 8px;
        background: #1b5e20;
        color: white;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
    }
    button.locate:disabled { opacity: 0.7; }
    """,
    js="""
    export default function(component) {
        const { setTriggerValue, parentElement } = component;
        const button = parentElement.querySelector("button.locate");
        if (!button || button.dataset.bound) {
            return;
        }
        button.dataset.bound = "1";
        button.onclick = () => {
            const label = "用我的位置讀測站";
            const finish = (payload) => {
                setTriggerValue("location", payload);
                button.disabled = false;
                button.textContent = label;
            };
            button.disabled = true;
            button.textContent = "正在取得位置…";
            if (!navigator.geolocation) {
                finish({ error: "這個瀏覽器不能定位。可以改用苗栗農改場附近的測站。" });
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => finish({
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                    error: null
                }),
                () => finish({ error: "沒有拿到位置。請允許定位，或改用苗栗農改場附近的測站。" }),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        };
    }
    """,
)


def _label(options, value):
    for label, item in options:
        if item == value:
            return label
    return options[0][0]


def _value(options, label):
    for text, item in options:
        if text == label:
            return item
    return options[0][1]


def _load_station(loader) -> None:
    try:
        st.session_state["station_reading"] = loader()
        st.session_state.pop("station_error", None)
    except Exception:
        st.session_state.pop("station_reading", None)
        st.session_state["station_error"] = "測站暫時讀不到，請改選雨量。"


def _rain_mm(choice: str, custom_mm: float, use_station: bool) -> float:
    station = st.session_state.get("station_reading")
    if use_station and station is not None:
        return station.rain_mm
    if choice == "只有一點":
        return 2
    if choice == "小雨":
        return 10
    if choice == "自己填毫米":
        return max(0.0, float(custom_mm))
    return 0


def _show_result(result: IrrigationResult) -> None:
    liters = round(result.liters_per_plant)
    trees = round(result.trees_per_fen)
    tons = f"{result.tons_per_fen:.1f}"
    sentence = STAGE_SENTENCE.get(result.stage_name, "")
    if result.irrigate:
        shortfall = ""
        if result.shortfall_mm > 0:
            shortfall = (
                f'<p class="note">灌完土還是偏乾，還差 {result.shortfall_mm:.1f} 毫米。明天再算一次。</p>'
            )
        st.markdown(
            f"""
            <div class="result-card need">
                <h2>{result.headline}</h2>
                <div class="figure">{liters} <span>公升／株</span></div>
                <div class="figure">{tons} <span>噸／分地</span></div>
                <p>{result.system_name}每株大約灌 {liters} 公升。一分地大約 {trees} 株，共 {tons} 噸。</p>
                {shortfall}
                <p>現在是{result.stage_name}。{sentence}</p>
                <p>同樣把 10 毫米的水送進土裡：滴灌最省，微噴居中，噴灌最耗水。</p>
            </div>
            """,
            unsafe_allow_html=True,
        )
    else:
        follow_up = ""
        if result.headline == "今天先不用灌" and result.days_until:
            extra = f"這幾天先假設還是「{result.stage_name}」。" if result.stage_fixed else ""
            follow_up = f"<p>如果後面沒下雨，大約 {result.days_until} 天後再來看。{extra}</p>"
        st.markdown(
            f"""
            <div class="result-card ok">
                <h2>{result.headline}</h2>
                <div class="figure">0.0 <span>噸／分地</span></div>
                {follow_up}
                <p>現在是{result.stage_name}。{sentence}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with st.expander("為什麼是這個結果"):
        rows = [
            f"今天雨量 {result.rainfall_mm:.1f} 毫米，有效雨量 {result.effective_rain:.1f} 毫米。",
            f"灌溉前耗水量 {result.deficit_before:.1f} 毫米，耗水限值 RAM {result.ram:.1f} 毫米。",
            f"進土 {result.soil_gain_mm:.0f} 毫米。",
        ]
        if result.irrigate:
            rows.append(f"灌完還差 {result.shortfall_mm:.1f} 毫米。")
        if result.stage_fixed and result.days_until and not result.irrigate:
            rows.append(f"往後天數假設時期維持在{result.stage_name}。")
        for row in rows:
            st.write("・ " + row)


def main() -> None:
    _apply_theme()
    _render_header()
    today = date.today()

    with st.container(border=True):
        st.subheader("1. 今天")
        st.write(f"今天是 {today.year}年{today.month}月{today.day}日")
        here, miaoli = st.columns(2)
        with here:
            located = _LOCATE(on_location_change=lambda: None)
        with miaoli:
            use_miaoli = st.button("改用苗栗農改場附近測站", use_container_width=True)
        if use_miaoli:
            _load_station(lambda: fetch_miaoli_station())
        location = getattr(located, "location", None) if located is not None else None
        if isinstance(location, dict):
            token = (location.get("lat"), location.get("lon"), location.get("error"))
            if st.session_state.get("location_token") != token:
                st.session_state["location_token"] = token
                if location.get("error"):
                    st.session_state["station_error"] = location["error"]
                elif location.get("lat") is not None:
                    key = (round(float(location["lat"]), 4), round(float(location["lon"]), 4))
                    st.session_state["located_key"] = key
                    _load_station(lambda: fetch_nearest_station(key[0], key[1], "你的位置"))
        station = st.session_state.get("station_reading")
        if st.session_state.get("station_error"):
            st.error(st.session_state["station_error"])
        if station is not None:
            st.info(
                f"{station.name}測站，距離{station.place_name} {station.distance_km:.1f} 公里。"
                f"24 小時雨量 {station.rain_mm:.1f} 毫米。更新時間 {station.observed_at or '測站未提供'}。"
            )

        use_station = False
        if station is not None:
            use_station = st.checkbox("這次用測站的 24 小時雨量", value=True)

        rain_choice = st.radio("今天下雨了嗎？", ["沒下雨", "只有一點", "小雨", "自己填毫米"], horizontal=True)
        custom_mm = 0.0
        if rain_choice == "自己填毫米":
            custom_mm = st.number_input("今天雨量（毫米）", min_value=0.0, max_value=500.0, value=0.0, step=0.1)
        st.caption("只有一點不到 3 毫米，幾乎不算。小雨大約 10 毫米。")

    with st.container(border=True):
        st.subheader("2. 果樹")
        stage_label = st.selectbox("現在果樹在哪個時期？", [item[0] for item in STAGE_OPTIONS])
        stage_mode = _value(STAGE_OPTIONS, stage_label)
        if stage_mode == "auto":
            preview = calculate(
                IrrigationInput(
                    on_date=today,
                    plant_age=8,
                    plant_density=400,
                    density_level="low",
                    soil_type="loam",
                    root="normal",
                    situation="general",
                    moisture="normal",
                    rainfall_mm=0,
                    system="drip",
                    stage_mode="auto",
                )
            )
            st.caption(f"依今天判斷，現在是{preview.stage_name}。如果園裡不是這個時期，請自己選。")
        else:
            st.caption(STAGE_SENTENCE.get(STAGE_PRESETS[stage_mode]["name"], ""))

        age = int(st.number_input("樹大約幾年", min_value=1, max_value=50, value=8, step=1))
        density_label = st.radio("一公頃大概幾株", [item[0] for item in DENSITY_OPTIONS])
        density = _value(DENSITY_OPTIONS, density_label)
        if density == 0:
            density = int(st.number_input("一公頃幾株", min_value=100, max_value=2000, value=400, step=10))
        density_level = "low"
        if age < 10:
            spacing = st.radio("未滿 10 年的樹，種得密還是疏？", ["比較疏", "比較密"], horizontal=True)
            density_level = "high" if spacing == "比較密" else "low"
            st.caption("這只會稍微改變幼樹每天耗水，通常不會改這一劑要灌幾公升。")

    with st.container(border=True):
        st.subheader("3. 土和果園")
        soil = _value(SOIL_OPTIONS, st.selectbox("土是哪一種", [item[0] for item in SOIL_OPTIONS], index=2))
        root = _value(ROOT_OPTIONS, st.radio("根大概多深", [item[0] for item in ROOT_OPTIONS], index=1))
        situation = _value(SITUATION_OPTIONS, st.radio("果園情況", [item[0] for item in SITUATION_OPTIONS]))
        if situation == "hillside":
            st.caption("山坡地的耗水限值設高一點，土可以再乾一些才建議灌，不是每次少灌幾公升。")
        elif situation == "shallow":
            st.caption("土層淺，耗水限值設低一點，不要讓土乾太久。")
        moisture = _value(MOISTURE_OPTIONS, st.radio("現在土摸起來", [item[0] for item in MOISTURE_OPTIONS], index=1, horizontal=True))
        st.caption("這只看你現在摸到的土。下次打開要重選，不會沿用上次算完的耗水量。不確定就選「普通」。")

    with st.container(border=True):
        st.subheader("4. 怎麼灌")
        system = _value(SYSTEM_OPTIONS, st.radio("園裡用哪一種", [item[0] for item in SYSTEM_OPTIONS]))
        st.caption("同樣把 10 毫米的水送進土裡：滴灌最省，微噴居中，噴灌最耗水。")

    if st.button("看今天要不要灌", type="primary", use_container_width=True):
        rainfall = _rain_mm(rain_choice, custom_mm, use_station and station is not None)
        result = calculate(
            IrrigationInput(
                on_date=today,
                plant_age=age,
                plant_density=float(density),
                density_level=density_level,
                soil_type=soil,
                root=root,
                situation=situation,
                moisture=moisture,
                rainfall_mm=rainfall,
                system=system,
                stage_mode=stage_mode,
            )
        )
        _show_result(result)
        st.caption(f"土壤是{SOIL_NAMES[soil]}。")


if __name__ == "__main__":
    main()
