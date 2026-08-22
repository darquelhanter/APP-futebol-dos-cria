import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { Pelada, Player, NotificationLog } from '../types';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth Instance
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Firestore Instance (using named database if present, otherwise default)
export const db = firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId)
  : getFirestore(app);

// Authentication Functions
export const loginWithGoogle = async (): Promise<FirebaseUser | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      await saveUserProfile(result.user);
      return result.user;
    }
    return null;
  } catch (error: any) {
    console.error('Google Sign In Error (Popup):', error);
    // If popup was blocked or in restrictive mobile iframe/webview, try redirect
    if (
      error.code === 'auth/popup-blocked' ||
      error.code === 'auth/cancelled-popup-request' ||
      error.code === 'auth/operation-not-supported-in-this-environment'
    ) {
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectError) {
        console.error('Google Sign In Error (Redirect):', redirectError);
        throw redirectError;
      }
    } else {
      throw error;
    }
    return null;
  }
};

export const checkRedirectLogin = async (): Promise<FirebaseUser | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      await saveUserProfile(result.user);
      return result.user;
    }
  } catch (error) {
    console.error('Redirect result check error:', error);
  }
  return null;
};

export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
};

export const subscribeToAuth = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      await saveUserProfile(user);
    }
    callback(user);
  });
};

export const saveUserProfile = async (user: FirebaseUser) => {
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        uid: user.uid,
        displayName: user.displayName || 'Jogador',
        email: user.email,
        photoURL: user.photoURL,
        lastLogin: Timestamp.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not save user profile to firestore:', err);
  }
};

// Firestore Sync for Peladas & Players
export interface CloudSyncResult {
  success: boolean;
  error?: string;
}

export const syncPeladaToCloud = async (pelada: Pelada): Promise<CloudSyncResult> => {
  try {
    const docRef = doc(db, 'peladas', pelada.id);
    await setDoc(docRef, { ...pelada, updatedAt: Timestamp.now() }, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.warn('Sync pelada error:', err);
    return { success: false, error: err?.message || 'Erro ao sincronizar pelada com a nuvem.' };
  }
};

export const deletePeladaFromCloud = async (peladaId: string): Promise<CloudSyncResult> => {
  try {
    const docRef = doc(db, 'peladas', peladaId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: any) {
    console.warn('Delete pelada from cloud error:', err);
    return { success: false, error: err?.message || 'Erro ao excluir pelada da nuvem.' };
  }
};

export const syncAllPeladasToCloud = async (peladas: Pelada[]): Promise<CloudSyncResult> => {
  for (const p of peladas) {
    const result = await syncPeladaToCloud(p);
    if (!result.success) {
      return result;
    }
  }
  return { success: true };
};

// Sync individual player document as well as the global roster
export const syncPlayerProfileToCloud = async (player: Player) => {
  try {
    const docRef = doc(db, 'players', player.id);
    await setDoc(docRef, { ...player, updatedAt: Timestamp.now() }, { merge: true });
  } catch (err) {
    console.warn('Sync individual player profile error:', err);
  }
};

// Must be called whenever a player is removed — subscribeToCloudPlayers merges
// this doc back in on every snapshot, so leaving it behind would resurrect a
// deleted player the next time anyone's roster reconciles.
export const deletePlayerProfileFromCloud = async (playerId: string): Promise<CloudSyncResult> => {
  try {
    await deleteDoc(doc(db, 'players', playerId));
    return { success: true };
  } catch (err: any) {
    console.warn('Delete player profile error:', err);
    return { success: false, error: err?.message || 'Erro ao excluir jogador da nuvem.' };
  }
};

export const syncPlayersToCloud = async (players: Player[]) => {
  try {
    const docRef = doc(db, 'app_data', 'players_collection');
    await setDoc(docRef, { players, updatedAt: Timestamp.now() }, { merge: true });

    // Also sync each player to /players/{playerId} for direct discovery
    for (const p of players) {
      await syncPlayerProfileToCloud(p);
    }
  } catch (err) {
    console.warn('Sync players error:', err);
  }
};

// Real-time listener for Peladas
export const subscribeToCloudPeladas = (callback: (peladas: Pelada[]) => void) => {
  const q = collection(db, 'peladas');
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Pelada[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as Pelada);
      });
      // Sort by date/created if present
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      callback(list);
    },
    (err) => {
      console.warn('Peladas snapshot listener error:', err);
    }
  );
};

