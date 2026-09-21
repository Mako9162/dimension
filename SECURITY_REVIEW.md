# Revisión de seguridad - Taller Dimensión

Fecha: 2026-09-20.

Actualización del flujo de aceptación: 2026-09-21.

Esta revisión cubre el código del repositorio, la configuración de despliegue incluida y pruebas locales contra PostgreSQL de QA. No inspecciona secretos ni configuraciones privadas dentro de Vercel, Render o Neon.

## Cambios aplicados

- Acceso con usuario y contraseña mediante `POST /api/auth/login`.
- Eliminación del acceso fijo por token o contraseña de demostración.
- Creación del primer usuario solo cuando la tabla `User` está vacía y existe `INITIAL_ADMIN_PASSWORD` de al menos 12 caracteres.
- Hash de contraseñas con scrypt y sal aleatoria.
- Sesiones persistidas como hash SHA-256 del token, con expiración de 8 horas.
- Cookie `HttpOnly`, `SameSite=Lax`, `Secure` en producción y path `/`.
- Cambio de contraseña autenticado, con verificación de contraseña actual y revocación de otras sesiones.
- Rechazo de mutaciones sin `X-Requested-With: TallerDimension`.
- CORS por origen exacto y rechazo 403 para orígenes no autorizados.
- Proxy de Vercel para `/api` y `/uploads`, evitando cookies de terceros.
- Cabeceras de seguridad en Vercel: CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`.
- Límites de frecuencia para login, cambio de contraseña, uploads y PDF.
- Sanitización de imágenes para logo/firma a PNG, con límite de tamaño y megapíxeles.
- Bloqueo de URLs arbitrarias, rutas locales y fetch HTTP en el generador PDF.
- Transacciones serializables para cotizaciones y recibos.
- Prevención de sobrepago simultáneo.
- Bloqueo de eliminación de cotizaciones con recibos.
- Bloqueo de cambios de cliente/vehículo en cotizaciones que ya tienen recibos.
- Migraciones Prisma versionadas para PostgreSQL y despliegue seguro sin `db push` destructivo.

## Revisión focalizada de aceptación (2026-09-21)

- La apertura del enlace y las descargas son de lectura; solo un POST explícito puede aceptar.
- Se validan token, versión, nombre y consentimiento. La API rechaza campos adicionales como total o estado enviados por el cliente.
- La aceptación y el cambio a APROBADA comparten una transacción serializable. La unicidad por cotización y versión, junto con reintentos de conflictos, evita duplicados sin sobrescribir a quien aceptó primero.
- La evidencia conserva una copia de la propuesta y sus condiciones. La proyección pública solo expone el nombre y fecha de la aceptación vigente, sin historial ni copias privadas.
- Editar o reabrir una cotización aprobada invalida su enlace anterior. No se permite eliminar cotizaciones con aceptaciones desde la API.
- La nueva ruta conserva CORS y la cabecera de mutación; limita a 30 intentos por minuto e IP.
- Se corrigió la descarga de recibos desde la vista pública para usar la ruta delimitada por el token de la cotización.
- Se restauró el bloqueo de descargas HTTP y rutas locales arbitrarias en las imágenes del PDF, presente antes de los últimos cambios del generador. Se mantienen el logo, la reducción de imágenes y el diseño vigente.
- Verificación: 9 pruebas unitarias, 11 pruebas de integración contra PostgreSQL aislado, 3 pruebas Python y build. Incluye doble aceptación simultánea, edición concurrente, enlaces revocados, versión incorrecta, cabeceras, limitador y aislamiento de recibos. El flujo de aceptación se probó en navegador local en escritorio y móvil con datos ficticios.

## Riesgos residuales

- El limitador de intentos vive en memoria. Es suficiente para una instancia pequeña de Render; si se escalan varias instancias conviene moverlo a Redis o similar.
- Los enlaces públicos son tokens portadores. Deben compartirse solo con el cliente correcto y revocarse cuando ya no sean necesarios.
- La aceptación pública registra un nombre declarado, no una identidad verificada. Cualquier persona que posea el enlace vigente puede aceptar una cotización enviada.
- No hay roles ni permisos diferenciados. Todo usuario autenticado opera como administrador.
- No hay recuperación de contraseña ni segundo factor.
- No hay bitácora de auditoría por cada cambio.
- Los usuarios existentes con contraseñas débiles no se rotan automáticamente; deben cambiarse desde la interfaz.
- Neon, Vercel y Render deben mantener secretos, backups y reglas de acceso revisadas fuera del repositorio.

## Verificacion realizada

- Build frontend con Vite.
- Pruebas unitarias backend.
- Pruebas de integración contra PostgreSQL local aislado.
- Pruebas Python de sanitización de imágenes.
- Migracion sobre base limpia.
- Baseline de migraciones sobre esquema legacy compatible.
- Revisión visual de login, tablero, formulario, protección de cambios sin guardar, menú móvil y PDFs.

## Checklist para producción

- `NODE_ENV=production` configurado en Render.
- `DATABASE_URL` apunta a Neon con SSL según la configuración de Neon.
- `INITIAL_ADMIN_PASSWORD` no es una clave temporal o reutilizada.
- `FRONTEND_URL=https://dimension-frontend-sage.vercel.app`.
- Vercel mantiene el proxy `/api` hacia Render.
- Después del primer despliegue, cambiar la contraseña inicial desde la interfaz.
- Revocar enlaces públicos antiguos cuando una cotización ya no deba compartirse.
