import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LotService, FaseAlimento } from '../../core/services/lot.service';

@Component({
  selector: 'app-fases-alimento',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Fases de Alimento</h1>
        <p class="subtitle">Precios por tonelada (Bs) - Editar cuando cambien los costos</p>
      </div>

      @if (loading()) {
        <div class="loading">Cargando...</div>
      } @else {
        <div class="fases-grid">
          @for (fase of fases(); track fase.id) {
            <div class="fase-card" [class]="'fase-' + getColorClass(fase)">
              <div class="fase-header">
                <h2>{{ fase.nombre }}</h2>
                <span class="dias-range">Días {{ fase.diaInicio }} - {{ fase.diaFin }}</span>
              </div>
              
              <div class="fase-stats">
                <div class="stat">
                  <span class="stat-label">Toneladas base</span>
                  <span class="stat-value">{{ fase.toneladasBase | number:'1.2-2' }} Tn</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Costo estimado</span>
                  <span class="stat-value">{{ getCostoTotal(fase) | number:'1.2-2' }} Bs</span>
                </div>
              </div>

              <div class="precio-section">
                <label>Precio por Tn (Bs)</label>
                <div class="precio-input-group">
                  <input 
                    type="number" 
                    [(ngModel)]="fase.precioTn"
                    (blur)="savePrecio(fase)"
                    class="precio-input"
                    step="10"
                  />
                  <span class="bs-label">Bs/Tn</span>
                </div>
              </div>
            </div>
          }
        </div>

        <div class="resumen-card">
          <h3>Resumen de Costo de Alimento (10,000 pollos)</h3>
          <div class="resumen-stats">
            <div class="resumen-stat">
              <span class="label">Total Toneladas</span>
              <span class="value">{{ getTotalToneladas() | number:'1.2-2' }} Tn</span>
            </div>
            <div class="resumen-stat highlight">
              <span class="label">Costo Total Alimento</span>
              <span class="value">{{ getCostoTotalGeneral() | number:'1.2-2' }} Bs</span>
            </div>
            <div class="resumen-stat">
              <span class="label">Costo Promedio / Tn</span>
              <span class="value">{{ getCostoPromedioTn() | number:'1.2-2' }} Bs/Tn</span>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { max-width: 1000px; margin: 0 auto; padding: 1rem; }
    .page-header { margin-bottom: 1.5rem; }
    .page-header h1 { margin: 0; color: var(--dark-color); }
    .subtitle { margin: 0.5rem 0 0 0; color: #666; }
    .loading { text-align: center; padding: 3rem; color: #666; }
    
    .fases-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .fase-card { background: white; border-radius: 16px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-top: 6px solid #ccc; }
    .fase-f0 { border-top-color: var(--primary-color); }
    .fase-f1 { border-top-color: #FF9800; }
    .fase-f2 { border-top-color: var(--secondary-color); }
    .fase-f3 { border-top-color: #6f42c1; }
    
    .fase-header { margin-bottom: 1rem; }
    .fase-header h2 { margin: 0; color: var(--dark-color); font-size: 1.25rem; }
    .dias-range { font-size: 0.875rem; color: #666; }
    
    .fase-stats { display: flex; gap: 1rem; margin-bottom: 1rem; }
    .stat { flex: 1; }
    .stat-label { display: block; font-size: 0.75rem; color: #666; margin-bottom: 0.25rem; }
    .stat-value { font-size: 1rem; font-weight: 600; }
    
    .precio-section { background: #f8f9fa; border-radius: 8px; padding: 1rem; }
    .precio-section label { display: block; font-size: 0.75rem; color: #666; margin-bottom: 0.5rem; }
    .precio-input-group { display: flex; align-items: center; gap: 0.5rem; }
    .precio-input { width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 6px; font-size: 1.25rem; font-weight: 600; text-align: right; }
    .precio-input:focus { outline: none; border-color: var(--primary-color); }
    .bs-label { font-size: 0.875rem; color: #666; }
    
    .resumen-card { background: linear-gradient(135deg, var(--dark-color) 0%, #3d3d3d 100%); border-radius: 16px; padding: 1.5rem; color: white; }
    .resumen-card h3 { margin: 0 0 1rem 0; font-size: 1rem; opacity: 0.9; }
    .resumen-stats { display: flex; gap: 2rem; flex-wrap: wrap; }
    .resumen-stat { text-align: center; }
    .resumen-stat .label { display: block; font-size: 0.75rem; opacity: 0.7; margin-bottom: 0.25rem; }
    .resumen-stat .value { font-size: 1.5rem; font-weight: 700; }
    .resumen-stat.highlight .value { color: var(--primary-color); }
    
    @media (max-width: 768px) {
      .resumen-stats { flex-direction: column; gap: 1rem; }
      .resumen-stat { display: flex; justify-content: space-between; align-items: center; }
    }
  `]
})
export class FasesAlimentoComponent implements OnInit {
  private lotService = inject(LotService);

  fases = signal<FaseAlimento[]>([]);
  loading = signal(true);

  async ngOnInit(): Promise<void> {
    await this.loadFases();
  }

  async loadFases(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.lotService.getFasesAlimento();
      this.fases.set(data);
    } catch (e) {
      console.error('Error loading fases:', e);
    } finally {
      this.loading.set(false);
    }
  }

  getColorClass(fase: FaseAlimento): string {
    if (fase.nombre.includes('F0') || fase.nombre.includes('Inicio')) return 'f0';
    if (fase.nombre.includes('F1') || fase.nombre.includes('Crecimiento')) return 'f1';
    if (fase.nombre.includes('F2') || fase.nombre.includes('Engorde')) return 'f2';
    return 'f3';
  }

  getCostoTotal(fase: FaseAlimento): number {
    return fase.toneladasBase * fase.precioTn;
  }

  getTotalToneladas(): number {
    return this.fases().reduce((sum, f) => sum + f.toneladasBase, 0);
  }

  getCostoTotalGeneral(): number {
    return this.fases().reduce((sum, f) => sum + this.getCostoTotal(f), 0);
  }

  getCostoPromedioTn(): number {
    const totalTn = this.getTotalToneladas();
    if (totalTn === 0) return 0;
    return this.getCostoTotalGeneral() / totalTn;
  }

  async savePrecio(fase: FaseAlimento): Promise<void> {
    try {
      await this.lotService.updateFaseAlimento(fase.id!, { precioTn: fase.precioTn });
    } catch (e: any) {
      alert('Error al guardar: ' + e.message);
      await this.loadFases();
    }
  }
}
