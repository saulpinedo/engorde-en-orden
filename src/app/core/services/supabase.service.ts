import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase!: SupabaseClient;
  private channels: Map<string, RealtimeChannel> = new Map();

  constructor() {
    this.supabase = createClient(environment.supabase.url, environment.supabase.anonKey);
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  async subscribe(table: string, callback: (payload: any) => void, schema: string = 'public'): Promise<string> {
    const channelName = `${table}_changes`;
    
    if (this.channels.has(channelName)) {
      this.channels.get(channelName)?.unsubscribe();
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema, table },
        (payload) => callback(payload)
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channelName;
  }

  unsubscribe(channelName: string): void {
    if (this.channels.has(channelName)) {
      this.channels.get(channelName)?.unsubscribe();
      this.channels.delete(channelName);
    }
  }
}
