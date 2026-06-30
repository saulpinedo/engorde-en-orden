import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LotService, Lote, GastoOperativo, GastoCategoria } from '../../core/services/lot.service';
import { StorageService } from '../../core/services/storage.service';
import { RefreshService } from '../../core/services/refresh.service';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface ResumenGastos {
  total: number;
  cantidad: number;
  promedio: number;
  porCategoria: { categoria: GastoCategoria; total: number }[];
}

@Component({
  selector: 'app-gastos-operativos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>💸 Gastos Operativos</h1>
          <p class="subtitle">Maíz, premezclas, gas, sueldos, herramientas y más</p>
        </div>
        <button class="btn-primary" (click)="openDialog()" [disabled]="!selectedLoteId()">➕ Nuevo Gasto</button>
      </div>

      <!-- Filtros -->
      <div class="filters-card">
        <div class="filter-group">
          <label>Lote</label>
          <select [ngModel]="selectedLoteId()" (ngModelChange)="onLoteChange($event)" class="input-field">
            <option [ngValue]="''">-- Seleccionar lote --</option>
            @for (l of lotes(); track l.id) {
              <option [ngValue]="l.id">{{ l.nombre || 'Lote ' + l.id?.slice(0,4) }} ({{ l.estado }})</option>
            }
          </select>
        </div>
        @if (selectedLoteId()) {
          <div class="filter-group">
            <label>Desde</label>
            <input type="date" [(ngModel)]="fechaDesde" (change)="loadData()" class="input-field" />
          </div>
          <div class="filter-group">
            <label>Hasta</label>
            <input type="date" [(ngModel)]="fechaHasta" (change)="loadData()" class="input-field" />
          </div>
          <div class="filter-group">
            <label>Categoría</label>
            <select [(ngModel)]="filtroCategoria" (change)="loadData()" class="input-field">
              <option value="">Todas</option>
              <option value="ALIMENTO">🌽 Alimento</option>
              <option value="INSUMOS">💊 Insumos</option>
              <option value="MANO_OBRA">👷 Mano de obra</option>
              <option value="MANTENIMIENTO">🔧 Mantenimiento</option>
              <option value="OTROS">📦 Otros</option>
            </select>
          </div>
        }
      </div>

      @if (selectedLoteId()) {
        @if (loading()) {
          <div class="loading">Cargando gastos...</div>
        } @else {
          <!-- Cards de resumen -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon rojo">💸</div>
              <div>
                <span class="stat-label">Total gastado</span>
                <span class="stat-value">{{ resumen()?.total || 0 | number:'1.2-2' }} Bs</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon amarillo">📋</div>
              <div>
                <span class="stat-label">Cantidad de gastos</span>
                <span class="stat-value">{{ resumen()?.cantidad || 0 }}</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon azul">📊</div>
              <div>
                <span class="stat-label">Promedio por gasto</span>
                <span class="stat-value">{{ resumen()?.promedio || 0 | number:'1.2-2' }} Bs</span>
              </div>
            </div>
            <div class="stat-card" [class.ganancia-pos]="rentabilidad().ganancia >= 0" [class.ganancia-neg]="rentabilidad().ganancia < 0">
              <div class="stat-icon verde">💰</div>
              <div>
                <span class="stat-label">Ganancia (vs ventas)</span>
                <span class="stat-value">{{ rentabilidad().ganancia | number:'1.2-2' }} Bs</span>
                <span class="stat-sublabel">ROI {{ rentabilidad().roi | number:'1.1-1' }}%</span>
              </div>
            </div>
          </div>

          <!-- Desglose por categoría -->
          @if ((resumen()?.porCategoria?.length || 0) > 0) {
            <div class="categoria-breakdown">
              <h3>Por categoría</h3>
              <div class="cat-grid">
                @for (c of resumen()?.porCategoria || []; track c.categoria) {
                  <div class="cat-item">
                    <span class="cat-label">{{ categoriaLabel(c.categoria) }}</span>
                    <span class="cat-total">{{ c.total | number:'1.2-2' }} Bs</span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Tabla principal -->
          <div class="card">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th>Proveedor</th>
                  <th>Comprob.</th>
                  <th>Monto</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (g of filteredGastos(); track g.id) {
                  <tr>
                    <td>{{ g.fecha | date:'dd/MM/yyyy' }}</td>
                    <td>
                      <span class="badge" [class]="'badge-' + g.categoria.toLowerCase()">
                        {{ categoriaLabel(g.categoria) }}
                      </span>
                    </td>
                    <td>{{ g.descripcion }}</td>
                    <td>{{ g.proveedor || '-' }}</td>
                    <td><span class="text-muted">-</span></td>
                    <td class="text-right"><strong>{{ g.monto | number:'1.2-2' }} Bs</strong></td>
                    <td>
                      <button class="btn-icon" (click)="editGasto(g)" title="Editar">✏️</button>
                      <button class="btn-icon btn-danger-icon" (click)="deleteGasto(g)" title="Eliminar">🗑️</button>
                    </td>
                  </tr>
                }
                @empty {
                  <tr><td colspan="7" class="text-center">No hay gastos registrados para este lote</td></tr>
                }
              </tbody>
            </table>
          </div>
        }
      } @else {
        <div class="empty-state">
          <span class="empty-icon">💸</span>
          <p>Seleccioná un lote arriba para ver y registrar sus gastos operativos.</p>
        </div>
      }

      <!-- Modal de crear/editar -->
      @if (dialogVisible()) {
        <div class="modal-overlay" (click)="closeDialog()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>{{ editingGasto() ? 'Editar Gasto' : 'Nuevo Gasto' }}</h3>
            <div class="form-group">
              <label>Lote *</label>
              <select [(ngModel)]="form.loteId" class="input-field">
                @for (l of lotes(); track l.id) {
                  <option [ngValue]="l.id">{{ l.nombre || 'Lote ' + l.id?.slice(0,4) }}</option>
                }
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Fecha *</label>
                <input type="date" [(ngModel)]="form.fecha" class="input-field" />
              </div>
              <div class="form-group">
                <label>Categoría *</label>
                <select [(ngModel)]="form.categoria" class="input-field">
                  <option value="ALIMENTO">🌽 Alimento</option>
                  <option value="INSUMOS">💊 Insumos</option>
                  <option value="MANO_OBRA">👷 Mano de obra</option>
                  <option value="MANTENIMIENTO">🔧 Mantenimiento</option>
                  <option value="OTROS">📦 Otros</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Descripción *</label>
              <input type="text" [(ngModel)]="form.descripcion" placeholder="Ej: Maíz amarillo 50kg" class="input-field" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Monto (Bs) *</label>
                <input type="number" [(ngModel)]="form.monto" min="0" step="0.01" class="input-field" />
              </div>
              <div class="form-group">
                <label>Proveedor</label>
                <input type="text" [(ngModel)]="form.proveedor" placeholder="Opcional" class="input-field" />
              </div>
            </div>
            <!--
            Upload de foto de comprobante deshabilitado por ahora (Storage cuesta plata).
            Para reactivar: quitar este comentario y verificar que las reglas storage.rules
            estén publicadas y StorageService.uploadComprobanteGasto siga disponible.
            <div class="form-group">
              <label>Comprobante (foto o PDF)</label>
              <input type="file" (change)="onFileSelected($event)" accept="image/*,application/pdf" class="input-field" />
              @if (uploading()) {
                <small class="text-muted">⏳ Comprimiendo y subiendo...</small>
              }
              @if (form.fotoComprobanteUrl && !uploading()) {
                <div class="foto-preview">
                  @if (form.fotoComprobanteUrl.toLowerCase().endsWith('.pdf')) {
                    <a [href]="form.fotoComprobanteUrl" target="_blank">📄 Ver PDF</a>
                  } @else {
                    <img [src]="form.fotoComprobanteUrl" alt="Comprobante" />
                  }
                  <button type="button" class="btn-link" (click)="quitarFoto()">Quitar foto</button>
                </div>
              }
            </div>
            -->
            <div class="modal-actions">
              @if (editingGasto()) {
                <button class="btn-danger" (click)="confirmDelete()">🗑️ Eliminar</button>
              }
              <button class="btn-secondary" (click)="closeDialog()">Cancelar</button>
              <button class="btn-primary" (click)="save()" [disabled]="uploading() || saving()">
                {{ saving() ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { max-width: 1400px; margin: 0 auto; padding: 1rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-header h1 { margin: 0; color: var(--dark-color); }
    .subtitle { margin: 0.25rem 0 0 0; color: #666; }
    .loading { text-align: center; padding: 3rem; color: #666; }

    .filters-card { background: white; padding: 1rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap; margin-bottom: 1.5rem; }
    .filter-group { flex: 1; min-width: 160px; }
    .filter-group label { display: block; font-size: 0.75rem; color: #666; margin-bottom: 0.25rem; }
    .input-field { width: 100%; padding: 0.625rem; border: 1px solid #ddd; border-radius: 8px; font-size: 0.95rem; }
    .input-field:focus { outline: none; border-color: var(--primary-color); }

    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .stat-card { background: white; border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; gap: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .stat-icon { width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
    .stat-icon.rojo { background: #f8d7da; }
    .stat-icon.amarillo { background: #fff3cd; }
    .stat-icon.azul { background: #d1ecf1; }
    .stat-icon.verde { background: #d4edda; }
    .stat-label { display: block; font-size: 0.75rem; color: #666; }
    .stat-value { display: block; font-size: 1.5rem; font-weight: 700; color: var(--dark-color); }
    .stat-sublabel { display: block; font-size: 0.75rem; color: #666; margin-top: 0.25rem; }
    .stat-card.ganancia-pos { border-left: 4px solid #28a745; }
    .stat-card.ganancia-neg { border-left: 4px solid var(--secondary-color); }
    .stat-card.ganancia-neg .stat-value { color: var(--secondary-color); }

    .categoria-breakdown { background: white; padding: 1rem 1.25rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 1.5rem; }
    .categoria-breakdown h3 { margin: 0 0 0.75rem 0; font-size: 0.95rem; color: var(--dark-color); }
    .cat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.5rem; }
    .cat-item { display: flex; justify-content: space-between; padding: 0.5rem 0.75rem; background: #f8f9fa; border-radius: 6px; font-size: 0.875rem; }
    .cat-total { font-weight: 600; color: var(--dark-color); }

    .card { background: white; border-radius: 12px; padding: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; min-width: 800px; }
    .data-table th, .data-table td { padding: 0.625rem 0.75rem; text-align: left; border-bottom: 1px solid #eee; font-size: 0.9rem; }
    .data-table th { background: #f8f9fa; font-weight: 600; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .text-muted { color: #999; }

    .badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .badge-alimento { background: #d4edda; color: #155724; }
    .badge-insumos { background: #cce5ff; color: #004085; }
    .badge-mano_obra { background: #fff3cd; color: #856404; }
    .badge-mantenimiento { background: #f8d7da; color: var(--secondary-color); }
    .badge-otros { background: #e2d9f3; color: #5a32a3; }

    .btn-icon { background: none; border: none; cursor: pointer; font-size: 1.1rem; padding: 0.25rem; }
    .btn-danger-icon:hover { color: var(--secondary-color); }
    .btn-link { background: none; border: none; color: var(--secondary-color); cursor: pointer; font-size: 0.8rem; padding: 0; text-decoration: underline; }

    .empty-state { text-align: center; padding: 4rem; background: white; border-radius: 12px; }
    .empty-icon { display: inline-block; width: 80px; height: 80px; background: #f8f9fa; border-radius: 50%; line-height: 80px; font-size: 3rem; }
    .empty-state p { margin: 1rem 0 0 0; color: #666; }

    .btn-primary { background: var(--primary-color); color: var(--dark-color); border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-primary:disabled { background: #e9ecef; color: #999; cursor: not-allowed; }
    .btn-secondary { background: #e9ecef; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; }
    .btn-danger { background: #f8d7da; color: var(--secondary-color); border: none; padding: 0.75rem; border-radius: 8px; cursor: pointer; }

    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .modal { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
    .modal h3 { margin: 0 0 1.5rem 0; color: var(--dark-color); }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--dark-color); font-size: 0.9rem; }
    .form-row { display: flex; gap: 1rem; }
    .form-row .form-group { flex: 1; }
    .foto-preview { margin-top: 0.5rem; padding: 0.5rem; background: #f8f9fa; border-radius: 6px; display: flex; flex-direction: column; align-items: flex-start; gap: 0.5rem; }
    .foto-preview img { max-width: 200px; max-height: 200px; border-radius: 4px; }
    .modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1.5rem; }
  `]
})
export class GastosOperativosComponent implements OnInit, OnDestroy {
  private lotService = inject(LotService);
  private storage = inject(StorageService);
  private refresh = inject(RefreshService);
  private refreshSub: any;

  lotes = signal<Lote[]>([]);
  selectedLoteId = signal<string>('');

  gastos = signal<GastoOperativo[]>([]);
  filteredGastos = signal<GastoOperativo[]>([]);
  resumen = signal<ResumenGastos | null>(null);
  rentabilidad = signal<{ totalGastos: number; totalVentas: number; ganancia: number; roi: number }>({
    totalGastos: 0, totalVentas: 0, ganancia: 0, roi: 0
  });

  loading = signal(false);
  dialogVisible = signal(false);
  editingGasto = signal<GastoOperativo | null>(null);
  uploading = signal(false);
  saving = signal(false);

  fechaDesde = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  fechaHasta = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  filtroCategoria: '' | GastoCategoria = '';

  // form (mutable, no signal, para ngModel two-way)
  form: any = {};

  async ngOnInit(): Promise<void> {
    const lotesData = await this.lotService.getLotes();
    this.lotes.set(lotesData);

    this.refreshSub = this.refresh.refresh$.subscribe((feature: string) => {
      if (feature === 'gastos' || feature === 'lotes' || feature === 'all') {
        if (this.selectedLoteId()) this.loadData();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.refreshSub) this.refreshSub.unsubscribe();
  }

  onLoteChange(loteId: string): void {
    this.selectedLoteId.set(loteId);
    if (loteId) {
      this.loadData();
    } else {
      this.gastos.set([]);
      this.filteredGastos.set([]);
      this.resumen.set(null);
      this.rentabilidad.set({ totalGastos: 0, totalVentas: 0, ganancia: 0, roi: 0 });
    }
  }

  async loadData(): Promise<void> {
    const loteId = this.selectedLoteId();
    if (!loteId) return;
    this.loading.set(true);
    try {
      const [gastosData, resumenData, rentabilidadData] = await Promise.all([
        this.lotService.getGastos(loteId),
        this.lotService.getResumenGastosPorLote(loteId),
        this.lotService.getRentabilidadPorLote(loteId)
      ]);
      this.gastos.set(gastosData);
      this.applyFilters();
      this.resumen.set(resumenData);
      this.rentabilidad.set(rentabilidadData);
    } catch (e) {
      console.error('Error loading gastos:', e);
    } finally {
      this.loading.set(false);
    }
  }

  private applyFilters(): void {
    let arr = this.gastos();
    if (this.fechaDesde) arr = arr.filter(g => g.fecha >= this.fechaDesde);
    if (this.fechaHasta) arr = arr.filter(g => g.fecha <= this.fechaHasta);
    if (this.filtroCategoria) arr = arr.filter(g => g.categoria === this.filtroCategoria);
    this.filteredGastos.set(arr);
  }

  categoriaLabel(cat: GastoCategoria): string {
    const map: Record<GastoCategoria, string> = {
      ALIMENTO: '🌽 Alimento',
      INSUMOS: '💊 Insumos',
      MANO_OBRA: '👷 Mano de obra',
      MANTENIMIENTO: '🔧 Mantenimiento',
      OTROS: '📦 Otros'
    };
    return map[cat] || cat;
  }

  openDialog(): void {
    const loteId = this.selectedLoteId() || (this.lotes()[0]?.id ?? '');
    this.editingGasto.set(null);
    this.form = {
      loteId,
      fecha: format(new Date(), 'yyyy-MM-dd'),
      categoria: 'ALIMENTO' as GastoCategoria,
      descripcion: '',
      monto: 0,
      proveedor: '',
      fotoComprobanteUrl: '',
      fotoPath: ''
    };
    this.dialogVisible.set(true);
  }

  editGasto(g: GastoOperativo): void {
    this.editingGasto.set(g);
    this.form = { ...g };
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
    this.editingGasto.set(null);
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!this.form.loteId) {
      alert('Selecciona un lote antes de subir el comprobante');
      input.value = '';
      return;
    }

    this.uploading.set(true);
    try {
      // pre-asignar un id temporal para construir el path (en edición es el id real)
      const idTemp = this.editingGasto()?.id || `temp-${Date.now()}`;
      const result = await this.storage.uploadComprobanteGasto(this.form.loteId, idTemp, file);
      this.form.fotoComprobanteUrl = result.url;
      this.form.fotoPath = result.path;
    } catch (e: any) {
      alert('Error al subir la foto: ' + (e?.message || e));
    } finally {
      this.uploading.set(false);
      input.value = '';
    }
  }

  quitarFoto(): void {
    this.form.fotoComprobanteUrl = '';
    this.form.fotoPath = '';
  }

  async save(): Promise<void> {
    if (!this.form.loteId || !this.form.fecha || !this.form.descripcion || !(this.form.monto > 0)) {
      alert('Completa lote, fecha, descripción y monto (>0)');
      return;
    }
    this.saving.set(true);
    try {
      const data: any = {
        fecha: this.form.fecha,
        loteId: this.form.loteId,
        categoria: this.form.categoria,
        descripcion: this.form.descripcion,
        monto: Number(this.form.monto),
        proveedor: this.form.proveedor || undefined,
        fotoComprobanteUrl: this.form.fotoComprobanteUrl || undefined,
        fotoPath: this.form.fotoPath || undefined
      };
      const editing = this.editingGasto();
      if (editing && editing.id) {
        // Si subió una foto nueva, hay que borrar la anterior
        if (editing.fotoPath && editing.fotoPath !== this.form.fotoPath) {
          try { await this.storage.deleteFile(editing.fotoPath); } catch {}
        }
        await this.lotService.updateGasto(editing.id, data);
      } else {
        await this.lotService.createGasto(data);
      }
      this.closeDialog();
      await this.loadData();
    } catch (e: any) {
      alert('Error: ' + (e?.message || e));
    } finally {
      this.saving.set(false);
    }
  }

  async deleteGasto(g: GastoOperativo): Promise<void> {
    if (!g.id) return;
    if (!confirm(`¿Eliminar este gasto de ${g.monto} Bs?\nLa foto también se borrará.`)) return;
    await this.lotService.deleteGasto(g.id);
    await this.loadData();
  }

  confirmDelete(): void {
    const g = this.editingGasto();
    if (g) this.deleteGasto(g);
  }
}
