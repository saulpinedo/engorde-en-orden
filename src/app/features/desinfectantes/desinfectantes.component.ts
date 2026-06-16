import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LotService, DesinfectanteCatalogo } from '../../core/services/lot.service';

@Component({
  selector: 'app-desinfectantes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div><h1>🧴 Desinfectantes</h1><p class="subtitle">Catálogo de desinfectantes disponibles</p></div>
        <button class="btn-primary" (click)="openDialog()">➕ Nuevo Desinfectante</button>
      </div>

      <div class="card">
        <table class="data-table">
          <thead><tr><th>Nombre</th><th>Precio</th><th>Unidad</th><th>Acciones</th></tr></thead>
          <tbody>
            @for (c of catalog(); track c.id) {
              <tr>
                <td><strong>{{ c.nombre }}</strong></td>
                <td>{{ c.precioUnitario ? c.precioUnitario + ' Bs' : '-' }}</td>
                <td>{{ c.unidad || '-' }}</td>
                <td>
                  <button class="btn-icon" (click)="edit(c)" title="Editar">✏️</button>
                  <button class="btn-icon" (click)="delete(c)" title="Eliminar">🗑️</button>
                </td>
              </tr>
            }
            @empty { <tr><td colspan="4" class="text-center">No hay desinfectantes registrados</td></tr> }
          </tbody>
        </table>
      </div>

      @if (dialogVisible()) {
        <div class="modal-overlay" (click)="dialogVisible.set(false)">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>{{ editing() ? 'Editar' : 'Nuevo Desinfectante' }}</h3>
            <div class="form-group"><label>Nombre</label><input type="text" [(ngModel)]="form.nombre" class="input-field"/></div>
            <div class="form-row">
              <div class="form-group"><label>Precio (Bs)</label><input type="number" [(ngModel)]="form.precioUnitario" step="0.01" class="input-field"/></div>
              <div class="form-group"><label>Unidad</label><select [(ngModel)]="form.unidad" class="input-field"><option value="Lt">Litros</option><option value="ml">ml</option><option value="kg">Kg</option><option value="und">Unidad</option></select></div>
            </div>
            <div class="form-group"><label>Descripción</label><input type="text" [(ngModel)]="form.descripcion" class="input-field"/></div>
            <div class="modal-actions">
              <button class="btn-secondary" (click)="dialogVisible.set(false)">Cancelar</button>
              <button class="btn-primary" (click)="save()">Guardar</button>
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
    .btn-icon { background: none; border: none; cursor: pointer; padding: 0.25rem; }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .modal { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 400px; }
    .modal h3 { margin: 0 0 1.5rem 0; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
    .form-row { display: flex; gap: 1rem; }
    .form-row .form-group { flex: 1; }
    .input-field { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; }
    .modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; }
  `]
})
export class DesinfectantesComponent implements OnInit {
  private lotService = inject(LotService);

  catalog = signal<DesinfectanteCatalogo[]>([]);
  dialogVisible = signal(false);
  editing = signal<DesinfectanteCatalogo | null>(null);
  form: any = {};

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    const data = await this.lotService.getDesinfectantesCatalogo();
    this.catalog.set(data);
  }

  openDialog(): void {
    this.editing.set(null);
    this.form = { unidad: 'Lt' };
    this.dialogVisible.set(true);
  }

  edit(c: DesinfectanteCatalogo): void {
    this.editing.set(c);
    this.form = { ...c };
    this.dialogVisible.set(true);
  }

  async save(): Promise<void> {
    if (!this.form.nombre) { alert('Ingresa el nombre'); return; }
    try {
      if (this.editing()) {
        await this.lotService.updateDesinfectanteCatalogo(this.editing()!.id!, this.form);
      } else {
        await this.lotService.createDesinfectanteCatalogo(this.form);
      }
      this.dialogVisible.set(false);
      await this.load();
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  }

  async delete(c: DesinfectanteCatalogo): Promise<void> {
    if (!confirm('¿Eliminar "' + c.nombre + '"?')) return;
    await this.lotService.deleteDesinfectanteCatalogo(c.id!);
    await this.load();
  }
}