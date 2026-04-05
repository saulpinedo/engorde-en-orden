import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LotService, Lote, ConsumoDiario } from '../../core/services/lot.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-consumo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div><h1>Consumo de Alimento</h1><p class="subtitle">Controla el consumo diario de alimento por lote</p></div>
        <button class="btn-primary" (click)="openDialog()">🌽 Registrar Consumo</button>
      </div>
      <div class="card">
        <table class="data-table">
          <thead><tr><th>Fecha</th><th>Lote</th><th>Etapa</th><th>Cantidad</th><th>Consumo/Pollo</th></tr></thead>
          <tbody>
            @for (reg of registros; track reg.id) {
              <tr><td>{{ reg.fecha | date:'dd/MM/yyyy' }}</td><td>{{ reg.lote?.nombre || 'Lote' }}</td><td><span class="tag tag-{{ reg.etapa?.toLowerCase() }}">{{ reg.etapa }}</span></td><td><strong>{{ reg.cantidad_kg }} kg</strong></td><td>{{ getConsumoPorPollo(reg) | number:'1.2-2' }}g</td></tr>
            }
            @empty { <tr><td colspan="5" class="text-center">No hay registros</td></tr> }
          </tbody>
        </table>
      </div>
      @if (dialogVisible) {
        <div class="modal-overlay" (click)="dialogVisible = false">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>Registrar Consumo</h3>
            <div class="form-group"><label>Lote</label><select [(ngModel)]="form.lote_id" (change)="onLoteChange()" class="input-field"><option value="">Seleccionar</option>@for (l of lotes; track l.id) { <option [value]="l.id">{{ l.nombre || 'Lote ' + l.id?.slice(0,4) }}</option> }</select></div>
            <div class="form-group"><label>Fecha</label><input type="date" [(ngModel)]="form.fecha" class="input-field"/></div>
            <div class="form-group"><label>Cantidad (kg)</label><input type="number" [(ngModel)]="form.cantidad_kg" step="0.5" class="input-field"/></div>
            <div class="form-group"><label>Etapa</label><select [(ngModel)]="form.etapa" class="input-field"><option value="INICIO">INICIO</option><option value="CRECIMIENTO">CRECIMIENTO</option><option value="ENGORDE">ENGORDE</option></select></div>
            <div class="modal-actions"><button class="btn-secondary" (click)="dialogVisible = false">Cancelar</button><button class="btn-primary" (click)="save()">Guardar</button></div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [` .page-container { max-width: 1200px; margin: 0 auto; } .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; } .page-header h1 { margin: 0; color: #2B2B2B; } .subtitle { margin: 0.25rem 0 0 0; color: #666; } .card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); } .data-table { width: 100%; border-collapse: collapse; } .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #eee; } .data-table th { background: #f8f9fa; font-weight: 600; } .tag { padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; } .tag-inicio { background: #d4edda; color: #155724; } .tag-crecimiento { background: #d1ecf1; color: #0c5460; } .tag-engorde { background: #fff3cd; color: #856404; } .text-center { text-align: center; } .btn-primary { background: #FFC107; color: #2B2B2B; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; } .btn-secondary { background: #e9ecef; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; } .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; } .modal { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 400px; } .modal h3 { margin: 0 0 1.5rem 0; } .form-group { margin-bottom: 1rem; } .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; } .input-field { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; } .modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; } `]
})
export class ConsumoComponent implements OnInit, OnDestroy {
  private lotService = inject(LotService);
  private authService = inject(AuthService);
  private authSub: any;
  registros: any[] = []; lotes: Lote[] = []; dialogVisible = false; form: any = { cantidad_kg: 0, etapa: 'INICIO' };
  async ngOnInit(): Promise<void> { 
    this.lotes = await this.lotService.getLotes(); 
    await this.loadData();
    this.authSub = this.authService.authChange?.subscribe(() => this.loadData());
  }
  ngOnDestroy(): void { if (this.authSub) this.authSub.unsubscribe(); }
  async loadData(): Promise<void> { const all: any[] = []; for (const l of this.lotes) { const c: any[] = await this.lotService.getConsumos(l.id!); c.forEach(x => x.lote = l); all.push(...c); } this.registros = all.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()); }
  onLoteChange(): void { const l = this.lotes.find(x => x.id === this.form.lote_id); if (l) this.form.etapa = l.etapa_actual; }
  getConsumoPorPollo(reg: any): number { return reg.lote ? (reg.cantidad_kg * 1000) / reg.lote.cantidad_actual : 0; }
  openDialog(): void { this.form = { cantidad_kg: 0, etapa: 'INICIO' }; this.dialogVisible = true; }
  async save(): Promise<void> { if (!this.form.lote_id || !this.form.fecha || !this.form.cantidad_kg) { alert('Completa los campos'); return; } await this.lotService.createConsumo({ ...this.form, fecha: this.form.fecha } as ConsumoDiario); this.dialogVisible = false; await this.loadData(); }
}
