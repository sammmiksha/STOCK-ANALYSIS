// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";   // ✅ THIS LINE WAS MISSING

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBqKrXTTf-DJvnwno0gmrk5RNWhH6Fvbb4",
    authDomain: "stock-analysis-2f871.firebaseapp.com",
    projectId: "stock-analysis-2f871",
    storageBucket: "stock-analysis-2f871.firebasestorage.app",
    messagingSenderId: "675073839858",
    appId: "1:675073839858:web:0703e43c8a5044beb2f66b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);