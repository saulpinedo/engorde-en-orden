import { Injectable, signal, inject } from '@angular/core';
import { differenceInDays } from 'date-fns';
import { FirestoreService } from './firestore.service';
import { RefreshService } from './refresh.service';
import { StorageService } from './storage.service';
import { doc, collection, serverTimestamp, writeBatch, setDoc, updateDoc, getDoc, query, where, getDocs } from 'firebase/firestore';

// ──────────────── MODELOS (camelCase) ────────────────

export interface Granja {
  id?: string;
  nombre: string;
  ubicacion?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Galpon {
  id?: string;
  granjaId: string;
  nombre: string;
  capacidad?: number;
  createdAt?: any;
  updatedAt?: any;
  granja?: Granja;
}

export interface Lote {
  id?: string;
  galponId: string;
  nombre?: string;
  cantidadInicial: number;
  cantidadActual: number;
  raza: string;
  pesoInicial: number;
  precioPollito: number;
  fechaInicio: string;
  fechaFin?: string;
  etapaActual: 'INICIO' | 'CRECIMIENTO' | 'ENGORDE';
  estado: 'ACTIVO' | 'FINALIZADO';
  createdAt?: any;
  updatedAt?: any;
  // denormalizado
  galponNombre?: string;
  granjaNombre?: string;
  galpon?: Galpon;
}

export interface Vacuna {
  id?: string;
  nombre: string;
  tipo: 'VACUNA' | 'ANTIBIOTICO' | 'VITAMINA' | 'DESINFECTANTE';
  diasAplicacion?: number;
  descripcion?: string;
  precioUnitario?: number;
  unidad?: string;
  createdAt?: any;
}

export interface VacunaAplicada {
  id?: string;
  loteId: string;
  catalogoVacunaId: string;
  fecha: string;
  notas?: string;
  createdAt?: any;
}

export interface Mortalidad {
  id?: string;
  loteId: string;
  fecha: string;
  cantidad: number;
  causa?: string;
  observaciones?: string;
  createdAt?: any;
}

export interface ConsumoDiario {
  id?: string;
  loteId: string;
  fecha: string;
  etapa?: string;
  cantidadKg: number;
  formulaId?: string;
  observaciones?: string;
  createdAt?: any;
}

export interface Pesaje {
  id?: string;
  loteId: string;
  fecha: string;
  pesoPromedio: number;
  muestra?: number;
  observaciones?: string;
  createdAt?: any;
}

export interface Hito {
  id?: string;
  loteId: string;
  tipo: 'VACUNA' | 'ANTIBIOTICO' | 'VITAMINA' | 'DESINFECTANTE' | 'PESAJE' | 'ALIMENTO' | 'OTRO';
  titulo: string;
  fecha: string;
  estado: 'PENDIENTE' | 'COMPLETADO';
  completadoEn?: string;
  realizadoPor?: string;
  observaciones?: string;
  cantidadAplicada?: number;
  createdAt?: any;
}

export interface Antibiotico {
  id?: string;
  loteId: string;
  catalogoId: string;
  fecha: string;
  cantidad: number;
  notas?: string;
  createdAt?: any;
}

export interface Vitamina {
  id?: string;
  loteId: string;
  catalogoId: string;
  fecha: string;
  cantidad: number;
  notas?: string;
  createdAt?: any;
}

export interface Desinfectante {
  id?: string;
  loteId: string;
  catalogoId: string;
  fecha: string;
  cantidad: number;
  notas?: string;
  createdAt?: any;
}

export interface AntibioticoCatalogo {
  id?: string;
  nombre: string;
  precioUnitario?: number;
  unidad?: string;
  descripcion?: string;
  createdAt?: any;
}

export interface VitaminaCatalogo {
  id?: string;
  nombre: string;
  precioUnitario?: number;
  unidad?: string;
  descripcion?: string;
  createdAt?: any;
}

export interface DesinfectanteCatalogo {
  id?: string;
  nombre: string;
  precioUnitario?: number;
  unidad?: string;
  descripcion?: string;
  createdAt?: any;
}

export interface Insumo {
  id?: string;
  nombre: string;
  tipo?: 'VACUNA' | 'ANTIBIOTICO' | 'VITAMINA' | 'DESINFECTANTE';
  precioUnitario?: number;
  unidad?: string;
  diasAplicacion?: number;
  descripcion?: string;
  createdAt?: any;
}

export interface Cliente {
  id?: string;
  nombre: string;
  telefono?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Venta {
  id?: string;
  fecha: string;
  clienteId?: string;
  loteId?: string;
  precioKg: number;
  totalKg: number;
  totalBs: number;
  placa?: string;
  estado: 'PENDIENTE' | 'CANCELADO' | 'PARCIAL';
  observaciones?: string;
  createdAt?: any;
  updatedAt?: any;
  // denormalizado
  clienteNombre?: string;
  loteNombre?: string;
  cliente?: Cliente;
  lote?: Lote;
  detallePesadas?: DetallePesada[];
  pagos?: Pago[];
}

export interface DetallePesada {
  id?: string;
  ventaId: string;
  pesoKg: number;
  cantidadPollos: number;
  createdAt?: any;
}

export interface Pago {
  id?: string;
  ventaId: string;
  monto: number;
  fecha: string;
  metodo: 'EFECTIVO' | 'TRANSFERENCIA' | 'OTRO';
  createdAt?: any;
}

export interface FaseAlimento {
  id?: string;
  nombre: string;
  diaInicio: number;
  diaFin: number;
  toneladasBase: number;
  precioTn: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface Formula {
  id?: string;
  nombre: string;
  etapa?: string;
  descripcion?: string;
  createdAt?: any;
}

export interface Ingrediente {
  id?: string;
  nombre: string;
  unidad?: string;
  createdAt?: any;
}

export interface FormulaDetalle {
  id?: string;
  formulaId: string;
  ingredienteId: string;
  cantidad: number;
  unidad?: string;
  // denormalizado para no hacer join en cada render
  ingredienteNombre?: string;
  ingredienteUnidad?: string;
}

export type GastoCategoria =
  | 'ALIMENTO' | 'INSUMOS' | 'MANO_OBRA' | 'MANTENIMIENTO' | 'OTROS';

export interface GastoOperativo {
  id?: string;
  fecha: string;
  loteId: string;
  loteNombre?: string;       // denormalizado
  granjaNombre?: string;     // denormalizado
  categoria: GastoCategoria;
  descripcion: string;
  monto: number;
  proveedor?: string;
  fotoComprobanteUrl?: string;
  fotoPath?: string;
  createdAt?: any;
  updatedAt?: any;
}

// ──────────────── SERVICIO ────────────────

@Injectable({
  providedIn: 'root'
})
export class LotService {
  private loadingSignal = signal(false);
  private refresh = inject(RefreshService);
  private fs = inject(FirestoreService);
  private storage = inject(StorageService);

