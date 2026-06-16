import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LotService, Formula, FormulaDetalle } from '../../core/services/lot.service';

interface FormulaView extends Formula {
  detalles: { ingrediente: string; cantidad: number; unidad: string }[];
}

@Component({
  selector: 'app-formulas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div><h1>Fórmulas de Alimento</h1><p class="subtitle">Recetas de alimento por etapa de crecimiento</p></div>
      </div>
      <div class="formulas-grid">
        @for (f of formulas(); track f.id) {
          <div class="formula-card">
            <div class="formula-header"><h3>{{ f.nombre }}</h3><span class="tag tag-{{ f.etapa?.toLowerCase() }}">{{ f.etapa }}</span></div>
            <p class="desc">{{ f.descripcion || 'Sin descripción' }}</p>
            <div class="detalles">
              @for (d of f.detalles; track d.ingrediente) {
                <div class="detalle-item"><span>{{ d.ingrediente }}</span><span>{{ d.cantidad }} {{ d.unidad }}</span></div>
              }
            </div>
          </div>
        }
        @empty {
          <div class="empty"><p>No hay fórmulas registradas</p></div>
        }
      </div>
    </div>
  `,
  styles: [` .page-container { max-width: 1400px; margin: 0 auto; } .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; } .page-header h1 { margin: 0; color: #2B2B2B; } .subtitle { margin: 0.25rem 0 0 0; color: #666; } .formulas-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5rem; } .formula-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); } .formula-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; } .formula-header h3 { margin: 0; color: #2B2B2B; } .desc { color: #666; margin-bottom: 1rem; } .detalles { display: flex; flex-direction: column; gap: 0.5rem; } .detalle-item { display: flex; justify-content: space-between; padding: 0.5rem; background: #f8f9fa; border-radius: 4px; font-size: 0.9rem; } .tag { padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; } .tag-inicio { background: #d4edda; color: #155724; } .tag-crecimiento { background: #d1ecf1; color: #0c5460; } .tag-engorde { background: #fff3cd; color: #856404; } .empty { grid-column: 1 / -1; text-align: center; padding: 3rem; color: #666; } `]
})
export class FormulasComponent implements OnInit {
  private lot = inject(LotService);
  formulas = signal<FormulaView[]>([]);

  async ngOnInit(): Promise<void> {
    const formulas = await this.lot.getFormulas();
    const out: FormulaView[] = [];
    for (const f of formulas) {
      if (!f.id) continue;
      const detalles = await this.lot.getFormulaDetalles(f.id);
      out.push({
        ...f,
        detalles: detalles.map((d: FormulaDetalle) => ({
          ingrediente: d.ingredienteNombre || '?',
          cantidad: d.cantidad,
          unidad: d.ingredienteUnidad || d.unidad || 'kg'
        }))
      });
    }
    this.formulas.set(out);
  }
}
