import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LotService, Lote } from '../../core/services/lot.service';
import { format } from 'date-fns';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      @if (lote) {
        <div class="page-header">
          <div>
            <h1>Timeline - {{ lote.nombre || 'Lote' }}</h1>
            <p class="subtitle">{{ lote.galpon?.granja?.nombre }} / {{ lote.galpon?.nombre }}</p>
          </div>
          <div class="header-actions">
            <button class="btn-danger" (click)="openMortalidadDialog()">💔 Mortalidad</button>
            <button class="btn-success" (click)="openConsumoDialog()">🌽 Consumo</button>
            <button class="btn-info" (click)="openPesajeDialog()">⚖️ Pesaje</button>
          </div>
        </div>
        
        <div class="stats-row">
          <div class="stat"><span class="stat-label">Días</span><span class="stat-value">{{ diasVida }}</span></div>
          <div class="stat"><span class="stat-label">Etapa</span><span class="tag" [class]="'tag-' + lote.etapa_actual.toLowerCase()">{{ lote.etapa_actual }}</span></div>
          <div class="stat"><span class="stat-label">Pollos</span><span class="stat-value">{{ lote.cantidad_actual | number }}</span></div>
          <div class="stat"><span class="stat-label">Mortalidad</span><span class="stat-value text-danger">{{ mortalidad }}%</span></div>
        </div>
        
        <div class="card">
          <h3>Línea de Tiempo</h3>
          <div class="timeline-scroll">
            @for (event of timelineEvents; track event.day) {
              <div class="timeline-day" [class]="'etapa-' + event.etapa.toLowerCase()" [class.hoy]="isToday(event.date)" [class.pasado]="isPasado(event.date)">
                <div class="day-header">Día {{ event.day }}<br/><small>{{ formatDate(event.date) }}</small></div>
                <div class="day-events">
                  @if (event.tipo === 'mortalidad') { <div class="event-badge mortalidad">💔 {{ event.cantidad }}</div> }
                  @if (event.tipo === 'consumo') { <div class="event-badge consumo">🌽 {{ event.cantidad }}kg</div> }
                  @if (event.tipo === 'pesaje') { <div class="event-badge pesaje">⚖️ {{ event.peso }}g</div> }
                </div>
              </div>
            }
          </div>
          <div class="timeline-legend">
            <span class="legend-item"><span class="legend-color inicio"></span> Inicio (1-10)</span>
            <span class="legend-item"><span class="legend-color crecimiento"></span> Crecimiento (11-25)</span>
            <span class="legend-item"><span class="legend-color engorde"></span> Engorde (26+)</span>
          </div>
        </div>
      } @else {
        <div class="loading">Cargando...</div>
      }
      
      @if (mortalidadDialogVisible) {
        <div class="modal-overlay" (click)="mortalidadDialogVisible = false">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>Registrar Mortalidad</h3>
            <div class="form-group"><label>Fecha</label><input type="date" [(ngModel)]="mortalidadForm.fecha" class="input-field"/></div>
            <div class="form-group"><label>Cantidad</label><input type="number" [(ngModel)]="mortalidadForm.cantidad" min="1" class="input-field"/></div>
            <div class="form-group"><label>Causa</label><input type="text" [(ngModel)]="mortalidadForm.causa" placeholder="Opcional" class="input-field"/></div>
            <div class="modal-actions">
              <button class="btn-secondary" (click)="mortalidadDialogVisible = false">Cancelar</button>
              <button class="btn-primary" (click)="saveMortalidad()">Guardar</button>
            </div>
          </div>
        </div>
      }
      
      @if (consumoDialogVisible) {
        <div class="modal-overlay" (click)="consumoDialogVisible = false">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>Registrar Consumo</h3>
            <div class="form-group"><label>Fecha</label><input type="date" [(ngModel)]="consumoForm.fecha" class="input-field"/></div>
            <div class="form-group"><label>Cantidad (kg)</label><input type="number" [(ngModel)]="consumoForm.cantidad_kg" step="0.5" class="input-field"/></div>
            <div class="modal-actions">
              <button class="btn-secondary" (click)="consumoDialogVisible = false">Cancelar</button>
              <button class="btn-primary" (click)="saveConsumo()">Guardar</button>
            </div>
          </div>
        </div>
      }
      
      @if (pesajeDialogVisible) {
        <div class="modal-overlay" (click)="pesajeDialogVisible = false">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>Registrar Pesaje</h3>
            <div class="form-group"><label>Fecha</label><input type="date" [(ngModel)]="pesajeForm.fecha" class="input-field"/></div>
            <div class="form-group"><label>Peso Promedio (g)</label><input type="number" [(ngModel)]="pesajeForm.peso_promedio" step="10" class="input-field"/></div>
            <div class="form-group"><label>Muestra</label><input type="number" [(ngModel)]="pesajeForm.muestra" min="1" class="input-field"/></div>
            <div class="modal-actions">
              <button class="btn-secondary" (click)="pesajeDialogVisible = false">Cancelar</button>
              <button class="btn-primary" (click)="savePesaje()">Guardar</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { max-width: 1400px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
    .page-header h1 { margin: 0; color: #2B2B2B; }
    .subtitle { margin: 0.25rem 0 0 0; color: #666; }
    .header-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
    .stat { background: white; padding: 1rem; border-radius: 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .stat-label { display: block; font-size: 0.75rem; color: #666; }
    .stat-value { font-size: 1.5rem; font-weight: 700; }
    .text-danger { color: #d32f2f; }
    .card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 1.5rem; }
    .card h3 { margin: 0 0 1rem 0; }
    .timeline-scroll { display: flex; gap: 0.75rem; overflow-x: auto; padding: 0.5rem 0; }
    .timeline-day { min-width: 100px; border-radius: 8px; padding: 0.75rem; border: 2px solid; }
    .timeline-day.etapa-inicio { background: rgba(40,167,69,0.1); border-color: #28a745; }
    .timeline-day.etapa-crecimiento { background: rgba(23,162,184,0.1); border-color: #17a2b8; }
    .timeline-day.etapa-engorde { background: rgba(255,193,7,0.1); border-color: #FFC107; }
    .timeline-day.hoy { box-shadow: 0 0 0 3px #2B2B2B; }
    .timeline-day.pasado { opacity: 0.7; }
    .day-header { text-align: center; font-weight: 700; font-size: 0.875rem; margin-bottom: 0.5rem; }
    .day-header small { font-weight: normal; color: #666; }
    .day-events { display: flex; flex-direction: column; gap: 0.25rem; }
    .event-badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; text-align: center; }
    .event-badge.mortalidad { background: #f8d7da; color: #721c24; }
    .event-badge.consumo { background: #d4edda; color: #155724; }
    .event-badge.pesaje { background: #d1ecf1; color: #0c5460; }
    .timeline-legend { display: flex; gap: 1.5rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee; }
    .legend-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; }
    .legend-color { width: 16px; height: 16px; border-radius: 4px; }
    .legend-color.inicio { background: #28a745; }
    .legend-color.crecimiento { background: #17a2b8; }
    .legend-color.engorde { background: #FFC107; }
    .tag { padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.875rem; font-weight: 600; display: inline-block; }
    .tag-inicio { background: #d4edda; color: #155724; }
    .tag-crecimiento { background: #d1ecf1; color: #0c5460; }
    .tag-engorde { background: #fff3cd; color: #856404; }
    .loading { text-align: center; padding: 3rem; color: #666; }
    .btn-primary { background: #FFC107; color: #2B2B2B; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-secondary { background: #e9ecef; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; }
    .btn-danger { background: #f8d7da; color: #D32F2F; border: none; padding: 0.75rem 1rem; border-radius: 8px; cursor: pointer; }
    .btn-success { background: #d4edda; color: #28a745; border: none; padding: 0.75rem 1rem; border-radius: 8px; cursor: pointer; }
    .btn-info { background: #d1ecf1; color: #17a2b8; border: none; padding: 0.75rem 1rem; border-radius: 8px; cursor: pointer; }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .modal { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 400px; }
    .modal h3 { margin: 0 0 1.5rem 0; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
    .input-field { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; }
    .input-field:focus { outline: none; border-color: #FFC107; }
    .modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; }
    @media (max-width: 768px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
  `]
})
export class TimelineComponent implements OnInit {
  private lotService = inject(LotService);
  lote: Lote | null = null;
  diasVida = 0;
  mortalidad = 0;
  today = new Date();
  
  timelineEvents: any[] = [];
  
  mortalidadDialogVisible = false;
  mortalidadForm: any = { cantidad: 1 };
  
  consumoDialogVisible = false;
  consumoForm: any = { cantidad_kg: 0 };
  
  pesajeDialogVisible = false;
  pesajeForm: any = { muestra: 10 };

  async ngOnInit(): Promise<void> {
    const lotes = await this.lotService.getLotes();
    const activo = lotes.find(l => l.estado === 'ACTIVO');
    if (activo) await this.loadLote(activo.id!);
  }

  async loadLote(id: string): Promise<void> {
    this.lote = await this.lotService.getLote(id);
    if (this.lote) {
      this.diasVida = this.lotService.getDiasVida(this.lote.fecha_inicio);
      this.mortalidad = Math.round((1 - this.lote.cantidad_actual / this.lote.cantidad_inicial) * 100 * 10) / 10;
      await this.buildTimeline();
    }
  }

  async buildTimeline(): Promise<void> {
    if (!this.lote) return;
    const [mortalidades, consumos, pesajes] = await Promise.all([
      this.lotService.getMortalidades(this.lote.id!),
      this.lotService.getConsumos(this.lote.id!),
      this.lotService.getPesajes(this.lote.id!)
    ]);
    
    this.timelineEvents = [];
    const days = Math.min(this.diasVida, 45);
    for (let i = 0; i < days; i++) {
      const date = new Date(this.lote.fecha_inicio);
      date.setDate(date.getDate() + i);
      const etapa = this.lotService.getEtapaActual(i + 1);
      const mort = mortalidades.find(m => m.fecha === format(date, 'yyyy-MM-dd'));
      const cons = consumos.find(c => c.fecha === format(date, 'yyyy-MM-dd'));
      const pes = pesajes.find(p => p.fecha === format(date, 'yyyy-MM-dd'));
      this.timelineEvents.push({ date, day: i + 1, etapa, ...(mort && { tipo: 'mortalidad', cantidad: mort.cantidad }), ...(cons && { tipo: 'consumo', cantidad: cons.cantidad_kg }), ...(pes && { tipo: 'pesaje', peso: pes.peso_promedio }) });
    }
  }

  isToday(date: Date): boolean { return date.toDateString() === this.today.toDateString(); }
  isPasado(date: Date): boolean { return date < this.today && !this.isToday(date); }
  formatDate(date: Date): string { return format(date, 'dd/MM'); }

  openMortalidadDialog(): void { this.mortalidadForm = { cantidad: 1 }; this.mortalidadDialogVisible = true; }
  openConsumoDialog(): void { this.consumoForm = { cantidad_kg: 0 }; this.consumoDialogVisible = true; }
  openPesajeDialog(): void { this.pesajeForm = { muestra: 10 }; this.pesajeDialogVisible = true; }

  async saveMortalidad(): Promise<void> {
    if (!this.lote) return;
    await this.lotService.createMortalidad({ ...this.mortalidadForm, lote_id: this.lote.id!, fecha: this.mortalidadForm.fecha } as any);
    this.mortalidadDialogVisible = false;
    await this.loadLote(this.lote.id!);
  }

  async saveConsumo(): Promise<void> {
    if (!this.lote) return;
    await this.lotService.createConsumo({ ...this.consumoForm, lote_id: this.lote.id!, fecha: this.consumoForm.fecha, etapa: this.lote.etapa_actual } as any);
    this.consumoDialogVisible = false;
    await this.loadLote(this.lote.id!);
  }

  async savePesaje(): Promise<void> {
    if (!this.lote) return;
    await this.lotService.createPesaje({ ...this.pesajeForm, lote_id: this.lote.id!, fecha: this.pesajeForm.fecha } as any);
    this.pesajeDialogVisible = false;
    await this.loadLote(this.lote.id!);
  }
}
