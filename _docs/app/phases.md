# Fases de Desarrollo — Sentinel

---

## ✅ Fase 1: Fundación y Admin Core (Completada)

### Arquitectura
- [x] Estructura modular con Route Groups (`(admin)`, `(cms)`)
- [x] Gateway de auth en `src/app/page.tsx` — redirige a `/dashboard` o `/login`
- [x] Layout del módulo Admin con Sidebar lateral y verificación de sesión
- [x] Estilos globales: fondo Blanco Nieve, menú azul profundo `#4953ac`, tokens CSS

### Autenticación
- [x] Login de doble capa: Supabase Auth (para admins) + credenciales locales (para recepcionistas)
- [x] Sistema de Device Token: solo terminales autorizadas pueden iniciar sesión
- [x] Cookies HTTP-only seguras (`sentinel_device_token`, `sentinel_session`)

### Módulo Admin — RBAC
- [x] Roles: `reception`, `admin`, `maintainer` (renombrados desde la base de datos original)
- [x] Sidebar segmentado por rol: sección "Administrar" y "Mantenimiento" condicionales
- [x] Logo como botón secreto de diagnóstico para admin/maintainer
- [x] Botón "Cerrar Terminal" (rojo) para admin/maintainer vs "Cerrar Sesión" para reception

### CRUD de Personal
- [x] `getUsersList` — lista operadores con filtrado por rol y exclusión de eliminados lógicamente
- [x] `saveNewUser` — validación de esquema, sanitización de inputs, vínculo `auth_user_id`
- [x] `updateUserData` — políticas de modificación por rol (admin no puede editar a otros admins)
- [x] `deleteUserData` — eliminación lógica: `password_hash = 'LOGICALLY_DELETED'`, `is_active = false`
- [x] UI de Gestión de Personal en español con controles deshabilitados por permisos

### Secciones del Dashboard (Shells)
- [x] Panel de Control (métricas en vivo desde Supabase)
- [x] Registro de Clientes
- [x] Planes de Clases
- [x] Registro de Pagos
- [x] Consola de Auditoría/RLS (solo `maintainer`)

---

## ✅ Fase 1.5: Módulo CMS (Completada)

- [x] Route Group `(cms)` con layout y guard de acceso
- [x] Schema TypeScript completo del contenido del sitio (`src/features/cms/types.ts`)
- [x] Server actions para Supabase Storage: leer, publicar con backup, subir imágenes
- [x] CMS Shell con navegación de 11 secciones, estado draft/publish/discard
- [x] 11 editores visuales: Hero, About, Header, Schedule, Gallery, FAQ, Contact, Art, Principles, Comments, Footer
- [x] Enlace "Editor de Sitio Web" en sidebar bajo sección "Administrar"

---

## 🔲 Fase 2: Operaciones y Lógica de Membresías (Próxima)

- [ ] Conectar Panel de Control con datos reales de Supabase (membresías activas, pagos del mes)
- [ ] Formulario de registro de cliente con validación completa
- [ ] Gestión de estados de membresía: Activa, Vencida, Suspendida, Congelada
- [ ] Registro y historial de pagos con filtros por cliente y fecha
- [ ] Asignación de planes a clientes

---

## 🔲 Fase 3: Gestión de Clases y Horarios (Próxima)

- [ ] Vista de horarios semanales con clases y capacidad
- [ ] Registro de asistencia
- [ ] Prevención de sobrecupo
- [ ] Asignación de instructoras a clases

---

## 🔲 Fase 4: Analytics y Automatización (Futura)

- [ ] Dashboard con métricas reales: ingresos, retención, crecimiento
- [ ] Alertas de deuda y membresías próximas a vencer
- [ ] Reportes exportables

---

## 🔲 Fase 5: Subida de Imágenes en CMS (Futura)

- [ ] Subida real de archivos en los editores Hero y Galería (actualmente se ingresan URLs manualmente)
- [ ] Preview de imágenes antes de publicar
- [ ] Gestión de versiones de respaldo con opción de restaurar desde el editor

---

## 🔲 Fase 6: Producción y Despliegue (Futura)

- [ ] Configurar RLS en todas las tablas de Supabase
- [ ] Variables de entorno de producción
- [ ] Despliegue en Vercel o servidor propio
- [ ] Optimización de tiempos de carga (< 2s)
