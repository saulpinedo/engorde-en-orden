# Sistema de Gestión de Engorde de Pollos
## Documento de Especificación — Módulo de Alimentos

---

## 1. Contexto del Negocio

Se trata de un sistema para gestionar la producción de pollos de engorde. El negocio opera con lotes de **10.000 pollos** por ciclo, con una duración de **42 a 49 días** por ciclo. El productor tiene su propio **molino**, compra los ingredientes a granel y adquiere las **premezclas de Comagro** (ellos proveen la fórmula de cada fase).

---

## 2. Datos Base del Lote de Referencia

| Parámetro | Valor |
|---|---|
| Cantidad de pollos bebé | 10.000 |
| Costo unitario pollo bebé | 5 Bs |
| Costo total pollo bebé | 50.000 Bs |
| Peso promedio al venta | 2.58 kg/pollo |
| Duración del ciclo | 42–49 días |
| Mortalidad estimada | ~5% (dato pendiente de confirmar con productor) |

---

## 3. Módulo de Alimentos

### 3.1 Concepto clave

El alimento es el mayor costo del negocio (~66% del costo total). El productor mezcla su propio alimento en molino propio. El costo por tonelada **varía con el mercado** (maíz, harina integral, aceite vegetal, premezclas). Por eso el sistema debe permitir **actualizar el precio por tonelada de cada fase** y recalcular automáticamente los costos.

---

### 3.2 Fases de Alimentación

El ciclo se divide en 4 fases (F0 a F3). Cada fase tiene nombre, rango de días, consumo total en toneladas para 10.000 pollos, y costo de referencia.

| Fase | Días | Toneladas (10k pollos) | Costo ref. total | Costo ref./Tn |
|---|---|---|---|---|
| F0 | 0 – 7 | 1 Tn | 3.461 Bs | 3.461 Bs/Tn |
| F1 | 8 – 21 | 9 Tn | 31.149 Bs | 3.461 Bs/Tn |
| F2 | 22 – 35 | 22 Tn | 74.998 Bs | 3.409 Bs/Tn |
| F3 | 36 – 42 | 14 Tn | 46.774 Bs | 3.341 Bs/Tn |
| **TOTAL** | **0–42 días** | **46 Tn** | **156.382 Bs** | — |

> ⚠️ Los valores de costo son de referencia. El sistema debe permitir editarlos por lote.

---

### 3.3 Consumo Diario por Pollo (por fase)

Estos datos se derivan dividiendo el consumo total entre los días de la fase y entre los pollos del lote.

| Fase | Toneladas totales | Días | Pollos | g/pollo/día |
|---|---|---|---|---|
| F0 | 1.000 kg | 7 | 10.000 | ~14.3 g |
| F1 | 9.000 kg | 14 | 10.000 | ~64.3 g |
| F2 | 22.000 kg | 14 | 10.000 | ~157.1 g |
| F3 | 14.000 kg | 7 | 10.000 | ~200.0 g |

**Fórmula para cualquier lote:**
```
consumo_diario_fase = (toneladas_fase * 1000) / dias_fase / cantidad_pollos_vivos
```

> El sistema debe ajustar el consumo estimado según la cantidad de pollos vivos (descontando mortalidad acumulada).

---

### 3.4 Modelo de Datos Sugerido

#### Entidad: `FaseAlimento`
```
id
nombre          (ej: "F0", "F1", "F2", "F3")
dia_inicio      (int)
dia_fin         (int)
toneladas_base  (float) — consumo base para 10.000 pollos
precio_por_tn   (float) — actualizable por el usuario
```

#### Entidad: `Lote`
```
id
fecha_inicio
cantidad_inicial_pollos
mortalidad_acumulada
fase_actual         (calculado según día actual)
```

#### Entidad: `ConsumoAlimentoDiario` (registro por día)
```
id
lote_id
fecha
fase_id
pollos_vivos
kg_consumidos_estimado
kg_consumidos_real      (editable por el usuario)
costo_dia
```

---

### 3.5 Cálculos que el sistema debe realizar

#### Costo total de alimento para un lote
```
costo_alimento_lote = Σ (toneladas_fase * precio_por_tn_fase)
```

#### Costo por pollo producido
```
costo_por_pollo = costo_total_lote / pollos_vivos_finales
```

#### Costo por kg producido (punto de equilibrio)
```
costo_por_kg = costo_por_pollo / peso_promedio_kg
```

---

## 4. Estructura de Costos Completa del Lote de Referencia

El sistema debe gestionar estas categorías de costos. Se muestran los valores de referencia del lote base.

