# Módulo CMS — Documentación Técnica

El módulo CMS de Sentinel permite a los operadores con rol `admin` o `maintainer` editar el contenido del sitio web público de Studio Power directamente desde el panel de Sentinel, sin necesidad de tocar código.

---

## Filosofía de Diseño

- **El sitio web público es estático desde el punto de vista de Sentinel.** Sentinel no sirve el sitio web — solo administra su contenido.
- **El contenido vive en Supabase Storage** como un único archivo JSON (`content.json`) y un bucket de imágenes.
- **El sitio externo lee el JSON** directamente desde la URL pública del bucket de Storage.
- **Los cambios son transaccionales:** antes de publicar un cambio, el sistema respalda automáticamente la versión actual.

---

## Rutas del Módulo CMS

| URL | Descripción |
|---|---|
| `/editor` | Editor principal de contenido |

El módulo vive en el Route Group `src/app/(cms)/`. El layout en `(cms)/layout.tsx` verifica la sesión y redirige a `/dashboard` si el usuario es `reception`.

---

## Supabase Storage — Estructura de Buckets

### Bucket: `site-content`
```
site-content/
├── content.json                  ← Archivo activo del sitio web
└── backups/
    ├── content_1748556000000.json ← Backup automático (Unix timestamp)
    └── content_1748555900000.json
```

**Política recomendada:** Lectura pública para `content.json` (para que el sitio externo lo consuma). Escritura solo para usuarios autenticados.

### Bucket: `site-images`
```
site-images/
├── hero/
│   ├── h_1.jpg
│   └── h_2.jpg
├── gallery/
│   ├── g_1.jpg
│   └── g_2.jpg
└── ...
```

**Política recomendada:** Lectura pública. Escritura solo para usuarios autenticados.

---

## Schema JSON del Contenido

El archivo `content.json` sigue la estructura definida en `src/features/cms/types.ts`. Las secciones son:

| Sección | Clave en JSON | Descripción |
|---|---|---|
| Datos Generales | `globals` | SEO (título, descripción), contactos y redes sociales unificadas |
| Encabezado | `header` | Links de navegación y botón de contacto |
| Hero | `hero` | Título, subtítulo, descripción, carrusel de imágenes principales |
| Sobre Nosotros | `about` | Heading y dos párrafos descriptivos |
| Arte | `art` | Tarjetas de valores (título, descripción, icono) |
| Principios | `principles` | Tarjetas de principios del estudio |
| Horarios | `schedule` | Clases con días activos y slots de tiempo |
| Galería | `gallery` | Lista de imágenes con título y URL |
| Testimonios | `comments` | Reseñas de alumnas con nombre, rol y tema visual |
| FAQ | `faq` | Preguntas frecuentes con respuestas completas |
| Contacto | `contact` | Info de contacto, mapa embed, configuración WhatsApp |
| Footer | `footer` | Copyright, propietario, ítems de políticas |

Ver el ejemplo completo en [`content-web-example.json`](./content-web-example.json).

---

## Flujo de Publicación

```
1. El operador abre /editor
2. CMS Shell carga el content.json desde Supabase Storage (getSiteContent)
3. Se crea una copia local en estado React (draft)
4. El operador edita secciones → cambios en el draft local (no en Storage aún)
5. Indicador "Hay cambios sin publicar" aparece en la barra superior
6. Al hacer clic en "Publicar Cambios":
   a. Se descarga el content.json actual como backup
   b. Se sube el backup a backups/content_{timestamp}.json
   c. Se sube el nuevo draft como content.json (upsert)
7. El sitio externo, en su próximo fetch del JSON, recibe el contenido actualizado
```

---

## Server Actions del CMS

Archivo: `src/features/cms/actions.ts`

| Función | Descripción |
|---|---|---|
| `getSiteContent()` | Lee y parsea `content.json`. Si no existe, lo crea con un JSON por defecto de inicialización rápida |
| `publishSiteContent(newContent)` | Respalda versión actual y publica el nuevo JSON |
| `restoreContentBackup(backupName)` | Descarga un backup específico y lo sobreescribe como el archivo activo |
| `uploadSiteImage(section, filename, data, mimeType)` | Sube una imagen al bucket `site-images` y retorna la URL pública |
| `deleteSiteImage(section, filename)` | Elimina una imagen del bucket |
| `listContentBackups()` | Lista los backups disponibles para restaurar |

---

## Componentes del Editor

Archivo principal: `src/features/cms/components/cms-shell.tsx`

El `CmsShell` gestiona:
- Estado del draft (copia local del JSON)
- Navegación entre las 11 secciones editables
- Botones de Publicar / Descartar / Recargar
- Panel de Resumen con métricas del contenido actual

Cada sección tiene su editor propio en `src/features/cms/components/editors/`:

| Archivo | Sección |
|---|---|---|
| `globals-editor.tsx` | Datos Generales unificados de la web y redes sociales |
| `header-editor.tsx` | Navegación y botón de contacto |
| `hero-editor.tsx` | Imágenes de carrusel y textos principales |
| `about-editor.tsx` | Párrafos de Sobre Nosotros |
| `art-editor.tsx` | Tarjetas de valores |
| `principles-editor.tsx` | Tarjetas de principios |
| `schedule-editor.tsx` | Grid de días/horarios por clase |
| `gallery-editor.tsx` | Lista de imágenes de la galería |
| `comments-editor.tsx` | Testimonios con selección de tema visual |
| `faq-editor.tsx` | Preguntas y respuestas |
| `contact-editor.tsx` | Contactos, mapa embed, WhatsApp |
| `footer-editor.tsx` | Copyright, ítems de políticas |

---

## Tipos TypeScript

Archivo: `src/features/cms/types.ts`

Define la interfaz completa `SiteContent` y todos sus subtipos. Siempre usar estos tipos al leer o escribir el JSON — nunca `any`.

Tipos clave:
- `SiteContent` — Raíz del JSON
- `CmsSection` — Identificador de sección para navegación
- `DayKey` — Días de la semana (`'L' | 'M' | 'Mi' | 'J' | 'V' | 'S' | 'D'`)
- `CmsPublishResult` — Resultado de la acción de publicación

---

## Configuración Inicial Requerida (Supabase)

Antes de usar el módulo CMS por primera vez:

1. **Crear bucket `site-content`** en Supabase Storage Dashboard.
   - Subir `docs/cms/content-web-example.json` renombrado como `content.json`.
   - Configurar política: lectura pública, escritura autenticada.

2. **Crear bucket `site-images`** en Supabase Storage Dashboard.
   - Configurar política: lectura pública, escritura autenticada.

3. Verificar que las variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` estén configuradas.

---

## Integración con el Sitio Externo (Studio Power)

El sitio web público de Studio Power debe obtener su contenido así:

```javascript
// En el sitio externo — fetch del JSON desde el bucket público
const res = await fetch(
  `${process.env.SUPABASE_URL}/storage/v1/object/public/site-content/content.json`,
  { next: { revalidate: 60 } } // Revalidar cada 60 segundos (Next.js ISR)
)
const content = await res.json()
```

Para imágenes, las URLs del bucket de Storage se almacenan directamente en los campos `src` / `url` del JSON cuando se suben desde el editor.
