# 🐔 EngordeEnOrden - MVP

## 🧠 Descripción
Sistema web para la gestión del crecimiento de pollos de engorde.

Permite controlar:
- Granjas y galpones
- Lotes de pollitos
- Alimentación por etapas
- Vacunación (hitos)
- Pesaje
- Mortalidad
- Costos y proyecciones

---

## 🎯 Objetivo del MVP
Construir un sistema funcional que permita:
- Registrar estructura básica (granja → galpón)
- Crear y gestionar lotes
- Controlar consumo de alimento por etapa
- Registrar eventos importantes (hitos)
- Visualizar el crecimiento en una línea de tiempo
- Controlar mortalidad y pérdidas económicas

---

## 🧩 Estructura del Negocio

### Granja
- Solo nombre (por ahora)

### Galpón
- Nombre
- Relación con granja

> 🔮 Futuro:
- Código sanitario
- Capacidad

---

## 🐣 Lotes de Pollitos

Al iniciar un lote se registra:

- Cantidad inicial
- Raza
- Peso promedio inicial
- Fecha de inicio
- Vacunas iniciales (seleccionadas de catálogo)

---

## 💉 Vacunas

### Catálogo de Vacunas
- Lista editable de vacunas disponibles

### En el lote:
- Seleccionar vacunas iniciales
- Programar refuerzos según días de vida

---

## 📆 Etapas del Crecimiento

Se manejan 3 etapas:

1. INICIO
2. CRECIMIENTO
3. ENGORDE

Cada etapa:
- Tiene rango de días
- Se visualiza por color en el calendario

---

## 📊 Calendarización (CORE)

Vista tipo timeline horizontal:

Por cada día se visualiza:
- Día de vida del lote
- Etapa (color)
- Eventos (hitos)

---

## ✅ Hitos (Eventos del sistema)

Tipos de hitos:
- Vacunación
- Pesaje
- Otros controles

Cada hito:
- Fecha programada
- Estado:
  - Pendiente
  - Completado
- Datos:
  - Qué se hizo
  - Quién lo hizo
  - Observaciones

---

## ⚖️ Pesaje

- Registrar peso promedio por día
- Comparar con peso esperado según raza
- Evaluar rendimiento del lote

---

## ☠️ Mortalidad

- Registrar bajas diarias
- Reducir cantidad actual del lote

---

## 💰 Impacto de Mortalidad (MUY IMPORTANTE)

El sistema debe calcular:

👉 Cuánto alimento consumió un pollo antes de morir

Basado en:
- Edad (días)
- Etapa

Ejemplo:

Si muere en día 7:
- Consumo en etapa INICIO

Si muere en día 30:
- Consumo en:
  - INICIO
  - CRECIMIENTO
  - ENGORDE (parcial)

👉 Mostrar:
- Cantidad consumida por etapa
- Costo por etapa
- Costo total perdido

---

## 🌽 Alimentación y Fórmulas

### Fórmulas (Recetas)
Se crean por etapa:

Cada fórmula contiene:
- Ingredientes:
  - Maíz
  - Soya
  - Aceite
  - Premezcla
- Cantidades

---

## 💲 Precio de Ingredientes

- El precio se registra al momento de preparar alimento
- Puede cambiar en el tiempo

👉 Importante:
El sistema debe permitir historial de precios

---

## 📅 Planificación de Alimentación

El usuario puede definir:

Ejemplo:
- Hasta miércoles: INICIO
- Desde jueves: CRECIMIENTO

👉 El sistema debe:
- Calcular consumo total necesario
- Determinar ingredientes requeridos

---

## 🧪 Módulo de Proyección (Sandbox)

Funcionalidad clave:

El usuario puede simular:

- Cantidad actual de pollos (menos muertos)
- Edad actual
- Etapa actual

El sistema calcula:

### 🔹 Proyección de alimento
- Cuánto alimento se necesitará hasta fin de etapa

### 🔹 Proyección de ingredientes
- Cuánto maíz, soya, etc.

### 🔹 Proyección de costos
- Costo total estimado del lote

---

## 📊 Dashboard (Resumen)

- Pollos vivos
- Mortalidad acumulada
- Consumo total
- Costo estimado
- Peso promedio

---

## 🏗️ Modelo de Datos (Base)

### Granja
- id
- nombre

### Galpon
- id
- nombre
- granjaId

### Lote
- id
- galponId
- cantidadInicial
- cantidadActual
- raza
- pesoInicial
- fechaInicio

### Vacuna
- id
- nombre

### LoteVacuna
- id
- loteId
- vacunaId
- fechaProgramada
- fechaAplicada
- aplicadoPor

### Formula
- id
- nombre
- etapa

### Ingrediente
- id
- nombre

### FormulaDetalle
- formulaId
- ingredienteId
- cantidad

### PrecioIngrediente
- ingredienteId
- fecha
- precio

### ConsumoDiario
- loteId
- fecha
- etapa
- cantidad

### Pesaje
- loteId
- fecha
- pesoPromedio

### Mortalidad
- loteId
- fecha
- cantidad

---

## 🎨 Branding

Nombre:
EngordeEnOrden

Eslogan:
Tecnología para crecer mejor

Colores:
- Amarillo #FFC107
- Rojo #D32F2F
- Gris oscuro #2B2B2B

---

## 🚀 Enfoque MVP

Prioridad:

1. Granjas + galpones
2. Lotes
3. Timeline (visual básico)
4. Vacunas (hitos)
5. Mortalidad
6. Alimentación básica

---

## 🔮 Futuro

- IA para predicción de crecimiento
- Optimización automática de alimentación
- Multi-granja (SaaS)
- App móvil
