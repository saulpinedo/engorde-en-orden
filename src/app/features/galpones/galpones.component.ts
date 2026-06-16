import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LotService, Granja, Galpon } from '../../core/services/lot.service';

@Component({
  selector: 'app-galpones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div><h1>Galpones</h1><p class="subtitle">Gestiona los galpones de tus granjas</p></div>
        <button class="btn-primary" (click)="openDialog()">📦 Nuevo Galpón</button>
      </div>
      <div class="card">
        <table class="data-table">
          <thead><tr><th>Nombre</th><th>Granja</th><th>Capacidad</th><th>Acciones</th></tr></thead>
          <tbody>
            @for (g of galpones(); track g.id) {
              <tr>
                <td><strong>{{ g.nombre }}</strong></td>
                <td>{{ g.granja?.nombre }}</td>
                <td>{{ g.capacidad ? g.capacidad + ' pollos' : '-' }}</td>
                <td>
                  <button class="btn-icon" (click)="editGalpon(g)" title="Editar">✏️</button>
                  <button class="btn-icon" (click)="deleteGalpon(g)" title="Eliminar">🗑️</button>
                </td>
              </tr>
            }
            @empty { <tr><td colspan="4" class="text-center">No hay galpones registrados</td></tr> }
          </tbody>
        </table>
      </div>
      @if (dialogVisible()) {
        <div class="modal-overlay" (click)="dialogVisible.set(false)">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>{{ editingGalpon() ? 'Editar Galpón' : 'Nuevo Galpón' }}</h3>
            <div class="form-group">
              <label>Granja</label>
              <select [(ngModel)]="form.granjaId" class="input-field">
                <option value="">Seleccionar</option>
                @for (g of granjas(); track g.id) {
                  <option [value]="g.id">{{ g.nombre }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Nombre</label>
              <input type="text" [(ngModel)]="form.nombre" placeholder="Ej: Galpón A" class="input-field"/>
            </div>
            <div class="form-group">
              <label>Capacidad</label>
              <input type="number" [(ngModel)]="form.capacidad" min="0" placeholder="Opcional" class="input-field"/>
            </div>
            <div class="modal-actions">
              @if (editingGalpon()) {
                <button class="btn-danger" (click)="deleteGalpon(form)">🗑️ Eliminar</button>
              }
              <button class="btn-secondary" (click)="dialogVisible.set(false)">Cancelar</button>
              <button class="btn-primary" (click)="save()">{{ editingGalpon() ? 'Actualizar' : 'Crear' }}</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-header h1 { margin: 0; color: #2B2B2B; }
    .subtitle { margin: 0.25rem 0 0 0; color: #666; }
    .card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #eee; }
    .data-table th { background: #f8f9fa; font-weight: 600; }
    .text-center { text-align: center; }
    .btn-primary { background: #FFC107; color: #2B2B2B; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-secondary { background: #e9ecef; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; }
    .btn-danger { background: #f8d7da; color: #D32F2F; border: none; padding: 0.75rem; border-radius: 8px; cursor: pointer; }
    .btn-icon { background: none; border: none; cursor: pointer; font-size: 1.25rem; padding: 0.25rem; }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .modal { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 400px; }
    .modal h3 { margin: 0 0 1.5rem 0; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
    .input-field { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; }
    .modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; }
  `]
})
export class GalponesComponent implements OnInit {
  private lotService = inject(LotService);
  
  galpones = signal<Galpon[]>([]);
  granjas = signal<Granja[]>([]);
  dialogVisible = signal(false);
  editingGalpon = signal<Galpon | null>(null);
  form: any = {};

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    const [galponesData, granjasData] = await Promise.all([
      this.lotService.getGalpones(),
      this.lotService.getGranjas()
    ]);
    this.galpones.set(galponesData);
    this.granjas.set(granjasData);
  }

  openDialog(): void {
    this.editingGalpon.set(null);
    this.form = {};
    this.dialogVisible.set(true);
  }

  editGalpon(galpon: Galpon): void {
    this.editingGalpon.set(galpon);
    this.form = { ...galpon, granjaId: galpon.granjaId };
    this.dialogVisible.set(true);
  }

  async save(): Promise<void> {
    if (!this.form.granjaId || !this.form.nombre) { alert('Completa los campos'); return; }

    const dataToSave = {
      nombre: this.form.nombre,
      granjaId: this.form.granjaId,
      capacidad: this.form.capacidad || null
    };
    
    if (this.editingGalpon()) {
      await this.lotService.updateGalpon(this.editingGalpon()!.id!, dataToSave);
    } else {
      await this.lotService.createGalpon(dataToSave);
    }
    this.dialogVisible.set(false);
    await this.loadData();
  }

  async deleteGalpon(g: Galpon): Promise<void> {
    if (confirm(`¿Eliminar "${g.nombre}"?`)) {
      await this.lotService.deleteGalpon(g.id!);
      this.dialogVisible.set(false);
      await this.loadData();
    }
  }
}
