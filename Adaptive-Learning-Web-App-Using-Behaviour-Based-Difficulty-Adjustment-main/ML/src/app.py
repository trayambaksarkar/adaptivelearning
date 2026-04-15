from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import joblib
import json
import os
from tensorflow.keras.models import load_model
from .groq_service import ask_llm

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],  # VERY IMPORTANT (enables OPTIONS)
    allow_headers=["*"],
)

# Load models safely
try:
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    ml_path = os.path.join(BASE_DIR, "models", "difficulty_model.pkl")
    dl_path = os.path.join(BASE_DIR, "models", "dkt_model.h5")

    ml = joblib.load(ml_path)
    dl = load_model(dl_path, compile=False)
except Exception as e:
    ml = None
    print("Error loading ML model:", e)

# try:
#     dl = keras.models.load_model("models/dkt_model.h5", compile=False)
# except Exception as e:
#     dl = None
#     print("Error loading DL model:", e)


# Root route
@app.get("/")
def home():
    return {"message": "API is running successfully"}


# Predict difficulty (uses BEST model automatically)
@app.post("/predict-difficulty")
def predict(data: dict):
    try:
        required = [
            "response_time",
            "correctness",
            "hint_used",
            "current_difficulty"
        ]

        for key in required:
            if key not in data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing field: {key}"
                )

        if ml is None:
            raise HTTPException(
                status_code=500,
                detail="ML model not loaded"
            )

        X = np.array([
            [
                data["response_time"],
                data["correctness"],
                data["hint_used"],
                data["current_difficulty"]
            ]
        ])

        prediction = ml.predict(X)[0]
        prediction = int(round(prediction))
        prediction = max(1, min(3, prediction))
        return {
            "difficulty": float(prediction),
            "model_used": type(ml).__name__
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Predict knowledge
@app.post("/predict-knowledge")
def knowledge(data: dict):
    try:
        if "history" not in data:
            raise HTTPException(
                status_code=400,
                detail="Missing field: history"
            )

        if dl is None:
            raise HTTPException(
                status_code=500,
                detail="DL model not loaded"
            )

        history = data["history"]

        if not isinstance(history, list):
            raise HTTPException(
                status_code=400,
                detail="history must be a list"
            )

        X = np.array(history).reshape(1, -1, 3)

        prediction = dl.predict(X)[0][0]

        return {"knowledge": float(prediction)}

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# AI explanation
@app.post("/ai-explain")
def explain(data: dict):
    try:
        required = [
            "question",
            "student_answer",
            "correct_answer",
            "topic"
        ]

        for key in required:
            if key not in data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing field: {key}"
                )

        prompt = f"""
You are an expert tutor helping a student learn.

Question: {data['question']}
Student Answer: {data['student_answer']}
Correct Answer: {data['correct_answer']}
Topic: {data['topic']}

Give a structured response in EXACT format:

1. First line:
- If correct → "✅ Correct Answer"
- If wrong → "❌ Incorrect Answer"

2. Then:
- Explain WHY the student's answer is correct or wrong

3. Then:
- Explain the correct concept in simple and clear terms

4. Then:
- Give a short real-world or exam-style example

5. Then:
- Give a quick tip or memory trick (very short)

6. Finally:
- Give a 1-line takeaway


Keep it:
- Simple
- Structured
- Student-friendly
- No long paragraphs
- Use bullet points where helpful
"""

        response = ask_llm(prompt)

        return {
    "explanation": response
}

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ML metrics
@app.get("/ml-metrics")
def ml_metrics():
    try:
        path = "metrics/ml_metrics.json"

        if not os.path.exists(path):
            raise HTTPException(
                status_code=404,
                detail="ML metrics file not found"
            )

        with open(path, "r") as f:
            return json.load(f)

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# DL metrics
@app.get("/dl-metrics")
def dl_metrics():
    try:
        path = "metrics/dl_metrics.json"

        if not os.path.exists(path):
            raise HTTPException(
                status_code=404,
                detail="DL metrics file not found"
            )

        with open(path, "r") as f:
            return json.load(f)

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))