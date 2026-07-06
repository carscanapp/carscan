# Especificación — App de Entrada de Vehículos para Desguace

## 1. Contexto y problema

Hoy la entrada de vehículos se registra en una hoja de papel con: matrícula, marca y modelo, bastidor, y una lista fija de ~25 piezas (alternador, batería, bomba gasolina, bomba inyección, cambio, caudalímetro, centralita, cierres, cinturones, cuadro, elevalunas, espejos, llave contacto, llave limpia, llave luces, mandos calefacción, mando elevalunas, motor, motor calefacción, motor limpia, puesta marcha, radiador agua, radiador aire, radio, turbo) donde el operario marca a mano qué se guarda, con anotaciones tipo código de motor (ej. "RHZ").

Problemas: transcripción manual posterior al ERP (Seinto), errores en bastidores de 17 caracteres, sin fotos, sin trazabilidad de quién/cuándo.

## 2. Usuarios y flujo principal

Usuario: operario de desguace, en exterior, con móvil. Flujo:

1. Login (sesión persistente, no pedir login cada vez)
2. "Nueva entrada" → fotografiar el VIN (o teclearlo / teclear matrícula)
3. La app resuelve marca, modelo, versión, motor, combustible y muestra la ficha para confirmar
4. Checklist de piezas: marcar cada pieza como **Guardar / Desechar / No tiene**, con campo de nota opcional (ej. código motor) y foto opcional por pieza
5. Guardar entrada → queda en el listado, exportable a CSV/Seinto

Regla de oro de UX: completar una entrada en **menos de 3 minutos** con una sola mano.

## 3. Requisitos funcionales (MVP = F1 + F2)

### F1 — Núcleo
- Auth email/password (Supabase Auth). Roles: `operario`, `admin`
- CRUD de entradas de vehículo: matrícula, bastidor (VIN), marca, modelo, versión, motor, fecha, operario
- Validación de VIN: 17 caracteres, sin I/O/Q, dígito de control ISO 3779 (implementar en local, sin API)
- Lista maestra de piezas: seed con las 25 de la hoja actual; el admin puede añadir/desactivar piezas y agruparlas por categoría (motor, carrocería, interior, electrónica)
- Checklist por entrada con estado por pieza (guardar/desechar/no tiene), nota y foto (Supabase Storage)
- Listado y detalle de entradas con búsqueda por matrícula/bastidor/modelo
- Export CSV de una entrada o rango de fechas (formato pensado para importar en Seinto)

### F2 — Automatización
- Captura de foto del VIN con la cámara (input capture o getUserMedia) → API route → OCR
  - Proveedor OCR: **Plate Recognizer VIN OCR** (o Google Cloud Vision como fallback barato). Abstraer detrás de una interfaz `VinOcrProvider` para poder cambiar
  - Mostrar el VIN leído SIEMPRE para confirmación humana antes de continuar; marcar caracteres corregidos
- Autocompletado de datos del vehículo:
  - Por matrícula española: **MatriculaAPI** (~0,20 €/consulta) o **InfoCoche** (partner DGT). Abstraer detrás de `VehicleDataProvider`
  - Por VIN (fallback): decodificador tipo Vincario/vindecoder.eu
  - Cachear respuestas en BD (tabla `vehicle_lookups`) para no pagar dos veces por el mismo coche
- Filtrado inteligente del checklist según ficha: si no es turbo, ocultar "turbo"; si es gasolina, ocultar "bomba inyección", etc. (reglas en BD, no hardcodeadas)

### F3 — Integraciones (post-MVP, no implementar aún)
- Volcado directo a Seinto (pendiente: confirmar con Seinto si exponen API; si no, se queda el CSV)
- Despiece real con referencias OE: Vehicle Databases Auto Parts API o TecDoc oficial

## 4. Modelo de datos (Postgres/Supabase)

- `profiles` — id (auth.users), nombre, rol
- `master_parts` — id, nombre, categoría, activa, orden, reglas_visibilidad (jsonb: ej. `{"fuel":"diesel"}`)
- `vehicle_entries` — id, matrícula, vin, marca, modelo, versión, motor_codigo, combustible, año, foto_vin_url, operario_id, created_at, estado (borrador/completada/exportada)
- `entry_parts` — id, entry_id, part_id, estado (guardar/desechar/no_tiene), nota, foto_url
- `vehicle_lookups` — caché de respuestas de APIs externas (clave: matrícula o vin, jsonb, proveedor, created_at)

RLS activado: operarios ven todas las entradas pero solo editan las suyas en estado borrador; admin todo.

## 5. APIs externas y variables de entorno

| Servicio | Uso | Variable |
|---|---|---|
| Plate Recognizer | OCR VIN por foto | `PLATERECOGNIZER_API_KEY` |
| MatriculaAPI / InfoCoche | matrícula → datos vehículo | `MATRICULA_API_KEY` |
| VIN decoder (Vincario u otro) | VIN → datos (fallback) | `VINDECODER_API_KEY` |
| Supabase | BD, auth, storage | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |

Todas las llamadas a APIs de pago pasan por API routes del servidor. Si una API externa falla, la app degrada a entrada manual (nunca bloquear al operario).

## 6. Fuera de alcance

- Venta online, precios, publicación en portales (eso lo hace Seinto)
- Gestión de almacén/ubicaciones
- Scraping de catálogos de terceros
- App nativa (iOS/Android) — PWA es suficiente

## 7. Criterios de aceptación del MVP

1. Un operario da de alta un coche completo (foto VIN → confirmar → checklist → guardar) en <3 min con el móvil
2. El VIN fotografiado se lee correctamente ≥90% de las veces en condiciones normales de luz
3. Con matrícula española válida, marca/modelo/motor se rellenan solos
4. El CSV exportado contiene todo lo necesario para el alta en Seinto sin reteclear
5. Funciona offline a nivel de formulario (la entrada se guarda localmente y sincroniza al recuperar red) — *nice to have, no bloqueante*
