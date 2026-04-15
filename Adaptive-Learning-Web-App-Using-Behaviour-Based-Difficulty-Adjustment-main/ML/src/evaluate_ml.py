import numpy as np
import pandas as pd
import joblib
import json
import os
import matplotlib.pyplot as plt
from sklearn.metrics import mean_absolute_error, r2_score

# Load model
model = joblib.load("models/difficulty_model.pkl")

# Load test data
X_test = np.load("data/splits/X_test.npy")
y_test = np.load("data/splits/y_test.npy")

# Predict
y_pred = model.predict(X_test)

# -----------------------------
# Metrics
# -----------------------------
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

metrics = {
    "MAE": float(mae),
    "R2": float(r2)
}

os.makedirs("metrics", exist_ok=True)
with open("metrics/ml_metrics.json","w") as f:
    json.dump(metrics,f)

print("ML Metrics:", metrics)

# -----------------------------
# Plots
# -----------------------------
os.makedirs("plots", exist_ok=True)

# Prediction vs Actual
plt.figure()
plt.scatter(y_test, y_pred, alpha=0.4)
plt.xlabel("Actual")
plt.ylabel("Predicted")
plt.title("ML Prediction vs Actual")
plt.savefig("plots/ml_pred_vs_actual.png")

# Feature importance
feature_names = ["response_time","correctness","hint_used","current_difficulty"]
importances = model.feature_importances_

plt.figure()
plt.barh(feature_names, importances)
plt.title("ML Feature Importance")
plt.savefig("plots/ml_feature_importance.png")

print("ML evaluation done")