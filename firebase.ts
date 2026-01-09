
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

// Initialize Firebase with the provided configuration
const firebaseConfig = {
  apiKey: "AIzaSyACJevG3EkuxT6uXBZi-F-4mZUqa9fdgts",
  authDomain: "zaber-svk.firebaseapp.com",
  projectId: "zaber-svk",
  storageBucket: "zaber-svk.firebasestorage.app",
  messagingSenderId: "333536907584",
  appId: "1:333536907584:web:394ac25f31eed5540faaa5",
  measurementId: "G-R8BC97E52J"
};

const app = firebase.initializeApp(firebaseConfig);

// Export namespaced instances
export const db = app.firestore();
export const auth = app.auth();
export const storage = app.storage();

// Auth providers
export const googleProvider = new firebase.auth.GoogleAuthProvider();
export const appleProvider = new firebase.auth.OAuthProvider('apple.com');

// SHIM: Premení v8 snapshot na v9-like objekt s metódou exists()
const wrapDocSnap = (snap: any) => ({
  exists: () => snap.exists,
  data: () => snap.data(),
  id: snap.id,
  ref: snap.ref
});

// Modular-style API wrappers with v9-like shims
export const collection = (db: any, path: string) => db.collection(path);
export const doc = (dbOrCol: any, pathOrId: string, id?: string) => {
  if (id) return dbOrCol.collection(pathOrId).doc(id);
  if (typeof dbOrCol.doc === 'function') return dbOrCol.doc(pathOrId);
  return dbOrCol.doc(pathOrId);
};

export const getDoc = async (ref: any) => {
  const snap = await ref.get();
  return wrapDocSnap(snap);
};

export const getDocs = (ref: any) => ref.get();
export const setDoc = (ref: any, data: any) => ref.set(data);
export const addDoc = (ref: any, data: any) => ref.add(data);
export const updateDoc = (ref: any, data: any) => ref.update(data);
export const writeBatch = (db: any) => db.batch();

export const onSnapshot = (ref: any, onNext: any, onError?: any) => {
  return ref.onSnapshot((snap: any) => {
    // Ak je to DocumentSnapshot (má vlastnosť exists)
    if (typeof snap.exists !== 'undefined') {
      onNext(wrapDocSnap(snap));
    } else {
      // Ak je to QuerySnapshot (má vlastnosť docs)
      onNext(snap);
    }
  }, onError);
};

// Query wrappers
export const query = (ref: any, ...constraints: any[]) => {
  let q = ref;
  for (const c of constraints) {
    if (typeof c === 'function') q = c(q);
  }
  return q;
};

export const where = (field: string, op: any, value: any) => (q: any) => q.where(field, op, value);
export const orderBy = (field: string, dir?: 'asc' | 'desc') => (q: any) => q.orderBy(field, dir || 'asc');
export const limit = (n: number) => (q: any) => q.limit(n);

// Field values
export const increment = (n: number) => firebase.firestore.FieldValue.increment(n);
export const serverTimestamp = () => firebase.firestore.FieldValue.serverTimestamp();
export const arrayUnion = (val: any) => firebase.firestore.FieldValue.arrayUnion(val);
export const arrayRemove = (val: any) => firebase.firestore.FieldValue.arrayRemove(val);

// Auth wrappers
export const signInWithEmailAndPassword = (auth: any, email: string, pass: string) => auth.signInWithEmailAndPassword(email, pass);
export const createUserWithEmailAndPassword = (auth: any, email: string, pass: string) => auth.createUserWithEmailAndPassword(email, pass);
export const onAuthStateChanged = (auth: any, callback: any) => auth.onAuthStateChanged(callback);
export const signOut = (auth: any) => auth.signOut();
export const signInWithPopup = (auth: any, provider: any) => auth.signInWithPopup(provider);

export default app;
