-- Tabla para Antibióticos
CREATE TABLE IF NOT EXISTS antibioticoss (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID REFERENCES lotes(id) ON DELETE CASCADE,
  insumo_id UUID REFERENCES insumos(id),
  fecha DATE NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para Vitaminas
CREATE TABLE IF NOT EXISTS vitaminass (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID REFERENCES lotes(id) ON DELETE CASCADE,
  insumo_id UUID REFERENCES insumos(id),
  fecha DATE NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para Desinfectantes
CREATE TABLE IF NOT EXISTS desinfectantess (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID REFERENCES lotes(id) ON DELETE CASCADE,
  insumo_id UUID REFERENCES insumos(id),
  fecha DATE NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE antibioticoss ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitaminass ENABLE ROW LEVEL SECURITY;
ALTER TABLE desinfectantess ENABLE RLS;

-- Políticas RLS
CREATE POLICY "Allow all for authenticated" ON antibioticoss FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON vitaminass FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON desinfectantess FOR ALL USING (true) WITH CHECK (true);