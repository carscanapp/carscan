# Entrada de Vehículos — App para Desguaces

## Qué es este proyecto

PWA mobile-first para digitalizar la entrada de vehículos en un desguace (cliente: Desguaces Oviedo, +118.000 referencias, ERP Seinto). Sustituye la hoja de papel actual: el operario fotografía el número de bastidor (VIN) o lo introduce a mano, la app identifica el vehículo (marca, modelo, matrícula) y muestra un checklist de piezas para marcar cuáles se desmontan y guardan en almacén.

La especificación funcional completa está en `docs/ESPECIFICACION.md`. **Léela antes de empezar cualquier tarea.**

## Stack

- **Next.js 14+** (App Router) + TypeScript + Tailwind CSS
- **Supabase**: Postgres, Auth (email/password para empleados), Storage (fotos)
- **PWA** instalable, mobile-first (se usa con el móvil en la campa, a veces con guantes: botones grandes, alto contraste)
- Despliegue: Vercel

## Comandos

- `npm run dev` — desarrollo
- `npm run build` — build de producción
- `npm run lint` — lint

## Convenciones

- UI en **español** (usuarios: operarios de desguace, sin perfil técnico)
- Código, variables y commits en inglés
- Componentes en `src/components/`, lógica de APIs externas en `src/lib/`
- Las claves de APIs externas van en `.env.local` (nunca en el código). Ver `docs/ESPECIFICACION.md` §5

## Fases (no empezar una sin cerrar la anterior)

1. **F1 — Núcleo manual**: auth, alta de vehículo a mano (matrícula, bastidor, marca, modelo), checklist de piezas desde lista maestra, guardado, listado de entradas, export CSV
2. **F2 — Automatización**: OCR de VIN por foto, autocompletado de datos por matrícula/VIN vía API, validación dígito de control VIN
3. **F3 — Integraciones**: volcado a Seinto (pendiente confirmar si expone API), despiece real por API (Vehicle Databases / TecDoc) si se contrata

## Decisiones ya tomadas (no reabrir)

- No se hace scraping de catálogos de terceros (Oscaro, etc.) — riesgo legal y mantenimiento
- El despiece del MVP es una **lista maestra propia configurable**, no un catálogo OEM completo
- El OCR y los decodificadores van detrás de API routes de Next.js (las claves no tocan el cliente)