  // ──────────── helpers de etapa ────────────
  getEtapaActual(diasVida: number): 'INICIO' | 'CRECIMIENTO' | 'ENGORDE' {
    if (diasVida <= 10) return 'INICIO';
    if (diasVida <= 25) return 'CRECIMIENTO';
    return 'ENGORDE';
  }

  getDiasVida(fechaInicio: string): number {
    return differenceInDays(new Date(), new Date(fechaInicio));
  }

  // ──────────── Granjas ────────────
  async getGranjas(): Promise<Granja[]> {
    return this.fs.getAll<Granja>('granjas', 'createdAt', 'desc');
  }

  async createGranja(granja: Partial<Granja>): Promise<Granja> {
    const created = await this.fs.create<Granja>('granjas', granja);
    this.refresh.triggerRefresh('granjas');
    return created;
  }

  async updateGranja(id: string, granja: Partial<Granja>): Promise<Granja> {
    await this.fs.update('granjas', id, granja);
    this.refresh.triggerRefresh('granjas');
    return (await this.fs.getById<Granja>('granjas', id))!;
  }

  async deleteGranja(id: string): Promise<void> {
    await this.fs.remove('granjas', id);
    this.refresh.triggerRefresh('granjas');
  }

  // ──────────── Galpones ────────────
  async getGalpones(granjaId?: string): Promise<Galpon[]> {
    if (granjaId) {
      return this.fs.whereEq<Galpon>('galpones', 'granjaId', granjaId, 'createdAt', 'desc');
    }
    const galpones = await this.fs.getAll<Galpon>('galpones', 'createdAt', 'desc');
    // hidrata granajas
    const granjas = await this.getGranjas();
    return galpones.map(g => ({ ...g, granja: granjas.find(x => x.id === g.granjaId) }));
  }

  async createGalpon(galpon: Partial<Galpon>): Promise<Galpon> {
    const created = await this.fs.create<Galpon>('galpones', galpon);
    this.refresh.triggerRefresh('galpones');
    return created;
  }

  async updateGalpon(id: string, galpon: Partial<Galpon>): Promise<Galpon> {
    await this.fs.update('galpones', id, galpon);
    this.refresh.triggerRefresh('galpones');
    return (await this.fs.getById<Galpon>('galpones', id))!;
  }

  async deleteGalpon(id: string): Promise<void> {
    await this.fs.remove('galpones', id);
    this.refresh.triggerRefresh('galpones');
  }

  // ──────────── Lotes ────────────
  async getLotes(galponId?: string): Promise<Lote[]> {
    const lotes = galponId
      ? await this.fs.whereEq<Lote>('lotes', 'galponId', galponId, 'createdAt', 'desc')
      : await this.fs.getAll<Lote>('lotes', 'createdAt', 'desc');
    return this.hydrateLotes(lotes);
  }

  async getLote(id: string): Promise<Lote | null> {
    const lote = await this.fs.getById<Lote>('lotes', id);
    if (!lote) return null;
    const [hidratado] = await this.hydrateLotes([lote]);
    return hidratado;
  }

  /**
   * Rellena lote.galponNombre y lote.granjaNombre si no están denormalizados.
   * Necesario porque Firestore no tiene joins: los nombres se cachean al crear,
   * pero si la UI se llena con datos viejos o creados por otro flujo, los hidratamos acá.
   */
  private async hydrateLotes(lotes: Lote[]): Promise<Lote[]> {
    if (lotes.length === 0) return lotes;
    const necesita = lotes.some(l => !l.galponNombre || !l.granjaNombre);
    if (!necesita) return lotes;
    const [galpones, granjas] = await Promise.all([
      this.fs.getAll<Galpon>('galpones'),
      this.fs.getAll<Granja>('granjas')
    ]);
    return lotes.map(l => {
      const galpon = galpones.find(g => g.id === l.galponId);
      const granja = galpon ? granjas.find(g => g.id === galpon.granjaId) : undefined;
      return {
        ...l,
        galponNombre: l.galponNombre || galpon?.nombre,
        granjaNombre: l.granjaNombre || granja?.nombre,
        galpon: galpon ? { ...galpon, granja } : l.galpon
      };
    });
  }

