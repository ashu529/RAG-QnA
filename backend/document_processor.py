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


def chunk_documents(documents, chunk_size=1500, overlap=300):
    """
    Chunks text with a sliding window (overlap) for better context retention.
    Tries to break on spaces to avoid cutting words in half.
    """
    chunks = []

    for doc in documents:
        start = 0
        doc_len = len(doc)

        while start < doc_len:
            end = start + chunk_size

            # If we're not at the end of the document, try to break on a space
            if end < doc_len:
                last_space = doc.rfind(' ', start, end)
                if last_space != -1 and last_space > start:
                    end = last_space

            chunk = doc[start:end].strip()
            if len(chunk) > 10: # Only add meaningful chunks
                chunks.append(chunk)

            # Move start forward, but keep an overlap
            start = end - overlap
            
            # Prevent infinite loop if no space was found and end == start
            if start <= 0 or end <= start:
                break

    return chunks
