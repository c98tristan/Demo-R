// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBJId7oTMvdf22THEvQ34NEo7VVMGd_l4w",
  authDomain: "ramper-407103.firebaseapp.com",
  projectId: "ramper-407103",
  storageBucket: "ramper-407103.appspot.com",
  messagingSenderId: "1047857429856",
  appId: "1:1047857429856:web:bac5b52926a46bc4833205",
  measurementId: "G-5GN1Y9DD3Y",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