  async createLote(lote: Partial<Lote>): Promise<Lote> {
    let galponNombre: string | undefined;
    let granjaNombre: string | undefined;
    if (lote.galponId) {
      const galpon = await this.fs.getById<Galpon>('galpones', lote.galponId);
      galponNombre = galpon?.nombre;
      if (galpon?.granjaId) {
        const granja = await this.fs.getById<Granja>('granjas', galpon.granjaId);
        granjaNombre = granja?.nombre;
      }
    }
    const created = await this.fs.create<Lote>('lotes', {
      ...lote,
      cantidadActual: lote.cantidadInicial ?? 0,
      etapaActual: 'INICIO',
      estado: 'ACTIVO',
      galponNombre,
      granjaNombre
    });
    this.refresh.triggerRefresh('lotes');
    return created;
  }

  async updateLote(id: string, lote: Partial<Lote>): Promise<Lote> {
    let galponNombre = lote.galponNombre;
    let granjaNombre = lote.granjaNombre;
    if (lote.galponId && !galponNombre) {
      const galpon = await this.fs.getById<Galpon>('galpones', lote.galponId);
      galponNombre = galpon?.nombre;
      if (galpon?.granjaId) {
        const granja = await this.fs.getById<Granja>('granjas', galpon.granjaId);
        granjaNombre = granja?.nombre;
      }
    }
    await this.fs.update('lotes', id, { ...lote, galponNombre, granjaNombre });
    this.refresh.triggerRefresh('lotes');
    return (await this.fs.getById<Lote>('lotes', id))!;
  }

  async deleteLote(id: string): Promise<void> {
    await this.fs.remove('lotes', id);
    this.refresh.triggerRefresh('lotes');
  }

  // ──────────── Vacunas (catálogo) ────────────
  async getVacunas(): Promise<Vacuna[]> {
    return this.fs.getAll<Vacuna>('vacunas', 'nombre', 'asc');
  }
  async createVacuna(vacuna: Partial<Vacuna>): Promise<Vacuna> {
    return this.fs.create<Vacuna>('vacunas', vacuna);
  }
  async updateVacuna(id: string, vacuna: Partial<Vacuna>): Promise<Vacuna> {
    await this.fs.update('vacunas', id, vacuna);
    return (await this.fs.getById<Vacuna>('vacunas', id))!;
  }
  async deleteVacuna(id: string): Promise<void> {
    await this.fs.remove('vacunas', id);
  }

  async getVacunasAplicadas(loteId?: string): Promise<VacunaAplicada[]> {
    if (loteId) {
      return this.fs.whereEq<VacunaAplicada>('vacunasAplicadas', 'loteId', loteId, 'fecha', 'desc');
    }
    return this.fs.getAll<VacunaAplicada>('vacunasAplicadas', 'fecha', 'desc');
  }
  async createVacunaAplicada(vacuna: Partial<VacunaAplicada>): Promise<VacunaAplicada> {
    return this.fs.create<VacunaAplicada>('vacunasAplicadas', vacuna);
  }
  async updateVacunaAplicada(id: string, data: Partial<VacunaAplicada>): Promise<VacunaAplicada> {
    await this.fs.update('vacunasAplicadas', id, data);
    return (await this.fs.getById<VacunaAplicada>('vacunasAplicadas', id))!;
  }
  async deleteVacunaAplicada(id: string): Promise<void> {
    await this.fs.remove('vacunasAplicadas', id);
  }

  // ──────────── Insumos (catálogo general) ────────────
  async getInsumos(): Promise<Insumo[]> {
    return this.fs.getAll<Insumo>('insumos', 'nombre', 'asc');
  }
  async createInsumo(insumo: Partial<Insumo>): Promise<Insumo> {
    return this.fs.create<Insumo>('insumos', insumo);
  }
  async updateInsumo(id: string, insumo: Partial<Insumo>): Promise<Insumo> {
    await this.fs.update('insumos', id, insumo);
    return (await this.fs.getById<Insumo>('insumos', id))!;
  }
  async deleteInsumo(id: string): Promise<void> {
    await this.fs.remove('insumos', id);
  }

  // ──────────── Antibióticos (catálogo) ────────────
  async getAntibioticosCatalogo(): Promise<AntibioticoCatalogo[]> {
    return this.fs.getAll<AntibioticoCatalogo>('antibioticosCatalogo', 'nombre', 'asc');
  }
  async createAntibioticoCatalogo(insumo: Partial<AntibioticoCatalogo>): Promise<AntibioticoCatalogo> {
    return this.fs.create<AntibioticoCatalogo>('antibioticosCatalogo', insumo);
  }
  async updateAntibioticoCatalogo(id: string, insumo: Partial<AntibioticoCatalogo>): Promise<AntibioticoCatalogo> {
    await this.fs.update('antibioticosCatalogo', id, insumo);
    return (await this.fs.getById<AntibioticoCatalogo>('antibioticosCatalogo', id))!;
  }
  async deleteAntibioticoCatalogo(id: string): Promise<void> {
    await this.fs.remove('antibioticosCatalogo', id);
  }

  // ──────────── Vitaminas (catálogo) ────────────
  async getVitaminasCatalogo(): Promise<VitaminaCatalogo[]> {
    return this.fs.getAll<VitaminaCatalogo>('vitaminasCatalogo', 'nombre', 'asc');
  }
  async createVitaminaCatalogo(insumo: Partial<VitaminaCatalogo>): Promise<VitaminaCatalogo> {
    return this.fs.create<VitaminaCatalogo>('vitaminasCatalogo', insumo);
  }
  async updateVitaminaCatalogo(id: string, insumo: Partial<VitaminaCatalogo>): Promise<VitaminaCatalogo> {
    await this.fs.update('vitaminasCatalogo', id, insumo);
    return (await this.fs.getById<VitaminaCatalogo>('vitaminasCatalogo', id))!;
  }
  async deleteVitaminaCatalogo(id: string): Promise<void> {
    await this.fs.remove('vitaminasCatalogo', id);
  }

