import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { RefreshService } from './refresh.service';
import { differenceInDays } from 'date-fns';

export interface Granja {
  id?: string;
  nombre: string;
  ubicacion?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Galpon {
  id?: string;
  granja_id: string;
  nombre: string;
  capacidad?: number;
  created_at?: string;
  updated_at?: string;
  granja?: Granja;
}

export interface Lote {
  id?: string;
  galpon_id: string;
  nombre?: string;
  cantidad_inicial: number;
  cantidad_actual: number;
  raza: string;
  peso_inicial: number;
  precio_pollito: number;
  fecha_inicio: string;
  fecha_fin?: string;
  etapa_actual: 'INICIO' | 'CRECIMIENTO' | 'ENGORDE';
  estado: 'ACTIVO' | 'FINALIZADO';
  created_at?: string;
  updated_at?: string;
  galpon?: Galpon;
}

export interface Vacuna {
  id?: string;
  nombre: string;
  dias_aplicacion?: number;
  descripcion?: string;
  created_at?: string;
}

export interface Mortalidad {
  id?: string;
  lote_id: string;
  fecha: string;
  cantidad: number;
  causa?: string;
  observaciones?: string;
  created_at?: string;
}

export interface ConsumoDiario {
  id?: string;
  lote_id: string;
  fecha: string;
  etapa?: string;
  cantidad_kg: number;
  formula_id?: string;
  observaciones?: string;
  created_at?: string;
}

export interface Pesaje {
  id?: string;
  lote_id: string;
  fecha: string;
  peso_promedio: number;
  muestra?: number;
  observaciones?: string;
  created_at?: string;
}

export interface Hito {
  id?: string;
  lote_id: string;
  tipo: 'VACUNA' | 'PESAJE' | 'ALIMENTO' | 'OTRO';
  titulo: string;
  fecha: string;
  estado: 'PENDIENTE' | 'COMPLETADO';
  completado_en?: string;
  realizado_por?: string;
  observaciones?: string;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LotService {
  private loadingSignal = signal(false);
  private refresh = inject(RefreshService);

  constructor(private supabase: SupabaseService) {}

  getEtapaActual(diasVida: number): 'INICIO' | 'CRECIMIENTO' | 'ENGORDE' {
    if (diasVida <= 10) return 'INICIO';
    if (diasVida <= 25) return 'CRECIMIENTO';
    return 'ENGORDE';
  }

  getDiasVida(fechaInicio: string): number {
    return differenceInDays(new Date(), new Date(fechaInicio));
  }

  async getGranjas(): Promise<Granja[]> {
    const { data, error } = await this.supabase.client.from('granjas').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createGranja(granja: Partial<Granja>): Promise<Granja> {
    const { data, error } = await this.supabase.client.from('granjas').insert(granja).select().single();
    if (error) throw error;
    this.refresh.triggerRefresh('granjas');
    return data;
  }

  async updateGranja(id: string, granja: Partial<Granja>): Promise<Granja> {
    const { data, error } = await this.supabase.client.from('granjas').update({ ...granja, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    this.refresh.triggerRefresh('granjas');
    return data;
  }

  async deleteGranja(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('granjas').delete().eq('id', id);
    if (error) throw error;
    this.refresh.triggerRefresh('granjas');
  }

  async getGalpones(granjaId?: string): Promise<Galpon[]> {
    let query = this.supabase.client.from('galpones').select('*, granja:granjas(*)');
    if (granjaId) query = query.eq('granja_id', granjaId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createGalpon(galpon: Partial<Galpon>): Promise<Galpon> {
    const { data, error } = await this.supabase.client.from('galpones').insert(galpon).select().single();
    if (error) throw error;
    this.refresh.triggerRefresh('galpones');
    return data;
  }

  async updateGalpon(id: string, galpon: Partial<Galpon>): Promise<Galpon> {
    const { data, error } = await this.supabase.client.from('galpones').update({ ...galpon, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    this.refresh.triggerRefresh('galpones');
    return data;
  }

  async deleteGalpon(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('galpones').delete().eq('id', id);
    if (error) throw error;
    this.refresh.triggerRefresh('galpones');
  }

  async getLotes(galponId?: string): Promise<Lote[]> {
    let query = this.supabase.client.from('lotes').select('*, galpon:galpones(*, granja:granjas(*))');
    if (galponId) query = query.eq('galpon_id', galponId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getLote(id: string): Promise<Lote | null> {
    const { data, error } = await this.supabase.client.from('lotes').select('*, galpon:galpones(*, granja:granjas(*))').eq('id', id);
    if (error) throw error;
    if (!data || data.length === 0) return null;
    return data[0];
  }

  async createLote(lote: Partial<Lote>): Promise<Lote> {
    const { data, error } = await this.supabase.client.from('lotes').insert({
      ...lote,
      cantidad_actual: lote.cantidad_inicial,
      etapa_actual: 'INICIO',
      estado: 'ACTIVO'
    }).select().single();
    if (error) throw error;
    this.refresh.triggerRefresh('lotes');
    return data;
  }

  async updateLote(id: string, lote: Partial<Lote>): Promise<Lote> {
    const { data, error } = await this.supabase.client.from('lotes').update({ ...lote, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    this.refresh.triggerRefresh('lotes');
    return data;
  }

  async deleteLote(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('lotes').delete().eq('id', id);
    if (error) throw error;
    this.refresh.triggerRefresh('lotes');
  }

  async getVacunas(): Promise<Vacuna[]> {
    const { data, error } = await this.supabase.client.from('vacunas').select('*').order('dias_aplicacion');
    if (error) throw error;
    return data || [];
  }

  async getMortalidades(loteId: string): Promise<Mortalidad[]> {
    const { data, error } = await this.supabase.client.from('mortalidades').select('*').eq('lote_id', loteId).order('fecha', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createMortalidad(mortalidad: Partial<Mortalidad>): Promise<Mortalidad> {
    const { data: newMortalidad, error } = await this.supabase.client.from('mortalidades').insert(mortalidad).select().single();
    if (error) throw error;
    
    const { error: updateError } = await this.supabase.client
      .from('lotes')
      .update({ cantidad_actual: this.supabase.client.rpc('get_cantidad_actual', { lote_id: mortalidad.lote_id }) })
      .eq('id', mortalidad.lote_id);
    
    this.refresh.triggerRefresh('mortalidad');
    return newMortalidad;
  }

  async getConsumos(loteId: string): Promise<ConsumoDiario[]> {
    const { data, error } = await this.supabase.client.from('consumo_diario').select('*').eq('lote_id', loteId).order('fecha', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createConsumo(consumo: Partial<ConsumoDiario>): Promise<ConsumoDiario> {
    const { data, error } = await this.supabase.client.from('consumo_diario').insert(consumo).select().single();
    if (error) throw error;
    this.refresh.triggerRefresh('consumo');
    return data;
  }

  async getPesajes(loteId: string): Promise<Pesaje[]> {
    const { data, error } = await this.supabase.client.from('pesajes').select('*').eq('lote_id', loteId).order('fecha', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createPesaje(pesaje: Partial<Pesaje>): Promise<Pesaje> {
    const { data, error } = await this.supabase.client.from('pesajes').insert(pesaje).select().single();
    if (error) throw error;
    this.refresh.triggerRefresh('pesajes');
    return data;
  }

  async getHitos(loteId: string): Promise<Hito[]> {
    const { data, error } = await this.supabase.client.from('hitos').select('*').eq('lote_id', loteId).order('fecha', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createHito(hito: Partial<Hito>): Promise<Hito> {
    const { data, error } = await this.supabase.client.from('hitos').insert(hito).select().single();
    if (error) throw error;
    return data;
  }

  async updateHito(id: string, hito: Partial<Hito>): Promise<Hito> {
    const { data, error } = await this.supabase.client.from('hitos').update(hito).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
}
