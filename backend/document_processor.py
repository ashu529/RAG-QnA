import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOCS_PATH = os.path.join(BASE_DIR, "data", "docs")

def load_documents():
    documents = []

    if not os.path.exists(DOCS_PATH):
        print("Docs folder not found:", DOCS_PATH)
        return documents

    for filename in os.listdir(DOCS_PATH):
        file_path = os.path.join(DOCS_PATH, filename)

        if filename.endswith(".txt"):
            with open(file_path, "r", encoding="utf-8") as f:
                documents.append(f.read())
        elif filename.endswith(".pdf"):
            import pypdf
            reader = pypdf.PdfReader(file_path)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            documents.append(text)

    return documents


def chunk_documents(documents, chunk_size=300):
    chunks = []

    for doc in documents:
        for i in range(0, len(doc), chunk_size):
            chunks.append(doc[i:i + chunk_size])

    return chunks