  // ──────────── Desinfectantes (catálogo) ────────────
  async getDesinfectantesCatalogo(): Promise<DesinfectanteCatalogo[]> {
    return this.fs.getAll<DesinfectanteCatalogo>('desinfectantesCatalogo', 'nombre', 'asc');
  }
  async createDesinfectanteCatalogo(insumo: Partial<DesinfectanteCatalogo>): Promise<DesinfectanteCatalogo> {
    return this.fs.create<DesinfectanteCatalogo>('desinfectantesCatalogo', insumo);
  }
  async updateDesinfectanteCatalogo(id: string, insumo: Partial<DesinfectanteCatalogo>): Promise<DesinfectanteCatalogo> {
    await this.fs.update('desinfectantesCatalogo', id, insumo);
    return (await this.fs.getById<DesinfectanteCatalogo>('desinfectantesCatalogo', id))!;
  }
  async deleteDesinfectanteCatalogo(id: string): Promise<void> {
    await this.fs.remove('desinfectantesCatalogo', id);
  }

  // ──────────── Mortalidad (con transacción que actualiza lote.cantidadActual) ────────────
  async getMortalidades(loteId: string): Promise<Mortalidad[]> {
    return this.fs.whereEq<Mortalidad>('mortalidades', 'loteId', loteId, 'fecha', 'desc');
  }

  /**
   * Crea una mortalidad y actualiza lote.cantidadActual atómicamente.
   * Reemplaza el bug de la RPC get_cantidad_actual: ahora se calcula en cliente
   * dentro de la transacción (sumando todas las mortalidades del lote).
   */
  async createMortalidad(mortalidad: Partial<Mortalidad>): Promise<Mortalidad> {
    if (!mortalidad.loteId) throw new Error('loteId es requerido');
    const result = await this.fs.transaction(async (tx) => {
      const mortId = this.fs.newId('mortalidades');
      const mortRef = doc(collection(this.fs['fs'] as any, 'mortalidades'), mortId);
      const loteRef = doc(this.fs['fs'] as any, `lotes/${mortalidad.loteId}`);

      const loteSnap = await tx.get(loteRef);
      if (!loteSnap.exists()) throw new Error('Lote no existe');
      const lote = loteSnap.data() as Lote;

      tx.set(mortRef, {
        ...mortalidad,
        id: mortId,
        createdAt: serverTimestamp()
      });

      // recalcula cantidadActual = cantidadInicial - suma(mortalidades) - otras salidas (no modeladas)
      const mortSnap = await tx.get(
        query(collection(this.fs['fs'] as any, 'mortalidades'), where('loteId', '==', mortalidad.loteId))
      );
      let totalMuerto = mortalidad.cantidad || 0;
      mortSnap.forEach((d: any) => {
        if (d.id !== mortId) totalMuerto += d.data()['cantidad'] || 0;
      });
      const nuevaCantidad = Math.max(0, (lote.cantidadInicial || 0) - totalMuerto);

      tx.update(loteRef, { cantidadActual: nuevaCantidad, updatedAt: serverTimestamp() });
      return { id: mortId, ...mortalidad } as Mortalidad;
    });
    this.refresh.triggerRefresh('mortalidad');
    this.refresh.triggerRefresh('lotes');
    return result;
  }

  async deleteMortalidad(id: string, loteId: string): Promise<void> {
    await this.fs.transaction(async (tx) => {
      const mortRef = doc(this.fs['fs'] as any, `mortalidades/${id}`);
      const loteRef = doc(this.fs['fs'] as any, `lotes/${loteId}`);

      const loteSnap = await tx.get(loteRef);
      if (!loteSnap.exists()) return;
      const lote = loteSnap.data() as Lote;

      tx.delete(mortRef);

      const mortSnap = await tx.get(
        query(collection(this.fs['fs'] as any, 'mortalidades'), where('loteId', '==', loteId))
      );
      let totalMuerto = 0;
      mortSnap.forEach((d: any) => {
        if (d.id !== id) totalMuerto += d.data()['cantidad'] || 0;
      });
      const nuevaCantidad = Math.max(0, (lote.cantidadInicial || 0) - totalMuerto);
      tx.update(loteRef, { cantidadActual: nuevaCantidad, updatedAt: serverTimestamp() });
    });
    this.refresh.triggerRefresh('mortalidad');
    this.refresh.triggerRefresh('lotes');
  }

  // ──────────── Consumo diario ────────────
  async getConsumos(loteId: string): Promise<ConsumoDiario[]> {
    return this.fs.whereEq<ConsumoDiario>('consumoDiario', 'loteId', loteId, 'fecha', 'desc');
  }
  async createConsumo(consumo: Partial<ConsumoDiario>): Promise<ConsumoDiario> {
    const created = await this.fs.create<ConsumoDiario>('consumoDiario', consumo);
    this.refresh.triggerRefresh('consumo');
    return created;
  }
  async deleteConsumo(id: string): Promise<void> {
    await this.fs.remove('consumoDiario', id);
    this.refresh.triggerRefresh('consumo');
  }

  // ──────────── Pesajes ────────────
  async getPesajes(loteId: string): Promise<Pesaje[]> {
    return this.fs.whereEq<Pesaje>('pesajes', 'loteId', loteId, 'fecha', 'desc');
  }
  async createPesaje(pesaje: Partial<Pesaje>): Promise<Pesaje> {
    const created = await this.fs.create<Pesaje>('pesajes', pesaje);
    this.refresh.triggerRefresh('pesajes');
    return created;
  }
  async deletePesaje(id: string): Promise<void> {
    await this.fs.remove('pesajes', id);
    this.refresh.triggerRefresh('pesajes');
  }

