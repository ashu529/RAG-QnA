import os
from dotenv import load_dotenv

load_dotenv()

from flask import Flask, request, jsonify
from flask_cors import CORS

from rag_pipeline import generate_answer
from vector_store import build_index

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
CORS(app)  # Allow all origins for Netlify frontend

# Absolute path to docs folder
UPLOAD_FOLDER = os.path.join(BASE_DIR, "data", "docs")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ---------------- HEALTH CHECK ----------------
@app.route("/")
def home():
    return jsonify({"status": "RAG API is running"})

# ---------------- UPLOAD DOCUMENT ----------------
@app.route("/upload", methods=["POST"])
def upload():
    # 1. Check file exists
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    # 2. Check filename
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    # 3. Restrict file type
    if not (file.filename.endswith(".txt") or file.filename.endswith(".pdf")):
        return jsonify({"error": "Only .txt and .pdf files supported"}), 400

    # 4. Save file
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    # 5. Rebuild FAISS index
    print(f"File {file.filename} saved. Rebuilding index...")
    try:
        build_index()
        print("Index rebuilt successfully.")
    except Exception as e:
        print(f"Error rebuilding index: {e}")
        return jsonify({"error": str(e)}), 500

    return jsonify({
        "status": "File uploaded and indexed successfully",
        "filename": file.filename
    })

# ---------------- ASK QUESTION ----------------
@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()

    if not data or "question" not in data:
        return jsonify({"error": "Question is required"}), 400

    result = generate_answer(data["question"])
    return jsonify(result)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
