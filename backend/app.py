import os
from dotenv import load_dotenv

load_dotenv()

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from rag_pipeline import generate_answer
from vector_store import build_index

# Get the absolute path to the frontend/dist folder
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_STARS_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend", "dist")

app = Flask(__name__, static_folder=FRONTEND_STARS_DIR, static_url_path="/")
CORS(app)

# Absolute path to docs folder
UPLOAD_FOLDER = os.path.join(BASE_DIR, "data", "docs")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ---------------- SERVE FRONTEND ----------------
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")

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