  // ──────────── Hitos ────────────
  async getHitos(loteId: string): Promise<Hito[]> {
    return this.fs.whereEq<Hito>('hitos', 'loteId', loteId, 'fecha', 'desc');
  }
  async createHito(hito: Partial<Hito>): Promise<Hito> {
    return this.fs.create<Hito>('hitos', hito);
  }
  async updateHito(id: string, hito: Partial<Hito>): Promise<Hito> {
    await this.fs.update('hitos', id, hito);
    return (await this.fs.getById<Hito>('hitos', id))!;
  }
  async deleteHito(id: string): Promise<void> {
    await this.fs.remove('hitos', id);
  }

  // ──────────── Antibióticos (aplicados) ────────────
  async getAntibioticos(loteId?: string): Promise<Antibiotico[]> {
    if (loteId) {
      return this.fs.whereEq<Antibiotico>('antibioticosAplicados', 'loteId', loteId, 'fecha', 'desc');
    }
    return this.fs.getAll<Antibiotico>('antibioticosAplicados', 'fecha', 'desc');
  }
  async createAntibiotico(antibiotico: Partial<Antibiotico>): Promise<Antibiotico> {
    return this.fs.create<Antibiotico>('antibioticosAplicados', antibiotico);
  }
  async deleteAntibiotico(id: string): Promise<void> {
    await this.fs.remove('antibioticosAplicados', id);
  }

  // ──────────── Vitaminas (aplicadas) ────────────
  async getVitaminas(loteId?: string): Promise<Vitamina[]> {
    if (loteId) {
      return this.fs.whereEq<Vitamina>('vitaminasAplicadas', 'loteId', loteId, 'fecha', 'desc');
    }
    return this.fs.getAll<Vitamina>('vitaminasAplicadas', 'fecha', 'desc');
  }
  async createVitamina(vitamina: Partial<Vitamina>): Promise<Vitamina> {
    return this.fs.create<Vitamina>('vitaminasAplicadas', vitamina);
  }
  async deleteVitamina(id: string): Promise<void> {
    await this.fs.remove('vitaminasAplicadas', id);
  }

  // ──────────── Desinfectantes (aplicados) ────────────
  async getDesinfectantes(loteId?: string): Promise<Desinfectante[]> {
    if (loteId) {
      return this.fs.whereEq<Desinfectante>('desinfectantesAplicados', 'loteId', loteId, 'fecha', 'desc');
    }
    return this.fs.getAll<Desinfectante>('desinfectantesAplicados', 'fecha', 'desc');
  }
  async createDesinfectante(desinfectante: Partial<Desinfectante>): Promise<Desinfectante> {
    return this.fs.create<Desinfectante>('desinfectantesAplicados', desinfectante);
  }
  async deleteDesinfectante(id: string): Promise<void> {
    await this.fs.remove('desinfectantesAplicados', id);
  }

  // ──────────── Clientes ────────────
  async getClientes(): Promise<Cliente[]> {
    return this.fs.getAll<Cliente>('clientes', 'nombre', 'asc');
  }

  async searchClientes(termino: string): Promise<Cliente[]> {
    if (!termino) return this.fs.getAll<Cliente>('clientes', 'nombre', 'asc', 10);
    return this.fs.wherePrefix<Cliente>('clientes', 'nombre', termino, 10);
  }

  async createCliente(cliente: Partial<Cliente>): Promise<Cliente> {
    return this.fs.create<Cliente>('clientes', cliente);
  }

  async updateCliente(id: string, cliente: Partial<Cliente>): Promise<Cliente> {
    await this.fs.update('clientes', id, cliente);
    return (await this.fs.getById<Cliente>('clientes', id))!;
  }

  async deleteCliente(id: string): Promise<void> {
    await this.fs.remove('clientes', id);
  }

  // ──────────── Ventas (con transacciones para triggers) ────────────
  async getVentas(loteId?: string): Promise<Venta[]> {
    if (loteId) {
      return this.fs.whereEq<Venta>('ventas', 'loteId', loteId, 'fecha', 'desc');
    }
    return this.fs.getAll<Venta>('ventas', 'fecha', 'desc');
  }

  async getVentasPorCliente(clienteId: string): Promise<Venta[]> {
    return this.fs.whereEq<Venta>('ventas', 'clienteId', clienteId, 'fecha', 'desc');
  }

  async createVenta(venta: Partial<Venta>): Promise<Venta> {
    // denormalizar clienteNombre y loteNombre
    let clienteNombre: string | undefined;
    let loteNombre: string | undefined;
    if (venta.clienteId) {
      const c = await this.fs.getById<Cliente>('clientes', venta.clienteId);
      clienteNombre = c?.nombre;
    }
    if (venta.loteId) {
      const l = await this.fs.getById<Lote>('lotes', venta.loteId);
      loteNombre = l?.nombre;
    }
    const created = await this.fs.create<Venta>('ventas', {
      ...venta,
      estado: 'PENDIENTE',
      totalKg: 0,
      totalBs: 0,
      clienteNombre,
      loteNombre
    });
    this.refresh.triggerRefresh('ventas');
    return created;
  }

  async updateVenta(id: string, venta: Partial<Venta>): Promise<Venta> {
    await this.fs.update('ventas', id, venta);
    this.refresh.triggerRefresh('ventas');
    return (await this.fs.getById<Venta>('ventas', id))!;
  }

