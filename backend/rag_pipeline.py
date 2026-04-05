import os
from dotenv import load_dotenv
from vector_store import search
from groq import Groq

load_dotenv()

# Configuration for Groq
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if GROQ_API_KEY:
    client = Groq(api_key=GROQ_API_KEY)
else:
    client = None
    print("WARNING: GROQ_API_KEY is missing from .env")

# We use the fast versatile model from Groq
MODEL = "llama-3.3-70b-versatile"

def generate_answer(question):
    retrieved_chunks = search(question, top_k=4)

    if not retrieved_chunks:
        return {
            "answer": "I don't have enough information to answer that question based on the provided documents.",
            "sources": []
        }

    combined_context = "\n\n".join(retrieved_chunks).strip()

    if len(combined_context) < 50:
        return {
            "answer": "The uploaded documents do not contain sufficient information to answer this question.",
            "sources": []
        }

    prompt = f"""
You are an expert AI tutor and educational assistant. 
Your primary source of truth is the provided context from the user's uploaded documents.
However, you are explicitly encouraged to use your broader AI knowledge to confidently explain topics, structure answers for exams (e.g., 'for 5 marks', 'short answer', etc.), provide examples, and elaborate on the context to help the student learn effectively.
If the document context does not perfectly contain the full answer, seamlessly use your own knowledge to help the student, but briefly clarify what the document originally mentioned.

Context:
{combined_context}

Question:
{question}
"""

    if not client:
        return {
            "answer": "Error: Groq API key is missing. Please add GROQ_API_KEY to the backend/.env file.",
            "sources": []
        }

    try:
        print(f"Generating answer with model: {MODEL}...")
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert educational AI tutor."
                },
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model=MODEL,
            temperature=0.5, # Increased for educational creativity filtering
        )
        
        answer = chat_completion.choices[0].message.content.strip()
        return {
            "answer": answer,
            "sources": retrieved_chunks
        }
            
    except Exception as e:
        print(f"Error with model {MODEL}: {e}")
        return {
            "answer": f"I encountered an error while processing your request. Please try again later. Error details: {str(e)}",
            "sources": []
        }
