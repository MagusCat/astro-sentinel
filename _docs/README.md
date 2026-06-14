# Sentinel — Visión General del Proyecto

Sentinel es una plataforma interna de gestión para academias de pole sport y centros deportivos. Es un sistema **modular** donde cada módulo es independiente pero comparte la misma autenticación de Supabase.

---

## ¿Qué es Sentinel?

Sentinel es **dos herramientas en una**, conectadas pero no fusionadas:

1. **Módulo Admin** (`/dashboard`) — El gestor operativo de la academia: clientes, membresías, pagos, horarios de clases y gestión del personal.
2. **Módulo CMS** (`/editor`) — El editor interno del sitio web público de la academia: textos, imágenes, horarios, galería, FAQ, testimonios y contacto.

Ambos módulos son opcionales — el proyecto puede desplegarse con solo uno de ellos activo. Lo único obligatorio es el núcleo de autenticación.

---

## Cliente / Academia

El proyecto está desarrollado para **Studio Power**, una academia de Pole Sport. El sitio web público de la academia (independiente de Sentinel) consume el contenido que se administra desde el Módulo CMS vía Supabase Storage.

---

## Módulos

### 🔑 Auth Core (siempre activo)
- Login vía Supabase Auth para administradores vinculados
- Login vía credenciales locales (`public.users`) para recepcionistas
- Sistema de Device Token para autorizar terminales físicas
- Sesión persistida en cookies HTTP-only (`sentinel_session`)

### 🖥️ Admin Module
- Panel de control con métricas de negocio
- Registro de clientes y membresías
- Planes de clases y horarios
- Registro de pagos
- Gestión de personal (CRUD con lógica de roles)
- Consola de auditoría y diagnóstico (solo `maintainer`)

### ✏️ CMS Module
- Editor visual por secciones del sitio web
- 11 secciones editables: Header, Hero, Sobre Nosotros, Arte, Principios, Horarios, Galería, Testimonios, FAQ, Contacto, Footer
- Publicación a Supabase Storage con backup automático
- Subida de imágenes a bucket `site-images`

---

## Roles del Sistema

| Rol | Español | Acceso |
|---|---|---|
| `reception` | Recepcionista | Solo operaciones diarias del Admin |
| `admin` | Administrador | Admin completo + CMS + gestión de personal |
| `maintainer` | Desarrollador | Todo, incluyendo auditoría y herramientas de mantenimiento |

---

## Documentación Adicional

| Documento | Descripción |
|---|---|
| [`docs/app/architecture.md`](./app/architecture.md) | Stack tecnológico, estructura de rutas, RBAC, autenticación y Storage |
| [`docs/app/db.md`](./app/db.md) | Esquema de base de datos PostgreSQL, tablas y relaciones |
| [`docs/app/phases.md`](./app/phases.md) | Fases de desarrollo y estado actual |
| [`docs/style.md`](../style.md) | Guía de estilos, colores, tipografía y tokens CSS |
| [`docs/cms/README.md`](./cms/README.md) | Arquitectura del módulo CMS, schema JSON y flujo de publicación |
| [`docs/cms/content-web-example.json`](./cms/content-web-example.json) | Ejemplo completo del JSON de contenido del sitio web |
