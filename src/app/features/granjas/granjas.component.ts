import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LotService, Granja } from '../../core/services/lot.service';

@Component({
  selector: 'app-granjas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Granjas</h1>
          <p class="subtitle">Gestiona tus granjas y ubicaciones</p>
        </div>
        <button class="btn-primary" (click)="openDialog()">➕ Nueva Granja</button>
      </div>
      
      <div class="card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Ubicación</th>
              <th>Fecha Creación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (granja of granjas(); track granja.id) {
              <tr>
                <td><strong>{{ granja.nombre }}</strong></td>
                <td>{{ granja.ubicacion || '-' }}</td>
                <td>{{ granja.createdAt | date:'dd/MM/yyyy' }}</td>
                <td>
                  <button class="btn-icon" (click)="editGranja(granja)">✏️</button>
                  <button class="btn-icon btn-danger" (click)="deleteGranja(granja)">🗑️</button>
                </td>
              </tr>
            }
            @empty {
              <tr><td colspan="4" class="text-center">No hay granjas registradas</td></tr>
            }
          </tbody>
        </table>
      </div>
      
      @if (dialogVisible()) {
        <div class="modal-overlay" (click)="dialogVisible.set(false)">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>{{ editingGranja ? 'Editar Granja' : 'Nueva Granja' }}</h3>
            <div class="form-group">
              <label>Nombre *</label>
              <input type="text" [(ngModel)]="granjaForm.nombre" placeholder="Nombre de la granja" class="input-field"/>
            </div>
            <div class="form-group">
              <label>Ubicación</label>
              <input type="text" [(ngModel)]="granjaForm.ubicacion" placeholder="Ciudad, departamento, etc." class="input-field"/>
            </div>
            <div class="modal-actions">
              <button class="btn-secondary" (click)="dialogVisible.set(false)">Cancelar</button>
              <button class="btn-primary" (click)="saveGranja()">{{ editingGranja ? 'Actualizar' : 'Crear' }}</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-header h1 { margin: 0; color: var(--dark-color); }
    .subtitle { margin: 0.25rem 0 0 0; color: #666; }
    .card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #eee; }
    .data-table th { background: #f8f9fa; font-weight: 600; }
    .text-center { text-align: center; }
    .btn-primary { background: var(--primary-color); color: var(--dark-color); border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-secondary { background: #e9ecef; color: var(--dark-color); border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; }
    .btn-icon { background: none; border: none; cursor: pointer; font-size: 1.25rem; padding: 0.25rem; }
    .btn-danger:hover { color: var(--secondary-color); }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .modal { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 450px; }
    .modal h3 { margin: 0 0 1.5rem 0; color: var(--dark-color); }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--dark-color); }
    .input-field { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; }
    .input-field:focus { outline: none; border-color: var(--primary-color); }
    .modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; }
  `]
})
export class GranjasComponent implements OnInit {
  private lotService = inject(LotService);
  
  granjas = signal<Granja[]>([]);
  dialogVisible = signal(false);
  editingGranja: Granja | null = null;
  granjaForm: Partial<Granja> = { nombre: '', ubicacion: '' };

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    const data = await this.lotService.getGranjas();
    this.granjas.set(data);
  }

  openDialog(): void {
    this.editingGranja = null;
    this.granjaForm = { nombre: '', ubicacion: '' };
    this.dialogVisible.set(true);
  }

  editGranja(granja: Granja): void {
    this.editingGranja = granja;
    this.granjaForm = { ...granja };
    this.dialogVisible.set(true);
  }

  async saveGranja(): Promise<void> {
    if (!this.granjaForm.nombre?.trim()) { alert('El nombre es requerido'); return; }
    try {
      if (this.editingGranja) {
        await this.lotService.updateGranja(this.editingGranja.id!, this.granjaForm);
      } else {
        await this.lotService.createGranja(this.granjaForm);
      }
      this.dialogVisible.set(false);
      await this.loadData();
    } catch (e: any) { alert(e.message); }
  }

  async deleteGranja(granja: Granja): Promise<void> {
    if (confirm(`¿Eliminar la granja "${granja.nombre}"?`)) {
      await this.lotService.deleteGranja(granja.id!);
      await this.loadData();
    }
  }
}
