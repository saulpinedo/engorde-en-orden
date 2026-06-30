import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LotService, Lote, Granja, Galpon } from '../../core/services/lot.service';
import { RefreshService } from '../../core/services/refresh.service';
import { format } from 'date-fns';

@Component({
  selector: 'app-lotes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Lotes</h1>
          <p class="subtitle">Gestiona tus lotes de pollos de engorde</p>
        </div>
        <button class="btn-primary" (click)="openDialog()">➕ Nuevo Lote</button>
      </div>
      
      <div class="tabs">
        <button class="tab-btn" [class.active]="tabActual() === 'activos'" (click)="setTab('activos')">
          Activos ({{ lotesActivos().length }})
        </button>
        <button class="tab-btn" [class.active]="tabActual() === 'finalizados'" (click)="setTab('finalizados')">
          Finalizados ({{ lotesFinalizados().length }})
        </button>
      </div>
      
      @if (loading()) {
        <div class="loading">Cargando...</div>
      } @else {
        <div class="card">
          @if (tabActual() === 'activos' ? lotesActivos().length > 0 : lotesFinalizados().length > 0) {
            <table class="data-table">
              <thead>
                <tr>
                  <th>Lote</th>
                  <th>Granja/Galpón</th>
                  <th>Raza</th>
                  <th>Días</th>
                  <th>Etapa</th>
                  <th>Cantidad</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (lote of (tabActual() === 'activos' ? lotesActivos() : lotesFinalizados()); track lote.id) {
                  <tr>
                    <td>
                      <strong>{{ lote.nombre || 'Lote ' + lote.id?.slice(0,4) }}</strong>
                      @if (lote.estado === 'FINALIZADO') {
                        <span class="badge-finalizado">FINALIZADO</span>
                      }
                    </td>
                    <td>
                      <ng-container *ngIf="false"></ng-container>
                      {{ lote.granjaNombre || lote.galpon?.granja?.nombre || '?' }}
                      /
                      {{ lote.galponNombre || lote.galpon?.nombre || '?' }}
                    </td>
                    <td>{{ lote.raza }}</td>
                    <td>{{ getDiasVida(lote) }}</td>
                    <td><span class="tag" [class]="'tag-' + lote.etapaActual.toLowerCase()">{{ lote.etapaActual }}</span></td>
                    <td>{{ lote.cantidadActual | number }} / {{ lote.cantidadInicial | number }}</td>
                    <td>
                      <button class="btn-icon" (click)="goToTimeline(lote)" title="Ver Timeline">📅</button>
                      <button class="btn-icon" (click)="editLote(lote)" title="Editar">✏️</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <div class="empty-state">
              <p>{{ tabActual() === 'activos' ? 'No hay lotes activos' : 'No hay lotes finalizados' }}</p>
            </div>
          }
        </div>
      }
      
      @if (dialogVisible()) {
        <div class="modal-overlay" (click)="dialogVisible.set(false)">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>{{ editingLote ? 'Editar Lote' : 'Nuevo Lote' }}</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Granja</label>
                <select [(ngModel)]="selectedGranja" (change)="onGranjaChange()" class="input-field">
                  <option value="">Seleccionar granja</option>
                  @for (g of granjas(); track g.id) {
                    <option [value]="g.id">{{ g.nombre }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>Galpón</label>
                <select [(ngModel)]="loteForm.galponId" class="input-field">
                  <option value="">Seleccionar galpón</option>
                  @for (g of galponesFiltrados(); track g.id) {
                    <option [value]="g.id">{{ g.nombre }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>Nombre</label>
                <input type="text" [(ngModel)]="loteForm.nombre" placeholder="Ej: Lote Abril 2024" class="input-field"/>
              </div>
              <div class="form-group">
                <label>Raza</label>
                <select [(ngModel)]="loteForm.raza" class="input-field">
                  @for (r of razas; track r) {
                    <option [value]="r">{{ r }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>Cantidad Inicial</label>
                <input type="number" [(ngModel)]="loteForm.cantidadInicial" min="1" class="input-field"/>
              </div>
              <div class="form-group">
                <label>Precio Pollito ($)</label>
                <input type="number" [(ngModel)]="loteForm.precioPollito" step="0.01" class="input-field"/>
              </div>
              <div class="form-group">
                <label>Fecha Inicio</label>
                <input type="date" [(ngModel)]="fechaInicioStr" class="input-field"/>
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn-secondary" (click)="dialogVisible.set(false)">Cancelar</button>
              <button class="btn-primary" (click)="saveLote()">{{ editingLote ? 'Actualizar' : 'Crear' }}</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { max-width: 1400px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-header h1 { margin: 0; color: var(--dark-color); }
    .subtitle { margin: 0.25rem 0 0 0; color: #666; }
    
    .tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
    .tab-btn { flex: 1; padding: 0.75rem; background: white; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s; }
    .tab-btn:hover { border-color: var(--primary-color); }
    .tab-btn.active { background: var(--primary-color); border-color: var(--primary-color); color: var(--dark-color); }
    
    .badge-finalizado { display: inline-block; background: #6c757d; color: white; font-size: 0.65rem; padding: 0.125rem 0.5rem; border-radius: 4px; margin-left: 0.5rem; }
    .loading { text-align: center; padding: 3rem; color: #666; }
    .empty-state { text-align: center; padding: 3rem; color: #666; }
    
    .card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; min-width: 800px; }
    .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #eee; }
    .data-table th { background: #f8f9fa; font-weight: 600; }
    .tag { padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .tag-inicio { background: #d4edda; color: #155724; }
    .tag-crecimiento { background: #d1ecf1; color: #0c5460; }
    .tag-engorde { background: #fff3cd; color: #856404; }
    .text-center { text-align: center; }
    .btn-primary { background: var(--primary-color); color: var(--dark-color); border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-secondary { background: #e9ecef; color: var(--dark-color); border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; }
    .btn-icon { background: none; border: none; cursor: pointer; font-size: 1.25rem; padding: 0.25rem; }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .modal { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
    .modal h3 { margin: 0 0 1.5rem 0; color: var(--dark-color); }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { margin-bottom: 0.5rem; }
    .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--dark-color); }
    .input-field { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; }
    .input-field:focus { outline: none; border-color: var(--primary-color); }
    .modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; }
  `]
})
export class LotesComponent implements OnInit {
  private lotService = inject(LotService);
  private refresh = inject(RefreshService);
  private refreshSub: any;
  private router = inject(Router);
  
  loading = signal(true);
  tabActual = signal<'activos' | 'finalizados'>('activos');
  
  lotes = signal<Lote[]>([]);
  lotesActivos = signal<Lote[]>([]);
  lotesFinalizados = signal<Lote[]>([]);
  granjas = signal<Granja[]>([]);
  galpones = signal<Galpon[]>([]);
  galponesFiltrados = signal<Galpon[]>([]);
  dialogVisible = signal(false);
  editingLote: Lote | null = null;
  selectedGranja = '';
  fechaInicioStr = format(new Date(), 'yyyy-MM-dd');
  
  loteForm: Partial<Lote> = { galponId: '', nombre: '', raza: 'COBB 500', cantidadInicial: 1000, precioPollito: 0, pesoInicial: 45 };
  razas = ['COBB 500', 'ROSS 308', 'HUBBARD', 'HYBRO', 'ARNOLD'];

  async ngOnInit(): Promise<void> {
    await this.loadData();
    this.refreshSub = this.refresh.refresh$.subscribe(() => this.loadData());
  }

  setTab(tab: 'activos' | 'finalizados'): void {
    this.tabActual.set(tab);
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    const [lotesData, granjasData, galponesData] = await Promise.all([
      this.lotService.getLotes(),
      this.lotService.getGranjas(),
      this.lotService.getGalpones()
    ]);
    this.lotes.set(lotesData);
    this.lotesActivos.set(lotesData.filter(l => l.estado === 'ACTIVO'));
    this.lotesFinalizados.set(lotesData.filter(l => l.estado === 'FINALIZADO'));
    this.granjas.set(granjasData);
    this.galpones.set(galponesData);
    this.loading.set(false);
  }

  onGranjaChange(): void {
    this.galponesFiltrados.set(this.galpones().filter(g => g.granjaId === this.selectedGranja));
    this.loteForm.galponId = '';
  }

  getDiasVida(lote: Lote): number {
    return this.lotService.getDiasVida(lote.fechaInicio);
  }

  goToTimeline(lote: Lote): void {
    this.router.navigate(['/timeline', lote.id]);
  }

  openDialog(): void {
    this.editingLote = null;
    this.selectedGranja = '';
    this.galponesFiltrados.set([]);
    this.fechaInicioStr = format(new Date(), 'yyyy-MM-dd');
    this.loteForm = { galponId: '', nombre: '', raza: 'COBB 500', cantidadInicial: 1000, precioPollito: 0, pesoInicial: 45 };
    this.dialogVisible.set(true);
  }

  editLote(lote: Lote): void {
    this.editingLote = lote;
    this.loteForm = { ...lote };
    this.selectedGranja = lote.galpon?.granjaId || '';
    this.galponesFiltrados.set(this.galpones().filter(g => g.granjaId === this.selectedGranja));
    this.fechaInicioStr = lote.fechaInicio;
    this.dialogVisible.set(true);
  }

  async saveLote(): Promise<void> {
    if (!this.loteForm.galponId || !this.loteForm.cantidadInicial) {
      alert('Completa los campos requeridos'); return;
    }
    try {
      const data = { ...this.loteForm, fechaInicio: this.fechaInicioStr };
      if (this.editingLote) {
        await this.lotService.updateLote(this.editingLote.id!, data);
      } else {
        await this.lotService.createLote(data);
      }
      this.dialogVisible.set(false);
      await this.loadData();
    } catch (e: any) { alert(e.message); }
  }

  ngOnDestroy(): void {
    if (this.refreshSub) this.refreshSub.unsubscribe();
  }
}
