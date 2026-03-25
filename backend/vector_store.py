import os
import faiss
import pickle
import numpy as np
from sentence_transformers import SentenceTransformer
from document_processor import load_documents, chunk_documents

# ---------------- PATHS ----------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
INDEX_PATH = os.path.join(DATA_DIR, "index.faiss")
CHUNKS_PATH = os.path.join(DATA_DIR, "chunks.pkl")

os.makedirs(DATA_DIR, exist_ok=True)

# ---------------- MODEL ----------------
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# ---------------- BUILD INDEX ----------------
def build_index():
    print("Loading documents...")
    documents = load_documents()
    print(f"Loaded {len(documents)} documents. Chunking...")
    chunks = chunk_documents(documents)
    print(f"Created {len(chunks)} chunks.")

    if not chunks:
        raise ValueError("No chunks found. Add documents to data/docs first.")

    print("Encoding chunks (this may take a while)...")
    embeddings = embedding_model.encode(chunks)
    print("Encoding complete. Preparing FAISS index...")
    embeddings = np.array(embeddings).astype("float32")

    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)

    print(f"Saving index to {INDEX_PATH}...")
    faiss.write_index(index, INDEX_PATH)

    print(f"Saving chunks to {CHUNKS_PATH}...")
    with open(CHUNKS_PATH, "wb") as f:
        pickle.dump(chunks, f)

    print(f"FAISS index built with {index.ntotal} chunks")


# ---------------- SEARCH ----------------
def search(query, top_k=3, distance_threshold=0.8):
    if not os.path.exists(INDEX_PATH):
        return []

    index = faiss.read_index(INDEX_PATH)

    with open(CHUNKS_PATH, "rb") as f:
        chunks = pickle.load(f)

    query_embedding = embedding_model.encode([query])
    query_embedding = np.array(query_embedding).astype("float32")

    distances, indices = index.search(query_embedding, top_k)

    results = []
    for dist, idx in zip(distances[0], indices[0]):
        # LOWER distance = MORE similar
        if idx < len(chunks) and dist < distance_threshold:
            results.append(chunks[idx])

    return results


# ---------------- TEST ----------------
if __name__ == "__main__":
    build_index()
    results = search("What is normalization in DBMS?")
    print("\nSearch results:")
    for r in results:
        print("-", r)
