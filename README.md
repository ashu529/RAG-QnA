# 🌟 Lumina RAG — AI-Powered Educational Assistant

A premium, full-stack **Retrieval-Augmented Generation (RAG)** application built for students and researchers. Upload your PDFs, ask questions, and get intelligent, structured answers — with support for 2-mark, 5-mark, and full-length exam-style responses.

---

## ✨ Features

- **🔐 Firebase Authentication** — Secure Email/Password and Phone (OTP) sign-in
- **📄 Multi-PDF Upload** — Upload multiple documents to the same knowledge base anytime using the paperclip button
- **🧠 Groq-Powered AI** — Ultra-fast responses using `llama-3.3-70b-versatile` via Groq
- **🎓 Educational Tutor Mode** — Ask for "5-mark answer", "short note", or "explain with examples" and get properly formatted responses
- **📝 Markdown Rendering** — AI responses display with proper headings, bold text, lists, tables, and code blocks
- **💬 Chat History** — All chat sessions are saved in the browser and accessible from the sidebar
- **🌌 Lumina Glass UI** — Premium glassmorphism design with dark mode, smooth animations, and Inter font

---

## 🗂️ Project Structure

```
RAG/
├── backend/                    # Python Flask API
│   ├── app.py                  # Main Flask server (upload & ask endpoints)
│   ├── document_processor.py   # PDF/TXT loading with sliding-window chunking
│   ├── vector_store.py         # FAISS index with local SentenceTransformers embeddings
│   ├── rag_pipeline.py         # Groq LLM integration & response generation
│   ├── firebase_service.py     # Firebase Admin SDK token verification
│   ├── requirements.txt        # Python dependencies
│   └── .env                    # Backend environment variables (not committed)
│
├── frontend/                   # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx             # Main app component (auth, chat, upload logic)
│   │   ├── App.css             # Lumina Glass design system & markdown styles
│   │   └── firebase-config.js  # Firebase client SDK initialization
│   ├── index.html
│   └── package.json
│
├── firebase.json               # Firebase Hosting configuration
├── firestore.rules             # Firestore security rules
└── .firebaserc                 # Firebase project alias
```

---

## 🚀 Local Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- A [Groq API Key](https://console.groq.com/) (free)
- A [Firebase Project](https://console.firebase.google.com/) with Email/Password auth enabled

---

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv testenv
.\testenv\Scripts\activate        # Windows
# source testenv/bin/activate     # Mac / Linux

# Install dependencies
pip install -r requirements.txt
```

Create `backend/.env`:
```env
GROQ_API_KEY=your_groq_api_key_here
```

Start the backend:
```bash
.\testenv\Scripts\python.exe app.py
```
The API will run at `http://localhost:5000`.

---

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
The app will run at `http://localhost:5173`.

---

## 🔧 Tech Stack

| Layer       | Technology                          |
|-------------|--------------------------------------|
| **LLM**     | Groq API (`llama-3.3-70b-versatile`) |
| **Embeddings** | SentenceTransformers (`all-MiniLM-L6-v2`) — runs locally |
| **Vector DB**  | FAISS (in-process, no server needed) |
| **Backend** | Python Flask + Flask-CORS            |
| **Frontend** | React 18 + Vite + Framer Motion     |
| **Auth**    | Firebase Authentication (Email + Phone OTP) |
| **Hosting** | Firebase Hosting                     |

---

## 🎓 How to Use

1. **Sign up / Log in** using email or phone OTP.
2. **Upload a PDF** on the welcome screen or use the 📎 paperclip button in chat.
3. **Ask questions** freely:
   - *"What is cryptography?"*
   - *"Explain RSA encryption for 5 marks."*
   - *"Give me a 2-mark answer on digital signatures."*
   - *"List tools used in forensic science with examples."*
4. **Chat history** is saved automatically in your browser sidebar.
5. **Upload more PDFs** at any time to expand the knowledge base in the same chat.

---

## 🔑 Environment Variables

### `backend/.env`
| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Your Groq API key for LLM inference |

### `frontend/.env` *(optional)*
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL (defaults to `localhost:5000` if not set) |

---

## 📦 Deployment

The frontend is configured for **Firebase Hosting**.

```bash
# Build the frontend
cd frontend && npm run build

# Deploy to Firebase
npx firebase-tools deploy --only hosting
```

> The Python backend requires a separate server (e.g., a VPS, Railway, or Render).

---

## 📄 License

MIT — Built with ❤️ for educational purposes.
