-- Tabla catálogo de Antibióticos
CREATE TABLE IF NOT EXISTS antibioticos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  precio_unitario NUMERIC(10,2),
  unidad TEXT DEFAULT 'Lt',
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla catálogo de Vitaminas
CREATE TABLE IF NOT EXISTS vitaminas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  precio_unitario NUMERIC(10,2),
  unidad TEXT DEFAULT 'Lt',
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla catálogo de Desinfectantes
CREATE TABLE IF NOT EXISTS desinfectantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  precio_unitario NUMERIC(10,2),
  unidad TEXT DEFAULT 'Lt',
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE antibioticos ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitaminas ENABLE ROW LEVEL SECURITY;
ALTER TABLE desinfectantes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Allow all" ON antibioticos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON vitaminas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON desinfectantes FOR ALL USING (true) WITH CHECK (true);