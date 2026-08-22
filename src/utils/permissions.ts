import { Pelada } from '../types';
import { User as FirebaseUser } from 'firebase/auth';

/**
 * Checks if the current user is the original creator / owner of the pelada.
 * Only the creator has permission to delete peladas, wipe data, remove players,
 * or grant/revoke admin privileges.
 */
export function isPeladaCreator(pelada: Pelada | null | undefined, currentUser: FirebaseUser | null): boolean {
  if (!currentUser) return false;
  if (!pelada) return true; // If no pelada created yet, authenticated user can create one

  const matchesUid = !!pelada.creatorUid && pelada.creatorUid === currentUser.uid;
  const matchesEmail = !!pelada.creatorEmail && !!currentUser.email && 
    pelada.creatorEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase();

  return matchesUid || matchesEmail;
}

/**
 * Checks if the user is an admin / organizer with elevated management privileges.
 * (Creator always has admin privileges, plus any user in adminUids or adminEmails).
 */
export function isPeladaAdmin(pelada: Pelada | null | undefined, currentUser: FirebaseUser | null): boolean {
  if (!currentUser) return false;
  if (!pelada) return true;

  if (isPeladaCreator(pelada, currentUser)) return true;

  if (pelada.adminUids && pelada.adminUids.includes(currentUser.uid)) {
    return true;
  }

  if (pelada.adminEmails && currentUser.email) {
    const userEmail = currentUser.email.trim().toLowerCase();
    if (pelada.adminEmails.some(e => e.trim().toLowerCase() === userEmail)) {
      return true;
    }
  }

  return false;
}
