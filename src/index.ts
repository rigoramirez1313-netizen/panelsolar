import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
import manifestJSON from "__STATIC_CONTENT_MANIFEST";
const assetManifest = JSON.parse(manifestJSON);

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const { pathname } = url;

        // 1. API de Cotización Inteligente
        if (request.method === "POST" && pathname === "/api/cotizar") {
            try {
                const { consumo, modalidad, paneles, baterias } = await request.json();
                
                // Precios de ingeniería (Mock para producción)
                const pPanel = 780000; // 550W Tier 1
                const pBat = 9200000;  // Litio 5kWh
                const pInv = modalidad === 'on-grid' ? 4500000 : 6800000;

                let costoEquipos = (paneles * pPanel) + (baterias * pBat) + pInv;
                if (modalidad === 'respaldo') costoEquipos -= (paneles * pPanel);
                
                const costoInstalacion = costoEquipos * 0.18; 
                const total = costoEquipos + costoInstalacion;
                
                // Métricas Energéticas
                const generacionKwh = paneles * 68.5; // Promedio kWh/mes por panel
                const cobertura = Math.min(100, (generacionKwh / (consumo || 1)) * 100);
                const ahorroMensual = Math.min(generacionKwh, consumo || 0) * 880; // COP/kWh
                const roi = ahorroMensual > 0 ? (total / (ahorroMensual * 12)).toFixed(1) : "---";

                return new Response(JSON.stringify({
                    total_cotizacion: total,
                    roi_anios: roi,
                    generacion_kwh: Math.round(generacionKwh),
                    cobertura_porcentaje: Math.round(cobertura),
                    ahorro_mensual: Math.round(ahorroMensual),
                    ahorro_anual: Math.round(ahorroMensual * 12),
                    paneles_sugeridos: paneles,
                    baterias_sugeridas: baterias
                }), { headers: { "Content-Type": "application/json" } });
            } catch (err) {
                return new Response(JSON.stringify({ error: err.message }), { status: 500 });
            }
        }

        // 2. API: Guardar Lead y Cotización en Supabase
        if (request.method === "POST" && pathname === "/api/guardar-lead") {
            try {
                const data = await request.json();
                const { nombre, email, whatsapp, consumo, modalidad, paneles, baterias, total, roi, generacion, ahorro, cobertura } = data;

                const supabaseUrl = env.SUPABASE_URL;
                const supabaseKey = env.SUPABASE_KEY;

                // 2a. Upsert Cliente (basado en email como identificador único)
                const resCliente = await fetch(`${supabaseUrl}/rest/v1/clientes`, {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation,resolution=merge-duplicates'
                    },
                    body: JSON.stringify({
                        nombre,
                        email,
                        whatsapp,
                        whatsapp_id: whatsapp // Para compatibilidad con esquema anterior
                    })
                });
                
                const clientes = await resCliente.json();
                const clienteId = clientes[0]?.id;

                if (!clienteId) throw new Error("Error al crear/obtener cliente");

                // 2b. Insertar Cotización
                await fetch(`${supabaseUrl}/rest/v1/cotizaciones`, {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        cliente_id: clienteId,
                        consumo_kwh: consumo,
                        num_paneles: paneles,
                        capacidad_bateria_kwh: baterias * 5.12, // Asumiendo capacidad estándar
                        modalidad,
                        total_cotizacion: total,
                        generacion_kwh: generacion,
                        ahorro_mensual: ahorro,
                        roi_anios: parseFloat(roi),
                        cobertura_porcentaje: cobertura
                    })
                });

                return new Response(JSON.stringify({ success: true, message: "Lead guardado correctamente" }), {
                    headers: { "Content-Type": "application/json" }
                });
            } catch (err) {
                return new Response(JSON.stringify({ success: false, error: err.message }), { 
                    status: 500,
                    headers: { "Content-Type": "application/json" } 
                });
            }
        }

        // 3. Servir Assets
        try {
            return await getAssetFromKV(
                { request, waitUntil: ctx.waitUntil.bind(ctx) },
                { ASSET_NAMESPACE: env.__STATIC_CONTENT, ASSET_MANIFEST: assetManifest }
            );
        } catch (e) {
            if (pathname === "/") {
                return new Response("Use public/index.html", { status: 200 });
            }
            return new Response("Not Found", { status: 404 });
        }
    }
}
