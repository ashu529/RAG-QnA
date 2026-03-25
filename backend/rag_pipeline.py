import os
import requests
from dotenv import load_dotenv
from vector_store import search

load_dotenv()

# Configuration for OpenRouter
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
# We use a list of free models for fallback redundancy
MODELS = [
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemini-2.0-flash-exp:free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "microsoft/phi-3-medium-128k-instruct:free",
    "qwen/qwen-2-72b-instruct:free",
    "deepseek/deepseek-chat:free",
    "cognitivecomputations/dolphin-mistral-24b-venice-edition:free"
]

def generate_answer(question):
    retrieved_chunks = search(question, top_k=3)

    if not retrieved_chunks:
        return {
            "answer": "I don't know. No relevant information found in the uploaded documents.",
            "sources": []
        }

    combined_context = " ".join(retrieved_chunks).strip()

    if len(combined_context) < 100:
        return {
            "answer": "I don't know. The uploaded documents do not contain this information.",
            "sources": []
        }

    prompt = f"""
You are a strict RAG assistant.
Answer ONLY using the context below.
If the answer is not clearly present, say "I don't know".

Context:
{combined_context}

Question:
{question}
"""

    if not OPENROUTER_API_KEY or OPENROUTER_API_KEY == "your_openrouter_api_key_here":
        return {
            "answer": "Error: OpenRouter API key is missing. Please paste your key into the backend/.env file.",
            "sources": []
        }

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "http://localhost:5000",
        "X-Title": "Local RAG App",
        "Content-Type": "application/json"
    }

    last_error = "Unknown error"
    
    for model in MODELS:
        payload = {
            "model": model,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        
        try:
            print(f"Trying model: {model}...")
            response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                answer = data["choices"][0]["message"]["content"].strip()
                return {
                    "answer": answer,
                    "sources": retrieved_chunks
                }
            
            elif response.status_code == 429:
                print(f"Model {model} is rate limited. Trying next...")
                last_error = "Rate limit hit for all free models."
                continue
            else:
                print(f"Model {model} failed with status {response.status_code}: {response.text}")
                last_error = f"API error {response.status_code}"
                continue
                
        except Exception as e:
            print(f"Error with model {model}: {e}")
            last_error = str(e)
            continue

    return {
        "answer": f"I encountered an error after trying multiple AI models. Likely a temporary rate limit on free models. Error: {last_error}",
        "sources": []
    }
