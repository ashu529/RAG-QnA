import React, { useState, useRef, useEffect } from 'react';
import { Upload, MessageSquare, Send, CheckCircle, Loader2, FileText, AlertCircle, Sun, Moon, Info, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import './App.css';

const API_BASE = 'http://localhost:5000';

function App() {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [question, setQuestion] = useState('');
  
  // Initialize state from localStorage
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('rag_messages');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('rag_theme') === 'dark';
  });
  
  const [isThinking, setIsThinking] = useState(false);
  const fileInputRef = useRef(null);

  // Save messages to localStorage
  useEffect(() => {
    localStorage.setItem('rag_messages', JSON.stringify(messages));
  }, [messages]);

  // Save theme to localStorage and apply to body
  useEffect(() => {
    localStorage.setItem('rag_theme', isDarkMode ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      setMessages([]);
      localStorage.removeItem('rag_messages');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadStatus(`Ready to upload: ${selectedFile.name}`);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('Uploading and indexing...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE}/upload`, formData);
      setUploadStatus('File uploaded and indexed successfully!');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      const msg = error.response?.data?.error || error.message || 'Check if the backend is running.';
      setUploadStatus(`Upload failed: ${msg}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;

    const userMsg = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion('');
    setIsThinking(true);

    try {
      const response = await axios.post(`${API_BASE}/ask`, { question });
      // The backend now returns { answer: "...", sources: ["...", "..."] }
      const botMsg = { 
        role: 'bot', 
        content: response.data.answer,
        sources: response.data.sources || []
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error('Ask error:', error);
      const errorMsg = { role: 'bot', content: 'Error: Could not connect to the backend server.', sources: [] };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="glass-card">
      <div className="header-actions">
        <button 
          className="action-btn" 
          onClick={clearHistory}
          title="Clear Chat History"
          style={{ marginRight: '0.5rem' }}
        >
          <Trash2 size={18} />
        </button>
        <button 
          className="action-btn" 
          onClick={() => setIsDarkMode(!isDarkMode)}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <h1>📘 RAG Assistant</h1>

      {/* Upload Section */}
      <section className="upload-section">
        <div 
          className={`drop-zone ${file ? 'active' : ''}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".txt,.pdf"
            style={{ display: 'none' }}
          />
          <Upload size={40} color={file ? '#6366f1' : '#cbd5e1'} style={{ marginBottom: '1rem' }} />
          <p>{file ? file.name : 'Drag & Drop your .txt or .pdf here'}</p>
          <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>or click to browse</p>
        </div>

        {uploadStatus && (
          <div className="status-text" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.5rem',
            color: uploadStatus.includes('failed') ? '#ef4444' : '#10b981'
          }}>
            {uploadStatus.includes('successfully') ? <CheckCircle size={16} /> : uploadStatus.includes('failed') ? <AlertCircle size={16} /> : <Loader2 size={16} className="spin" />}
            {uploadStatus}
          </div>
        )}

        <button 
          className="btn-primary" 
          onClick={handleUpload} 
          disabled={!file || isUploading}
        >
          {isUploading ? 'Indexing...' : 'Upload & Index'}
        </button>
      </section>

      <hr style={{ margin: '2rem 0', opacity: 0.1 }} />

      {/* Chat Section */}
      <section className="chat-section">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '100px' }}>
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`message ${msg.role === 'user' ? 'user-message' : 'bot-message'}`}
              >
                <div>{msg.content}</div>
                
                {msg.role === 'bot' && msg.sources && msg.sources.length > 0 && (
                  <div className="sources-container">
                    <div className="sources-title">
                      <Info size={12} /> Sources Used
                    </div>
                    {msg.sources.map((source, idx) => (
                      <div key={idx} className="source-item">
                        "{source.length > 150 ? source.substring(0, 150) + '...' : source}"
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
            {isThinking && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="message bot-message"
              >
                Thinking<span className="loading-dots"></span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="chat-input-wrapper">
          <textarea 
            placeholder="Ask a question about your documents..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAsk();
              }
            }}
          />
          <button 
            className="btn-primary" 
            onClick={handleAsk}
            disabled={!question.trim() || isThinking}
            style={{ width: 'auto', position: 'absolute', bottom: '15px', right: '15px', marginTop: 0, padding: '8px 16px' }}
          >
            {isThinking ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
          </button>
        </div>
      </section>
    </div>
  );
}

export default App;
