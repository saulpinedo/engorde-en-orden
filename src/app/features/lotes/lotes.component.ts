import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LotService, Lote, Granja, Galpon } from '../../core/services/lot.service';
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
      
      <div class="card">
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
            @for (lote of lotes; track lote.id) {
              <tr>
                <td><strong>{{ lote.nombre || 'Lote ' + lote.id?.slice(0,4) }}</strong></td>
                <td>{{ lote.galpon?.granja?.nombre }} / {{ lote.galpon?.nombre }}</td>
                <td>{{ lote.raza }}</td>
                <td>{{ getDiasVida(lote) }}</td>
                <td><span class="tag" [class]="'tag-' + lote.etapa_actual.toLowerCase()">{{ lote.etapa_actual }}</span></td>
                <td>{{ lote.cantidad_actual | number }} / {{ lote.cantidad_inicial | number }}</td>
                <td>
                  <button class="btn-icon" (click)="goToTimeline(lote)">📅</button>
                  <button class="btn-icon" (click)="editLote(lote)">✏️</button>
                </td>
              </tr>
            }
            @empty {
              <tr><td colspan="7" class="text-center">No hay lotes registrados</td></tr>
            }
          </tbody>
        </table>
      </div>
      
      @if (dialogVisible) {
        <div class="modal-overlay" (click)="dialogVisible = false">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>{{ editingLote ? 'Editar Lote' : 'Nuevo Lote' }}</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Granja</label>
                <select [(ngModel)]="selectedGranja" (change)="onGranjaChange()" class="input-field">
                  <option value="">Seleccionar granja</option>
                  @for (g of granjas; track g.id) {
                    <option [value]="g.id">{{ g.nombre }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>Galpón</label>
                <select [(ngModel)]="loteForm.galpon_id" class="input-field">
                  <option value="">Seleccionar galpón</option>
                  @for (g of galponesFiltrados; track g.id) {
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
                <input type="number" [(ngModel)]="loteForm.cantidad_inicial" min="1" class="input-field"/>
              </div>
              <div class="form-group">
                <label>Precio Pollito ($)</label>
                <input type="number" [(ngModel)]="loteForm.precio_pollito" step="0.01" class="input-field"/>
              </div>
              <div class="form-group">
                <label>Fecha Inicio</label>
                <input type="date" [(ngModel)]="fechaInicioStr" class="input-field"/>
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn-secondary" (click)="dialogVisible = false">Cancelar</button>
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
    .page-header h1 { margin: 0; color: #2B2B2B; }
    .subtitle { margin: 0.25rem 0 0 0; color: #666; }
    .card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; min-width: 800px; }
    .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #eee; }
    .data-table th { background: #f8f9fa; font-weight: 600; }
    .tag { padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .tag-inicio { background: #d4edda; color: #155724; }
    .tag-crecimiento { background: #d1ecf1; color: #0c5460; }
    .tag-engorde { background: #fff3cd; color: #856404; }
    .text-center { text-align: center; }
    .btn-primary { background: #FFC107; color: #2B2B2B; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-secondary { background: #e9ecef; color: #2B2B2B; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; }
    .btn-icon { background: none; border: none; cursor: pointer; font-size: 1.25rem; padding: 0.25rem; }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .modal { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
    .modal h3 { margin: 0 0 1.5rem 0; color: #2B2B2B; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { margin-bottom: 0.5rem; }
    .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #2B2B2B; }
    .input-field { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; }
    .input-field:focus { outline: none; border-color: #FFC107; }
    .modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; }
  `]
})
export class LotesComponent implements OnInit {
  private lotService = inject(LotService);
  private router = inject(Router);
  
  lotes: Lote[] = [];
  granjas: Granja[] = [];
  galpones: Galpon[] = [];
  galponesFiltrados: Galpon[] = [];
  dialogVisible = false;
  editingLote: Lote | null = null;
  selectedGranja = '';
  fechaInicioStr = format(new Date(), 'yyyy-MM-dd');
  
  loteForm: Partial<Lote> = { galpon_id: '', nombre: '', raza: 'COBB 500', cantidad_inicial: 1000, precio_pollito: 0, peso_inicial: 45 };
  razas = ['COBB 500', 'ROSS 308', 'HUBBARD', 'HYBRO', 'ARNOLD'];

  async ngOnInit(): Promise<void> {
    [this.lotes, this.granjas, this.galpones] = await Promise.all([
      this.lotService.getLotes(),
      this.lotService.getGranjas(),
      this.lotService.getGalpones()
    ]);
  }

  onGranjaChange(): void {
    this.galponesFiltrados = this.galpones.filter(g => g.granja_id === this.selectedGranja);
    this.loteForm.galpon_id = '';
  }

  getDiasVida(lote: Lote): number {
    return this.lotService.getDiasVida(lote.fecha_inicio);
  }

  goToTimeline(lote: Lote): void {
    this.router.navigate(['/timeline', lote.id]);
  }

  openDialog(): void {
    this.editingLote = null;
    this.selectedGranja = '';
    this.galponesFiltrados = [];
    this.fechaInicioStr = format(new Date(), 'yyyy-MM-dd');
    this.loteForm = { galpon_id: '', nombre: '', raza: 'COBB 500', cantidad_inicial: 1000, precio_pollito: 0, peso_inicial: 45 };
    this.dialogVisible = true;
  }

  editLote(lote: Lote): void {
    this.editingLote = lote;
    this.loteForm = { ...lote };
    this.selectedGranja = lote.galpon?.granja_id || '';
    this.galponesFiltrados = this.galpones.filter(g => g.granja_id === this.selectedGranja);
    this.fechaInicioStr = lote.fecha_inicio;
    this.dialogVisible = true;
  }

  async saveLote(): Promise<void> {
    if (!this.loteForm.galpon_id || !this.loteForm.cantidad_inicial) {
      alert('Completa los campos requeridos'); return;
    }
    try {
      const data = { ...this.loteForm, fecha_inicio: this.fechaInicioStr };
      if (this.editingLote) {
        await this.lotService.updateLote(this.editingLote.id!, data);
      } else {
        await this.lotService.createLote(data);
      }
      this.dialogVisible = false;
      [this.lotes, this.granjas, this.galpones] = await Promise.all([
        this.lotService.getLotes(),
        this.lotService.getGranjas(),
        this.lotService.getGalpones()
      ]);
    } catch (e: any) { alert(e.message); }
  }
}
