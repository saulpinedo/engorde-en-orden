import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LotService, Cliente, Venta } from '../../core/services/lot.service';
import { RefreshService } from '../../core/services/refresh.service';
import { format, subMonths } from 'date-fns';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Clientes</h1>
        <button class="btn-primary" (click)="openModal()">+ Nuevo Cliente</button>
      </div>

      @if (loading()) {
        <div class="loading">Cargando...</div>
      } @else {
        <div class="search-box">
          <input 
            type="text" 
            [(ngModel)]="searchTerm" 
            (input)="onSearch()"
            placeholder="Buscar cliente por nombre..."
            class="search-input"
          />
        </div>

        <div class="clientes-grid">
          @for (cliente of filteredClientes(); track cliente.id) {
            <div class="cliente-card" (click)="selectCliente(cliente)">
              <div class="cliente-info">
                <h3>{{ cliente.nombre }}</h3>
                <p class="telefono">{{ cliente.telefono || 'Sin teléfono' }}</p>
              </div>
              <button class="btn-edit" (click)="editCliente(cliente); $event.stopPropagation()">
                ✏️
              </button>
            </div>
          } @empty {
            <div class="empty-state">
              <p>No hay clientes registrados</p>
            </div>
          }
        </div>
      }

      @if (selectedCliente()) {
        <div class="modal-overlay" (click)="closeClienteDetail()">
          <div class="modal modal-large" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ selectedCliente()!.nombre }}</h2>
              <button class="btn-close" (click)="closeClienteDetail()">×</button>
            </div>
            <div class="modal-body">
              <p class="info-line"><strong>Teléfono:</strong> {{ selectedCliente()!.telefono || 'N/A' }}</p>
              
              <h3>Historial de Compras</h3>
              
              <div class="filtro-fecha">
                <div class="filtro-group">
                  <label>Desde:</label>
                  <input type="date" [(ngModel)]="fechaDesde" (change)="filtrarVentas()" class="input-field" />
                </div>
                <div class="filtro-group">
                  <label>Hasta:</label>
                  <input type="date" [(ngModel)]="fechaHasta" (change)="filtrarVentas()" class="input-field" />
                </div>
                <button class="btn-limpiar" (click)="limpiarFiltro()">Limpiar</button>
              </div>

              <div class="resumen-filtro">
                @if (fechaDesde || fechaHasta) {
                  <span class="filtro-activo">
                    Mostrando {{ ventasFiltradas().length }} ventas
                    @if (totalFiltrado() > 0) { | Total: {{ totalFiltrado() | number:'1.2-2' }} Bs }
                  </span>
                }
              </div>
              
              @if (ventasFiltradas().length > 0) {
                <div class="ventas-list">
                  @for (venta of ventasFiltradas(); track venta.id) {
                    <div class="venta-item" [class]="'estado-' + venta.estado.toLowerCase()">
                      <div class="venta-main">
                        <span class="venta-fecha">{{ formatDate(venta.fecha) }}</span>
                        <span class="venta-lote">{{ getLoteNombre(venta) }}</span>
                      </div>
                      <div class="venta-details">
                        <span class="venta-kg">{{ venta.total_kg | number:'1.1-1' }} kg</span>
                        <span class="venta-total">{{ venta.total_bs | number:'1.2-2' }} Bs</span>
                        <span class="venta-estado" [class]="venta.estado.toLowerCase()">
                          {{ getEstadoLabel(venta.estado) }}
                        </span>
                      </div>
                    </div>
                  }
                </div>
                <div class="resumen-total">
                  <strong>Total del período:</strong>
                  <span class="total-valor">{{ totalFiltrado() | number:'1.2-2' }} Bs</span>
                </div>
              } @else {
                <p class="empty-ventas">No hay compras en este período</p>
              }
            </div>
          </div>
        </div>
      }

      @if (modalVisible()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>{{ editingCliente() ? 'Editar Cliente' : 'Nuevo Cliente' }}</h3>
            <form (ngSubmit)="saveCliente()">
              <div class="form-group">
                <label>Nombre *</label>
                <input type="text" [(ngModel)]="form.nombre" name="nombre" required class="input-field" />
              </div>
              <div class="form-group">
                <label>Teléfono</label>
                <input type="text" [(ngModel)]="form.telefono" name="telefono" class="input-field" />
              </div>
              <div class="modal-actions">
                @if (editingCliente()) {
                  <button type="button" class="btn-danger" (click)="deleteCliente()">🗑️</button>
                }
                <button type="button" class="btn-secondary" (click)="closeModal()">Cancelar</button>
                <button type="submit" class="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { max-width: 1000px; margin: 0 auto; padding: 1rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-header h1 { margin: 0; color: #2B2B2B; }
    .loading { text-align: center; padding: 3rem; color: #666; }
    
    .search-box { margin-bottom: 1rem; }
    .search-input { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; }
    .search-input:focus { outline: none; border-color: #FFC107; }
    
    .clientes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .cliente-card { background: white; border-radius: 12px; padding: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.2s; }
    .cliente-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); transform: translateY(-2px); }
    .cliente-info h3 { margin: 0; color: #2B2B2B; }
    .telefono { margin: 0.25rem 0 0 0; color: #666; font-size: 0.875rem; }
    .btn-edit { background: none; border: none; font-size: 1.25rem; cursor: pointer; padding: 0.5rem; }
    .btn-edit:hover { transform: scale(1.1); }
    .empty-state { grid-column: 1 / -1; text-align: center; padding: 3rem; color: #666; }
    
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .modal { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 400px; max-height: 90vh; overflow-y: auto; }
    .modal-large { max-width: 600px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .modal-header h2 { margin: 0; color: #2B2B2B; }
    .btn-close { background: none; border: none; font-size: 2rem; cursor: pointer; color: #666; }
    .modal h3 { margin: 0 0 1rem 0; color: #2B2B2B; }
    .modal-body h3 { margin: 1.5rem 0 1rem 0; color: #2B2B2B; }
    .info-line { color: #666; margin-bottom: 1rem; }
    
    .filtro-fecha { display: flex; gap: 1rem; align-items: flex-end; margin-bottom: 1rem; flex-wrap: wrap; }
    .filtro-group { flex: 1; min-width: 120px; }
    .filtro-group label { display: block; font-size: 0.75rem; color: #666; margin-bottom: 0.25rem; }
    .btn-limpiar { background: #e9ecef; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem; white-space: nowrap; }
    .btn-limpiar:hover { background: #ddd; }
    
    .resumen-filtro { margin-bottom: 1rem; }
    .filtro-activo { font-size: 0.875rem; color: #666; }
    
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-weight: 500; margin-bottom: 0.5rem; font-size: 0.875rem; }
    .input-field { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; }
    .input-field:focus { outline: none; border-color: #FFC107; }
    
    .modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1.5rem; }
    .btn-primary { background: #FFC107; color: #2B2B2B; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-secondary { background: #e9ecef; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; }
    .btn-danger { background: #f8d7da; color: #D32F2F; border: none; padding: 0.75rem; border-radius: 8px; cursor: pointer; }
    
    .ventas-list { max-height: 300px; overflow-y: auto; }
    .venta-item { background: #f8f9fa; border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem; border-left: 4px solid #ccc; }
    .venta-item.estado-pendiente { border-left-color: #D32F2F; }
    .venta-item.estado-parcial { border-left-color: #FF9800; }
    .venta-item.estado-cancelado { border-left-color: #28a745; }
    .venta-main { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
    .venta-fecha { font-weight: 600; }
    .venta-lote { color: #666; font-size: 0.875rem; }
    .venta-details { display: flex; gap: 1rem; font-size: 0.875rem; }
    .venta-kg { color: #17a2b8; }
    .venta-total { font-weight: 600; }
    .venta-estado { padding: 0.125rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .venta-estado.pendiente { background: #f8d7da; color: #D32F2F; }
    .venta-estado.parcial { background: #fff3cd; color: #856404; }
    .venta-estado.cancelado { background: #d4edda; color: #155724; }
    .empty-ventas { color: #666; text-align: center; padding: 2rem; }
    
    .resumen-total { display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #2B2B2B; color: white; border-radius: 8px; margin-top: 1rem; }
    .total-valor { font-size: 1.25rem; font-weight: 700; color: #FFC107; }
  `]
})
export class ClientesComponent implements OnInit {
  private lotService = inject(LotService);
  private refreshService = inject(RefreshService);

  clientes = signal<Cliente[]>([]);
  filteredClientes = signal<Cliente[]>([]);
  loading = signal(true);
  modalVisible = signal(false);
  editingCliente = signal<Cliente | null>(null);
  selectedCliente = signal<Cliente | null>(null);
  clienteVentas = signal<Venta[]>([]);
  todasVentasCliente = signal<Venta[]>([]);
  ventasFiltradas = signal<Venta[]>([]);
  searchTerm = '';
  form: any = {};
  
  fechaDesde = '';
  fechaHasta = '';

  async ngOnInit(): Promise<void> {
    await this.loadClientes();
    
    this.refreshService.refresh$.subscribe(() => {
      this.loadClientes();
    });
  }

  async loadClientes(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.lotService.getClientes();
      this.clientes.set(data);
      this.filteredClientes.set(data);
    } catch (e) {
      console.error('Error loading clientes:', e);
    } finally {
      this.loading.set(false);
    }
  }

  onSearch(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredClientes.set(this.clientes());
    } else {
      this.filteredClientes.set(
        this.clientes().filter(c => 
          c.nombre.toLowerCase().includes(term) ||
          (c.telefono && c.telefono.includes(term))
        )
      );
    }
  }

  openModal(): void {
    this.editingCliente.set(null);
    this.form = { nombre: '', telefono: '' };
    this.modalVisible.set(true);
  }

  editCliente(cliente: Cliente): void {
    this.editingCliente.set(cliente);
    this.form = { ...cliente };
    this.modalVisible.set(true);
  }

  closeModal(): void {
    this.modalVisible.set(false);
    this.editingCliente.set(null);
  }

  async saveCliente(): Promise<void> {
    if (!this.form.nombre?.trim()) {
      alert('El nombre es requerido');
      return;
    }

    try {
      if (this.editingCliente()) {
        await this.lotService.updateCliente(this.editingCliente()!.id!, this.form);
      } else {
        await this.lotService.createCliente(this.form);
      }
      this.closeModal();
      await this.loadClientes();
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  }

  async deleteCliente(): Promise<void> {
    if (!this.editingCliente()) return;
    if (!confirm('¿Eliminar este cliente?')) return;

    try {
      await this.lotService.deleteCliente(this.editingCliente()!.id!);
      this.closeModal();
      await this.loadClientes();
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  }

  async selectCliente(cliente: Cliente): Promise<void> {
    this.selectedCliente.set(cliente);
    try {
      const ventas = await this.lotService.getVentasPorCliente(cliente.id!);
      this.todasVentasCliente.set(ventas);
      this.setFechasDefault();
      this.filtrarVentas();
    } catch (e) {
      console.error('Error loading ventas:', e);
      this.todasVentasCliente.set([]);
      this.ventasFiltradas.set([]);
    }
  }

  setFechasDefault(): void {
    const haceUnMes = subMonths(new Date(), 1);
    this.fechaDesde = format(haceUnMes, 'yyyy-MM-dd');
    this.fechaHasta = format(new Date(), 'yyyy-MM-dd');
  }

  filtrarVentas(): void {
    let filtradas = this.todasVentasCliente();
    
    if (this.fechaDesde) {
      filtradas = filtradas.filter(v => v.fecha >= this.fechaDesde);
    }
    if (this.fechaHasta) {
      filtradas = filtradas.filter(v => v.fecha <= this.fechaHasta);
    }
    
    this.ventasFiltradas.set(filtradas);
  }

  limpiarFiltro(): void {
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.ventasFiltradas.set(this.todasVentasCliente());
  }

  totalFiltrado(): number {
    return this.ventasFiltradas().reduce((sum, v) => sum + v.total_bs, 0);
  }

  closeClienteDetail(): void {
    this.selectedCliente.set(null);
    this.clienteVentas.set([]);
    this.todasVentasCliente.set([]);
    this.ventasFiltradas.set([]);
    this.fechaDesde = '';
    this.fechaHasta = '';
  }

  formatDate(fecha: string): string {
    return format(new Date(fecha), 'dd/MM/yyyy');
  }

  getLoteNombre(venta: Venta): string {
    return venta.lote?.nombre || venta.lote?.id?.slice(0, 6) || 'Sin lote';
  }

  getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'PENDIENTE': return 'Por cobrar';
      case 'PARCIAL': return 'Parcial';
      case 'CANCELADO': return 'Cancelado';
      default: return estado;
    }
  }
}
