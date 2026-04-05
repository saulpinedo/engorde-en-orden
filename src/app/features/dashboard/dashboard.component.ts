import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { LotService, Lote } from '../../core/services/lot.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard">
      <div class="page-header">
        <h1>Dashboard</h1>
        <p class="subtitle">Resumen de tu operación de engorde</p>
      </div>
      
      @if (loading) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Cargando datos...</p>
        </div>
      } @else {
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon verde">📦</div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.lotesActivos }}</span>
              <span class="stat-label">Lotes Activos</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon amarillo">🐔</div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.totalPollos | number }}</span>
              <span class="stat-label">Pollos en Granja</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon rojo">💔</div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.mortalidadPromedio | number:'1.1-1' }}%</span>
              <span class="stat-label">Mortalidad Promedio</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon azul">⚖️</div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.pesoPromedio | number:'1.1-1' }}g</span>
              <span class="stat-label">Peso Promedio</span>
            </div>
          </div>
        </div>
        
        <div class="content-grid">
          <div class="card">
            <div class="card-header">
              <h2>Lotes Activos</h2>
              <a routerLink="/lotes" class="link">Ver todos →</a>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Lote</th>
                  <th>Granja/Galpón</th>
                  <th>Días</th>
                  <th>Etapa</th>
                  <th>Pollos</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (lote of lotes.slice(0, 5); track lote.id) {
                  <tr>
                    <td><strong>{{ lote.nombre || 'Lote ' + lote.id?.slice(0,4) }}</strong></td>
                    <td>{{ lote.galpon?.granja?.nombre }} / {{ lote.galpon?.nombre }}</td>
                    <td>{{ getDiasVida(lote) }}</td>
                    <td><span class="tag" [class]="'tag-' + lote.etapa_actual.toLowerCase()">{{ lote.etapa_actual }}</span></td>
                    <td>{{ lote.cantidad_actual | number }}</td>
                    <td><span class="badge-success">ACTIVO</span></td>
                  </tr>
                }
                @empty {
                  <tr><td colspan="6" class="text-center">No hay lotes activos. <a routerLink="/lotes" class="link">Crea uno nuevo →</a></td></tr>
                }
              </tbody>
            </table>
          </div>
          
          <div class="card">
            <div class="card-header">
              <h2>Acciones Rápidas</h2>
            </div>
            <div class="quick-actions">
              <button class="action-btn" routerLink="/lotes">➕ Nuevo Lote</button>
              <button class="action-btn" routerLink="/mortalidad">💔 Registrar Mortalidad</button>
              <button class="action-btn" routerLink="/consumo">🌽 Registrar Consumo</button>
              <button class="action-btn" routerLink="/pesajes">⚖️ Nuevo Pesaje</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard { max-width: 1400px; margin: 0 auto; }
    .page-header { margin-bottom: 2rem; }
    .page-header h1 { margin: 0; color: #2B2B2B; font-size: 1.75rem; }
    .subtitle { margin: 0.25rem 0 0 0; color: #666; }
    .loading-state { text-align: center; padding: 4rem; }
    .spinner {
      width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid #FFC107; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .stat-card { background: white; border-radius: 12px; padding: 1.5rem; display: flex; align-items: center; gap: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .stat-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
    .stat-icon.verde { background: #d4edda; }
    .stat-icon.amarillo { background: #fff3cd; }
    .stat-icon.rojo { background: #f8d7da; }
    .stat-icon.azul { background: #d1ecf1; }
    .stat-value { font-size: 1.75rem; font-weight: 700; color: #2B2B2B; display: block; }
    .stat-label { color: #666; font-size: 0.875rem; }
    .content-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; }
    .card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .card-header h2 { margin: 0; color: #2B2B2B; }
    .link { color: #FFC107; text-decoration: none; font-weight: 500; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #eee; }
    .data-table th { background: #f8f9fa; font-weight: 600; color: #2B2B2B; }
    .tag { padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .tag-inicio { background: #d4edda; color: #155724; }
    .tag-crecimiento { background: #d1ecf1; color: #0c5460; }
    .tag-engorde { background: #fff3cd; color: #856404; }
    .badge-success { background: #d4edda; color: #155724; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; }
    .text-center { text-align: center; }
    .quick-actions { display: flex; flex-direction: column; gap: 0.75rem; }
    .action-btn { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; cursor: pointer; transition: all 0.2s; text-align: left; font-size: 0.95rem; }
    .action-btn:hover { background: #FFC107; border-color: #FFC107; }
    @media (max-width: 1024px) { .content-grid { grid-template-columns: 1fr; } }
  `]
})
export class DashboardComponent implements OnInit {
  private lotService = inject(LotService);
  lotes: Lote[] = [];
  loading = true;
  stats = { lotesActivos: 0, totalPollos: 0, mortalidadPromedio: 0, pesoPromedio: 2500 };

  async ngOnInit(): Promise<void> {
    try {
      this.loading = true;
      this.lotes = await this.lotService.getLotes();
      const activos = this.lotes.filter(l => l.estado === 'ACTIVO');
      this.stats.lotesActivos = activos.length;
      this.stats.totalPollos = activos.reduce((sum, l) => sum + l.cantidad_actual, 0);
    } catch (e) { console.error(e); }
    finally { this.loading = false; }
  }

  getDiasVida(lote: Lote): number {
    return this.lotService.getDiasVida(lote.fecha_inicio);
  }
}
