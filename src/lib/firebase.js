import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBonEk5Rko588hPG4R-JD_0l26A96ixWhY",
  authDomain: "voidchat-195fd.firebaseapp.com",
  databaseURL: "https://voidchat-195fd-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "voidchat-195fd",
  storageBucket: "voidchat-195fd.firebasestorage.app",
  messagingSenderId: "727236193817",
  appId: "1:727236193817:web:56c10bd5df32c342610488",
  measurementId: "G-47K1RFZJ9N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Auth, Realtime Database and Storage
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);
