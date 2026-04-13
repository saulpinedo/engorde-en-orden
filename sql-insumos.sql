-- ================================================
-- TABLA: insumos (genérica para todos los tipos)
-- ================================================
CREATE TABLE IF NOT EXISTS insumos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('VACUNA', 'ANTIBIOTICO', 'VITAMINA', 'DESINFECTANTE')),
  precio_unitario DECIMAL(10,2),
  unidad TEXT DEFAULT 'und',
  dias_aplicacion INT,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrar datos de vacunas existentes si hay
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vacunas') THEN
    INSERT INTO insumos (nombre, tipo, precio_unitario, unidad, dias_aplicacion, descripcion)
    SELECT nombre, COALESCE(tipo, 'VACUNA'), precio_unitario, unidad, dias_aplicacion, descripcion
    FROM vacunas
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Insertar datos de ejemplo
INSERT INTO insumos (nombre, tipo, precio_unitario, unidad, descripcion) VALUES
-- Vacunas
('Gumboro', 'VACUNA', 450, 'dosis', 'Vacuna contra enfermedad de Gumboro'),
('Newcastle', 'VACUNA', 380, 'dosis', 'Vacuna contra Newcastle'),
('Bronquitis', 'VACUNA', 420, 'dosis', 'Vacuna contra Bronquitis Infecciosa'),
('Enfermedad de Marek', 'VACUNA', 200, 'dosis', 'Vacuna contra Marek'),
-- Antibióticos
('Tibcina', 'ANTIBIOTICO', 430, 'kg', 'Antibiótico de amplio espectro'),
('Ciprofloxacina', 'ANTIBIOTICO', 550, 'kg', 'Antibiótico fluorquinolona'),
('Tilosina', 'ANTIBIOTICO', 860, 'kg', 'Antibiótico macrólido'),
('Enrofloxacina', 'ANTIBIOTICO', 220, 'Lt', 'Antibiótico inyectable'),
('Oxytetraciclina', 'ANTIBIOTICO', 350, 'kg', 'Antibiótico de amplio espectro'),
-- Vitaminas
('Vitamina Complex', 'VITAMINA', 100, 'Lt', 'Complejo vitamínico'),
('Vitamina B Complex', 'VITAMINA', 80, 'Lt', 'Vitaminas del complejo B'),
('Electrolitos', 'VITAMINA', 75, 'kg', 'Reposición de electrolitos'),
('Aminoácidos', 'VITAMINA', 150, 'Lt', 'Suplemento aminoácido'),
-- Desinfectantes
('Desinfectante General', 'DESINFECTANTE', 150, 'Lt', 'Desinfectante de amplio espectro'),
('Formalina', 'DESINFECTANTE', 200, 'Lt', 'Formol al 40%'),
('Yodo', 'DESINFECTANTE', 180, 'Lt', 'Desinfectante yodado'),
('Cloro', 'DESINFECTANTE', 50, 'kg', 'Hipoclorito de sodio')
ON CONFLICT DO NOTHING;