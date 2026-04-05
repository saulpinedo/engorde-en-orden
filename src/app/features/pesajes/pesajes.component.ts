import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LotService, Lote, Pesaje } from '../../core/services/lot.service';
import { format } from 'date-fns';

@Component({
  selector: 'app-pesajes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div><h1>Pesajes</h1><p class="subtitle">Registra el peso promedio de tus lotes</p></div>
        <button class="btn-primary" (click)="openDialog()">⚖️ Nuevo Pesaje</button>
      </div>
      <div class="card">
        <table class="data-table">
          <thead><tr><th>Fecha</th><th>Lote</th><th>Días</th><th>Peso Promedio</th><th>Muestra</th></tr></thead>
          <tbody>
            @for (reg of registros; track reg.id) {
              <tr><td>{{ reg.fecha | date:'dd/MM/yyyy' }}</td><td>{{ reg.lote?.nombre || 'Lote' }}</td><td>{{ getDiasVida(reg) }}</td><td><strong>{{ reg.peso_promedio }}g</strong></td><td>{{ reg.muestra }}</td></tr>
            }
            @empty { <tr><td colspan="5" class="text-center">No hay registros</td></tr> }
          </tbody>
        </table>
      </div>
      @if (dialogVisible) {
        <div class="modal-overlay" (click)="dialogVisible = false">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>Registrar Pesaje</h3>
            <div class="form-group"><label>Lote</label><select [(ngModel)]="form.lote_id" class="input-field"><option value="">Seleccionar</option>@for (l of lotes; track l.id) { <option [value]="l.id">{{ l.nombre || 'Lote ' + l.id?.slice(0,4) }}</option> }</select></div>
            <div class="form-group"><label>Fecha</label><input type="date" [(ngModel)]="form.fecha" class="input-field"/></div>
            <div class="form-group"><label>Peso Promedio (g)</label><input type="number" [(ngModel)]="form.peso_promedio" step="10" class="input-field"/></div>
            <div class="form-group"><label>Muestra</label><input type="number" [(ngModel)]="form.muestra" min="1" value="10" class="input-field"/></div>
            <div class="modal-actions"><button class="btn-secondary" (click)="dialogVisible = false">Cancelar</button><button class="btn-primary" (click)="save()">Guardar</button></div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [` .page-container { max-width: 1200px; margin: 0 auto; } .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; } .page-header h1 { margin: 0; color: #2B2B2B; } .subtitle { margin: 0.25rem 0 0 0; color: #666; } .card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); } .data-table { width: 100%; border-collapse: collapse; } .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #eee; } .data-table th { background: #f8f9fa; font-weight: 600; } .text-center { text-align: center; } .btn-primary { background: #FFC107; color: #2B2B2B; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; } .btn-secondary { background: #e9ecef; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; } .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; } .modal { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 400px; } .modal h3 { margin: 0 0 1.5rem 0; } .form-group { margin-bottom: 1rem; } .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; } .input-field { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; } .modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; } `]
})
export class PesajesComponent implements OnInit {
  private lotService = inject(LotService);
  registros: any[] = []; lotes: Lote[] = []; dialogVisible = false; form: any = { muestra: 10 };
  async ngOnInit(): Promise<void> { this.lotes = await this.lotService.getLotes(); await this.loadData(); }
  async loadData(): Promise<void> { const all: any[] = []; for (const l of this.lotes) { const p: any[] = await this.lotService.getPesajes(l.id!); p.forEach(x => x.lote = l); all.push(...p); } this.registros = all.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()); }
  getDiasVida(reg: any): number { const l = this.lotes.find(x => x.id === reg.lote_id); return l ? this.lotService.getDiasVida(l.fecha_inicio) : 0; }
  openDialog(): void { this.form = { muestra: 10 }; this.dialogVisible = true; }
  async save(): Promise<void> { if (!this.form.lote_id || !this.form.fecha || !this.form.peso_promedio) { alert('Completa los campos'); return; } await this.lotService.createPesaje({ ...this.form, fecha: this.form.fecha } as Pesaje); this.dialogVisible = false; await this.loadData(); }
}
