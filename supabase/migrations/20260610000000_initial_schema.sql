-- Esquema para Cotizador Solar Colombia

-- 1. Tabla de Productos (Precios en COP)
CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL, -- 'panel', 'bateria', 'inversor'
    capacidad_valor NUMERIC NOT NULL, -- Watts para paneles, kWh para baterías, kW para inversores
    precio_unitario NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Clientes (Preparada para n8n/WhatsApp)
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_id TEXT UNIQUE, -- Numero de teléfono o ID de n8n
    nombre TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Cotizaciones
CREATE TABLE cotizaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id),
    consumo_kwh NUMERIC NOT NULL,
    num_paneles INTEGER,
    capacidad_bateria_kwh NUMERIC,
    capacidad_inversor_kw NUMERIC,
    modalidad TEXT, -- 'hibrido', 'respaldo', 'on-grid'
    total_equipos NUMERIC,
    total_instalacion NUMERIC,
    total_cotizacion NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserción de precios realistas (COP)
INSERT INTO productos (nombre, categoria, capacidad_valor, precio_unitario) VALUES
('Panel Solar 550W Mono', 'panel', 550, 750000),
('Batería Litio 5.12kWh', 'bateria', 5.12, 9500000),
('Inversor Híbrido 5kW', 'inversor', 5, 6500000),
('Inversor On-Grid 5kW', 'inversor', 5, 4800000);
