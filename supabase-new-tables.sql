-- ================================================
-- SCRIPT SQL PARA SUPABASE - EngordeEnOrden
-- Ejecutar en: SQL Editor de Supabase Dashboard
-- ================================================

-- TABLA: clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA: fases_alimento
CREATE TABLE IF NOT EXISTS fases_alimento (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  dia_inicio INT NOT NULL,
  dia_fin INT NOT NULL,
  toneladas_base DECIMAL(10,2) NOT NULL,
  precio_tn DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar las 4 fases F0-F3
INSERT INTO fases_alimento (nombre, dia_inicio, dia_fin, toneladas_base, precio_tn) VALUES
('F0 (Inicio)', 0, 7, 1.00, 3461),
('F1 (Crecimiento)', 8, 21, 9.00, 3461),
('F2 (Engorde)', 22, 35, 22.00, 3409),
('F3 (Final)', 36, 42, 14.00, 3341);

-- TABLA: ventas
CREATE TABLE IF NOT EXISTS ventas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE DEFAULT CURRENT_DATE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  lote_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  precio_kg DECIMAL(10,2) NOT NULL,
  total_kg DECIMAL(10,2) DEFAULT 0,
  total_bs DECIMAL(10,2) DEFAULT 0,
  placa TEXT,
  estado TEXT DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'CANCELADO', 'PARCIAL')),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA: detalle_pesadas
CREATE TABLE IF NOT EXISTS detalle_pesadas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
  peso_kg DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA: pagos
CREATE TABLE IF NOT EXISTS pagos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
  monto DECIMAL(10,2) NOT NULL,
  fecha DATE DEFAULT CURRENT_DATE,
  metodo TEXT DEFAULT 'EFECTIVO' CHECK (metodo IN ('EFECTIVO', 'TRANSFERENCIA', 'OTRO')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: actualizar estado de venta
CREATE OR REPLACE FUNCTION actualizar_estado_venta()
RETURNS TRIGGER AS $$
DECLARE
  total_pagado DECIMAL(10,2);
  total_venta DECIMAL(10,2);
BEGIN
  SELECT COALESCE(total_bs, 0) INTO total_venta FROM ventas WHERE id = NEW.venta_id;
  SELECT COALESCE(SUM(monto), 0) INTO total_pagado FROM pagos WHERE venta_id = NEW.venta_id;
  IF total_pagado >= total_venta THEN
    UPDATE ventas SET estado = 'CANCELADO', updated_at = NOW() WHERE id = NEW.venta_id;
  ELSIF total_pagado > 0 THEN
    UPDATE ventas SET estado = 'PARCIAL', updated_at = NOW() WHERE id = NEW.venta_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_estado ON pagos;
CREATE TRIGGER trigger_actualizar_estado AFTER INSERT ON pagos FOR EACH ROW EXECUTE FUNCTION actualizar_estado_venta();

-- Trigger: actualizar totales de venta
CREATE OR REPLACE FUNCTION actualizar_totales_venta()
RETURNS TRIGGER AS $$
DECLARE
  precio_venta DECIMAL(10,2);
  suma_pesos DECIMAL(10,2);
BEGIN
  SELECT precio_kg INTO precio_venta FROM ventas WHERE id = NEW.venta_id;
  SELECT COALESCE(SUM(peso_kg), 0) INTO suma_pesos FROM detalle_pesadas WHERE venta_id = NEW.venta_id;
  UPDATE ventas SET total_kg = suma_pesos, total_bs = suma_pesos * precio_venta, updated_at = NOW() WHERE id = NEW.venta_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_totales ON detalle_pesadas;
CREATE TRIGGER trigger_actualizar_totales AFTER INSERT OR UPDATE OR DELETE ON detalle_pesadas FOR EACH ROW EXECUTE FUNCTION actualizar_totales_venta();

-- Índices
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_lote ON ventas(lote_id);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON ventas(estado);
CREATE INDEX IF NOT EXISTS idx_detalle_pesadas_venta ON detalle_pesadas(venta_id);
CREATE INDEX IF NOT EXISTS idx_pagos_venta ON pagos(venta_id);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);
