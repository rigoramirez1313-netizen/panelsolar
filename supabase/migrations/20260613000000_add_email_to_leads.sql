-- Migración para añadir campo de email y mejorar tabla de clientes

ALTER TABLE clientes ADD COLUMN email TEXT;
ALTER TABLE clientes ADD COLUMN whatsapp TEXT;

-- Asegurar que las cotizaciones tengan más detalle de los resultados calculados
ALTER TABLE cotizaciones ADD COLUMN generacion_kwh NUMERIC;
ALTER TABLE cotizaciones ADD COLUMN ahorro_mensual NUMERIC;
ALTER TABLE cotizaciones ADD COLUMN roi_anios NUMERIC;
ALTER TABLE cotizaciones ADD COLUMN cobertura_porcentaje NUMERIC;
