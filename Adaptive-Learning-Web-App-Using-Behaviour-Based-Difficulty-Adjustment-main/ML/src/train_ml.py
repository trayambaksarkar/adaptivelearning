import pandas as pd
import numpy as np
import joblib
import os
import json

from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_squared_error
from sklearn.model_selection import train_test_split

# XGBoost (install if not installed: pip install xgboost)
from xgboost import XGBRegressor

# Load dataset
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data_path = os.path.join(BASE_DIR, "data", "final_dataset.csv")

df = pd.read_csv(data_path)

X = df[["response_time", "correctness", "hint_used", "current_difficulty"]]

# Target
y = (
    df["current_difficulty"]
    + df["correctness"]
    - df["hint_used"]
    - (df["response_time"] > 0.6).astype(int)
)

y = np.clip(y, 1, 3)

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Save split
os.makedirs("data/splits", exist_ok=True)
np.save("data/splits/X_test.npy", X_test)
np.save("data/splits/y_test.npy", y_test)

# Define models
models = {
    "LinearRegression": LinearRegression(),
    "RandomForest": RandomForestRegressor(n_estimators=120, random_state=42),
    "XGBoost": XGBRegressor(n_estimators=150, learning_rate=0.1, random_state=42)
}

best_model = None
best_score = -np.inf
best_name = ""

results = {}

# Train & compare models
for name, model in models.items():
    print(f"\nTraining {name}...")

    model.fit(X_train, y_train)
    preds = model.predict(X_test)

    r2 = r2_score(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))

    results[name] = {
        "r2_score": float(r2),
        "rmse": float(rmse)
    }

    print(f"{name} → R2: {r2:.4f}, RMSE: {rmse:.4f}")

    # Select best model (based on R2 score)
    if r2 > best_score:
        best_score = r2
        best_model = model
        best_name = name

# ✅ Save best model
os.makedirs("models", exist_ok=True)
joblib.dump(best_model, "models/difficulty_model.pkl")

# ✅ Save metrics
os.makedirs("metrics", exist_ok=True)
with open("metrics/ml_metrics.json", "w") as f:
    json.dump(results, f, indent=4)

print(f"\n Best model selected: {best_name}")
print("ML model trained successfully")