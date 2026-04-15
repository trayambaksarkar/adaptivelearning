import requests
import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(BASE_DIR, ".env")
load_dotenv(env_path)

API_KEY = os.getenv("GROQ_API_KEY")

def ask_llm(prompt):
    try:
        print("API KEY VALUE:", API_KEY)
        res = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.1-8b-instant",
                "messages":[
                    {"role":"system","content":"You are a helpful tutor."},
                    {"role":"user","content":prompt}
                ],
                "temperature": 0.7
            }
        )

        if res.status_code != 200:
            return f"Groq Error: {res.text}"

        data = res.json()

        return data.get("choices",[{}])[0].get("message",{}).get("content","No response")

    except Exception as e:
        return f"Exception: {str(e)}"