// Real-time listener for Players Collection.
//
// The roster is stored two ways: one document (app_data/players_collection)
// holding the whole array, and one document per player under /players. Any
// client syncing with an incomplete local roster only overwrites the array
// field, so the individual documents are the safety net when that happens
// (see syncPlayersToCloud). This listener always merges both sources —
// individual docs win on conflict, since they can only be more complete,
// never staler — instead of trusting the array doc alone.
export const subscribeToCloudPlayers = (callback: (players: Player[]) => void) => {
  const mainDocRef = doc(db, 'app_data', 'players_collection');
  const individualCollRef = collection(db, 'players');

  let mainPlayers: Player[] | null = null;
  let individualPlayers: Player[] | null = null;

  const emitMerged = () => {
    if (mainPlayers === null && individualPlayers === null) return;
    const byId = new Map<string, Player>();
    (mainPlayers || []).forEach((p) => byId.set(p.id, p));
    (individualPlayers || []).forEach((p) => byId.set(p.id, p));
    callback(Array.from(byId.values()));
  };

  const unsubscribeMain = onSnapshot(
    mainDocRef,
    (snapshot) => {
      mainPlayers = snapshot.exists() && Array.isArray(snapshot.data()?.players)
        ? snapshot.data()!.players
        : [];
      emitMerged();
    },
    (err) => console.warn('Players main doc listener error:', err)
  );

  const unsubscribeIndividual = onSnapshot(
    individualCollRef,
    (snapshot) => {
      const list: Player[] = [];
      snapshot.forEach((d) => list.push(d.data() as Player));
      individualPlayers = list;
      emitMerged();
    },
    (err) => console.warn('Players individual collection listener error:', err)
  );

  return () => {
    unsubscribeMain();
    unsubscribeIndividual();
  };
};

export const clearCloudData = async (): Promise<void> => {
  try {
    // Clear players
    const playersDocRef = doc(db, 'app_data', 'players_collection');
    await setDoc(playersDocRef, { players: [], updatedAt: Timestamp.now() });

    // Clear all peladas documents
    const peladasSnap = await getDocs(collection(db, 'peladas'));
    const deletePromises = peladasSnap.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);

    // Clear individual players
    const indPlayersSnap = await getDocs(collection(db, 'players'));
    const delPlayerPromises = indPlayersSnap.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(delPlayerPromises);
  } catch (err) {
    console.warn('Clear cloud data error:', err);
  }
};

export const fetchCloudData = async (): Promise<{
  peladas?: Pelada[];
  players?: Player[];
  notifications?: NotificationLog[];
} | null> => {
  try {
    const result: { peladas?: Pelada[]; players?: Player[]; notifications?: NotificationLog[] } = {};
    
    // Fetch players
    const playersDoc = await getDoc(doc(db, 'app_data', 'players_collection'));
    if (playersDoc.exists() && Array.isArray(playersDoc.data()?.players) && playersDoc.data()?.players.length > 0) {
      result.players = playersDoc.data()?.players;
    } else {
      // Try individual players collection
      const indPlayers = await getDocs(collection(db, 'players'));
      if (!indPlayers.empty) {
        const pList: Player[] = [];
        indPlayers.forEach((d) => pList.push(d.data() as Player));
        result.players = pList;
      }
    }

    // Fetch peladas
    const peladasSnap = await getDocs(collection(db, 'peladas'));
    if (!peladasSnap.empty) {
      const list: Pelada[] = [];
      peladasSnap.forEach((docSnap) => {
        list.push(docSnap.data() as Pelada);
      });
      result.peladas = list;
    }

    return result;
  } catch (err) {
    console.warn('Fetch cloud data note:', err);
    return null;
  }
};



