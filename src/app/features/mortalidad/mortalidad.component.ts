import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LotService, Lote, Mortalidad } from '../../core/services/lot.service';
import { format } from 'date-fns';

@Component({
  selector: 'app-mortalidad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div><h1>Mortalidad</h1><p class="subtitle">Registra las bajas de tus lotes</p></div>
        <button class="btn-primary" (click)="openDialog()">💔 Registrar Baja</button>
      </div>
      <div class="card">
        <table class="data-table">
          <thead><tr><th>Fecha</th><th>Lote</th><th>Cantidad</th><th>Causa</th></tr></thead>
          <tbody>
            @for (reg of registros; track reg.id) {
              <tr><td>{{ reg.fecha | date:'dd/MM/yyyy' }}</td><td>{{ reg.lote?.nombre || 'Lote' }}</td><td class="text-danger">{{ reg.cantidad }}</td><td>{{ reg.causa || '-' }}</td></tr>
            }
            @empty { <tr><td colspan="4" class="text-center">No hay registros</td></tr> }
          </tbody>
        </table>
      </div>
      @if (dialogVisible) {
        <div class="modal-overlay" (click)="dialogVisible = false">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>Registrar Mortalidad</h3>
            <div class="form-group"><label>Lote</label><select [(ngModel)]="form.lote_id" class="input-field"><option value="">Seleccionar</option>@for (l of lotes; track l.id) { <option [value]="l.id">{{ l.nombre || 'Lote ' + l.id?.slice(0,4) }}</option> }</select></div>
            <div class="form-group"><label>Fecha</label><input type="date" [(ngModel)]="form.fecha" class="input-field"/></div>
            <div class="form-group"><label>Cantidad</label><input type="number" [(ngModel)]="form.cantidad" min="1" class="input-field"/></div>
            <div class="form-group"><label>Causa</label><input type="text" [(ngModel)]="form.causa" placeholder="Opcional" class="input-field"/></div>
            <div class="modal-actions"><button class="btn-secondary" (click)="dialogVisible = false">Cancelar</button><button class="btn-primary" (click)="save()">Guardar</button></div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [` .page-container { max-width: 1200px; margin: 0 auto; } .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; } .page-header h1 { margin: 0; color: #2B2B2B; } .subtitle { margin: 0.25rem 0 0 0; color: #666; } .card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); } .data-table { width: 100%; border-collapse: collapse; } .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #eee; } .data-table th { background: #f8f9fa; font-weight: 600; } .text-center { text-align: center; } .text-danger { color: #d32f2f; font-weight: bold; } .btn-primary { background: #FFC107; color: #2B2B2B; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; } .btn-secondary { background: #e9ecef; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; } .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; } .modal { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 400px; } .modal h3 { margin: 0 0 1.5rem 0; } .form-group { margin-bottom: 1rem; } .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; } .input-field { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; } .modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; } `]
})
export class MortalidadComponent implements OnInit {
  private lotService = inject(LotService);
  registros: any[] = []; lotes: Lote[] = []; dialogVisible = false; form: any = { cantidad: 1 };
  async ngOnInit(): Promise<void> { this.lotes = await this.lotService.getLotes(); await this.loadData(); }
  async loadData(): Promise<void> { const all: any[] = []; for (const l of this.lotes) { const m: any[] = await this.lotService.getMortalidades(l.id!); m.forEach(x => x.lote = l); all.push(...m); } this.registros = all.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()); }
  openDialog(): void { this.form = { cantidad: 1 }; this.dialogVisible = true; }
  async save(): Promise<void> { if (!this.form.lote_id || !this.form.fecha || !this.form.cantidad) { alert('Completa los campos'); return; } await this.lotService.createMortalidad({ ...this.form, fecha: this.form.fecha } as Mortalidad); this.dialogVisible = false; await this.loadData(); }
}
