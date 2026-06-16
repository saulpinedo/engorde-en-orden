import { Injectable, signal, computed, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { Router } from '@angular/router';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
  User as FbUser
} from 'firebase/auth';
import { FirebaseService } from './firebase.service';

/** Sesión simplificada: lo mínimo que la app necesita. */
export interface AppSession {
  user: FbUser;
  accessToken?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private fb = inject(FirebaseService);
  private router = inject(Router);

  /** Emite cuando el estado de auth cambia (login/logout). */
  public authChange = new Subject<void>();

  private userSignal = signal<FbUser | null>(null);
  private sessionSignal = signal<AppSession | null>(null);
  private initialisedSignal = signal<boolean>(false);

  user = this.userSignal.asReadonly();
  session = this.sessionSignal.asReadonly();
  isAuthenticated = computed(() => !!this.userSignal());
  initialised = this.initialisedSignal.asReadonly();

  constructor() {
    this.initAuth();
  }

  /**
   * Resuelve cuando Firebase Auth termina la primera verificación de sesión.
   * Usar en provideAppInitializer para que el authGuard no se ejecute antes.
   */
  waitForAuth(): Promise<void> {
    return new Promise(resolve => {
      const unsubscribe = onAuthStateChanged(this.fb.auth, () => {
        unsubscribe();
        resolve();
      });
    });
  }

  private initAuth(): void {
    onAuthStateChanged(this.fb.auth, (fbUser) => {
      if (fbUser) {
        this.userSignal.set(fbUser);
        this.sessionSignal.set({ user: fbUser });
      } else {
        this.userSignal.set(null);
        this.sessionSignal.set(null);
      }
      this.initialisedSignal.set(true);
      this.authChange.next();
    });
  }

  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const cred = await signInWithEmailAndPassword(this.fb.auth, email, password);
      this.userSignal.set(cred.user);
      this.sessionSignal.set({ user: cred.user });
      this.authChange.next();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: this.friendlyError(error?.code, error?.message) };
    }
  }

  async signUp(email: string, password: string, name?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const cred = await createUserWithEmailAndPassword(this.fb.auth, email, password);
      if (name) {
        await updateProfile(cred.user, { displayName: name });
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: this.friendlyError(error?.code, error?.message) };
    }
  }

  async signOut(): Promise<void> {
    await fbSignOut(this.fb.auth);
    this.userSignal.set(null);
    this.sessionSignal.set(null);
    this.router.navigate(['/auth/login']);
  }

  /** Traduce códigos comunes de Firebase a mensajes legibles. */
  private friendlyError(code?: string, fallback?: string): string {
    switch (code) {
      case 'auth/invalid-email': return 'Email inválido.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential': return 'Email o contraseña incorrectos.';
      case 'auth/email-already-in-use': return 'Este email ya está registrado.';
      case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
      case 'auth/too-many-requests': return 'Demasiados intentos. Probá más tarde.';
      default: return fallback || 'Error desconocido';
    }
  }
}
