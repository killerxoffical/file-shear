import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBNC4ms6GsG7YjPLTOuyPiWBbuF8XUxVXk",
  authDomain: "telecome-9c7e0.firebaseapp.com",
  databaseURL: "https://telecome-9c7e0-default-rtdb.firebaseio.com",
  projectId: "telecome-9c7e0",
  storageBucket: "telecome-9c7e0.firebasestorage.app",
  messagingSenderId: "334926468571",
  appId: "1:334926468571:web:a36f2ab99d8fab850643fe",
  firestoreDatabaseId: "ai-studio-6afebf77-c6c3-43fe-9a44-7a31d9140dd9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "ai-studio-6afebf77-c6c3-43fe-9a44-7a31d9140dd9");
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const registerWithEmail = async (email: string, pass: string) => {
  return createUserWithEmailAndPassword(auth, email, pass);
};

export const loginWithEmail = async (email: string, pass: string) => {
  return signInWithEmailAndPassword(auth, email, pass);
};

export const resetPassword = async (email: string) => {
  return sendPasswordResetEmail(auth, email);
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

// Validate Connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or network status (operating in offline simulation).");
    }
  }
}
testConnection();
