import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { User, Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  
  private userSignal = signal<User | null>(null);
  private sessionSignal = signal<Session | null>(null);
  
  user = this.userSignal.asReadonly();
  session = this.sessionSignal.asReadonly();
  isAuthenticated = computed(() => !!this.userSignal());

  constructor() {
    this.initAuth();
  }

  private async initAuth(): Promise<void> {
    try {
      const { data } = await this.supabase.client.auth.getSession();
      if (data.session) {
        this.sessionSignal.set(data.session);
        this.userSignal.set(data.session.user);
      }
    } catch (error) {
      console.error('Error getting session:', error);
    }

    this.supabase.client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        this.sessionSignal.set(session);
        this.userSignal.set(session.user);
      } else if (event === 'SIGNED_OUT') {
        this.sessionSignal.set(null);
        this.userSignal.set(null);
      }
    });
  }

  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.client.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session) {
        this.sessionSignal.set(data.session);
        this.userSignal.set(data.user);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error desconocido' };
    }
  }

  async signUp(email: string, password: string, name?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.client.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error desconocido' };
    }
  }

  async signOut(): Promise<void> {
    await this.supabase.client.auth.signOut();
    this.sessionSignal.set(null);
    this.userSignal.set(null);
    this.router.navigate(['/auth/login']);
  }
}
