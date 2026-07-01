import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LotService, Venta, Pago } from '../../core/services/lot.service';
import { format, subDays } from 'date-fns';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Cobranzas</h1>
        <div class="filtro-fecha">
          <label>Mostrar:</label>
          <select [(ngModel)]="filtroDias" (change)="onFiltroChange()" class="input-field">
            <option [value]="7">Últimos 7 días</option>
            <option [value]="30">Último mes</option>
            <option [value]="90">Últimos 3 meses</option>
            <option [value]="0">Todo</option>
          </select>
        </div>
      </div>

      <div class="tabs">
        <button class="tab-btn" [class.active]="tabActual() === 'pendientes'" (click)="setTab('pendientes')">
          Por Cobrar ({{ ventasPendientes().length }})
        </button>
        <button class="tab-btn" [class.active]="tabActual() === 'canceladas'" (click)="setTab('canceladas')">
          Canceladas ({{ ventasCanceladas().length }})
        </button>
      </div>

      @if (loading()) {
        <div class="loading">Cargando...</div>
      } @else {
        @if (tabActual() === 'pendientes') {
          <div class="stats-bar">
            <div class="stat">
              <span class="stat-label">Total Por Cobrar</span>
              <span class="stat-value danger">{{ getTotalPendiente() | number:'1.2-2' }} Bs</span>
            </div>
            <div class="stat">
              <span class="stat-label">Ventas Pendientes</span>
              <span class="stat-value">{{ ventasPendientes().length }}</span>
            </div>
          </div>

          @if (ventasPendientes().length > 0) {
            <div class="ventas-list">
              @for (venta of ventasPendientes(); track venta.id) {
                <div class="venta-card" [class]="'estado-' + venta.estado.toLowerCase()">
                  <div class="venta-main" (click)="toggleVenta(venta.id!)">
                    <div class="venta-info">
                      <h3>{{ venta.clienteNombre || 'Sin cliente' }}</h3>
                      <p class="venta-fecha">{{venta.loteNombre }}</p>
                      <p class="venta-fecha">{{ formatDate(venta.fecha) }}</p>
                      @if (venta.placa) { <p class="venta-placa">🚗 {{ venta.placa }}</p> }
                    </div>
                    <div class="venta-monto">
                      <span class="total">{{ getSaldo(venta) | number:'1.2-2' }} Bs</span>
                      <span class="badge" [class]="venta.estado.toLowerCase()">{{ getEstadoLabel(venta.estado) }}</span>
                      <span class="toggle">{{ isExpanded(venta.id!) ? '▲' : '▼' }}</span>
                    </div>
                  </div>

                  @if (isExpanded(venta.id!)) {
                    <div class="venta-detail">
                      <div class="detail-row">
                        <span>Total venta:</span>
                        <strong>{{ venta.totalBs | number:'1.2-2' }} Bs</strong>
                      </div>
                      <div class="detail-row">
                        <span>Pagado:</span>
                        <strong class="text-success">{{ getTotalPagado(venta) | number:'1.2-2' }} Bs</strong>
                      </div>
                      <div class="detail-row highlight">
                        <span>Saldo pendiente:</span>
                        <strong class="text-danger">{{ getSaldo(venta) | number:'1.2-2' }} Bs</strong>
                      </div>
                      <div class="detail-row">
                        <span>Peso total:</span>
                        <strong>{{ venta.totalKg | number:'1.1-1' }} kg</strong>
                      </div>
                      <div class="detail-row">
                        <span>Precio/kg:</span>
                        <strong>{{ venta.precioKg }} Bs</strong>
                      </div>
                      
                      @if (venta.observaciones) {
                        <div class="detail-row">
                          <span>Obs:</span>
                          <strong>{{ venta.observaciones }}</strong>
                        </div>
                      }

                      @if (getPagosVenta(venta.id!).length > 0) {
                        <div class="pagos-anteriores">
                          <h4>Pagos realizados</h4>
                          @for (pago of getPagosVenta(venta.id!); track pago.id) {
                            <div class="pago-item">
                              <span>{{ formatDate(pago.fecha) }}</span>
                              <span>{{ pago.monto | number:'1.2-2' }} Bs</span>
                              <span class="metodo">{{ pago.metodo }}</span>
                            </div>
                          }
                        </div>
                      }

                      <div class="abonar-section">
                        <h4>Registrar Pago</h4>
                        <div class="abonar-form">
                          <input 
                            type="number" 
                            [(ngModel)]="abonoMonto[venta.id!]" 
                            [placeholder]="'Saldo: ' + getSaldo(venta) + ' Bs'"
                            class="input-field"
                            step="0.01"
                          />
                          <select [(ngModel)]="abonoMetodo[venta.id!]" class="input-field">
                            <option value="EFECTIVO">Efectivo</option>
                            <option value="TRANSFERENCIA">Transferencia</option>
                            <option value="OTRO">Otro</option>
                          </select>
                          <button class="btn-primary" (click)="registrarAbono(venta)">
                            Pagar
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          } @else {
            <div class="empty-state">
              <span class="empty-icon">✓</span>
              <p>¡No hay cuentas por cobrar!</p>
            </div>
          }
        } @else {
          <div class="stats-bar">
            <div class="stat">
              <span class="stat-label">Total Cobrado</span>
              <span class="stat-value success">{{ getTotalCobrado() | number:'1.2-2' }} Bs</span>
            </div>
            <div class="stat">
              <span class="stat-label">Ventas Canceladas</span>
              <span class="stat-value">{{ ventasCanceladas().length }}</span>
            </div>
          </div>

          @if (ventasCanceladas().length > 0) {
            <div class="ventas-list">
              @for (venta of ventasCanceladas(); track venta.id) {
                <div class="venta-card cancelada">
                  <div class="venta-main" (click)="toggleVenta(venta.id!)">
                    <div class="venta-info">
                      <h3>{{ venta.clienteNombre || 'Sin cliente' }}</h3>
                      <p class="venta-fecha">{{venta.loteNombre }}</p>
                      <p class="venta-fecha">{{ formatDate(venta.fecha) }}</p>
                      @if (venta.placa) { <p class="venta-placa">🚗 {{ venta.placa }}</p> }
                    </div>
                    <div class="venta-monto">
                      <span class="total">{{ venta.totalBs | number:'1.2-2' }} Bs</span>
                      <span class="badge cancelado">✓ Cancelado</span>
                      <span class="toggle">{{ isExpanded(venta.id!) ? '▲' : '▼' }}</span>
                    </div>
                  </div>

                  @if (isExpanded(venta.id!)) {
                    <div class="venta-detail">
                      <div class="detail-row">
                        <span>Peso total:</span>
                        <strong>{{ venta.totalKg | number:'1.1-1' }} kg</strong>
                      </div>
                      <div class="detail-row">
                        <span>Precio/kg:</span>
                        <strong>{{ venta.precioKg }} Bs</strong>
                      </div>
                      
                      @if (venta.observaciones) {
                        <div class="detail-row">
                          <span>Obs:</span>
                          <strong>{{ venta.observaciones }}</strong>
                        </div>
                      }

                      @if (getPagosVenta(venta.id!).length > 0) {
                        <div class="pagos-anteriores">
                          <h4>Pagos realizados</h4>
                          @for (pago of getPagosVenta(venta.id!); track pago.id) {
                            <div class="pago-item">
                              <span>{{ formatDate(pago.fecha) }}</span>
                              <span>{{ pago.monto | number:'1.2-2' }} Bs</span>
                              <span class="metodo">{{ pago.metodo }}</span>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          } @else {
            <div class="empty-state">
              <p>No hay ventas canceladas</p>
            </div>
          }
        }
      }
    </div>
  `,
  styles: [`
    .page-container { max-width: 800px; margin: 0 auto; padding: 1rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem; }
    .page-header h1 { margin: 0; color: var(--dark-color); }
    .filtro-fecha { display: flex; align-items: center; gap: 0.5rem; }
    .filtro-fecha label { font-size: 0.875rem; color: #666; }
    .filtro-fecha select { padding: 0.5rem; border: 1px solid #ddd; border-radius: 6px; }
    .loading { text-align: center; padding: 3rem; color: #666; }
    
    .tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
    .tab-btn { flex: 1; padding: 0.75rem; background: white; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s; }
    .tab-btn:hover { border-color: var(--primary-color); }
    .tab-btn.active { background: var(--primary-color); border-color: var(--primary-color); color: var(--dark-color); }
    
    .stats-bar { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
    .stat { background: white; flex: 1; padding: 1rem; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .stat-label { display: block; font-size: 0.75rem; color: #666; margin-bottom: 0.25rem; }
    .stat-value { font-size: 1.5rem; font-weight: 700; }
    .stat-value.danger { color: var(--secondary-color); }
    .stat-value.success { color: #28a745; }
    
    .ventas-list { display: flex; flex-direction: column; gap: 1rem; }
    .venta-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-left: 4px solid #ccc; }
    .venta-card.estado-pendiente { border-left-color: var(--secondary-color); }
    .venta-card.estado-parcial { border-left-color: #FF9800; }
    .venta-card.cancelada { border-left-color: #28a745; }
    
    .venta-main { display: flex; justify-content: space-between; align-items: center; padding: 1rem; cursor: pointer; }
    .venta-main:hover { background: #f8f9fa; }
    .venta-info h3 { margin: 0; color: var(--dark-color); font-size: 1rem; }
    .venta-fecha { margin: 0.25rem 0 0 0; font-size: 0.875rem; color: #666; }
    .venta-placa { margin: 0; font-size: 0.875rem; color: #666; }
    .venta-monto { text-align: right; }
    .venta-monto .total { display: block; font-size: 1.25rem; font-weight: 700; color: var(--dark-color); }
    .badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; margin-left: 0.5rem; }
    .badge.pendiente { background: #f8d7da; color: var(--secondary-color); }
    .badge.parcial { background: #fff3cd; color: #856404; }
    .badge.cancelado { background: #d4edda; color: #155724; }
    .toggle { margin-left: 0.5rem; color: #666; }
    
    .venta-detail { padding: 1rem; background: #f8f9fa; border-top: 1px solid #eee; }
    .detail-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee; }
    .detail-row:last-child { border-bottom: none; }
    .detail-row span { color: #666; }
    .detail-row.highlight { background: #fff3cd; padding: 0.5rem; border-radius: 4px; margin-top: 0.5rem; }
    .text-success { color: #28a745; }
    .text-danger { color: var(--secondary-color); }
    
    .pagos-anteriores { margin: 1rem 0; padding: 1rem; background: white; border-radius: 8px; }
    .pagos-anteriores h4 { margin: 0 0 0.5rem 0; font-size: 0.875rem; color: #28a745; }
    .pago-item { display: flex; justify-content: space-between; padding: 0.25rem 0; font-size: 0.875rem; }
    .pago-item .metodo { color: #666; font-size: 0.75rem; }
    
    .abonar-section { margin-top: 1rem; padding: 1rem; background: white; border-radius: 8px; }
    .abonar-section h4 { margin: 0 0 0.75rem 0; font-size: 0.875rem; }
    .abonar-form { display: flex; gap: 0.5rem; }
    .abonar-form input { flex: 1; }
    .abonar-form select { width: 140px; }
    .input-field { padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; }
    .input-field:focus { outline: none; border-color: var(--primary-color); }
    .btn-primary { background: var(--primary-color); color: var(--dark-color); border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; white-space: nowrap; }
    
    .empty-state { text-align: center; padding: 3rem; background: white; border-radius: 12px; }
    .empty-icon { display: inline-block; width: 60px; height: 60px; background: #d4edda; color: #155724; border-radius: 50%; line-height: 60px; font-size: 2rem; }
    .empty-state p { margin: 1rem 0 0 0; color: #666; font-size: 1.1rem; }
  `]
})
export class PagosComponent implements OnInit {
  private lotService = inject(LotService);

  loading = signal(true);
  tabActual = signal<'pendientes' | 'canceladas'>('pendientes');
  filtroDias = 30;

  ventasPendientes = signal<Venta[]>([]);
  ventasCanceladas = signal<Venta[]>([]);
  todasLasVentas = signal<Venta[]>([]);
  todosLosPagos = signal<Pago[]>([]);
  expandedVentas = signal<Set<string>>(new Set());

  abonoMonto: { [key: string]: number } = {};
  abonoMetodo: { [key: string]: 'EFECTIVO' | 'TRANSFERENCIA' | 'OTRO' } = {};

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    try {
      const ventas = await this.lotService.getVentas();
      this.todasLasVentas.set(ventas);

      const fechaLimite = this.filtroDias > 0
        ? format(subDays(new Date(), this.filtroDias), 'yyyy-MM-dd')
        : null;

      const filtradas = fechaLimite
        ? ventas.filter(v => v.fecha >= fechaLimite)
        : ventas;

      const pendientes = filtradas.filter(v => v.estado !== 'CANCELADO');
      const canceladas = filtradas.filter(v => v.estado === 'CANCELADO');

      this.ventasPendientes.set(pendientes);
      this.ventasCanceladas.set(canceladas);

      const pagos: Pago[] = [];
      for (const venta of [...pendientes, ...canceladas]) {
        if (venta.id) {
          const pagosVenta = await this.lotService.getPagos(venta.id);
          pagos.push(...pagosVenta);
        }
      }
      this.todosLosPagos.set(pagos);

      pendientes.forEach(v => {
        if (v.id) {
          const saldo = this.calculateSaldo(v, pagos.filter(p => p.ventaId === v.id));
          this.abonoMonto[v.id] = saldo;
          this.abonoMetodo[v.id] = 'EFECTIVO';
        }
      });
    } catch (e) {
      console.error('Error loading:', e);
    } finally {
      this.loading.set(false);
    }
  }

  setTab(tab: 'pendientes' | 'canceladas'): void {
    this.tabActual.set(tab);
    this.expandedVentas.set(new Set());
  }

  onFiltroChange(): void {
    this.loadData();
  }

  private calculateSaldo(venta: Venta, pagosVenta: Pago[]): number {
    const totalPagado = pagosVenta.reduce((sum, p) => sum + p.monto, 0);
    return venta.totalBs - totalPagado;
  }

  formatDate(fecha: string): string {
    return format(new Date(fecha), 'dd/MM/yyyy');
  }

  getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'PENDIENTE': return 'Por Cobrar';
      case 'PARCIAL': return 'Parcial';
      case 'CANCELADO': return 'Cancelado';
      default: return estado;
    }
  }

  getTotalPendiente(): number {
    return this.ventasPendientes().reduce((sum, v) => sum + this.getSaldo(v), 0);
  }

  getTotalCobrado(): number {
    return this.ventasCanceladas().reduce((sum, v) => sum + v.totalBs, 0);
  }

  getPagosVenta(ventaId: string): Pago[] {
    return this.todosLosPagos().filter(p => p.ventaId === ventaId);
  }

  getTotalPagado(venta: Venta): number {
    const pagos = this.getPagosVenta(venta.id!);
    return pagos.reduce((sum, p) => sum + p.monto, 0);
  }

  getSaldo(venta: Venta): number {
    const pagos = this.getPagosVenta(venta.id!);
    const totalPagado = pagos.reduce((sum, p) => sum + p.monto, 0);
    return venta.totalBs - totalPagado;
  }

  isExpanded(ventaId: string): boolean {
    return this.expandedVentas().has(ventaId);
  }

  toggleVenta(ventaId: string): void {
    this.expandedVentas.update(set => {
      const newSet = new Set(set);
      if (newSet.has(ventaId)) {
        newSet.delete(ventaId);
      } else {
        newSet.add(ventaId);
      }
      return newSet;
    });
  }

  async registrarAbono(venta: Venta): Promise<void> {
    const monto = this.abonoMonto[venta.id!];
    const metodo = this.abonoMetodo[venta.id!];

    if (!monto || monto <= 0) {
      alert('Ingresa un monto válido');
      return;
    }

    const saldo = this.getSaldo(venta);
    if (monto > saldo) {
      if (!confirm(`El monto excede el saldo de ${saldo.toFixed(2)} Bs. ¿Desea continuar?`)) {
        return;
      }
    }

    try {
      await this.lotService.createPago({
        ventaId: venta.id!,
        monto,
        fecha: format(new Date(), 'yyyy-MM-dd'),
        metodo
      });

      await this.loadData();
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  }
}