  async deleteVenta(id: string): Promise<void> {
    // también elimina sus pesadas y pagos
    await this.fs.transaction(async (tx) => {
      const pesadas = await tx.get(query(collection(this.fs['fs'] as any, 'detallePesadas'), where('ventaId', '==', id)));
      const pagos = await tx.get(query(collection(this.fs['fs'] as any, 'pagos'), where('ventaId', '==', id)));
      const batch = writeBatch(this.fs['fs'] as any);
      pesadas.forEach((d: any) => batch.delete(d.ref));
      pagos.forEach((d: any) => batch.delete(d.ref));
      batch.delete(doc(this.fs['fs'] as any, `ventas/${id}`));
      await batch.commit();
    });
    this.refresh.triggerRefresh('ventas');
  }

  /**
   * Crea/actualiza/elimina una pesada y recalcula venta.totalKg y venta.totalBs.
   * Reemplaza el trigger PL/pgSQL `actualizar_totales_venta`.
   */
  async addPesada(ventaId: string, pesoKg: number, cantidadPollos: number = 1): Promise<DetallePesada> {
    const result = await this.fs.transaction(async (tx) => {
      const ventaRef = doc(this.fs['fs'] as any, `ventas/${ventaId}`);
      const ventaSnap = await tx.get(ventaRef);
      if (!ventaSnap.exists()) throw new Error('Venta no existe');
      const venta = ventaSnap.data() as Venta;

      const pesadaId = this.fs.newId('detallePesadas');
      const pesadaRef = doc(collection(this.fs['fs'] as any, 'detallePesadas'), pesadaId);
      tx.set(pesadaRef, {
        id: pesadaId,
        ventaId,
        pesoKg,
        cantidadPollos,
        createdAt: serverTimestamp()
      });

      // recalcular totales sumando todas las pesadas de la venta
      const pesadas = await tx.get(query(collection(this.fs['fs'] as any, 'detallePesadas'), where('ventaId', '==', ventaId)));
      let totalKg = pesoKg;
      pesadas.forEach((d: any) => {
        if (d.id !== pesadaId) totalKg += d.data()['pesoKg'] || 0;
      });
      const totalBs = totalKg * (venta.precioKg || 0);

      tx.update(ventaRef, { totalKg, totalBs, updatedAt: serverTimestamp() });
      return { id: pesadaId, ventaId, pesoKg, cantidadPollos } as DetallePesada;
    });
    this.refresh.triggerRefresh('ventas');
    return result;
  }

  async updatePesada(id: string, pesoKg: number, cantidadPollos: number, ventaId: string): Promise<DetallePesada> {
    const result = await this.fs.transaction(async (tx) => {
      const ventaRef = doc(this.fs['fs'] as any, `ventas/${ventaId}`);
      const pesadaRef = doc(this.fs['fs'] as any, `detallePesadas/${id}`);

      tx.update(pesadaRef, { pesoKg, cantidadPollos, updatedAt: serverTimestamp() });

      const ventaSnap = await tx.get(ventaRef);
      if (!ventaSnap.exists()) throw new Error('Venta no existe');
      const venta = ventaSnap.data() as Venta;

      const pesadas = await tx.get(query(collection(this.fs['fs'] as any, 'detallePesadas'), where('ventaId', '==', ventaId)));
      let totalKg = 0;
      pesadas.forEach((d: any) => totalKg += d.data()['pesoKg'] || 0);
      const totalBs = totalKg * (venta.precioKg || 0);

      tx.update(ventaRef, { totalKg, totalBs, updatedAt: serverTimestamp() });
      return { id, ventaId, pesoKg, cantidadPollos } as DetallePesada;
    });
    this.refresh.triggerRefresh('ventas');
    return result;
  }

  async removePesada(id: string, ventaId: string): Promise<void> {
    await this.fs.transaction(async (tx) => {
      const ventaRef = doc(this.fs['fs'] as any, `ventas/${ventaId}`);
      const pesadaRef = doc(this.fs['fs'] as any, `detallePesadas/${id}`);

      tx.delete(pesadaRef);

      const ventaSnap = await tx.get(ventaRef);
      if (!ventaSnap.exists()) return;
      const venta = ventaSnap.data() as Venta;

      const pesadas = await tx.get(query(collection(this.fs['fs'] as any, 'detallePesadas'), where('ventaId', '==', ventaId)));
      let totalKg = 0;
      pesadas.forEach((d: any) => {
        if (d.id !== id) totalKg += d.data()['pesoKg'] || 0;
      });
      const totalBs = totalKg * (venta.precioKg || 0);
      tx.update(ventaRef, { totalKg, totalBs, updatedAt: serverTimestamp() });
    });
    this.refresh.triggerRefresh('ventas');
  }

  async getDetallePesadas(ventaId: string): Promise<DetallePesada[]> {
    return this.fs.whereEq<DetallePesada>('detallePesadas', 'ventaId', ventaId, 'createdAt', 'asc');
  }

  // ──────────── Pagos (con transacción que actualiza estado de venta) ────────────
  async getPagos(ventaId: string): Promise<Pago[]> {
    return this.fs.whereEq<Pago>('pagos', 'ventaId', ventaId, 'fecha', 'asc');
  }

