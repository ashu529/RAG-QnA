import React, { useState, useRef, useEffect } from 'react';
import { Upload, MessageSquare, Send, CheckCircle, Loader2, Info, Plus, User, LogOut, ChevronRight, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from './firebase-config';
import ReactMarkdown from 'react-markdown';
import './App.css';

const API_BASE = import.meta.env.VITE_API_URL 
  || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000' 
    : ''); 

function App() {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoginMsg, setIsLoginMsg] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('email'); // 'email' or 'phone'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isSendingOTP, setIsSendingOTP] = useState(false);

  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [question, setQuestion] = useState('');
  
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('rag_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentSessionId, setCurrentSessionId] = useState(() => {
    return localStorage.getItem('rag_active_session') || Date.now().toString();
  });
  
  const [messages, setMessages] = useState(() => {
    const savedSessions = localStorage.getItem('rag_sessions');
    const sessionId = localStorage.getItem('rag_active_session');
    if (savedSessions && sessionId) {
      const sessList = JSON.parse(savedSessions);
      const sess = sessList.find(s => s.id === sessionId);
      return sess ? sess.messages : [];
    }
    return [];
  });
  
  const [isThinking, setIsThinking] = useState(false);
  const fileInputRef = useRef(null);
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    setSessions(prev => {
      const existingIdx = prev.findIndex(s => s.id === currentSessionId);
      let updated = [...prev];
      if (messages.length > 0) {
        if (existingIdx >= 0) {
          updated[existingIdx].messages = messages;
        } else {
          updated.push({
            id: currentSessionId,
            title: messages[0].content.substring(0, 30) + '...',
            messages: messages
          });
        }
      }
      return updated;
    });
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentSessionId]);

  useEffect(() => {
    localStorage.setItem('rag_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('rag_active_session', currentSessionId);
  }, [currentSessionId]);

  const handleAuth = async (e, isSignup = false) => {
    e.preventDefault();
    setIsLoginMsg('');
    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setShowAuthModal(false);
    } catch (error) {
      setIsLoginMsg(error.message);
    }
  };

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible'
      });
    }
  };

  const handleSendOTP = async () => {
    setIsLoginMsg('');
    setIsSendingOTP(true);
    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const confirmObj = await signInWithPhoneNumber(auth, phone, appVerifier);
      setConfirmationResult(confirmObj);
    } catch (error) {
      setIsLoginMsg(error.message);
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleVerifyOTP = async () => {
    setIsLoginMsg('');
    setIsSendingOTP(true);
    try {
      await confirmationResult.confirm(otp);
      setShowAuthModal(false);
      setConfirmationResult(null);
    } catch (error) {
      setIsLoginMsg(error.message);
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const startNewChat = () => {
    setCurrentSessionId(Date.now().toString());
    setMessages([]);
  };

  const loadSession = (id) => {
    const sess = sessions.find(s => s.id === id);
    if (sess) {
      setCurrentSessionId(id);
      setMessages(sess.messages);
    }
  };

  const performUpload = async (fileToUpload) => {
    if (!fileToUpload) return;
    setIsUploading(true);
    setUploadStatus('Uploading and indexing...');
    
    // Show a loading message in chat
    setMessages(prev => [...prev, { role: 'bot', content: `Indexing document: ${fileToUpload.name}...`, type: 'system-loading' }]);

    const formData = new FormData();
    formData.append('file', fileToUpload);

    try {
      const authHeader = user ? { Authorization: `Bearer ${await user.getIdToken()}` } : {};
      await axios.post(`${API_BASE}/upload`, formData, { headers: authHeader });
      setUploadStatus('Document indexed successfully!');
      
      setMessages(prev => prev.map(m => m.type === 'system-loading' ? { role: 'bot', content: `Successfully indexed ${fileToUpload.name}. Ready for questions.`, sources: [] } : m));
      
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      const msg = error.response?.data?.error || error.message;
      setUploadStatus(`Upload failed: ${msg}`);
      
      setMessages(prev => prev.map(m => m.type === 'system-loading' ? { role: 'bot', content: `Failed to index ${fileToUpload.name}: ${msg}`, sources: [] } : m));
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (messages.length > 0 && user) {
        performUpload(selectedFile);
      } else {
        setUploadStatus(`Ready: ${selectedFile.name}`);
      }
    }
  };

  const handleUpload = () => performUpload(file);

  const handleAsk = async () => {
    if (!question.trim()) return;

    const userMsg = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion('');
    setIsThinking(true);

    try {
      const authHeader = user ? { Authorization: `Bearer ${await user.getIdToken()}` } : {};
      const response = await axios.post(`${API_BASE}/ask`, { question }, { headers: authHeader });
      
      const botMsg = { 
        role: 'bot', 
        content: response.data.answer,
        sources: response.data.sources || []
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error('Ask error:', error);
      setMessages((prev) => [...prev, { role: 'bot', content: 'Connection Error: Please try again later.', sources: [] }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <>
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Lumina RAG</h2>
        </div>
        
        <button className="btn-new-chat" onClick={startNewChat}>
          <Plus size={18} /> New Chat
        </button>

        <div className="history-list">
          <div style={{color: 'var(--on-surface-variant)', fontSize: '0.75rem', fontWeight: 600, paddingLeft: '0.5rem', marginBottom: '0.5rem'}}>
            RECENT CHATS
          </div>
          {sessions.map(s => (
            <div 
               key={s.id} 
               className={`history-item ${s.id === currentSessionId ? 'active' : ''}`}
               onClick={() => loadSession(s.id)}
            >
              <MessageSquare size={14} style={{flexShrink: 0, marginRight:'0.5rem'}}/> 
              <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                {s.title}
              </span>
            </div>
          ))}
          {sessions.length === 0 && <div style={{fontSize: '0.8rem', padding: '0.5rem', opacity: 0.5}}>No recent chats.</div>}
        </div>

        <div className="user-profile">
          {user ? (
            <div className="auth-buttons">
              <div style={{fontSize: '0.875rem', color: 'var(--primary-dim)', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                <User size={14} style={{display:'inline', marginRight:'0.5rem'}}/> {user.email}
              </div>
              <button className="btn-auth" onClick={handleLogout} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center'}}>
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <button className="btn-primary" onClick={() => setShowAuthModal(true)} style={{marginTop: 0, padding: '0.75rem'}}>
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>

      <main className="main-content">
        {messages.length === 0 ? (
          <div className="glass-container">
            <h1 className="welcome-title">Welcome back, Curator.</h1>
            
            <div className="upload-card">
              {!user ? (
                <div 
                  className="drop-zone"
                  style={{ cursor: 'not-allowed', opacity: 0.6 }}
                  onClick={() => setShowAuthModal(true)}
                >
                  <User size={48} color="var(--primary-dim)" style={{ marginBottom: '1.5rem', opacity: 0.8 }} />
                  <p style={{fontSize: '1.1rem', fontWeight: 500}}>Authentication Required</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginTop: '0.5rem' }}>Please sign in to upload documents</p>
                </div>
              ) : (
                <div 
                  className="drop-zone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={48} color="var(--primary-dim)" style={{ marginBottom: '1.5rem', opacity: 0.8 }} />
                  <p style={{fontSize: '1.1rem', fontWeight: 500}}>Upload New Document to Knowledge Base</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginTop: '0.5rem' }}>Drop PDF or TXT to analyze</p>
                </div>
              )}

              {uploadStatus && (
                <div className="status-text" style={{ color: uploadStatus.includes('failed') ? 'var(--error)' : 'var(--primary)' }}>
                  {uploadStatus.includes('failed') ? '' : isUploading ? <Loader2 size={14} className="spin" style={{display:'inline', marginRight:'0.5rem'}}/> : <CheckCircle size={14} style={{display:'inline', marginRight:'0.5rem'}}/>}
                  {uploadStatus}
                </div>
              )}

              <button 
                className="btn-primary" 
                onClick={handleUpload} 
                disabled={!file || isUploading}
              >
                {isUploading ? 'Analyzing...' : 'Index Document'}
              </button>
            </div>
          </div>
        ) : (
          <div className="chat-container">
             <AnimatePresence>
                {messages.map((msg, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`message ${msg.role === 'user' ? 'user-message' : 'bot-message'}`}
                  >
                    <div className={`message-content ${msg.role === 'user' ? '' : 'markdown-body'}`}>
                      {msg.role === 'user' 
                        ? msg.content 
                        : <ReactMarkdown>{msg.content}</ReactMarkdown>
                      }
                    </div>
                    
                    {msg.role === 'bot' && msg.sources && msg.sources.length > 0 && (
                      <div className="sources-container">
                        <div className="sources-title">
                          <Info size={14} /> Citations
                        </div>
                        {msg.sources.map((source, idx) => (
                          <div key={idx} className="source-item">
                            <ChevronRight size={12} style={{display:'inline', verticalAlign:'middle'}}/> "{source.length > 150 ? source.substring(0, 150) + '...' : source}"
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
                    Generating insight<span className="spin" style={{display:'inline-block'}}><Loader2 size={14}/></span>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={endOfMessagesRef} />
          </div>
        )}

        <div className="input-wrapper">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".txt,.pdf"
            style={{ display: 'none' }}
          />
          <button 
             className="btn-auth" 
             style={{ padding: '0.5rem', marginRight: '0.5rem', marginBottom: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
             onClick={() => {
                if (!user) setShowAuthModal(true);
                else fileInputRef.current?.click();
             }}
             title="Upload Document"
          >
             <Paperclip size={18} />
          </button>
          <textarea 
            className="chat-input"
            placeholder="Ask a question about your knowledge base..."
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
            className="send-btn" 
            onClick={handleAsk}
            disabled={!question.trim() || isThinking}
          >
            {isThinking ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
          </button>
        </div>
      </main>

      {/* Firebase Auth Modal */}
      {showAuthModal && (
        <div className="auth-modal" onClick={() => setShowAuthModal(false)}>
          <div className="auth-card" onClick={e => e.stopPropagation()}>
            <h3>Access Control</h3>
            {isLoginMsg && <div style={{color: '#ff6e84', marginBottom: '1rem', fontSize: '0.875rem'}}>{isLoginMsg}</div>}
            
            <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem'}}>
              <button 
                className={authMode === 'email' ? 'btn-primary' : 'btn-auth'} 
                onClick={() => { setAuthMode('email'); setIsLoginMsg(''); }}
                style={{flex: 1, marginTop: 0, padding: '0.5rem'}}
              >
                Email
              </button>
              <button 
                className={authMode === 'phone' ? 'btn-primary' : 'btn-auth'} 
                onClick={() => { setAuthMode('phone'); setIsLoginMsg(''); }}
                style={{flex: 1, marginTop: 0, padding: '0.5rem'}}
              >
                Phone
              </button>
            </div>

            {authMode === 'email' ? (
              <>
                <input 
                  type="email" 
                  placeholder="Email address" 
                  className="auth-input" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
                <input 
                  type="password" 
                  placeholder="Password" 
                  className="auth-input" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  onKeyDown={e => { if (e.key === 'Enter') handleAuth(e, false) }}
                />
                <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                  <button className="btn-primary" onClick={e => handleAuth(e, false)} style={{marginTop: 0}}>Login</button>
                  <button className="btn-auth" onClick={e => handleAuth(e, true)} style={{flex: 1}}>Sign Up</button>
                </div>
              </>
            ) : (
              <>
                <div id="recaptcha-container"></div>
                {!confirmationResult ? (
                  <>
                    <input 
                      type="tel" 
                      placeholder="Phone no. (e.g., +1234567890)" 
                      className="auth-input" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                    />
                    <button className="btn-primary" onClick={handleSendOTP} disabled={isSendingOTP} style={{marginTop: '1rem'}}>
                      {isSendingOTP ? <Loader2 size={16} className="spin" /> : 'Send OTP'}
                    </button>
                  </>
                ) : (
                  <>
                    <input 
                      type="text" 
                      placeholder="Enter 6-digit OTP" 
                      className="auth-input" 
                      value={otp} 
                      onChange={e => setOtp(e.target.value)} 
                    />
                    <button className="btn-primary" onClick={handleVerifyOTP} disabled={isSendingOTP} style={{marginTop: '1rem'}}>
                      {isSendingOTP ? <Loader2 size={16} className="spin" /> : 'Verify Code'}
                    </button>
                    <button className="btn-auth" onClick={() => setConfirmationResult(null)} style={{width: '100%', marginTop: '0.5rem', padding: '0.5rem'}}>
                      Back to Phone
                    </button>
                  </>
                )}
              </>
            )}
            
          </div>
        </div>
      )}
    </>
  );
}

export default App;
