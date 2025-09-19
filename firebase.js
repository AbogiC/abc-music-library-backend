// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCvUMSnmjWuHHwMgam_2oMlm6Xy7ZnsuO0",
  authDomain: "abc-music-library-cd1c3.firebaseapp.com",
  projectId: "abc-music-library-cd1c3",
  storageBucket: "abc-music-library-cd1c3.firebasestorage.app",
  messagingSenderId: "431888700003",
  appId: "1:431888700003:web:e0331d0ec8bd9d0bab5e56",
  measurementId: "G-K94PFKCJ99",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