  /**
   * Crea un pago y recalcula venta.estado (PENDIENTE/PARCIAL/CANCELADO).
   * Reemplaza el trigger PL/pgSQL `actualizar_estado_venta`.
   */
  async createPago(pago: Partial<Pago>): Promise<Pago> {
    if (!pago.ventaId) throw new Error('ventaId es requerido');
    const result = await this.fs.transaction(async (tx) => {
      const ventaRef = doc(this.fs['fs'] as any, `ventas/${pago.ventaId}`);
      const pagoId = this.fs.newId('pagos');
      const pagoRef = doc(collection(this.fs['fs'] as any, 'pagos'), pagoId);

      const ventaSnap = await tx.get(ventaRef);
      if (!ventaSnap.exists()) throw new Error('Venta no existe');
      const venta = ventaSnap.data() as Venta;

      tx.set(pagoRef, { ...pago, id: pagoId, createdAt: serverTimestamp() });

      const pagos = await tx.get(query(collection(this.fs['fs'] as any, 'pagos'), where('ventaId', '==', pago.ventaId)));
      let totalPagado = pago.monto || 0;
      pagos.forEach((d: any) => {
        if (d.id !== pagoId) totalPagado += d.data()['monto'] || 0;
      });
      const totalBs = venta.totalBs || 0;

      let estado: 'PENDIENTE' | 'PARCIAL' | 'CANCELADO' = 'PENDIENTE';
      if (totalBs > 0 && totalPagado >= totalBs) estado = 'CANCELADO';
      else if (totalPagado > 0) estado = 'PARCIAL';

      tx.update(ventaRef, { estado, updatedAt: serverTimestamp() });
      return { id: pagoId, ...pago } as Pago;
    });
    this.refresh.triggerRefresh('ventas');
    this.refresh.triggerRefresh('pagos');
    return result;
  }

  async deletePago(id: string, ventaId: string): Promise<void> {
    await this.fs.transaction(async (tx) => {
      const ventaRef = doc(this.fs['fs'] as any, `ventas/${ventaId}`);
      const pagoRef = doc(this.fs['fs'] as any, `pagos/${id}`);

      tx.delete(pagoRef);

      const ventaSnap = await tx.get(ventaRef);
      if (!ventaSnap.exists()) return;
      const venta = ventaSnap.data() as Venta;

      const pagos = await tx.get(query(collection(this.fs['fs'] as any, 'pagos'), where('ventaId', '==', ventaId)));
      let totalPagado = 0;
      pagos.forEach((d: any) => {
        if (d.id !== id) totalPagado += d.data()['monto'] || 0;
      });
      const totalBs = venta.totalBs || 0;
      let estado: 'PENDIENTE' | 'PARCIAL' | 'CANCELADO' = 'PENDIENTE';
      if (totalBs > 0 && totalPagado >= totalBs) estado = 'CANCELADO';
      else if (totalPagado > 0) estado = 'PARCIAL';
      tx.update(ventaRef, { estado, updatedAt: serverTimestamp() });
    });
    this.refresh.triggerRefresh('ventas');
    this.refresh.triggerRefresh('pagos');
  }

  // ──────────── Fases de alimento ────────────
  async getFasesAlimento(): Promise<FaseAlimento[]> {
    return this.fs.getAll<FaseAlimento>('fasesAlimento', 'diaInicio', 'asc');
  }
  async createFaseAlimento(fase: Partial<FaseAlimento>): Promise<FaseAlimento> {
    return this.fs.create<FaseAlimento>('fasesAlimento', fase);
  }
  async updateFaseAlimento(id: string, fase: Partial<FaseAlimento>): Promise<FaseAlimento> {
    await this.fs.update('fasesAlimento', id, fase);
    return (await this.fs.getById<FaseAlimento>('fasesAlimento', id))!;
  }
  async deleteFaseAlimento(id: string): Promise<void> {
    await this.fs.remove('fasesAlimento', id);
  }

  // ──────────── Fórmulas (métodos nuevos) ────────────
  async getFormulas(): Promise<Formula[]> {
    return this.fs.getAll<Formula>('formulas', 'nombre', 'asc');
  }
  async createFormula(formula: Partial<Formula>): Promise<Formula> {
    return this.fs.create<Formula>('formulas', formula);
  }
  async updateFormula(id: string, formula: Partial<Formula>): Promise<Formula> {
    await this.fs.update('formulas', id, formula);
    return (await this.fs.getById<Formula>('formulas', id))!;
  }
  async deleteFormula(id: string): Promise<void> {
    // borra también sus detalles
    const detalles = await this.fs.whereEq<FormulaDetalle>('formulaDetalles', 'formulaId', id);
    for (const d of detalles) {
      if (d.id) await this.fs.remove('formulaDetalles', d.id);
    }
    await this.fs.remove('formulas', id);
  }

  // ──────────── Ingredientes ────────────
  async getIngredientes(): Promise<Ingrediente[]> {
    return this.fs.getAll<Ingrediente>('ingredientes', 'nombre', 'asc');
  }
  async createIngrediente(ing: Partial<Ingrediente>): Promise<Ingrediente> {
    return this.fs.create<Ingrediente>('ingredientes', ing);
  }
  async updateIngrediente(id: string, ing: Partial<Ingrediente>): Promise<Ingrediente> {
    await this.fs.update('ingredientes', id, ing);
    return (await this.fs.getById<Ingrediente>('ingredientes', id))!;
  }
  async deleteIngrediente(id: string): Promise<void> {
    await this.fs.remove('ingredientes', id);
  }

  // ──────────── Fórmula detalles ────────────
  async getFormulaDetalles(formulaId: string): Promise<FormulaDetalle[]> {
    const detalles = await this.fs.whereEq<FormulaDetalle>('formulaDetalles', 'formulaId', formulaId);
    // hidrata nombre de ingrediente
    if (detalles.length === 0) return detalles;
    const ings = await this.getIngredientes();
    return detalles.map(d => {
      const ing = ings.find(i => i.id === d.ingredienteId);
      return {
        ...d,
        ingredienteNombre: ing?.nombre,
        ingredienteUnidad: ing?.unidad
      };
    });
  }

  async addFormulaDetalle(detalle: Partial<FormulaDetalle>): Promise<FormulaDetalle> {
    let ingredienteNombre: string | undefined;
    let ingredienteUnidad: string | undefined;
    if (detalle.ingredienteId) {
      const ing = await this.fs.getById<Ingrediente>('ingredientes', detalle.ingredienteId);
      ingredienteNombre = ing?.nombre;
      ingredienteUnidad = ing?.unidad;
    }
    return this.fs.create<FormulaDetalle>('formulaDetalles', {
      ...detalle,
      ingredienteNombre,
      ingredienteUnidad
    });
  }

