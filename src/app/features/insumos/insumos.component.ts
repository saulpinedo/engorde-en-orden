import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LotService, Insumo } from '../../core/services/lot.service';

@Component({
  selector: 'app-insumos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Insumos</h1>
          <p class="subtitle">Catálogo de productos para la crianza</p>
        </div>
        <button class="btn-primary" (click)="openDialog()">+ Nuevo Insumo</button>
      </div>

      <div class="tabs">
        @for (tipo of tipos; track tipo.value) {
          <button class="tab-btn" [class.active]="filtroTipo() === tipo.value" (click)="setFiltro(tipo.value)">
            {{ tipo.icon }} {{ tipo.label }} ({{ getCount(tipo.value) }})
          </button>
        }
      </div>

      <div class="card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Precio</th>
              <th>Días Aplic.</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (v of filteredInsumos(); track v.id) {
              <tr>
                <td><strong>{{ v.nombre }}</strong></td>
                <td>
                  <span class="badge-tipo" [class]="'tipo-' + (v.tipo || '').toLowerCase()">
                    {{ getTipoLabel(v.tipo!) }}
                  </span>
                </td>
                <td>{{ v.precioUnitario ? v.precioUnitario + ' Bs/' + (v.unidad || 'und') : '-' }}</td>
                <td>{{ v.diasAplicacion ? 'Día ' + v.diasAplicacion : '-' }}</td>
                <td>
                  <button class="btn-icon" (click)="editInsumo(v)" title="Editar">✏️</button>
                  <button class="btn-icon" (click)="deleteInsumo(v)" title="Eliminar">🗑️</button>
                </td>
              </tr>
            }
            @empty { <tr><td colspan="5" class="text-center">No hay insumos registrados</td></tr> }
          </tbody>
        </table>
      </div>

      @if (dialogVisible()) {
        <div class="modal-overlay" (click)="dialogVisible.set(false)">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>{{ editingInsumo() ? 'Editar Insumo' : 'Nuevo Insumo' }}</h3>
            <div class="form-group">
              <label>Tipo de Insumo</label>
              <select [(ngModel)]="form.tipo" class="input-field">
                <option value="VACUNA">💉 Vacuna</option>
                <option value="ANTIBIOTICO">💊 Antibiótico</option>
                <option value="VITAMINA">💊 Vitamina</option>
                <option value="DESINFECTANTE">🧴 Desinfectante</option>
              </select>
            </div>
            <div class="form-group">
              <label>Nombre</label>
              <input type="text" [(ngModel)]="form.nombre" placeholder="Ej: Gumboro" class="input-field"/>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Precio Unitario (Bs)</label>
                <input type="number" [(ngModel)]="form.precioUnitario" min="0" step="0.01" class="input-field"/>
              </div>
              <div class="form-group">
                <label>Unidad</label>
                <select [(ngModel)]="form.unidad" class="input-field">
                  <option value="dosis">Dosis</option>
                  <option value="Lt">Litros</option>
                  <option value="kg">Kg</option>
                  <option value="ml">ml</option>
                  <option value="und">Unidad</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Días de Aplicación (opcional)</label>
              <input type="number" [(ngModel)]="form.diasAplicacion" min="0" class="input-field"/>
            </div>
            <div class="form-group">
              <label>Descripción</label>
              <input type="text" [(ngModel)]="form.descripcion" placeholder="Notas adicionales" class="input-field"/>
            </div>
            <div class="modal-actions">
              @if (editingInsumo()) {
                <button class="btn-danger" (click)="confirmDelete()">🗑️ Eliminar</button>
              }
              <button class="btn-secondary" (click)="dialogVisible.set(false)">Cancelar</button>
              <button class="btn-primary" (click)="save()">{{ editingInsumo() ? 'Actualizar' : 'Crear' }}</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .page-header h1 { margin: 0; color: var(--dark-color); }
    .subtitle { margin: 0.25rem 0 0 0; color: #666; }
    .tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .tab-btn { padding: 0.5rem 1rem; background: white; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; font-weight: 500; }
    .tab-btn.active { background: var(--primary-color); border-color: var(--primary-color); color: var(--dark-color); }
    .card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #eee; }
    .data-table th { background: #f8f9fa; font-weight: 600; }
    .text-center { text-align: center; }
    .btn-primary { background: var(--primary-color); color: var(--dark-color); border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-secondary { background: #e9ecef; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; }
    .btn-danger { background: #f8d7da; color: var(--secondary-color); border: none; padding: 0.75rem; border-radius: 8px; cursor: pointer; }
    .btn-icon { background: none; border: none; cursor: pointer; font-size: 1.25rem; padding: 0.25rem; }
    .badge-tipo { padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .badge-tipo.tipo-vacuna { background: #d4edda; color: #155724; }
    .badge-tipo.tipo-antibiotico { background: #f8d7da; color: var(--secondary-color); }
    .badge-tipo.tipo-vitamina { background: #cce5ff; color: #004085; }
    .badge-tipo.tipo-desinfectante { background: #fff3cd; color: #856404; }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .modal { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 500px; }
    .modal h3 { margin: 0 0 1.5rem 0; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
    .form-row { display: flex; gap: 1rem; }
    .form-row .form-group { flex: 1; }
    .input-field { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; }
    .modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; }
  `]
})
export class InsumosComponent implements OnInit {
  private lotService = inject(LotService);
  
  insumos = signal<Insumo[]>([]);
  filtroTipo = signal<string>('TODOS');
  dialogVisible = signal(false);
  editingInsumo = signal<Insumo | null>(null);
  form: any = {};
  
  tipos = [
    { value: 'TODOS', label: 'Todos', icon: '📋' },
    { value: 'VACUNA', label: 'Vacunas', icon: '💉' },
    { value: 'ANTIBIOTICO', label: 'Antibióticos', icon: '💊' },
    { value: 'VITAMINA', label: 'Vitaminas', icon: '💧' },
    { value: 'DESINFECTANTE', label: 'Desinfectantes', icon: '🧴' }
  ];

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    const data = await this.lotService.getInsumos();
    this.insumos.set(data);
  }

  filteredInsumos(): Insumo[] {
    if (this.filtroTipo() === 'TODOS') return this.insumos();
    return this.insumos().filter(v => v.tipo === this.filtroTipo());
  }

  setFiltro(tipo: string): void {
    this.filtroTipo.set(tipo);
  }

  getCount(tipo: string): number {
    if (tipo === 'TODOS') return this.insumos().length;
    return this.insumos().filter(v => v.tipo === tipo).length;
  }

  getTipoLabel(tipo: string): string {
    const found = this.tipos.find(t => t.value === tipo);
    return found ? found.label : tipo;
  }

  openDialog(): void {
    this.editingInsumo.set(null);
    this.form = { tipo: 'VACUNA', unidad: 'dosis' };
    this.dialogVisible.set(true);
  }

  editInsumo(v: Insumo): void {
    this.editingInsumo.set(v);
    this.form = { ...v };
    this.dialogVisible.set(true);
  }

  async save(): Promise<void> {
    if (!this.form.nombre || !this.form.tipo) {
      alert('Completa los campos requeridos');
      return;
    }
    
    try {
      if (this.editingInsumo()) {
        await this.lotService.updateInsumo(this.editingInsumo()!.id!, this.form);
      } else {
        await this.lotService.createInsumo(this.form);
      }
      this.dialogVisible.set(false);
      await this.loadData();
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  }

  confirmDelete(): void {
    if (confirm('¿Eliminar "' + this.form.nombre + '"?')) {
      this.deleteInsumo(this.form);
    }
  }

  async deleteInsumo(v: Insumo): Promise<void> {
    if (!v.id) return;
    await this.lotService.deleteInsumo(v.id);
    this.dialogVisible.set(false);
    await this.loadData();
  }
}