import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LotService, Cliente, Venta, DetallePesada, Lote } from '../../core/services/lot.service';
import { RefreshService } from '../../core/services/refresh.service';
import { format } from 'date-fns';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      @if (!loteId) {
        <div class="page-header">
          <h1>Ventas</h1>
        </div>
        
        <div class="lote-selector">
          <label>Seleccionar Lote:</label>
          <select [(ngModel)]="selectedLoteId" (change)="onLoteChange()" class="input-field">
            <option value="">Seleccionar lote...</option>
            @for (lote of lotes(); track lote.id) {
              <option [value]="lote.id">
                {{ lote.nombre || 'Lote ' + lote.id?.slice(0,6) }} 
                ({{ getLoteInfo(lote) }})
              </option>
            }
          </select>
        </div>

        @if (ventasDelDia().length > 0) {
          <div class="ventas-hoy">
            <h2>Ventas de Hoy</h2>
            <div class="ventas-list">
              @for (venta of ventasDelDia(); track venta.id) {
                <div class="venta-card" [class]="'estado-' + venta.estado.toLowerCase()">
                  <div class="venta-header">
                    <strong>{{ venta.cliente?.nombre || 'Sin cliente' }}</strong>
                    <span class="badge" [class]="venta.estado.toLowerCase()">{{ getEstadoLabel(venta.estado) }}</span>
                  </div>
                  <div class="venta-body">
                    <div class="venta-info">
                      <span>{{ venta.total_kg | number:'1.1-1' }} kg</span>
                      <span>{{ venta.total_bs | number:'1.2-2' }} Bs</span>
                      <span>@ {{ venta.precio_kg }} Bs/kg</span>
                    </div>
                    <div class="venta-details">
                      @if (venta.placa) { <span>🚗 {{ venta.placa }}</span> }
                      <span>📍 {{ getLoteGalpon(venta) }}</span>
                    </div>
                  </div>
                  <div class="venta-actions">
                    <button class="btn-imprimir" (click)="imprimirBoleta(venta)">🖨️ Imprimir</button>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      } @else {
        <div class="page-header">
          <div class="header-info">
            <button class="btn-back" (click)="goBack()">←</button>
            <div>
              <h1>Ventas - {{ loteInfo()?.nombre || 'Lote' }}</h1>
              <p class="subtitle">{{ loteInfo()?.galpon?.granja?.nombre }} / {{ loteInfo()?.galpon?.nombre }}</p>
            </div>
          </div>
        </div>
      }

      @if (loading()) {
        <div class="loading">Cargando...</div>
      } @else if (!loteId) {
        <!-- Selector de lote arriba -->
      } @else if (!showForm() && ventasDelLote().length > 0) {
        <div class="resumen-lote">
          <h3>Resumen del Lote</h3>
          <div class="resumen-stats">
            <div class="stat-card">
              <span class="stat-label">Total Vendido</span>
              <span class="stat-value">{{ resumenLote().total_kg | number:'1.1-1' }} kg</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Ingresos</span>
              <span class="stat-value highlight">{{ resumenLote().total_bs | number:'1.2-2' }} Bs</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Por Cobrar</span>
              <span class="stat-value warning">{{ resumenLote().pendientes | number:'1.2-2' }} Bs</span>
            </div>
          </div>
        </div>
        
        <div class="ventas-lote-header">
          <h3>Todas las Ventas del Lote</h3>
          <div class="filtro-fecha">
            <select [(ngModel)]="filtroEstado" (change)="filtrarVentasLote()" class="input-field">
              <option value="todas">Todas</option>
              <option value="pendiente">Pendientes</option>
              <option value="cancelado">Canceladas</option>
            </select>
          </div>
        </div>

        <div class="ventas-list ventas-todas">
          @for (venta of ventasFiltradas(); track venta.id) {
            <div class="venta-card" [class]="'estado-' + venta.estado.toLowerCase()">
              <div class="venta-header">
                <strong>{{ venta.cliente?.nombre || 'Sin cliente' }}</strong>
                <span class="badge" [class]="venta.estado.toLowerCase()">{{ getEstadoLabel(venta.estado) }}</span>
              </div>
              <div class="venta-body">
                <div class="venta-info">
                  <span>{{ venta.total_kg | number:'1.1-1' }} kg</span>
                  <span>{{ venta.total_bs | number:'1.2-2' }} Bs</span>
                  <span>@ {{ venta.precio_kg }} Bs/kg</span>
                </div>
                <div class="venta-details">
                  <span>📅 {{ formatDate(venta.fecha) }}</span>
                  @if (venta.placa) { <span>🚗 {{ venta.placa }}</span> }
                </div>
              </div>
              <div class="venta-actions">
                <button class="btn-imprimir" (click)="imprimirBoleta(venta)">🖨️ Imprimir</button>
              </div>
            </div>
          }
        </div>

        <div class="empty-state">
          <button class="btn-primary btn-large" (click)="nuevaVenta()">+ Nueva Venta</button>
        </div>
      } @else if (!showForm()) {
        <div class="empty-state">
          <p>No hay ventas registradas en este lote</p>
          <button class="btn-primary btn-large" (click)="nuevaVenta()">+ Registrar Primera Venta</button>
        </div>
      }

      @if (loading()) {
        <div class="loading">Cargando...</div>
      } @else if (showForm()) {
        <div class="venta-form">
          <div class="form-section">
            <h3>1. Cliente</h3>
            <div class="cliente-search">
              <input 
                type="text" 
                [(ngModel)]="clienteSearch"
                (input)="searchClientes()"
                (focus)="showClienteDropdown = true"
                placeholder="Buscar cliente..."
                class="input-field"
              />
              @if (showClienteDropdown && clienteResults().length > 0) {
                <div class="dropdown">
                  @for (cliente of clienteResults(); track cliente.id) {
                    <div class="dropdown-item" (click)="selectCliente(cliente)">
                      {{ cliente.nombre }}
                      @if (cliente.telefono) { <small>{{ cliente.telefono }}</small> }
                    </div>
                  }
                  <div class="dropdown-item nuevo" (click)="createNewCliente()">
                    + Crear nuevo cliente
                  </div>
                </div>
              }
            </div>
            @if (selectedCliente()) {
              <div class="selected-cliente">
                <span>✓ {{ selectedCliente()!.nombre }}</span>
                <button class="btn-link" (click)="clearCliente()">Cambiar</button>
              </div>
            }
          </div>

          <div class="form-section">
            <h3>2. Precio por Kg</h3>
            <div class="precio-input">
              <input type="number" [(ngModel)]="precioKg" step="0.1" min="0" class="input-field" />
              <span>Bs/kg</span>
            </div>
          </div>

          <div class="form-section">
            <h3>3. Pesadas</h3>
            <div class="pesada-input">
              <input 
                type="number" 
                [(ngModel)]="nuevaPesada" 
                step="0.1" 
                min="0"
                placeholder="kg"
                class="input-field input-kg"
                (keyup.enter)="addPesada()"
              />
              <input 
                type="number" 
                [(ngModel)]="nuevaCantidadPollos" 
                min="1"
                placeholder="pollos"
                class="input-field input-pollos"
                (keyup.enter)="addPesada()"
              />
              <button class="btn-add" (click)="addPesada()">+ Agregar</button>
            </div>
            
            <div class="pesadas-list">
              @for (pesada of pesadas(); track pesada.id; let i = $index) {
                <div class="pesada-item" (click)="editPesada(pesada, i)">
                  <span class="pesada-num">{{ i + 1 }}</span>
                  <div class="pesada-info">
                    <span class="pesada-peso">{{ pesada.peso_kg | number:'1.1-1' }} kg</span>
                    <span class="pesada-pollos">🐔 {{ pesada.cantidad_pollos }}</span>
                  </div>
                  @if (editandoPesadaIndex === i) {
                    <div class="pesada-edit" (click)="$event.stopPropagation()">
                      <input type="number" [(ngModel)]="editPesadaKg" step="0.1" class="input-edit" />
                      <input type="number" [(ngModel)]="editPesadaPollos" min="1" class="input-edit" />
                      <button class="btn-save" (click)="savePesada(pesada.id!)">✓</button>
                      <button class="btn-cancel" (click)="cancelEditPesada()">×</button>
                    </div>
                  } @else {
                    <button class="btn-remove" (click)="removePesada(pesada.id!)">×</button>
                  }
                </div>
              }
              <div class="pesadas-total">
                <strong>Total:</strong>
                <span class="total-kg">{{ getTotalKg() | number:'1.1-1' }} kg</span>
                <span class="total-pollos">{{ getTotalPollos() }} pollos</span>
                <span class="total-bs">= {{ getTotalBs() | number:'1.2-2' }} Bs</span>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3>4. Datos Adicionales</h3>
            <div class="form-row">
              <div class="form-group">
                <label>Placa del vehículo</label>
                <input type="text" [(ngModel)]="placa" placeholder="Ej: ABC-1234" class="input-field" />
              </div>
              <div class="form-group">
                <label>Fecha</label>
                <input type="date" [(ngModel)]="fecha" class="input-field" />
              </div>
            </div>
            <div class="form-group">
              <label>Observaciones</label>
              <input type="text" [(ngModel)]="observaciones" placeholder="Opcional" class="input-field" />
            </div>
          </div>

          <div class="form-actions">
            <button class="btn-secondary" (click)="cancel()">Cancelar</button>
            <button class="btn-primary btn-large" (click)="guardarVenta()">
              Guardar Venta ({{ getTotalBs() | number:'1.2-2' }} Bs)
            </button>
          </div>
        </div>
      } @else if (!loteId) {
        <div class="empty-state">
          <p>Selecciona un lote para comenzar</p>
        </div>
      }

      @if (pagoModalVisible()) {
        <div class="modal-overlay" (click)="closePagoModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>Registrar Pago</h3>
            <p class="modal-info">
              Total: {{ ventaActual()?.total_bs | number:'1.2-2' }} Bs
            </p>
            <div class="form-group">
              <label>Monto a pagar</label>
              <input type="number" [(ngModel)]="montoPago" step="0.01" min="0" class="input-field" />
            </div>
            <div class="form-group">
              <label>Método</label>
              <select [(ngModel)]="metodoPago" class="input-field">
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div class="modal-actions">
              <button class="btn-secondary" (click)="closePagoModal()">Cancelar</button>
              <button class="btn-primary" (click)="registrarPago()">Registrar</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { max-width: 800px; margin: 0 auto; padding: 1rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-header h1 { margin: 0; color: #2B2B2B; }
    .header-info { display: flex; align-items: center; gap: 1rem; }
    .btn-back { background: #e9ecef; border: none; width: 40px; height: 40px; border-radius: 8px; cursor: pointer; font-size: 1.25rem; }
    .btn-back:hover { background: #FFC107; }
    .subtitle { margin: 0.25rem 0 0 0; color: #666; }
    .loading { text-align: center; padding: 3rem; color: #666; }
    
    .lote-selector { background: white; border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem; }
    .lote-selector label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
    .input-field { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; }
    .input-field:focus { outline: none; border-color: #FFC107; }
    
    .ventas-hoy { margin-bottom: 2rem; }
    .ventas-hoy h2 { margin-bottom: 1rem; color: #2B2B2B; }
    .ventas-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .venta-card { background: white; border-radius: 12px; padding: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-left: 4px solid #ccc; }
    .venta-card.estado-pendiente { border-left-color: #D32F2F; }
    .venta-card.estado-parcial { border-left-color: #FF9800; }
    .venta-card.estado-cancelado { border-left-color: #28a745; }
    .venta-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .badge { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
    .badge.pendiente { background: #f8d7da; color: #D32F2F; }
    .badge.parcial { background: #fff3cd; color: #856404; }
    .badge.cancelado { background: #d4edda; color: #155724; }
    .venta-body { display: flex; justify-content: space-between; }
    .venta-info { display: flex; gap: 1rem; font-size: 0.875rem; }
    .venta-info span:first-child { font-weight: 600; }
    .venta-details { font-size: 0.875rem; color: #666; display: flex; flex-direction: column; gap: 0.25rem; }
    .venta-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #eee; }
    .btn-imprimir { background: #17a2b8; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
    .btn-imprimir:hover { background: #138496; }
    
    .venta-form { background: white; border-radius: 16px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .form-section { margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid #eee; }
    .form-section:last-of-type { border-bottom: none; }
    .form-section h3 { margin: 0 0 1rem 0; color: #2B2B2B; font-size: 1rem; }
    
    .cliente-search { position: relative; }
    .dropdown { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 100; max-height: 200px; overflow-y: auto; }
    .dropdown-item { padding: 0.75rem; cursor: pointer; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
    .dropdown-item:hover { background: #f8f9fa; }
    .dropdown-item.nuevo { color: #FFC107; font-weight: 600; border-bottom: none; }
    .dropdown-item small { color: #666; }
    .selected-cliente { margin-top: 0.75rem; padding: 0.75rem; background: #d4edda; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; color: #155724; }
    .btn-link { background: none; border: none; color: #155724; text-decoration: underline; cursor: pointer; }
    
    .precio-input { display: flex; align-items: center; gap: 0.5rem; }
    .precio-input input { max-width: 150px; }
    .precio-input span { color: #666; }
    
    .pesada-input { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    .input-kg { flex: 2; }
    .input-pollos { flex: 1; max-width: 100px; }
    .btn-add { background: #28a745; color: white; border: none; padding: 0.75rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 600; white-space: nowrap; }
    
    .pesadas-list { background: #f8f9fa; border-radius: 8px; padding: 0.75rem; }
    .pesada-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; background: white; border-radius: 6px; margin-bottom: 0.5rem; cursor: pointer; }
    .pesada-item:hover { background: #fff; }
    .pesada-num { width: 24px; height: 24px; background: #FFC107; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; }
    .pesada-info { flex: 1; display: flex; gap: 1rem; align-items: center; }
    .pesada-peso { font-weight: 500; }
    .pesada-pollos { color: #666; font-size: 0.875rem; }
    .btn-remove { background: #f8d7da; color: #D32F2F; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 1rem; }
    .pesada-edit { display: flex; gap: 0.5rem; align-items: center; }
    .input-edit { width: 70px; padding: 0.25rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.875rem; }
    .btn-save { background: #28a745; color: white; border: none; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; }
    .btn-cancel { background: #f8d7da; color: #D32F2F; border: none; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; }
    .pesadas-total { display: flex; align-items: center; gap: 1.5rem; padding-top: 0.75rem; border-top: 2px solid #ddd; margin-top: 0.5rem; }
    .total-kg { font-size: 1.25rem; font-weight: 700; color: #2B2B2B; }
    .total-pollos { color: #666; font-size: 0.875rem; }
    .total-bs { font-size: 1.25rem; font-weight: 700; color: #28a745; margin-left: auto; }
    
    .form-row { display: flex; gap: 1rem; }
    .form-row .form-group { flex: 1; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-weight: 500; margin-bottom: 0.5rem; font-size: 0.875rem; }
    
    .form-actions { display: flex; gap: 1rem; justify-content: flex-end; padding-top: 1rem; }
    .btn-primary { background: #FFC107; color: #2B2B2B; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-secondary { background: #e9ecef; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; }
    .btn-large { padding: 1rem 2rem; font-size: 1.1rem; }
    
    .empty-state { text-align: center; padding: 2rem; }
    .resumen-lote { background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
    .resumen-lote h3 { margin: 0 0 1rem 0; }
    .resumen-stats { display: flex; gap: 1rem; }
    .stat-card { flex: 1; background: #f8f9fa; padding: 1rem; border-radius: 8px; text-align: center; }
    .stat-label { display: block; font-size: 0.75rem; color: #666; margin-bottom: 0.25rem; }
    .stat-value { font-size: 1.5rem; font-weight: 700; }
    .stat-value.highlight { color: #28a745; }
    .stat-value.warning { color: #D32F2F; }
    
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .modal { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 400px; }
    .modal h3 { margin: 0 0 1rem 0; text-align: center; }
    .modal-info { text-align: center; color: #666; margin-bottom: 1rem; }
    .modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1.5rem; }
    
    .ventas-lote-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .ventas-lote-header h3 { margin: 0; color: #2B2B2B; }
    .filtro-fecha { display: flex; gap: 0.5rem; }
    .filtro-fecha select { padding: 0.5rem; min-width: 120px; }
    .ventas-todas { margin-bottom: 1.5rem; }
  `]
})
export class VentasComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private lotService = inject(LotService);
  private refreshService = inject(RefreshService);

  loading = signal(true);
  showForm = signal(false);
  showClienteDropdown = false;
  
  lotes = signal<Lote[]>([]);
  selectedLoteId = '';
  loteId: string | null = null;
  loteInfo = signal<Lote | null>(null);
  
  clientes = signal<Cliente[]>([]);
  clienteResults = signal<Cliente[]>([]);
  selectedCliente = signal<Cliente | null>(null);
  
  ventasDelDia = signal<Venta[]>([]);
  ventasDelLote = signal<Venta[]>([]);
  ventasFiltradas = signal<Venta[]>([]);
  filtroEstado = 'todas';
  pesadas = signal<DetallePesada[]>([]);
  resumenLote = signal<{ total_bs: number; total_kg: number; pendientes: number }>({ total_bs: 0, total_kg: 0, pendientes: 0 });
  
  ventaActual = signal<Venta | null>(null);
  pagoModalVisible = signal(false);
  
  clienteSearch = '';
  nuevaPesada: number | null = null;
  nuevaCantidadPollos: number = 1;
  precioKg: number = 0;
  placa = '';
  fecha = format(new Date(), 'yyyy-MM-dd');
  observaciones = '';
  
  editandoPesadaIndex: number | null = null;
  editPesadaKg: number = 0;
  editPesadaPollos: number = 1;
  
  montoPago = 0;
  metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'OTRO' = 'EFECTIVO';
  
  private refreshSub: any;

  async ngOnInit(): Promise<void> {
    this.loteId = this.route.snapshot.paramMap.get('loteId');
    await this.loadData();
    
    this.refreshSub = this.refreshService.refresh$.subscribe(() => {
      this.loadData();
    });
  }

  ngOnDestroy(): void {
    if (this.refreshSub) this.refreshSub.unsubscribe();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    try {
      const [lotesData] = await Promise.all([
        this.lotService.getLotes()
      ]);
      this.lotes.set(lotesData.filter(l => l.estado === 'ACTIVO'));
      
      if (this.loteId) {
        const loteInfo = await this.lotService.getLote(this.loteId);
        this.loteInfo.set(loteInfo);
        
        const resumen = await this.lotService.getResumenVentas(this.loteId);
        this.resumenLote.set(resumen);
        
        const ventas = await this.lotService.getVentas(this.loteId);
        const hoy = format(new Date(), 'yyyy-MM-dd');
        this.ventasDelDia.set(ventas.filter(v => v.fecha === hoy));
        this.ventasDelLote.set(ventas);
        this.filtrarVentasLote();
      } else {
        const ventas = await this.lotService.getVentasDiarias();
        this.ventasDelDia.set(ventas);
      }
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      this.loading.set(false);
    }
  }

  filtrarVentasLote(): void {
    let filtradas = this.ventasDelLote();
    if (this.filtroEstado === 'pendiente') {
      filtradas = filtradas.filter(v => v.estado !== 'CANCELADO');
    } else if (this.filtroEstado === 'cancelado') {
      filtradas = filtradas.filter(v => v.estado === 'CANCELADO');
    }
    this.ventasFiltradas.set(filtradas);
  }

  onLoteChange(): void {
    if (this.selectedLoteId) {
      this.router.navigate(['/ventas', this.selectedLoteId]);
    }
  }

  getLoteInfo(lote: Lote): string {
    return `${lote.galpon?.granja?.nombre || ''} / ${lote.galpon?.nombre || ''}`;
  }

  getLoteGalpon(venta: Venta): string {
    if (venta.lote) {
      const galpon = venta.lote.galpon?.nombre || '';
      const granja = venta.lote.galpon?.granja?.nombre || '';
      return `${granja} / ${galpon}`;
    }
    return 'Sin lote';
  }

  async imprimirBoleta(venta: Venta): Promise<void> {
    const pesadas = await this.lotService.getDetallePesadas(venta.id!);
    const pagos = await this.lotService.getPagos(venta.id!);
    
    const contenido = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Boleta de Venta</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; max-width: 300px; }
    h1 { font-size: 18px; text-align: center; margin-bottom: 5px; }
    .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
    .info { margin-bottom: 10px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; }
    .label { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
    th { background: #f0f0f0; }
    .total { font-size: 16px; font-weight: bold; margin-top: 15px; text-align: right; }
    .footer { margin-top: 20px; text-align: center; font-size: 10px; border-top: 1px solid #000; padding-top: 10px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>🐔 BOLETA DE VENTA</h1>
    <div>EngordeEnOrden</div>
  </div>
  
  <div class="info">
    <div class="info-row"><span class="label">Fecha:</span> <span>${this.formatDate(venta.fecha)}</span></div>
    <div class="info-row"><span class="label">Cliente:</span> <span>${venta.cliente?.nombre || 'Sin cliente'}</span></div>
    ${venta.cliente?.telefono ? `<div class="info-row"><span class="label">Teléfono:</span> <span>${venta.cliente.telefono}</span></div>` : ''}
    <div class="info-row"><span class="label">Lote/Galpón:</span> <span>${this.getLoteGalpon(venta)}</span></div>
    ${venta.placa ? `<div class="info-row"><span class="label">Vehículo:</span> <span>${venta.placa}</span></div>` : ''}
  </div>
  
  <table>
    <tr><th>#</th><th>Peso (kg)</th><th>Pollos</th></tr>
    ${pesadas.map((p, i) => `<tr><td>${i + 1}</td><td>${p.peso_kg.toFixed(2)}</td><td>${p.cantidad_pollos}</td></tr>`).join('')}
  </table>
  
  <div class="info">
    <div class="info-row"><span class="label">Total Pollos:</span> <span>${pesadas.reduce((s, p) => s + p.cantidad_pollos, 0)}</span></div>
    <div class="info-row"><span class="label">Total Kilos:</span> <span>${venta.total_kg.toFixed(2)} kg</span></div>
    <div class="info-row"><span class="label">Precio/kg:</span> <span>${venta.precio_kg} Bs</span></div>
  </div>
  
  <div class="total">TOTAL: ${venta.total_bs.toFixed(2)} Bs</div>
  
  ${venta.estado !== 'CANCELADO' && pagos.length > 0 ? `
  <div class="info" style="margin-top:15px;">
    <div class="info-row"><span class="label">Pagado:</span> <span>${pagos.reduce((s, p) => s + p.monto, 0).toFixed(2)} Bs</span></div>
    <div class="info-row"><span class="label">Pendiente:</span> <span>${(venta.total_bs - pagos.reduce((s, p) => s + p.monto, 0)).toFixed(2)} Bs</span></div>
  </div>
  ` : ''}
  
  <div class="info-row"><span class="label">Estado:</span> <span>${this.getEstadoLabel(venta.estado)}</span></div>
  
  <div class="footer">
    ¡Gracias por su compra!<br>
    EngordeEnOrden - Sistema de Gestión Avícola
  </div>
  
  <script>window.print();</script>
</body>
</html>`;

    const ventana = window.open('', '_blank', 'width=400,height=600');
    if (ventana) {
      ventana.document.write(contenido);
      ventana.document.close();
    }
  }

  formatDate(fecha: string): string {
    return format(new Date(fecha), 'dd/MM/yyyy');
  }

  goBack(): void {
    this.router.navigate(['/ventas']);
    this.selectedLoteId = '';
  }

  async searchClientes(): Promise<void> {
    if (this.clienteSearch.length < 2) {
      this.clienteResults.set([]);
      return;
    }
    try {
      const results = await this.lotService.searchClientes(this.clienteSearch);
      this.clienteResults.set(results);
    } catch (e) {
      console.error('Error searching:', e);
    }
  }

  selectCliente(cliente: Cliente): void {
    this.selectedCliente.set(cliente);
    this.clienteSearch = cliente.nombre;
    this.showClienteDropdown = false;
  }

  clearCliente(): void {
    this.selectedCliente.set(null);
    this.clienteSearch = '';
  }

  async createNewCliente(): Promise<void> {
    if (!this.clienteSearch.trim()) {
      alert('Ingresa un nombre para el cliente');
      return;
    }
    try {
      const nuevoCliente = await this.lotService.createCliente({ nombre: this.clienteSearch.trim() });
      this.selectCliente(nuevoCliente);
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  }

  addPesada(): void {
    if (!this.nuevaPesada || this.nuevaPesada <= 0) return;
    if (!this.nuevaCantidadPollos || this.nuevaCantidadPollos <= 0) this.nuevaCantidadPollos = 1;
    
    const pesada: DetallePesada = {
      id: 'temp-' + Date.now(),
      venta_id: '',
      peso_kg: this.nuevaPesada,
      cantidad_pollos: this.nuevaCantidadPollos
    };
    
    this.pesadas.update(list => [...list, pesada]);
    this.nuevaPesada = null;
    this.nuevaCantidadPollos = 1;
  }

  editPesada(pesada: DetallePesada, index: number): void {
    this.editandoPesadaIndex = index;
    this.editPesadaKg = pesada.peso_kg;
    this.editPesadaPollos = pesada.cantidad_pollos;
  }

  async savePesada(id: string): Promise<void> {
    if (id.startsWith('temp-')) {
      this.pesadas.update(list => list.map(p => {
        if (p.id === id) {
          return { ...p, peso_kg: this.editPesadaKg, cantidad_pollos: this.editPesadaPollos };
        }
        return p;
      }));
    } else {
      await this.lotService.updatePesada(id, this.editPesadaKg, this.editPesadaPollos);
      const pesadaActualizada = this.pesadas().find(p => p.id === id);
      if (pesadaActualizada) {
        this.pesadas.update(list => list.map(p => {
          if (p.id === id) {
            return { ...p, peso_kg: this.editPesadaKg, cantidad_pollos: this.editPesadaPollos };
          }
          return p;
        }));
      }
    }
    this.cancelEditPesada();
  }

  cancelEditPesada(): void {
    this.editandoPesadaIndex = null;
    this.editPesadaKg = 0;
    this.editPesadaPollos = 1;
  }

  removePesada(id: string): void {
    this.pesadas.update(list => list.filter(p => p.id !== id));
  }

  getTotalKg(): number {
    return this.pesadas().reduce((sum, p) => sum + p.peso_kg, 0);
  }

  getTotalPollos(): number {
    return this.pesadas().reduce((sum, p) => sum + (p.cantidad_pollos || 0), 0);
  }

  getTotalBs(): number {
    return this.getTotalKg() * this.precioKg;
  }

  nuevaVenta(): void {
    this.showForm.set(true);
    this.resetForm();
  }

  cancel(): void {
    this.showForm.set(false);
    this.resetForm();
  }

  resetForm(): void {
    this.selectedCliente.set(null);
    this.clienteSearch = '';
    this.precioKg = 0;
    this.pesadas.set([]);
    this.placa = '';
    this.fecha = format(new Date(), 'yyyy-MM-dd');
    this.observaciones = '';
  }

  async guardarVenta(): Promise<void> {
    if (this.pesadas().length === 0) {
      alert('Agrega al menos una pesada');
      return;
    }
    if (!this.precioKg || this.precioKg <= 0) {
      alert('Ingresa el precio por kg');
      return;
    }

    try {
      const venta = await this.lotService.createVenta({
        cliente_id: this.selectedCliente()?.id,
        lote_id: this.loteId || undefined,
        precio_kg: this.precioKg,
        total_kg: this.getTotalKg(),
        total_bs: this.getTotalBs(),
        placa: this.placa || undefined,
        fecha: this.fecha,
        observaciones: this.observaciones || undefined,
        estado: 'PENDIENTE'
      });

      for (const pesada of this.pesadas()) {
        await this.lotService.addPesada(venta.id!, pesada.peso_kg, pesada.cantidad_pollos);
      }

      if (this.loteId) {
        const resumen = await this.lotService.getResumenVentas(this.loteId);
        this.resumenLote.set(resumen);
      }
      
      await this.loadData();
      this.showForm.set(false);
      this.resetForm();
      
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  }

  getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'PENDIENTE': return 'Por Cobrar';
      case 'PARCIAL': return 'Parcial';
      case 'CANCELADO': return 'Cancelado';
      default: return estado;
    }
  }

  closePagoModal(): void {
    this.pagoModalVisible.set(false);
  }

  async registrarPago(): Promise<void> {
    if (!this.montoPago || this.montoPago <= 0) {
      alert('Ingresa un monto válido');
      return;
    }
    
    try {
      await this.lotService.createPago({
        venta_id: this.ventaActual()!.id!,
        monto: this.montoPago,
        fecha: format(new Date(), 'yyyy-MM-dd'),
        metodo: this.metodoPago
      });
      
      this.closePagoModal();
      await this.loadData();
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  }
}
