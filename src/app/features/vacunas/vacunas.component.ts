import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LotService, Vacuna } from '../../core/services/lot.service';

@Component({
  selector: 'app-vacunas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div><h1>Vacunas</h1><p class="subtitle">Catálogo de vacunas y aplicación por lote</p></div>
        <button class="btn-primary" (click)="openDialog()">💉 Nueva Vacuna</button>
      </div>
      <div class="card">
        <table class="data-table">
          <thead><tr><th>Nombre</th><th>Días de Aplicación</th><th>Descripción</th></tr></thead>
          <tbody>
            @for (v of vacunas(); track v.id) {
              <tr><td><strong>{{ v.nombre }}</strong></td><td>{{ v.dias_aplicacion ? 'Día ' + v.dias_aplicacion : '-' }}</td><td>{{ v.descripcion || '-' }}</td></tr>
            }
            @empty { <tr><td colspan="3" class="text-center">No hay vacunas registradas</td></tr> }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [` .page-container { max-width: 1200px; margin: 0 auto; } .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; } .page-header h1 { margin: 0; color: #2B2B2B; } .subtitle { margin: 0.25rem 0 0 0; color: #666; } .card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); } .data-table { width: 100%; border-collapse: collapse; } .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #eee; } .data-table th { background: #f8f9fa; font-weight: 600; } .text-center { text-align: center; } .btn-primary { background: #FFC107; color: #2B2B2B; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; } `]
})
export class VacunasComponent implements OnInit {
  private lotService = inject(LotService);
  vacunas = signal<Vacuna[]>([]);

  async ngOnInit(): Promise<void> {
    const data = await this.lotService.getVacunas();
    this.vacunas.set(data);
  }

  openDialog(): void { alert('Función de agregar vacuna en desarrollo'); }
}
