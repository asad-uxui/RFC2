import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInAsGuest = () => signInAnonymously(auth);
export const signInWithEmail = (email: string, pass: string) => firebaseSignInWithEmailAndPassword(auth, email, pass);
export const signOut = () => auth.signOut();
