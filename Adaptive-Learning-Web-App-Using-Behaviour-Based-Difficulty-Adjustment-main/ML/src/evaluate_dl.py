import numpy as np
import json
import os
import matplotlib.pyplot as plt
from tensorflow import keras

# Load model
model = keras.models.load_model("models/dkt_model.h5", compile=False)
model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])

# Load test data
X_test = np.load("data/splits/X_test_dl.npy")
y_test = np.load("data/splits/y_test_dl.npy")

# Evaluate
loss, acc = model.evaluate(X_test, y_test)

metrics = {
    "loss": float(loss),
    "accuracy": float(acc)
}

os.makedirs("metrics", exist_ok=True)
with open("metrics/dl_metrics.json","w") as f:
    json.dump(metrics,f)

print("DL Metrics:", metrics)

# -----------------------------
# Plots
# -----------------------------
os.makedirs("plots", exist_ok=True)

# Prediction vs Actual
y_pred = model.predict(X_test)

plt.figure()
plt.scatter(y_test, y_pred, alpha=0.4)
plt.xlabel("Actual")
plt.ylabel("Predicted")
plt.title("DL Prediction vs Actual")
plt.savefig("plots/dl_pred_vs_actual.png")

# Accuracy & Loss dummy visualization (since no history saved here)
plt.figure()
plt.plot([acc])
plt.title("DL Accuracy")
plt.savefig("plots/dl_accuracy.png")

plt.figure()
plt.plot([loss])
plt.title("DL Loss")
plt.savefig("plots/dl_loss.png")

print("DL evaluation done")