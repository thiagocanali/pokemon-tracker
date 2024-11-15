// src/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAAujRAOTMmbNGbZR666_PXAElqXNsY5JY",
  authDomain: "pokemon-tracker-93096.firebaseapp.com",
  projectId: "pokemon-tracker-93096",
  storageBucket: "pokemon-tracker-93096.firebasestorage.app",
  messagingSenderId: "31703665183",
  appId: "1:31703665183:web:3a16bdfee87695c1e5232a",
  measurementId: "G-L08X6Y15C3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