  async updateFormulaDetalle(id: string, detalle: Partial<FormulaDetalle>): Promise<FormulaDetalle> {
    await this.fs.update('formulaDetalles', id, detalle);
    return (await this.fs.getById<FormulaDetalle>('formulaDetalles', id))!;
  }

  async removeFormulaDetalle(id: string): Promise<void> {
    await this.fs.remove('formulaDetalles', id);
  }

  // ──────────── Resúmenes y ventas diarias ────────────
  async getVentasDiarias(fecha?: string): Promise<Venta[]> {
    const fechaBuscada = fecha || new Date().toISOString().split('T')[0];
    return this.fs.whereEq<Venta>('ventas', 'fecha', fechaBuscada, 'createdAt', 'desc');
  }

  async getResumenVentas(loteId?: string): Promise<{ totalBs: number; totalKg: number; pendientes: number }> {
    const ventas = loteId
      ? await this.getVentas(loteId)
      : await this.fs.getAll<Venta>('ventas');

    const resumen = { totalBs: 0, totalKg: 0, pendientes: 0 };
    ventas.forEach(v => {
      resumen.totalBs += v.totalBs || 0;
      resumen.totalKg += v.totalKg || 0;
      if (v.estado !== 'CANCELADO') resumen.pendientes += (v.totalBs || 0);
    });
    return resumen;
  }

  // ──────────── Gastos Operativos ────────────
  async getGastos(loteId?: string): Promise<GastoOperativo[]> {
    if (loteId) {
      return this.fs.whereEq<GastoOperativo>('gastosOperativos', 'loteId', loteId, 'fecha', 'desc');
    }
    return this.fs.getAll<GastoOperativo>('gastosOperativos', 'fecha', 'desc');
  }

  async createGasto(gasto: Partial<GastoOperativo>): Promise<GastoOperativo> {
    if (!gasto.loteId) throw new Error('loteId es requerido');
    let loteNombre = gasto.loteNombre;
    let granjaNombre = gasto.granjaNombre;
    if (!loteNombre || !granjaNombre) {
      const lote = await this.fs.getById<Lote>('lotes', gasto.loteId);
      if (lote) {
        loteNombre = lote.nombre;
        if (lote.galponId) {
          const galpon = await this.fs.getById<Galpon>('galpones', lote.galponId);
          if (galpon?.granjaId) {
            const granja = await this.fs.getById<Granja>('granjas', galpon.granjaId);
            granjaNombre = granja?.nombre;
          }
        }
      }
    }
    const created = await this.fs.create<GastoOperativo>('gastosOperativos', {
      ...gasto,
      loteNombre,
      granjaNombre
    });
    this.refresh.triggerRefresh('gastos');
    return created;
  }

  async updateGasto(id: string, gasto: Partial<GastoOperativo>): Promise<GastoOperativo> {
    await this.fs.update('gastosOperativos', id, gasto);
    this.refresh.triggerRefresh('gastos');
    return (await this.fs.getById<GastoOperativo>('gastosOperativos', id))!;
  }

  /**
   * Borra el gasto y, si tenía foto en Storage, también la borra.
   * La foto se borra de forma tolerante: si falla, igual se completa
   * la operación principal (queda el log para limpieza manual).
   */
  async deleteGasto(id: string): Promise<void> {
    const existing = await this.fs.getById<GastoOperativo>('gastosOperativos', id);
    await this.fs.remove('gastosOperativos', id);
    if (existing?.fotoPath) {
      try {
        await this.storage.deleteFile(existing.fotoPath);
      } catch (e) {
        console.warn('No se pudo borrar la foto del gasto:', existing.fotoPath, e);
      }
    }
    this.refresh.triggerRefresh('gastos');
  }

  async getResumenGastosPorLote(loteId: string): Promise<{
    total: number;
    cantidad: number;
    promedio: number;
    porCategoria: { categoria: GastoCategoria; total: number }[];
  }> {
    const gastos = await this.getGastos(loteId);
    const total = gastos.reduce((sum, g) => sum + (g.monto || 0), 0);
    const cantidad = gastos.length;
    const promedio = cantidad > 0 ? total / cantidad : 0;

    const porCategoriaMap = new Map<GastoCategoria, number>();
    gastos.forEach(g => {
      porCategoriaMap.set(g.categoria, (porCategoriaMap.get(g.categoria) || 0) + (g.monto || 0));
    });
    const porCategoria: { categoria: GastoCategoria; total: number }[] =
      Array.from(porCategoriaMap.entries())
        .map(([categoria, t]) => ({ categoria, total: t }))
        .sort((a, b) => b.total - a.total);

    return { total, cantidad, promedio, porCategoria };
  }

  /**
   * Rentabilidad por lote: cruza gastos operativos + ventas para mostrar
   * ganancia neta y ROI%. Sirve para evaluar si un engorde dejó ganancia.
   */
  async getRentabilidadPorLote(loteId: string): Promise<{
    totalGastos: number;
    totalVentas: number;
    ganancia: number;
    roi: number;
  }> {
    const [resumenGastos, resumenVentas] = await Promise.all([
      this.getResumenGastosPorLote(loteId),
      this.getResumenVentas(loteId)
    ]);
    const totalGastos = resumenGastos.total;
    const totalVentas = resumenVentas.totalBs;
    const ganancia = totalVentas - totalGastos;
    const roi = totalGastos > 0 ? (ganancia / totalGastos) * 100 : 0;
    return { totalGastos, totalVentas, ganancia, roi };
  }
}
