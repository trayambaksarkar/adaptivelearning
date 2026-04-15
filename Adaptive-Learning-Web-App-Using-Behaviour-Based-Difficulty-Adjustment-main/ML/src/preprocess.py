import pandas as pd
import os

DATA_PATH = os.path.join("JunyiDataset", "Log_Problem.csv")

df = pd.read_csv(DATA_PATH)

df = df[[
    "ucid",
    "is_correct",
    "is_hint_used",
    "total_sec_taken"
]]

df.rename(columns={
    "ucid": "user_id",
    "is_correct": "correctness",
    "is_hint_used": "hint_used",
    "total_sec_taken": "response_time"
}, inplace=True)

df["correctness"] = df["correctness"].astype(int)
df["hint_used"] = df["hint_used"].astype(str).str.upper().map({"TRUE":1,"FALSE":0})
df["response_time"] = pd.to_numeric(df["response_time"], errors="coerce")

df.dropna(inplace=True)

df["response_time"] = df["response_time"] / df["response_time"].max()

user_acc = df.groupby("user_id")["correctness"].transform("mean")

def get_diff(acc):
    if acc < 0.4:
        return 1
    elif acc < 0.7:
        return 2
    else:
        return 3

df["current_difficulty"] = user_acc.apply(get_diff)

final_df = df[[
    "response_time",
    "correctness",
    "hint_used",
    "current_difficulty"
]]

os.makedirs("data", exist_ok=True)
final_df.to_csv("data/final_dataset.csv", index=False)

print("Preprocessing done")