| Categoría | Total Ref. (Bs) | % del total |
|---|---|---|
| Pollo bebé | 50.000 | 21.2% |
| **Alimento** | **156.382** | **66.4%** |
| Vacunas | 2.137 | 0.9% |
| Antibióticos | 5.480 | 2.3% |
| Desinfectantes | 1.546 | 0.7% |
| Alquiler galpón | 7.000 | 3.0% |
| Servicios y otros | 12.980 | 5.5% |
| **TOTAL** | **235.525** | 100% |

---

### 4.1 Detalle de Vacunas (2.137 Bs)

| Vacuna | Momento | Costo |
|---|---|---|
| BDD BLEM | Día 0 | 952 Bs |
| Marek/Newcastle (new castle) | Día 12 | 490 Bs |
| Gumboro | Día 8 | 595 Bs |
| Cevamune | — | 40 Bs |
| 6 Lt Leche descremada | — | 60 Bs |

---

### 4.2 Detalle de Antibióticos (5.480 Bs)

| Producto | Cantidad | Costo |
|---|---|---|
| Tibcina | 2 kg | 860 Bs |
| Ciprofloxacina | 2 kg | 1.100 Bs |
| Tilosina | 3 kg | 2.580 Bs |
| Enrofloxacina | 2 Lt | 440 Bs |
| Vitamina | 5 Lt | 500 Bs |

---

### 4.3 Detalle de Desinfectantes (1.546 Bs)

| Producto | Cantidad | Costo |
|---|---|---|
| SLT Amoniacal (glutaltec) | 1 Lt | 730 Bs |
| Yodo | 1 gt | 816 Bs |

---

### 4.4 Detalle de Alquiler (7.000 Bs)

- 0.35 Bs x ave x 2 meses = 7.000 Bs para 10.000 aves

---

### 4.5 Detalle de Servicios y Otros (12.980 Bs)

| Concepto | Costo |
|---|---|
| 1 camión chata | 1.600 Bs |
| 30 garrafas de gas | 900 Bs |
| Sueldo galpón x 2 meses | 6.600 Bs |
| Electricidad x 2 meses | 1.000 Bs |
| Despacho de pollo (0.15 Bs x pollo) | 1.500 Bs |
| Transporte alimento (30 Bs x Tn) | 1.380 Bs |

---

## 5. Análisis de Rentabilidad

### Variables de venta
- **Precio de venta:** Bs por kg al mayorista (compra en granja, pollo vivo)
- **Peso promedio:** 2.58 kg por pollo
- **Punto de equilibrio:** ~9.11 Bs/kg

### Escenarios con lote de 10.000 pollos (2.58 kg/pollo)

| Precio venta (Bs/kg) | Ingreso total | Resultado |
|---|---|---|
| 7 Bs/kg | 180.600 Bs | -54.925 Bs ❌ |
| 9 Bs/kg | 232.200 Bs | -3.325 Bs ❌ |
| **9.11 Bs/kg** | **235.039 Bs** | **~0 (equilibrio)** |
| 9.50 Bs/kg | 244.950 Bs | +9.425 Bs ✅ |
| 10 Bs/kg | 258.000 Bs | +22.475 Bs ✅ |
| 16 Bs/kg | 412.800 Bs | +177.275 Bs ✅ |

### Fórmula general
```
ingreso = precio_kg * peso_promedio * pollos_vendidos
ganancia = ingreso - costo_total_lote
precio_minimo_kg = costo_total_lote / (peso_promedio * pollos_vendidos)
```

---

## 6. Funcionalidades Prioritarias del Módulo de Alimentos

1. **CRUD de fases de alimento** con precio por tonelada editable
2. **Registro diario de consumo real** vs consumo estimado
3. **Recálculo automático** de costos al cambiar precio de ingredientes
4. **Dashboard por lote activo:**
   - Fase actual
   - Días transcurridos / restantes
   - Alimento consumido acumulado (kg y costo)
   - Proyección de costo final de alimento
5. **Simulador de rentabilidad:** ingresar precio de venta → ver ganancia/pérdida proyectada
6. **Alerta de punto de equilibrio:** mostrar el precio mínimo de venta en tiempo real

---

## 7. Pendientes / Datos a confirmar

- [ ] Porcentaje de mortalidad real que maneja el productor (estimado 3–5%)
- [ ] Curva de ganancia de peso diaria por fase (para proyectar peso final)
- [ ] Si el precio de venta varía entre ciclos o es relativamente estable
- [ ] Moneda: confirmar si todos los valores están en Bolivianos (Bs) venezolanos

---

*Documento generado a partir de análisis de costos reales proporcionados por productor avícola. Última actualización: Abril 2026.*
