import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB-4g5913dw5FLShdW-pDXdjIHC1qHz-W4",
  authDomain: "sehatech-519pg.firebaseapp.com",
  databaseURL: "https://sehatech-519pg-default-rtdb.firebaseio.com",
  projectId: "sehatech-519pg",
  storageBucket: "sehatech-519pg.firebasestorage.app",
  messagingSenderId: "289549478988",
  appId: "1:289549478988:web:be08211a23c1706bee58e9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const storage = getStorage(app);

export { app, auth, db, rtdb, storage };


