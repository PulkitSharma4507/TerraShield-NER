import numpy as np
import pandas as pd
import joblib

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, roc_auc_score, classification_report
from sklearn.model_selection import train_test_split

CSV_FILE = "landslides_NER_clean.csv"
MODEL_FILE = "model.pkl"
METRICS_FILE = "metrics.json"
GRID_SIZE = 0.1

# 1) Load and clean the NER landslide inventory
df = pd.read_csv(CSV_FILE)

for col in ["State", "District", "Material", "Movement_Type"]:
    df[col] = df[col].fillna("Unknown").astype(str).str.strip()

df["State"] = df["State"].str.title()

df = df.dropna(subset=["Latitude", "Longitude"])
df = df[
    df["Latitude"].between(22, 29)
    & df["Longitude"].between(88, 97)
].copy()

# 2) Convert the historical point inventory into 0.1° spatial cells.
# A cell containing one or more historical landslides = positive sample.
df["lat_cell"] = np.floor(df["Latitude"] / GRID_SIZE) * GRID_SIZE
df["lon_cell"] = np.floor(df["Longitude"] / GRID_SIZE) * GRID_SIZE

positive = (
    df.groupby(["lat_cell", "lon_cell"])
    .size()
    .reset_index(name="event_count")
)

positive = positive[["lat_cell", "lon_cell"]].copy()
positive["landslide"] = 1

# 3) Create an equal number of background cells that contain no recorded event.
lat_min = np.floor(df["Latitude"].min() / GRID_SIZE) * GRID_SIZE
lat_max = np.floor(df["Latitude"].max() / GRID_SIZE) * GRID_SIZE
lon_min = np.floor(df["Longitude"].min() / GRID_SIZE) * GRID_SIZE
lon_max = np.floor(df["Longitude"].max() / GRID_SIZE) * GRID_SIZE

lat_values = np.round(
    np.arange(lat_min, lat_max + GRID_SIZE / 2, GRID_SIZE), 10
)
lon_values = np.round(
    np.arange(lon_min, lon_max + GRID_SIZE / 2, GRID_SIZE), 10
)

all_cells = pd.MultiIndex.from_product(
    [lat_values, lon_values],
    names=["lat_cell", "lon_cell"]
).to_frame(index=False)

negative = all_cells.merge(
    positive[["lat_cell", "lon_cell"]],
    on=["lat_cell", "lon_cell"],
    how="left",
    indicator=True
)

negative = negative[
    negative["_merge"] == "left_only"
][["lat_cell", "lon_cell"]]

negative = negative.sample(
    n=len(positive),
    random_state=42
)

negative["landslide"] = 0

training_data = pd.concat(
    [positive, negative],
    ignore_index=True
)

X = training_data[["lat_cell", "lon_cell"]]
y = training_data["landslide"]

# 4) Train/test split
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

# 5) Train Random Forest
model = RandomForestClassifier(
    n_estimators=300,
    max_depth=18,
    min_samples_leaf=2,
    random_state=42,
    class_weight="balanced_subsample"
)

print("Training Random Forest...")
model.fit(X_train, y_train)

# 6) Evaluate
predictions = model.predict(X_test)
probabilities = model.predict_proba(X_test)[:, 1]

accuracy = accuracy_score(y_test, predictions)
roc_auc = roc_auc_score(y_test, probabilities)

print("\nAccuracy:", round(accuracy, 4))
print("ROC-AUC:", round(roc_auc, 4))
print("\nClassification report:\n")
print(classification_report(y_test, predictions))

# 7) Save
joblib.dump(model, MODEL_FILE)

metrics = {
    "grid_size_degrees": GRID_SIZE,
    "historical_events": int(len(df)),
    "positive_cells": int(len(positive)),
    "negative_cells_used": int(len(negative)),
    "accuracy": float(accuracy),
    "roc_auc": float(roc_auc)
}

with open(METRICS_FILE, "w", encoding="utf-8") as f:
    import json
    json.dump(metrics, f, indent=2)

print("\nSaved:", MODEL_FILE)
print("Saved:", METRICS_FILE)
