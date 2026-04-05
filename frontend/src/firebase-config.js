import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCVHDfbnfrBvUtRzCAScEE6nw5EQaS7EBs",
  authDomain: "premium-rag-assistant.firebaseapp.com",
  projectId: "premium-rag-assistant",
  storageBucket: "premium-rag-assistant.firebasestorage.app",
  messagingSenderId: "1030257771646",
  appId: "1:1030257771646:web:644fc7e149953148dc042f",
  measurementId: "G-ZQMJKQNNH4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
