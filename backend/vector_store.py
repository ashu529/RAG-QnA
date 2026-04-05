import os
import faiss
import pickle
import numpy as np
from dotenv import load_dotenv
from document_processor import load_documents, chunk_documents

# Use a lightweight local embedding model instead of Gemini to avoid API keys
from sentence_transformers import SentenceTransformer

load_dotenv()

# ---------------- PATHS ----------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
INDEX_PATH = os.path.join(DATA_DIR, "index.faiss")
CHUNKS_PATH = os.path.join(DATA_DIR, "chunks.pkl")

os.makedirs(DATA_DIR, exist_ok=True)

# ---------------- MODEL ----------------
# We use a very small, fast model to prevent memory issues.
print("Loading local embedding model...")
embedder = SentenceTransformer('all-MiniLM-L6-v2')

def get_embeddings(texts):
    """Fetches embeddings entirely locally."""
    print(f"Generating embeddings for {len(texts)} chunks...")
    embeddings = embedder.encode(texts, convert_to_numpy=True)
    return embeddings

# ---------------- BUILD INDEX ----------------
def build_index():
    print("Loading documents...")
    documents = load_documents()
    print(f"Loaded {len(documents)} documents. Chunking...")
    chunks = chunk_documents(documents)
    print(f"Created {len(chunks)} chunks.")

    if not chunks:
        raise ValueError("No chunks found. Add documents to data/docs first.")

    print("Encoding chunks via Gemini (cloud)...")
    embeddings = get_embeddings(chunks)
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
def search(query, top_k=4): 
    if not os.path.exists(INDEX_PATH):
        return []

    index = faiss.read_index(INDEX_PATH)

    with open(CHUNKS_PATH, "rb") as f:
        chunks = pickle.load(f)

    # Embed query locally
    try:
        query_embedding = embedder.encode([query], convert_to_numpy=True).astype("float32")
    except Exception as e:
        print(f"Query embedding error: {e}")
        return []

    distances, indices = index.search(query_embedding, top_k)

    results = []
    # Relaxed search logic: just return top_k to let the LLM filter
    for dist, idx in zip(distances[0], indices[0]):
        if idx < len(chunks):
            results.append(chunks[idx])

    return results

if __name__ == "__main__":
    build_index()
    results = search("What is normalization in DBMS?")
    print("\nSearch results:")
    for r in results:
        print("-", r)
