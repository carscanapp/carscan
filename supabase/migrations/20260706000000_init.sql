-- Create custom types
CREATE TYPE user_role AS ENUM ('operario', 'admin');
CREATE TYPE entry_status AS ENUM ('borrador', 'completada', 'exportada');
CREATE TYPE part_status AS ENUM ('guardar', 'desechar', 'no_tiene');

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nombre TEXT NOT NULL,
  rol user_role DEFAULT 'operario' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create master_parts table
CREATE TABLE master_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  categoria TEXT,
  activa BOOLEAN DEFAULT true NOT NULL,
  orden INTEGER DEFAULT 0 NOT NULL,
  reglas_visibilidad JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create vehicle_entries table
CREATE TABLE vehicle_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula TEXT,
  vin TEXT,
  marca TEXT,
  modelo TEXT,
  version TEXT,
  motor_codigo TEXT,
  combustible TEXT,
  ano INTEGER,
  foto_vin_url TEXT,
  operario_id UUID REFERENCES profiles(id) NOT NULL,
  estado entry_status DEFAULT 'borrador' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create entry_parts table
CREATE TABLE entry_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES vehicle_entries(id) ON DELETE CASCADE NOT NULL,
  part_id UUID REFERENCES master_parts(id) NOT NULL,
  estado part_status NOT NULL,
  nota TEXT,
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(entry_id, part_id)
);

-- Create vehicle_lookups table
CREATE TABLE vehicle_lookups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave TEXT NOT NULL, -- matricula or vin
  data JSONB NOT NULL,
  proveedor TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_lookups ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: Users can read all profiles, but only admin can edit, users can only update their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Master parts: Everyone can read, only admin can write
CREATE POLICY "Master parts viewable by everyone" ON master_parts FOR SELECT USING (true);
CREATE POLICY "Master parts insert by admin" ON master_parts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
);
CREATE POLICY "Master parts update by admin" ON master_parts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
);

-- Vehicle entries: Operarios ven todas las entradas, editan las suyas en estado borrador. Admin todo.
CREATE POLICY "Entries viewable by everyone" ON vehicle_entries FOR SELECT USING (true);
CREATE POLICY "Entries insertable by auth users" ON vehicle_entries FOR INSERT WITH CHECK (auth.uid() = operario_id);
CREATE POLICY "Entries updatable by owner if borrador or admin" ON vehicle_entries FOR UPDATE USING (
  (auth.uid() = operario_id AND estado = 'borrador') OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
);
CREATE POLICY "Entries deletable by admin" ON vehicle_entries FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
);

-- Entry parts: Inherit permissions roughly from entries
CREATE POLICY "Entry parts viewable by everyone" ON entry_parts FOR SELECT USING (true);
CREATE POLICY "Entry parts insertable by entry owner or admin" ON entry_parts FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM vehicle_entries 
    WHERE id = entry_id AND (
      (operario_id = auth.uid() AND estado = 'borrador') OR 
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
    )
  )
);
CREATE POLICY "Entry parts updatable by entry owner or admin" ON entry_parts FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM vehicle_entries 
    WHERE id = entry_id AND (
      (operario_id = auth.uid() AND estado = 'borrador') OR 
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
    )
  )
);

-- Lookups: Only internal use, but we can allow authenticated users to read/write
CREATE POLICY "Lookups viewable by auth users" ON vehicle_lookups FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Lookups insertable by auth users" ON vehicle_lookups FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Seed master_parts
INSERT INTO master_parts (nombre, orden, categoria) VALUES 
  ('alternador', 10, 'motor'),
  ('batería', 20, 'electrónica'),
  ('bomba gasolina', 30, 'motor'),
  ('bomba inyección', 40, 'motor'),
  ('cambio', 50, 'motor'),
  ('caudalímetro', 60, 'motor'),
  ('centralita', 70, 'electrónica'),
  ('cierres', 80, 'carrocería'),
  ('cinturones', 90, 'interior'),
  ('cuadro', 100, 'interior'),
  ('elevalunas', 110, 'carrocería'),
  ('espejos', 120, 'carrocería'),
  ('llave contacto', 130, 'interior'),
  ('llave limpia', 140, 'interior'),
  ('llave luces', 150, 'interior'),
  ('mandos calefacción', 160, 'interior'),
  ('mando elevalunas', 170, 'interior'),
  ('motor', 180, 'motor'),
  ('motor calefacción', 190, 'interior'),
  ('motor limpia', 200, 'carrocería'),
  ('puesta marcha', 210, 'motor'),
  ('radiador agua', 220, 'motor'),
  ('radiador aire', 230, 'motor'),
  ('radio', 240, 'interior'),
  ('turbo', 250, 'motor');
