import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'auth/login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  { 
    path: '', 
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'granjas', loadComponent: () => import('./features/granjas/granjas.component').then(m => m.GranjasComponent) },
      { path: 'lotes', loadComponent: () => import('./features/lotes/lotes.component').then(m => m.LotesComponent) },
      { path: 'timeline', loadComponent: () => import('./features/timeline/timeline.component').then(m => m.TimelineComponent) },
      { path: 'timeline/:id', loadComponent: () => import('./features/timeline/timeline.component').then(m => m.TimelineComponent) },
      { path: 'mortalidad', loadComponent: () => import('./features/mortalidad/mortalidad.component').then(m => m.MortalidadComponent) },
      { path: 'consumo', loadComponent: () => import('./features/consumo/consumo.component').then(m => m.ConsumoComponent) },
      { path: 'pesajes', loadComponent: () => import('./features/pesajes/pesajes.component').then(m => m.PesajesComponent) },
      { path: 'vacunas', loadComponent: () => import('./features/vacunas/vacunas.component').then(m => m.VacunasComponent) },
      { path: 'antibioticos', loadComponent: () => import('./features/antibioticos/antibioticos.component').then(m => m.AntibioticosComponent) },
      { path: 'vitaminas', loadComponent: () => import('./features/vitaminas/vitaminas.component').then(m => m.VitaminasComponent) },
      { path: 'desinfectantes', loadComponent: () => import('./features/desinfectantes/desinfectantes.component').then(m => m.DesinfectantesComponent) },
      { path: 'formulas', loadComponent: () => import('./features/formulas/formulas.component').then(m => m.FormulasComponent) },
      { path: 'fases-alimento', loadComponent: () => import('./features/fases-alimento/fases-alimento.component').then(m => m.FasesAlimentoComponent) },
      { path: 'galpones', loadComponent: () => import('./features/galpones/galpones.component').then(m => m.GalponesComponent) },
      { path: 'clientes', loadComponent: () => import('./features/clientes/clientes.component').then(m => m.ClientesComponent) },
      { path: 'ventas', loadComponent: () => import('./features/ventas/ventas.component').then(m => m.VentasComponent) },
      { path: 'ventas/:loteId', loadComponent: () => import('./features/ventas/ventas.component').then(m => m.VentasComponent) },
      { path: 'pagos', loadComponent: () => import('./features/pagos/pagos.component').then(m => m.PagosComponent) }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
