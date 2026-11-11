from flask import Flask, jsonify, request
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd

app = Flask(__name__)
CORS(app)

MODEL_FILE = "model.pkl"
GRID_SIZE = 0.1

model = joblib.load(MODEL_FILE)


def risk_level(risk):
    if risk >= 75:
        return "CRITICAL"
    if risk >= 50:
        return "HIGH"
    if risk >= 25:
        return "MODERATE"
    return "LOW"


@app.get("/")
def home():
    return jsonify({
        "service": "SlopeGuard NER AI API",
        "status": "online"
    })


@app.post("/predict")
def predict():
    data = request.get_json(force=True)

    latitude = float(data["latitude"])
    longitude = float(data["longitude"])

    lat_cell = np.floor(latitude / GRID_SIZE) * GRID_SIZE
    lon_cell = np.floor(longitude / GRID_SIZE) * GRID_SIZE

    features = pd.DataFrame({
        "lat_cell": [lat_cell],
        "lon_cell": [lon_cell]
    })

    probability = float(model.predict_proba(features)[0, 1])
    risk = round(probability * 100)

    return jsonify({
        "risk": risk,
        "level": risk_level(risk),
        "latitude": latitude,
        "longitude": longitude,
        "model": "Random Forest",
        "basis": "Historical NER landslide spatial inventory"
    })


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
