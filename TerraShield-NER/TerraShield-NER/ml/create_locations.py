import json
import re
import numpy as np
import pandas as pd
import joblib

CSV_FILE = "landslides_NER_clean.csv"
MODEL_FILE = "model.pkl"
OUTPUT_FILE = "../data/locations.json"
GRID_SIZE = 0.1

df = pd.read_csv(CSV_FILE)

for col in ["State", "District", "Material", "Movement_Type"]:
    df[col] = df[col].fillna("Unknown").astype(str).str.strip()

df["State"] = df["State"].str.title()

df = df.dropna(subset=["Latitude", "Longitude"]).copy()

model = joblib.load(MODEL_FILE)

locations = []

for (state, district), group in df.groupby(["State", "District"]):
    lat = float(group["Latitude"].mean())
    lng = float(group["Longitude"].mean())
    historical = int(len(group))

    lat_cell = np.floor(lat / GRID_SIZE) * GRID_SIZE
    lon_cell = np.floor(lng / GRID_SIZE) * GRID_SIZE

    risk = float(
        model.predict_proba(
            pd.DataFrame({
                "lat_cell": [lat_cell],
                "lon_cell": [lon_cell]
            })
        )[0, 1] * 100
    )

    risk = round(risk)

    if risk >= 75:
        level = "CRITICAL"
    elif risk >= 50:
        level = "HIGH"
    elif risk >= 25:
        level = "MODERATE"
    else:
        level = "LOW"

    slug = re.sub(
        r"[^a-z0-9]+",
        "-",
        f"{state}-{district}".lower()
    ).strip("-")

    locations.append({
        "id": slug,
        "name": str(district),
        "state": str(state),
        "district": str(district),
        "lat": round(lat, 6),
        "lng": round(lng, 6),
        "historical": historical,
        "aiRisk": risk,
        "level": level
    })

locations.sort(key=lambda x: (x["state"], x["name"]))

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(locations, f, indent=2, ensure_ascii=False)

print(f"Created {OUTPUT_FILE}")
print(f"District locations: {len(locations)}")
