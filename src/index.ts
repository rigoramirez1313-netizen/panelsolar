import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
import manifestJSON from "__STATIC_CONTENT_MANIFEST";
const assetManifest = JSON.parse(manifestJSON);

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const { pathname } = url;

        // 1. API de Cotización
        if (request.method === "POST" && pathname === "/api/cotizar") {
            try {
                const { consumo, modalidad, paneles, baterias } = await request.json();
                const pPanel = 750000;
                const pBat = 9500000;
                const pInv = modalidad === 'on-grid' ? 4800000 : 6500000;

                let costoEquipos = (paneles * pPanel) + (baterias * pBat) + pInv;
                if (modalidad === 'respaldo') costoEquipos -= (paneles * pPanel);
                const costoInstalacion = costoEquipos * 0.20; 
                const total = costoEquipos + costoInstalacion;
                const generacionMensual = paneles * 66; 
                const ahorroMensual = Math.min(generacionMensual, consumo) * 850; 
                const roi = ahorroMensual > 0 ? (total / (ahorroMensual * 12)).toFixed(1) : "---";

                return new Response(JSON.stringify({
                    total_equipos: costoEquipos,
                    total_instalacion: costoInstalacion,
                    total_cotizacion: total,
                    roi_anios: roi
                }), { headers: { "Content-Type": "application/json" } });
            } catch (err) {
                return new Response(JSON.stringify({ error: err.message }), { status: 500 });
            }
        }

        // 2. API: Enviar a n8n para WhatsApp/Email
        if (request.method === "POST" && pathname === "/api/enviar-pdf") {
            try {
                const data = await request.json();
                
                // Si no hay URL de webhook configurada, devolvemos éxito simulado para que no de error 500
                const N8N_WEBHOOK_URL = env.N8N_WEBHOOK_URL;

                if (N8N_WEBHOOK_URL && N8N_WEBHOOK_URL !== "https://tu-n8n.com/webhook/cotizacion") {
                    await fetch(N8N_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                } else {
                    console.log("Simulando envío: No hay Webhook de n8n configurado aún.");
                }

                return new Response(JSON.stringify({ success: true, message: "Datos procesados" }), {
                    headers: { "Content-Type": "application/json" }
                });
            } catch (err) {
                // Evitar error 500 si el webhook falla, para que el cliente igual descargue su PDF
                return new Response(JSON.stringify({ success: false, error: err.message }), { 
                    status: 200, // Devolvemos 200 pero con success false para manejo interno
                    headers: { "Content-Type": "application/json" } 
                });
            }
        }

        // 3. Servir Assets desde KV
        try {
            return await getAssetFromKV(
                { request, waitUntil: ctx.waitUntil.bind(ctx) },
                { ASSET_NAMESPACE: env.__STATIC_CONTENT, ASSET_MANIFEST: assetManifest }
            );
        } catch (e) {
            if (pathname === "/") {
                return new Response(env.FRONTEND_HTML, {
                    headers: { "Content-Type": "text/html;charset=UTF-8" },
                });
            }
            return new Response("Not Found", { status: 404 });
        }
    }
}
