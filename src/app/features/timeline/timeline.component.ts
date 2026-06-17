import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { LotService, Lote, Mortalidad, ConsumoDiario, Pesaje, Vacuna, Hito, VacunaAplicada, Antibiotico, Vitamina, Desinfectante, GastoOperativo, GastoCategoria } from '../../core/services/lot.service';
import { RefreshService } from '../../core/services/refresh.service';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule, FullCalendarModule, RouterLink],
  template: `
    <div class="page-container">
      @if (loading()) {
        <div class="loading">Cargando calendario...</div>
      } @else if (!lote()) {
        <div class="error-state">
          <h2>Lote no encontrado</h2>
          <button class="btn-primary" (click)="goBack()">Volver a Lotes</button>
        </div>
      } @else {
        <div class="page-header">
          <div class="header-info">
            <button class="btn-back" (click)="goBack()">←</button>
            <div>
              <h1>{{ lote()!.nombre || 'Lote ' + lote()!.id?.slice(0,4) }}</h1>
              <p class="subtitle">{{ lote()!.galpon?.granja?.nombre }} / {{ lote()!.galpon?.nombre }}</p>
            </div>
          </div>
          <div class="header-actions">
            <span class="badge" [class]="'badge-' + lote()!.estado.toLowerCase()">{{ lote()!.estado }}</span>
            <span class="badge badge-etapa">{{ lote()!.etapaActual }}</span>
          </div>
        </div>

        <div class="main-layout">
          <aside class="sidebar">
            <div class="sidebar-section">
              <h4>Vista de Etapas</h4>
              <div class="toggle-group">
                <button 
                  class="toggle-btn" 
                  [class.active]="vistaEtapa() === 'auto'"
                  (click)="setVistaEtapa('auto')">
                  🚀 Auto-navegar
                </button>
                <button 
                  class="toggle-btn" 
                  [class.active]="vistaEtapa() === 'strip'"
                  (click)="setVistaEtapa('strip')">
                  📊 Strip
                </button>
                <button 
                  class="toggle-btn" 
                  [class.active]="vistaEtapa() === 'ninguna'"
                  (click)="setVistaEtapa('ninguna')">
                  ❌ Ninguna
                </button>
              </div>
              @if (vistaEtapa() === 'auto') {
                <p class="helper-text">Navega mes por mes desde inicio del lote</p>
              }
              @if (vistaEtapa() === 'strip') {
                <p class="helper-text">Barra de colores sobre los días</p>
              }
            </div>

            <div class="sidebar-section">
              <h4>Filtros</h4>
              <label class="filter-item">
                <input type="checkbox" [(ngModel)]="showMortalidad" (change)="updateFilters()"/>
                <span class="filter-dot dot-mortalidad"></span>
                Mortalidad
              </label>
              <label class="filter-item">
                <input type="checkbox" [(ngModel)]="showConsumo" (change)="updateFilters()"/>
                <span class="filter-dot dot-consumo"></span>
                Consumo
              </label>
              <label class="filter-item">
                <input type="checkbox" [(ngModel)]="showPesaje" (change)="updateFilters()"/>
                <span class="filter-dot dot-pesaje"></span>
                Pesaje
              </label>
              <label class="filter-item">
                <input type="checkbox" [(ngModel)]="showVacuna" (change)="updateFilters()"/>
                <span class="filter-dot dot-vacuna"></span>
                Vacunas
              </label>
              <label class="filter-item">
                <input type="checkbox" [(ngModel)]="showAntibiotico" (change)="updateFilters()"/>
                <span class="filter-dot dot-antibiotico"></span>
                Antibióticos
              </label>
              <label class="filter-item">
                <input type="checkbox" [(ngModel)]="showVitamina" (change)="updateFilters()"/>
                <span class="filter-dot dot-vitamina"></span>
                Vitaminas
              </label>
              <label class="filter-item">
                <input type="checkbox" [(ngModel)]="showDesinfectante" (change)="updateFilters()"/>
                <span class="filter-dot dot-desinfectante"></span>
                Desinfectantes
              </label>
            </div>

            <div class="sidebar-section">
              <h4>Etapas</h4>
              <div class="etapa-indicator inicio">
                <span class="etapa-color"></span>
                <span>Inicio (Días 1-10)</span>
              </div>
              <div class="etapa-indicator crecimiento">
                <span class="etapa-color"></span>
                <span>Crecimiento (Días 11-25)</span>
              </div>
              <div class="etapa-indicator engorde">
                <span class="etapa-color"></span>
                <span>Engorde (Días 26-45)</span>
              </div>
            </div>

            @if (vistaEtapa() === 'auto') {
              <div class="sidebar-section">
                <h4>Ir a Mes</h4>
                <button class="btn-nav" (click)="navigateToMonth('prev')">◀ Mes Anterior</button>
                <button class="btn-nav" (click)="navigateToMonth('today')">📍 Hoy</button>
                <button class="btn-nav" (click)="navigateToMonth('next')">Mes Siguiente ▶</button>
                <div class="mes-info">
                  <small>Día {{ diasVida() }} de 45</small>
                </div>
              </div>
            }
          </aside>

          <main class="content">
            @if (vistaEtapa() === 'strip') {
              <div class="etapas-strip">
                @for (day of getDiasEtapas(); track day.date) {
                  <div 
                    class="etapa-day" 
                    [class]="'etapa-day-' + day.etapa.toLowerCase()"
                    [title]="day.etapa + ' - Día ' + day.dayNumber">
                    <span class="day-num">{{ day.dayNumber }}</span>
                  </div>
                }
              </div>
            }

            <div class="stats-row">
              <div class="stat">
                <span class="stat-label">Día</span>
                <span class="stat-value">{{ diasVida() }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Pollos Actuales</span>
                <span class="stat-value">{{ lote()!.cantidadActual | number }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Mortalidad</span>
                <span class="stat-value text-danger">{{ mortalidad() }}%</span>
              </div>
              <div class="stat">
                <span class="stat-label">Ingreso Pollitos</span>
                <span class="stat-value">{{ lote()!.cantidadInicial | number }}</span>
              </div>
            </div>

            <div class="calendar-card">
              <full-calendar [options]="calendarOptions"></full-calendar>
            </div>

            <!-- Rentabilidad del lote -->
            <div class="rentabilidad-card" [class.ganancia-pos]="rentabilidad().ganancia >= 0" [class.ganancia-neg]="rentabilidad().ganancia < 0">
              <h3>📊 Rentabilidad del Lote</h3>
              <div class="rent-grid">
                <div class="rent-item">
                  <span class="rent-label">Total gastado</span>
                  <span class="rent-value text-danger">💸 {{ rentabilidad().totalGastos | number:'1.2-2' }} Bs</span>
                </div>
                <div class="rent-item">
                  <span class="rent-label">Total vendido</span>
                  <span class="rent-value text-success">💰 {{ rentabilidad().totalVentas | number:'1.2-2' }} Bs</span>
                </div>
                <div class="rent-item">
                  <span class="rent-label">Ganancia neta</span>
                  <span class="rent-value big">{{ rentabilidad().ganancia | number:'1.2-2' }} Bs</span>
                </div>
                <div class="rent-item">
                  <span class="rent-label">ROI</span>
                  <span class="rent-value big">{{ rentabilidad().roi | number:'1.1-1' }}%</span>
                </div>
              </div>
            </div>

            <!-- Gastos del lote -->
            <div class="gastos-card">
              <div class="gastos-header">
                <h3>💸 Gastos Operativos</h3>
                <button class="btn-mini" [routerLink]="['/gastos-operativos']">Ver todos →</button>
              </div>
              <div class="gastos-stats">
                <span><strong>{{ totalGastos() | number:'1.2-2' }} Bs</strong> gastados en <strong>{{ cantidadGastos() }}</strong> gastos</span>
              </div>
              @if (ultimosGastos().length > 0) {
                <table class="mini-table">
                  <thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Monto</th></tr></thead>
                  <tbody>
                    @for (g of ultimosGastos(); track g.id) {
                      <tr>
                        <td>{{ g.fecha | date:'dd/MM' }}</td>
                        <td><span class="mini-badge" [class]="'mini-' + g.categoria.toLowerCase()">{{ categoriaLabel(g.categoria) }}</span></td>
                        <td>{{ g.descripcion }}</td>
                        <td class="text-right"><strong>{{ g.monto | number:'1.2-2' }} Bs</strong></td>
                      </tr>
                    }
                  </tbody>
                </table>
              } @else {
                <p class="text-muted">Aún no hay gastos registrados para este lote. <a [routerLink]="['/gastos-operativos']">Registrar el primero →</a></p>
              }
            </div>
          </main>
        </div>
      }

      @if (modalVisible()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>{{ getModalTitle() }}</h3>
            
            @if (modalMode() === 'select') {
              <div class="event-types">
                <button class="event-type-btn" (click)="setModalMode('mortalidad')">
                  <span class="icon">💔</span>
                  <span>Mortalidad</span>
                </button>
                <button class="event-type-btn" (click)="setModalMode('consumo')">
                  <span class="icon">🌽</span>
                  <span>Consumo</span>
                </button>
                <button class="event-type-btn" (click)="setModalMode('pesaje')">
                  <span class="icon">⚖️</span>
                  <span>Pesaje</span>
                </button>
                <button class="event-type-btn" (click)="setModalMode('vacuna')">
                  <span class="icon">💉</span>
                  <span>Vacuna</span>
                </button>
                <button class="event-type-btn" (click)="setModalMode('antibiotico')">
                  <span class="icon">💊</span>
                  <span>Antibiótico</span>
                </button>
                <button class="event-type-btn" (click)="setModalMode('vitamina')">
                  <span class="icon">🌿</span>
                  <span>Vitamina</span>
                </button>
                <button class="event-type-btn" (click)="setModalMode('desinfectante')">
                  <span class="icon">🧴</span>
                  <span>Desinfectante</span>
                </button>
              </div>
            } @else {
              <div class="form-grid">
                @if (modalMode() === 'mortalidad') {
                  <div class="form-group"><label>Fecha</label><input type="date" [(ngModel)]="form.fecha" class="input-field"/></div>
                  <div class="form-group"><label>Cantidad de pollos</label><input type="number" [(ngModel)]="form.cantidad" min="1" class="input-field"/></div>
                  <div class="form-group"><label>Causa (opcional)</label><input type="text" [(ngModel)]="form.causa" placeholder="Ej: Disease..." class="input-field"/></div>
                }
                @if (modalMode() === 'consumo') {
                  <div class="form-group"><label>Fecha</label><input type="date" [(ngModel)]="form.fecha" class="input-field"/></div>
                  <div class="form-group"><label>Cantidad (kg)</label><input type="number" [(ngModel)]="form.cantidadKg" step="0.5" min="0" class="input-field"/></div>
                  <div class="info-box"><span class="info-icon">ℹ️</span><span>Durará {{ calcularDiasDuracion() }} días ({{ getConsumoPorPollo() }}g/pollo/día)</span></div>
                }
                @if (modalMode() === 'pesaje') {
                  <div class="form-group"><label>Fecha</label><input type="date" [(ngModel)]="form.fecha" class="input-field"/></div>
                  <div class="form-group"><label>Peso Promedio (g)</label><input type="number" [(ngModel)]="form.pesoPromedio" step="10" class="input-field"/></div>
                  <div class="form-group"><label>Muestra</label><input type="number" [(ngModel)]="form.muestra" min="1" class="input-field"/></div>
                }
                @if (modalMode() === 'vacuna') {
                  <div class="form-group"><label>Fecha</label><input type="date" [(ngModel)]="form.fecha" class="input-field"/></div>
                  <div class="form-group"><label>Vacuna</label><select [(ngModel)]="form.catalogoVacunaId" class="input-field"><option value="">Seleccionar</option>@for (v of vacunas(); track v.id) { <option [value]="v.id">{{ v.nombre }}</option> }</select></div>
                  <div class="form-group"><label>Notas</label><input type="text" [(ngModel)]="form.notas" placeholder="Opcional" class="input-field"/></div>
                }
                @if (modalMode() === 'antibiotico') {
                  <div class="form-group"><label>Fecha</label><input type="date" [(ngModel)]="form.fecha" class="input-field"/></div>
                  <div class="form-group"><label>Antibiótico</label><select [(ngModel)]="form.catalogoId" class="input-field"><option value="">Seleccionar</option>@for (a of antibioticos(); track a.id) { <option [value]="a.id">{{ a.nombre }} ({{ a.unidad }})</option> }</select></div>
                  <div class="form-group"><label>Cantidad</label><input type="number" [(ngModel)]="form.cantidad" step="0.1" min="0" class="input-field"/></div>
                  <div class="form-group"><label>Notas</label><input type="text" [(ngModel)]="form.notas" placeholder="Opcional" class="input-field"/></div>
                }
                @if (modalMode() === 'vitamina') {
                  <div class="form-group"><label>Fecha</label><input type="date" [(ngModel)]="form.fecha" class="input-field"/></div>
                  <div class="form-group"><label>Vitamina</label><select [(ngModel)]="form.catalogoId" class="input-field"><option value="">Seleccionar</option>@for (v of vitaminas(); track v.id) { <option [value]="v.id">{{ v.nombre }} ({{ v.unidad }})</option> }</select></div>
                  <div class="form-group"><label>Cantidad</label><input type="number" [(ngModel)]="form.cantidad" step="0.1" min="0" class="input-field"/></div>
                  <div class="form-group"><label>Notas</label><input type="text" [(ngModel)]="form.notas" placeholder="Opcional" class="input-field"/></div>
                }
                @if (modalMode() === 'desinfectante') {
                  <div class="form-group"><label>Fecha</label><input type="date" [(ngModel)]="form.fecha" class="input-field"/></div>
                  <div class="form-group"><label>Desinfectante</label><select [(ngModel)]="form.catalogoId" class="input-field"><option value="">Seleccionar</option>@for (d of desinfectantes(); track d.id) { <option [value]="d.id">{{ d.nombre }} ({{ d.unidad }})</option> }</select></div>
                  <div class="form-group"><label>Cantidad</label><input type="number" [(ngModel)]="form.cantidad" step="0.1" min="0" class="input-field"/></div>
                  <div class="form-group"><label>Notas</label><input type="text" [(ngModel)]="form.notas" placeholder="Opcional" class="input-field"/></div>
                }
              </div>
              <div class="modal-actions">
                @if (isEditing()) { <button class="btn-danger" (click)="deleteEvent()">🗑️</button> }
                @if (!isEditing()) { <button class="btn-secondary" (click)="setModalMode('select')">←</button> }
                <button class="btn-secondary" (click)="closeModal()">Cancelar</button>
                <button class="btn-primary" (click)="saveEvent()">{{ isEditing() ? 'Actualizar' : 'Guardar' }}</button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { max-width: 100%; margin: 0 auto; padding: 1rem; }
    .loading, .error-state { text-align: center; padding: 4rem; color: #666; }
    .error-state h2 { margin-bottom: 1rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem; }
    .header-info { display: flex; align-items: center; gap: 1rem; }
    .btn-back { background: #e9ecef; border: none; width: 40px; height: 40px; border-radius: 8px; cursor: pointer; font-size: 1.25rem; }
    .btn-back:hover { background: #FFC107; }
    .page-header h1 { margin: 0; color: #2B2B2B; }
    .subtitle { margin: 0.25rem 0 0 0; color: #666; }
    .header-actions { display: flex; gap: 0.5rem; }
    .badge { padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.875rem; font-weight: 600; }
    .badge-activo { background: #d4edda; color: #155724; }
    .badge-finalizado { background: #fff3cd; color: #856404; }
    .badge-etapa { background: #e9ecef; color: #2B2B2B; }
    
    .main-layout { display: flex; gap: 1rem; }
    .sidebar { width: 220px; flex-shrink: 0; display: flex; flex-direction: column; gap: 1rem; }
    .sidebar-section { background: white; border-radius: 12px; padding: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .sidebar-section h4 { margin: 0 0 0.75rem 0; font-size: 0.875rem; color: #2B2B2B; text-transform: uppercase; letter-spacing: 0.5px; }
    .toggle-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .toggle-btn { padding: 0.5rem; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer; font-size: 0.8rem; transition: all 0.2s; }
    .toggle-btn:hover { border-color: #FFC107; }
    .toggle-btn.active { background: #FFC107; color: #2B2B2B; border-color: #FFC107; font-weight: 600; }
    .helper-text { font-size: 0.75rem; color: #666; margin: 0.5rem 0 0 0; }
    
    .filter-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0; cursor: pointer; font-size: 0.875rem; }
    .filter-item input { cursor: pointer; }
    .filter-dot { width: 12px; height: 12px; border-radius: 50%; }
    .dot-mortalidad { background: #D32F2F; }
    .dot-consumo { background: #28a745; }
    .dot-pesaje { background: #17a2b8; }
    .dot-vacuna { background: #6f42c1; }
    .dot-antibiotico { background: #dc3545; }
    .dot-vitamina { background: #28a745; }
    .dot-desinfectante { background: #0dcaf0; }
    
    .etapa-indicator { display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0; font-size: 0.8rem; }
    .etapa-color { width: 16px; height: 16px; border-radius: 4px; }
    .etapa-indicator.inicio .etapa-color { background: #FFC107; }
    .etapa-indicator.crecimiento .etapa-color { background: #FF9800; }
    .etapa-indicator.engorde .etapa-color { background: #D32F2F; }
    
    .btn-nav { width: 100%; padding: 0.5rem; margin-bottom: 0.5rem; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer; font-size: 0.8rem; }
    .btn-nav:hover { background: #FFC107; border-color: #FFC107; }
    .mes-info { text-align: center; margin-top: 0.5rem; color: #666; }
    
    .content { flex: 1; min-width: 0; }
    .etapas-strip { display: flex; overflow-x: auto; padding: 0.5rem; background: white; border-radius: 12px; margin-bottom: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .etapa-day { min-width: 20px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; border-radius: 3px; margin-right: 2px; color: white; font-weight: 600; cursor: pointer; }
    .etapa-day:hover { transform: scale(1.2); }
    .etapa-day-inicio { background: #FFC107; color: #856404; }
    .etapa-day-crecimiento { background: #FF9800; }
    .etapa-day-engorde { background: #D32F2F; }
    .day-num { line-height: 1; }
    
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1rem; }
    .stat { background: white; padding: 1rem; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .stat-label { display: block; font-size: 0.75rem; color: #666; margin-bottom: 0.25rem; }
    .stat-value { font-size: 1.5rem; font-weight: 700; }
    .text-danger { color: #d32f2f; }
    
    .calendar-card { background: white; border-radius: 12px; padding: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .modal { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 400px; max-height: 90vh; overflow-y: auto; }
    .modal h3 { margin: 0 0 1.5rem 0; color: #2B2B2B; text-align: center; }
    .event-types { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .event-type-btn { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1.5rem; background: #f8f9fa; border: 2px solid transparent; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
    .event-type-btn:hover { border-color: #FFC107; }
    .event-type-btn .icon { font-size: 2rem; }
    .form-grid { display: flex; flex-direction: column; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; }
    .form-group label { font-weight: 500; margin-bottom: 0.5rem; font-size: 0.875rem; }
    .input-field { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; }
    .input-field:focus { outline: none; border-color: #FFC107; }
    .info-box { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: #e7f3ff; border-radius: 8px; font-size: 0.875rem; color: #004085; }
    .modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1.5rem; }
    .btn-primary { background: #FFC107; color: #2B2B2B; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-secondary { background: #e9ecef; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; }
    .btn-danger { background: #f8d7da; color: #D32F2F; border: none; padding: 0.75rem; border-radius: 8px; cursor: pointer; }
    
    @media (max-width: 1024px) { .main-layout { flex-direction: column; } .sidebar { width: 100%; } .stats-row { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 768px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
    
    :host ::ng-deep .fc { font-family: inherit; }
    :host ::ng-deep .fc-toolbar-title { font-size: 1.25rem; color: #2B2B2B; }
    :host ::ng-deep .fc-button-primary { background-color: #FFC107 !important; border-color: #FFC107 !important; color: #2B2B2B !important; }
    :host ::ng-deep .fc-button-primary:hover { background-color: #e0a800 !important; }
    :host ::ng-deep .fc-day-today { background: rgba(255,193,7,0.15) !important; }
    :host ::ng-deep .fc-event { cursor: pointer; padding: 2px 4px; font-size: 0.75rem; }
    :host ::ng-deep .fc-daygrid-event { padding: 2px 6px; }

    .rentabilidad-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-top: 1.5rem; border-left: 4px solid #ccc; }
    .rentabilidad-card.ganancia-pos { border-left-color: #28a745; }
    .rentabilidad-card.ganancia-neg { border-left-color: #D32F2F; }
    .rentabilidad-card h3 { margin: 0 0 1rem 0; color: #2B2B2B; font-size: 1.1rem; }
    .rent-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }
    .rent-item { display: flex; flex-direction: column; gap: 0.25rem; padding: 0.75rem; background: #f8f9fa; border-radius: 8px; }
    .rent-label { font-size: 0.75rem; color: #666; text-transform: uppercase; }
    .rent-value { font-size: 1.1rem; font-weight: 600; color: #2B2B2B; }
    .rent-value.big { font-size: 1.5rem; }
    .text-danger { color: #D32F2F; }
    .text-success { color: #28a745; }
    .text-right { text-align: right; }
    .text-muted { color: #666; }

    .gastos-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-top: 1.5rem; }
    .gastos-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .gastos-header h3 { margin: 0; color: #2B2B2B; font-size: 1.1rem; }
    .btn-mini { background: none; border: 1px solid #FFC107; color: #2B2B2B; padding: 0.4rem 0.9rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; text-decoration: none; }
    .btn-mini:hover { background: #FFC107; }
    .gastos-stats { padding: 0.5rem 0.75rem; background: #fff3cd; border-radius: 6px; margin-bottom: 0.75rem; font-size: 0.9rem; }
    .mini-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .mini-table th, .mini-table td { padding: 0.4rem 0.5rem; text-align: left; border-bottom: 1px solid #eee; }
    .mini-table th { background: #f8f9fa; font-weight: 600; font-size: 0.75rem; }
    .mini-badge { display: inline-block; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; }
    .mini-alimento { background: #d4edda; color: #155724; }
    .mini-insumos { background: #cce5ff; color: #004085; }
    .mini-mano_obra { background: #fff3cd; color: #856404; }
    .mini-mantenimiento { background: #f8d7da; color: #D32F2F; }
    .mini-otros { background: #e2d9f3; color: #5a32a3; }
  `]
})
export class TimelineComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private lotService = inject(LotService);
  private refreshService = inject(RefreshService);
  private refreshSub: any;

  lote = signal<Lote | null>(null);
  loading = signal(true);
  diasVida = signal(0);
  mortalidad = signal(0);
  vacunas = signal<Vacuna[]>([]);
  antibioticos = signal<any[]>([]);
  vitaminas = signal<any[]>([]);
  desinfectantes = signal<any[]>([]);
  
  vistaEtapa = signal<'auto' | 'strip' | 'ninguna'>('strip');
  currentViewDate = signal<Date>(new Date());
  
  showMortalidad = true;
  showConsumo = true;
  showPesaje = true;
  showVacuna = true;
  showAntibiotico = true;
  showVitamina = true;
  showDesinfectante = true;
  
  modalVisible = signal(false);
  modalMode = signal<'select' | 'mortalidad' | 'consumo' | 'pesaje' | 'vacuna' | 'antibiotico' | 'vitamina' | 'desinfectante'>('select');
  selectedDate = signal<Date | null>(null);
  form: any = {};
  isEditing = signal(false);
  editingEventId = signal<string | null>(null);
  editingEventType = signal<string | null>(null);

  mortalidadesCache: Mortalidad[] = [];
  consumosCache: ConsumoDiario[] = [];
  pesajesCache: Pesaje[] = [];
  vacunasAplicadasCache: VacunaAplicada[] = [];
  antibioticosAplicadosCache: Antibiotico[] = [];
  vitaminasAplicadasCache: Vitamina[] = [];
  desinfectantesAplicadosCache: Desinfectante[] = [];

  // Gastos / rentabilidad del lote (sección debajo del calendario)
  ultimosGastos = signal<GastoOperativo[]>([]);
  totalGastos = signal<number>(0);
  cantidadGastos = signal<number>(0);
  rentabilidad = signal<{ totalGastos: number; totalVentas: number; ganancia: number; roi: number }>({
    totalGastos: 0, totalVentas: 0, ganancia: 0, roi: 0
  });

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek,listWeek'
    },
    height: 'auto',
    selectable: true,
    editable: false,
    dateClick: this.handleDateClick.bind(this),
    eventClick: this.handleEventClick.bind(this),
    dayMaxEvents: 5,
    nowIndicator: true,
    events: []
  };

  async ngOnInit(): Promise<void> {
    const loteId = this.route.snapshot.paramMap.get('id');
    console.log('Timeline init, loteId:', loteId);
    
    if (loteId) {
      await this.loadLote(loteId);
    } else {
      console.error('No loteId found in route params');
      this.loading.set(false);
    }
    
    this.refreshSub = this.refreshService.refresh$.subscribe((feature: string) => {
      if (loteId) {
        this.loadLote(loteId);
        if (feature === 'gastos') this.loadGastosRentabilidad(loteId);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.refreshSub) this.refreshSub.unsubscribe();
  }

  async loadLote(id: string): Promise<void> {
    this.loading.set(true);
    try {
      console.log('Loading lote:', id);
      const [loteData, vacunasData, antibioticosData, vitaminasData, desinfectantesData] = await Promise.all([
        this.lotService.getLote(id),
        this.lotService.getVacunas(),
        this.lotService.getAntibioticosCatalogo(),
        this.lotService.getVitaminasCatalogo(),
        this.lotService.getDesinfectantesCatalogo()
      ]);
      
      console.log('Lote data:', loteData);
      
      if (loteData) {
        this.lote.set(loteData);
        this.diasVida.set(this.lotService.getDiasVida(loteData.fechaInicio));
        this.mortalidad.set(Math.round((1 - loteData.cantidadActual / loteData.cantidadInicial) * 100 * 10) / 10);

        const startDate = new Date(loteData.fechaInicio);
        const initialViewDate = addDays(startDate, Math.max(0, this.diasVida() - 14));
        this.currentViewDate.set(initialViewDate);
        
        const events = await this.buildEvents(loteData);
        
        this.calendarOptions = {
          ...this.calendarOptions,
          initialDate: initialViewDate,
          events
        };
        
        this.vacunas.set(vacunasData);
        this.antibioticos.set(antibioticosData);
        this.vitaminas.set(vitaminasData);
        this.desinfectantes.set(desinfectantesData);

        // Cargar gastos + rentabilidad del lote (no bloquea el render principal)
        this.loadGastosRentabilidad(id);
      } else {
        console.warn('No loteData returned for id:', id);
      }
    } catch (e: any) {
      console.error('Error loading lote:', e);
    } finally {
      this.loading.set(false);
    }
  }

  async loadGastosRentabilidad(loteId: string): Promise<void> {
    try {
      const [gastos, resumen, rent] = await Promise.all([
        this.lotService.getGastos(loteId),
        this.lotService.getResumenGastosPorLote(loteId),
        this.lotService.getRentabilidadPorLote(loteId)
      ]);
      this.ultimosGastos.set(gastos.slice(0, 5));
      this.totalGastos.set(resumen.total);
      this.cantidadGastos.set(resumen.cantidad);
      this.rentabilidad.set(rent);
    } catch (e) {
      console.error('Error cargando gastos/rentabilidad del lote (probable índice faltante en gastosOperativos):', e);
    }
  }

  categoriaLabel(cat: GastoCategoria): string {
    const map: Record<GastoCategoria, string> = {
      ALIMENTO: '🌽 Alimento',
      INSUMOS: '💊 Insumos',
      MANO_OBRA: '👷 Mano',
      MANTENIMIENTO: '🔧 Mant.',
      OTROS: '📦 Otros'
    };
    return map[cat] || cat;
  }

  async buildEvents(lote: Lote): Promise<EventInput[]> {
    const events: EventInput[] = [];
    
    this.mortalidadesCache = await this.lotService.getMortalidades(lote.id!);
    this.consumosCache = await this.lotService.getConsumos(lote.id!);
    this.pesajesCache = await this.lotService.getPesajes(lote.id!);
    this.vacunasAplicadasCache = await this.lotService.getVacunasAplicadas(lote.id!);
    this.antibioticosAplicadosCache = await this.lotService.getAntibioticos(lote.id!);
    this.vitaminasAplicadasCache = await this.lotService.getVitaminas(lote.id!);
    this.desinfectantesAplicadosCache = await this.lotService.getDesinfectantes(lote.id!);
    
    if (this.showMortalidad) {
      this.mortalidadesCache.forEach(m => {
        events.push({
          id: `m-${m.id}`,
          title: `💔 ${m.cantidad}`,
          start: m.fecha,
          backgroundColor: '#D32F2F',
          borderColor: '#D32F2F',
          extendedProps: { tipo: 'mortalidad', cantidad: m.cantidad, causa: m.causa, originalId: m.id }
        });
      });
    }
    
    if (this.showConsumo) {
      this.consumosCache.forEach(c => {
        const diasDuracion = this.calcularDiasConsumo(c.cantidadKg, lote);
        events.push({
          id: `c-${c.id}`,
          title: `🌽 ${c.cantidadKg}kg (~${diasDuracion}d)`,
          start: c.fecha,
          end: format(addDays(new Date(c.fecha), diasDuracion), 'yyyy-MM-dd'),
          backgroundColor: '#28a745',
          borderColor: '#28a745',
          extendedProps: { tipo: 'consumo', cantidad: c.cantidadKg, originalId: c.id }
        });
      });
    }
    
    if (this.showPesaje) {
      this.pesajesCache.forEach(p => {
        events.push({
          id: `p-${p.id}`,
          title: `⚖️ ${p.pesoPromedio}g`,
          start: p.fecha,
          backgroundColor: '#17a2b8',
          borderColor: '#17a2b8',
          extendedProps: { tipo: 'pesaje', peso: p.pesoPromedio, muestra: p.muestra, originalId: p.id }
        });
      });
    }
    
    if (this.showVacuna) {
      this.vacunasAplicadasCache.forEach(h => {
        const cat = this.vacunas().find(v => v.id === h.catalogoVacunaId);
        events.push({
          id: `va-${h.id}`,
          title: `💉 ${cat?.nombre || 'Vacuna'}`,
          start: h.fecha,
          backgroundColor: '#6f42c1',
          borderColor: '#6f42c1',
          extendedProps: { tipo: 'vacuna', titulo: cat?.nombre || 'Vacuna', notas: h.notas, originalId: h.id }
        });
      });
    }
    
    if (this.showAntibiotico) {
      this.antibioticosAplicadosCache.forEach(h => {
        const cat = this.antibioticos().find(a => a.id === h.catalogoId);
        events.push({
          id: `ab-${h.id}`,
          title: `💊 ${cat?.nombre || 'Antibiótico'}`,
          start: h.fecha,
          backgroundColor: '#dc3545',
          borderColor: '#dc3545',
          extendedProps: { tipo: 'antibiotico', titulo: cat?.nombre || 'Antibiótico', cantidad: h.cantidad, notas: h.notas, originalId: h.id }
        });
      });
    }
    
    if (this.showVitamina) {
      this.vitaminasAplicadasCache.forEach(h => {
        const cat = this.vitaminas().find(v => v.id === h.catalogoId);
        events.push({
          id: `vt-${h.id}`,
          title: `🌿 ${cat?.nombre || 'Vitamina'}`,
          start: h.fecha,
          backgroundColor: '#28a745',
          borderColor: '#28a745',
          extendedProps: { tipo: 'vitamina', titulo: cat?.nombre || 'Vitamina', cantidad: h.cantidad, notas: h.notas, originalId: h.id }
        });
      });
    }
    
    if (this.showDesinfectante) {
      this.desinfectantesAplicadosCache.forEach(h => {
        const cat = this.desinfectantes().find(d => d.id === h.catalogoId);
        events.push({
          id: `ds-${h.id}`,
          title: `🧴 ${cat?.nombre || 'Desinfectante'}`,
          start: h.fecha,
          backgroundColor: '#0dcaf0',
          borderColor: '#0dcaf0',
          extendedProps: { tipo: 'desinfectante', titulo: cat?.nombre || 'Desinfectante', cantidad: h.cantidad, notas: h.notas, originalId: h.id }
        });
      });
    }
    
    if (this.vistaEtapa() === 'auto') {
      const etapaChanges = this.getEtapaChangeEvents(lote);
      events.push(...etapaChanges);
    }
    
    return events;
  }

  getEtapaChangeEvents(lote: Lote): EventInput[] {
    const events: EventInput[] = [];
    const startDate = new Date(lote.fechaInicio);
    
    const etapas = [
      { nombre: 'INICIO', dias: [0, 10], color: '#FFC107', textColor: '#856404' },
      { nombre: 'CRECIMIENTO', dias: [11, 25], color: '#FF9800', textColor: '#ffffff' },
      { nombre: 'ENGORDE', dias: [26, 45], color: '#D32F2F', textColor: '#ffffff' }
    ];
    
    etapas.forEach(etapa => {
      const etapaStart = addDays(startDate, etapa.dias[0]);
      const etapaEnd = addDays(startDate, etapa.dias[1] + 1);
      
      events.push({
        id: `etapa-${etapa.nombre}`,
        title: etapa.nombre,
        start: etapaStart,
        end: etapaEnd,
        display: 'background',
        backgroundColor: etapa.color,
        textColor: etapa.textColor,
        classNames: [`etapa-bg-${etapa.nombre.toLowerCase()}`]
      });
    });
    
    return events;
  }

  getDiasEtapas(): { date: string; etapa: string; dayNumber: number }[] {
    const currentLote = this.lote();
    if (!currentLote) return [];
    
    const startDate = new Date(currentLote.fechaInicio);
    const diasTotales = 45;
    const days: { date: string; etapa: string; dayNumber: number }[] = [];
    
    for (let i = 0; i < diasTotales; i++) {
      const date = addDays(startDate, i);
      let etapa = 'ENGORDE';
      if (i < 10) etapa = 'INICIO';
      else if (i < 25) etapa = 'CRECIMIENTO';
      
      days.push({
        date: format(date, 'yyyy-MM-dd'),
        etapa,
        dayNumber: i + 1
      });
    }
    
    return days;
  }

  setVistaEtapa(vista: 'auto' | 'strip' | 'ninguna'): void {
    this.vistaEtapa.set(vista);
    this.reloadEvents();
  }

  updateFilters(): void {
    this.reloadEvents();
  }

  async reloadEvents(): Promise<void> {
    const currentLote = this.lote();
    if (!currentLote) return;
    
    const events = await this.buildEvents(currentLote);
    this.calendarOptions = {
      ...this.calendarOptions,
      events
    };
  }

  navigateToMonth(direction: 'prev' | 'next' | 'today'): void {
    const currentDate = this.currentViewDate();
    let newDate: Date;
    
    if (direction === 'today') {
      newDate = new Date();
    } else if (direction === 'prev') {
      newDate = addDays(startOfMonth(currentDate), -1);
    } else {
      newDate = addDays(endOfMonth(currentDate), 1);
    }
    
    this.currentViewDate.set(newDate);
    this.calendarOptions = {
      ...this.calendarOptions,
      initialDate: newDate
    };
  }

  calcularDiasConsumo(kg: number, lote: Lote): number {
    const etapa = lote.etapaActual;
    const consumoDiarioGramos = this.getConsumoDiarioCobb(etapa);
    const totalPollos = lote.cantidadActual;
    return Math.max(1, Math.round((kg * 1000) / (consumoDiarioGramos * totalPollos)));
  }

  calcularDiasDuracion(): number {
    const currentLote = this.lote();
    if (!currentLote || !this.form.cantidadKg) return 0;
    return this.calcularDiasConsumo(this.form.cantidadKg, currentLote);
  }

  getConsumoPorPollo(): number {
    const currentLote = this.lote();
    if (!currentLote) return 0;
    return Math.round(this.getConsumoDiarioCobb(currentLote.etapaActual) * 1000);
  }

  getConsumoDiarioCobb(etapa: string): number {
    switch (etapa) {
      case 'INICIO': return 0.033;
      case 'CRECIMIENTO': return 0.095;
      case 'ENGORDE': return 0.160;
      default: return 0.100;
    }
  }

  handleDateClick(arg: any): void {
    this.selectedDate.set(arg.date);
    this.isEditing.set(false);
    this.editingEventId.set(null);
    this.modalMode.set('select');
    this.form = {};
    this.modalVisible.set(true);
  }

  handleEventClick(arg: EventClickArg): void {
    const event = arg.event;
    const props = event.extendedProps as any;
    const tipo = props.tipo;
    
    if (!tipo) return;
    
    this.selectedDate.set(event.start);
    this.editingEventId.set(props.originalId);
    this.editingEventType.set(tipo);
    this.isEditing.set(true);
    this.modalMode.set(tipo);
    
    switch (tipo) {
      case 'mortalidad':
        this.form = { fecha: event.startStr, cantidad: props.cantidad, causa: props.causa || '' };
        break;
      case 'consumo':
        this.form = { fecha: event.startStr, cantidadKg: props.cantidad };
        break;
      case 'pesaje':
        this.form = { fecha: event.startStr, pesoPromedio: props.peso, muestra: props.muestra || 10 };
        break;
      case 'vacuna':
        const vacuna = this.vacunas().find(v => v.nombre === props.titulo);
        this.form = { fecha: event.startStr, catalogoVacunaId: vacuna?.id || '', notas: props.notas || '' };
        break;
      case 'antibiotico':
        const antib = this.antibioticos().find(a => a.nombre === props.titulo);
        this.form = { fecha: event.startStr, catalogoId: antib?.id || '', cantidad: props.cantidad || 0, notas: props.notas || '' };
        break;
      case 'vitamina':
        const vit = this.vitaminas().find(v => v.nombre === props.titulo);
        this.form = { fecha: event.startStr, catalogoId: vit?.id || '', cantidad: props.cantidad || 0, notas: props.notas || '' };
        break;
      case 'desinfectante':
        const des = this.desinfectantes().find(d => d.nombre === props.titulo);
        this.form = { fecha: event.startStr, catalogoId: des?.id || '', cantidad: props.cantidad || 0, notas: props.notas || '' };
        break;
    }
    
    this.modalVisible.set(true);
  }

  getModalTitle(): string {
    const date = this.selectedDate();
    const dateStr = date ? format(date, 'dd/MM/yyyy') : '';
    const prefix = this.isEditing() ? 'Editar ' : '';
    switch (this.modalMode()) {
      case 'mortalidad': return `${prefix}💔 Mortalidad - ${dateStr}`;
      case 'consumo': return `${prefix}🌽 Consumo - ${dateStr}`;
      case 'pesaje': return `${prefix}⚖️ Pesaje - ${dateStr}`;
      case 'vacuna': return `${prefix}💉 Vacuna - ${dateStr}`;
      case 'antibiotico': return `${prefix}💊 Antibiótico - ${dateStr}`;
      case 'vitamina': return `${prefix}🌿 Vitamina - ${dateStr}`;
      case 'desinfectante': return `${prefix}🧴 Desinfectante - ${dateStr}`;
      default: return this.isEditing() ? 'Editar Evento' : 'Registrar Evento';
    }
  }

  setModalMode(mode: 'select' | 'mortalidad' | 'consumo' | 'pesaje' | 'vacuna' | 'antibiotico' | 'vitamina' | 'desinfectante'): void {
    this.modalMode.set(mode);
    if (mode === 'mortalidad') this.form = { cantidad: 1, causa: '' };
    if (mode === 'consumo') this.form = { cantidadKg: 0 };
    if (mode === 'pesaje') this.form = { muestra: 10 };
    if (mode === 'vacuna') this.form = { notas: '' };
    if (mode === 'antibiotico') this.form = { cantidad: 0, notas: '' };
    if (mode === 'vitamina') this.form = { cantidad: 0, notas: '' };
    if (mode === 'desinfectante') this.form = { cantidad: 0, notas: '' };
  }

  closeModal(): void {
    this.modalVisible.set(false);
    this.modalMode.set('select');
    this.isEditing.set(false);
    this.editingEventId.set(null);
    this.editingEventType.set(null);
  }

  async saveEvent(): Promise<void> {
    const currentLote = this.lote();
    if (!currentLote || !currentLote.id) return;
    const fecha = this.form.fecha;
    const editingId = this.editingEventId();

    try {
      switch (this.modalMode()) {
        case 'mortalidad':
          if (!this.form.cantidad || this.form.cantidad < 1) { alert('Cantidad inválida'); return; }
          if (editingId) { await this.lotService.deleteMortalidad(editingId, currentLote.id); await this.lotService.createMortalidad({ loteId: currentLote.id, fecha, cantidad: this.form.cantidad, causa: this.form.causa }); }
          else { await this.lotService.createMortalidad({ loteId: currentLote.id, fecha, cantidad: this.form.cantidad, causa: this.form.causa }); }
          break;
        case 'consumo':
          if (!this.form.cantidadKg || this.form.cantidadKg <= 0) { alert('Cantidad inválida'); return; }
          if (editingId) { await this.lotService.deleteConsumo(editingId); await this.lotService.createConsumo({ loteId: currentLote.id, fecha, cantidadKg: this.form.cantidadKg, etapa: currentLote.etapaActual }); }
          else { await this.lotService.createConsumo({ loteId: currentLote.id, fecha, cantidadKg: this.form.cantidadKg, etapa: currentLote.etapaActual }); }
          break;
        case 'pesaje':
          if (!this.form.pesoPromedio || this.form.pesoPromedio <= 0) { alert('Peso inválido'); return; }
          if (editingId) { await this.lotService.deletePesaje(editingId); await this.lotService.createPesaje({ loteId: currentLote.id, fecha, pesoPromedio: this.form.pesoPromedio, muestra: this.form.muestra || 10 }); }
          else { await this.lotService.createPesaje({ loteId: currentLote.id, fecha, pesoPromedio: this.form.pesoPromedio, muestra: this.form.muestra || 10 }); }
          break;
        case 'vacuna':
          if (!this.form.catalogoVacunaId) { alert('Selecciona una vacuna'); return; }
          if (editingId) { await this.lotService.deleteVacunaAplicada(editingId); await this.lotService.createVacunaAplicada({ loteId: currentLote.id, catalogoVacunaId: this.form.catalogoVacunaId, fecha, notas: this.form.notas }); }
          else { await this.lotService.createVacunaAplicada({ loteId: currentLote.id, catalogoVacunaId: this.form.catalogoVacunaId, fecha, notas: this.form.notas }); }
          break;
        case 'antibiotico':
          if (!this.form.catalogoId) { alert('Selecciona un antibiótico'); return; }
          if (!this.form.cantidad || this.form.cantidad <= 0) { alert('Cantidad inválida'); return; }
          if (editingId) { await this.lotService.deleteAntibiotico(editingId); await this.lotService.createAntibiotico({ loteId: currentLote.id, catalogoId: this.form.catalogoId, cantidad: this.form.cantidad, fecha, notas: this.form.notas }); }
          else { await this.lotService.createAntibiotico({ loteId: currentLote.id, catalogoId: this.form.catalogoId, cantidad: this.form.cantidad, fecha, notas: this.form.notas }); }
          break;
        case 'vitamina':
          if (!this.form.catalogoId) { alert('Selecciona una vitamina'); return; }
          if (!this.form.cantidad || this.form.cantidad <= 0) { alert('Cantidad inválida'); return; }
          if (editingId) { await this.lotService.deleteVitamina(editingId); await this.lotService.createVitamina({ loteId: currentLote.id, catalogoId: this.form.catalogoId, cantidad: this.form.cantidad, fecha, notas: this.form.notas }); }
          else { await this.lotService.createVitamina({ loteId: currentLote.id, catalogoId: this.form.catalogoId, cantidad: this.form.cantidad, fecha, notas: this.form.notas }); }
          break;
        case 'desinfectante':
          if (!this.form.catalogoId) { alert('Selecciona un desinfectante'); return; }
          if (!this.form.cantidad || this.form.cantidad <= 0) { alert('Cantidad inválida'); return; }
          if (editingId) { await this.lotService.deleteDesinfectante(editingId); await this.lotService.createDesinfectante({ loteId: currentLote.id, catalogoId: this.form.catalogoId, cantidad: this.form.cantidad, fecha, notas: this.form.notas }); }
          else { await this.lotService.createDesinfectante({ loteId: currentLote.id, catalogoId: this.form.catalogoId, cantidad: this.form.cantidad, fecha, notas: this.form.notas }); }
          break;
      }

      this.closeModal();
      await this.loadLote(currentLote.id);
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  }

  async deleteEvent(): Promise<void> {
    const editingId = this.editingEventId();
    const tipo = this.editingEventType();
    if (!editingId || !tipo) return;
    if (!confirm('¿Eliminar este registro?')) return;

    try {
      const currentLote = this.lote();
      switch (tipo) {
        case 'mortalidad':
          if (currentLote?.id) await this.lotService.deleteMortalidad(editingId, currentLote.id);
          break;
        case 'consumo':
          await this.lotService.deleteConsumo(editingId);
          break;
        case 'pesaje':
          await this.lotService.deletePesaje(editingId);
          break;
        case 'vacuna':
          await this.lotService.deleteVacunaAplicada(editingId);
          break;
        case 'antibiotico':
          await this.lotService.deleteAntibiotico(editingId);
          break;
        case 'vitamina':
          await this.lotService.deleteVitamina(editingId);
          break;
        case 'desinfectante':
          await this.lotService.deleteDesinfectante(editingId);
          break;
      }
      this.closeModal();
      if (currentLote?.id) await this.loadLote(currentLote.id);
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  }

  goBack(): void {
    this.router.navigate(['/lotes']);
  }
}
