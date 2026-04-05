import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Router } from '@angular/router';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export type User = SupabaseUser;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSignal = signal<User | null>(null);
  
  user = this.userSignal.asReadonly();
  isAuthenticated = computed(() => !!this.userSignal());

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {
    this.initAuth();
  }

  private async initAuth(): Promise<void> {
    const { data: { session } } = await this.supabase.client.auth.getSession();
    this.userSignal.set(session?.user ?? null);

    this.supabase.client.auth.onAuthStateChange((_, session) => {
      this.userSignal.set(session?.user ?? null);
    });
  }

  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { success: false, error: error.message };
    }

    this.userSignal.set(data.user as User);
    return { success: true };
  }

  async signUp(email: string, password: string, name?: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await this.supabase.client.auth.signUp({
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
  }

  async signOut(): Promise<void> {
    await this.supabase.client.auth.signOut();
    this.userSignal.set(null);
    this.router.navigate(['/auth/login']);
  }

  async getSession(): Promise<string | null> {
    const { data: { session } } = await this.supabase.client.auth.getSession();
    return session?.access_token ?? null;
  }
}
