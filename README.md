# Vitrina Web Interactiva — Documento Ejecutivo Chimay V3.2

**Proyecto:** `PROJ-GEMA32-WEB-V1` · **Módulo de publicación:** `MOD-GEMA32-PUBLISH`

Representación web navegable e interactiva del **Documento Ejecutivo Maestro V3.2** de
Gema Agroecología (Rancho Gema, San Pedro Chimay, Yucatán): 9 capítulos como *tiles*,
texto íntegro, **mapas interactivos**, **flujos animados**, 6 diagramas dinámicos y capa
pedagógica (glosario del documento, tiempos de lectura y atajos de teclado).

**URL pública:** https://in2techmx.github.io/gema-v32-vitrina/

### Qué incluye

- **9 tiles** con número, descripción, secciones y **tiempo de lectura**.
- **Texto completo**: 45 secciones, 20 tablas y 7 fotografías (cobertura de prosa 100 %).
- **2 mapas interactivos**: el polígono de 10.00 HA con sus 4 zonas **a área proporcional** (clic en cada
  zona abre su ficha con superficie, uso y sección de origen) y el esquema de contexto regional con las
  distancias reales del documento. Sin Leaflet ni teselas remotas: sigue funcionando sin internet.
- **3 flujos animados**: financiamiento por nivel de gobierno, cadena de valor del campo al cliente y
  escalera de autorización del gasto (N1/N2/N3 con límites y responsables).
- **6 diagramas dinámicos**: escenarios financieros a 12 meses, presupuesto maestro, roadmap con sus
  Decision Gates, explorador de los 7 canales, catálogo de semillas con validación y apoyos por nivel.
- **Capa pedagógica**: glosario de 60 términos con definiciones **tomadas del documento**, tiempo de
  lectura por capítulo y panel de atajos de teclado.

---

## Ver la vitrina

| Modo | Cómo |
|---|---|
| **Local, sin servidor** | Abre `index.html` con doble clic. Los datos se cargan desde `data/document.data.js`, así que funciona con `file://` (un `fetch` de JSON local habría sido bloqueado por CORS). |
| **Local, con servidor** | `python -m http.server 8080 --directory src/gema-v32` y abre `http://localhost:8080/` |
| **Pública** | GitHub Pages (ver *Publicación* abajo). |

Rutas direccionables:

- `#/` → hub de los 9 tiles
- `#/cap-07` → capítulo 7
- `#/cap-07/sec-7.11` → capítulo 7, sección 7.11

## Regenerar los datos

La vitrina **no se edita a mano**: se regenera desde el markdown oficial.

```bash
node scripts/gema-v32-build-data.js     # markdown -> data/document.json + data/document.data.js
node tests/gemav32-data.test.js         # Gate 1 del módulo DATA
```

Entrada: `src/gema-v32/source/01_DOCUMENTO_EJECUTIVO_PROYECTO_CHIMAY_V3.2.md`
Salidas: `data/document.json` (canónico, para tests) y `data/document.data.js` (navegador, compacto).

El generador es **determinista**: dos corridas producen el mismo `dataSha256`, que queda
registrado en el propio JSON. Si alguien edita el JSON a mano, el test lo detecta.

## Reglas de oro

1. **Cero cifras inventadas.** Toda cifra monetaria mostrada existe literalmente en el
   markdown fuente. Lo verifica `tests/gemav32-data.test.js` y `tests/gemav32-viz.test.js`.
   Si un componente calcula un agregado (p. ej. la suma de 12 meses), lo marca con
   `data-computed` y lo declara como cálculo propio.
2. **Cero dependencias externas.** Sin CDN, sin fuentes remotas, sin frameworks. Todo el
   CSS y el JS son locales; los tipos de letra son del sistema.
3. **El texto no se recorta.** Los 9 capítulos se publican completos; la cobertura de prosa
   verificada es del 100 %.

## Aviso de consistencia detectado en el documento fuente

En el **escenario Normal** del §7.11, la suma de los 12 meses de OPEX es **$279,500.00**
mientras el resumen anual declara **$281,500.00** (diferencia de $2,000.00). Los escenarios
Optimista y Pesimista cuadran exactos. La vitrina **no corrige** el documento: muestra ambas
cifras y publica el aviso. Pendiente de decisión editorial sobre el origen.

## Estructura

```
src/gema-v32/
├── index.html              única página (hub + vista de capítulo)
├── README.md               este archivo
├── source/                 markdown y PDF oficiales (fuente de verdad)
├── data/                   document.json (canónico) + document.data.js (navegador)
├── imagenes/               7 fotografías locales
└── assets/
    ├── css/  tokens · app · content · viz
    └── js/   theme · router · render · search · tiles · app · viz/*
```

## Publicación

### ✅ Publicado y verificado

**URL pública:** https://in2techmx.github.io/gema-v32-vitrina/

| Dato | Valor |
|---|---|
| Repositorio | `in2techmx/gema-v32-vitrina` (**público**, solo la vitrina) |
| Origen de Pages | rama `main`, raíz del repositorio |
| Commit publicado | `d9b7b17` |
| Verificación | `node scripts/gema-v32-pages-check.js https://in2techmx.github.io/gema-v32-vitrina /` → **APTO** |
| Render real del sitio en vivo | **4/4 vistas APTO** (Edge y Chrome: hub y capítulo 7) |

El repositorio de trabajo (`in2techmx/HarnessFactory_DS`) es **privado**, y su plan no permite Pages:

```
POST /repos/in2techmx/HarnessFactory_DS/pages -> 422
{"message":"Your current plan does not support GitHub Pages for this repository."}
```

Por eso la publicación se hizo en un repositorio público **que contiene únicamente la vitrina**, aplicando
la opción elegida por el propietario. Si algún día se quiere publicar también desde el repositorio privado,
hay que hacerlo público o cambiar de plan.

### Vía 1 — GitHub Actions (la mejor una vez haya plan público)

La definición vive como **plantilla** en `docs/ci/deploy-gema-v32-pages.yml`, no activa, por dos motivos
reales: (a) el token de `gh` disponible no tiene el scope `workflow` y GitHub rechaza los push que crean o
modifican archivos en `.github/workflows/`; (b) Pages no está disponible en el plan actual.

Publica **únicamente** `src/gema-v32` como artefacto, de modo que la vitrina queda en la **raíz de la URL**,
y **ejecuta las 5 suites antes de desplegar**: si un test falla, no publica.

Para activarla cuando el repositorio sea público:

```bash
git mv docs/ci/deploy-gema-v32-pages.yml .github/workflows/
git commit -m "ci(pages): activar publicacion de la vitrina" && git push
# y en GitHub: Settings → Pages → Source: GitHub Actions
```

Validación local de la plantilla (estructura, permisos y que cada prueba exista de verdad):

```bash
python scripts/gema-v32-workflow-check.py     # exit 0 = APTO
```

### Vía 2 — Publicar desde la rama (rama `main` / raíz)

1. *Settings → Pages → Deploy from a branch → `main` / `(root)` → Save.*
2. La raíz ya está preparada con `index.html` (punto de entrada que enlaza la vitrina) y `.nojekyll`.

### Vía 3 — Paquete estático portable (no depende de GitHub)

```bash
python scripts/gema-v32-bundle.py     # genera dist/gema-v32-vitrina-v3.2.zip (reproducible)
```

El zip trae `index.html` en la raíz: se sube a cualquier host estático o se descomprime y se abre sin
servidor y sin internet. `dist/` está excluido del repositorio porque el paquete es reproducible.

### Diagnóstico de sincronización

```bash
node scripts/gema-v32-github-sync.js --recon         # token, visibilidad del repo y estado de Pages
node scripts/gema-v32-github-sync.js --push          # sincronizar los commits
node scripts/gema-v32-github-sync.js --enable-pages  # push + habilitar Pages por API
node scripts/gema-v32-pages-check.js                 # verifica la URL pública

# La credencial válida de esta máquina vive en el llavero de GitHub CLI:
$env:IN2TECHMX_GH_TOKEN = (gh auth token)
```

Qué hace la herramienta de sincronización:

- Toma el token de `IN2TECHMX_GH_TOKEN` (preferido, solo sesión) o del respaldo `.agents/github-token`.
- **Nunca imprime ni persiste el token**.
- Informa visibilidad del repositorio y estado de Pages, y puede habilitar Pages desde la raíz de `main`.

Requisitos que dependen del repositorio (no del código):

1. **Credencial válida.** El token en `.agents/github-token` responde `401 Bad credentials` (caducado):
   GitHub contesta literalmente *«Invalid username or token»*. Con un token fresco en la variable
   `IN2TECHMX_GH_TOKEN`, el mismo comando publica y habilita Pages sin salir de este entorno.
   Alternativa equivalente: ejecutar `Sync-to-GitHub.bat` del escritorio desde la sesión de Windows del
   usuario, donde Git Credential Manager sí tiene acceso al almacén de credenciales.
2. **Pages habilitado:** *Settings → Pages → Deploy from a branch → `main` / `(root)` → Save.*
   La raíz ya está preparada con `index.html` (punto de entrada) y `.nojekyll`.
   La herramienta puede habilitarlo por API con `--enable-pages`.
3. **Visibilidad:** si el repositorio es privado, Pages requiere plan de pago; en público es gratuito.
   Alternativa: repositorio público independiente solo para la vitrina.

### Nota técnica: git dentro de entornos confinados

En un sandbox sin acceso al almacén de credenciales de Windows, `git push` falla dos veces por razones
distintas a la autenticación:

| Síntoma | Causa | Solución aplicada |
|---|---|---|
| `schannel: AcquireCredentialsHandle failed (SEC_E_NO_CREDENTIALS)` | El backend TLS `schannel` no puede tomar credenciales del sistema | `-c http.sslBackend=openssl` (Node ya usaba OpenSSL) |
| `sh.exe: couldn't create signal pipe, Win32 error 5` | Los ayudantes de credenciales invocan `sh.exe` y el sandbox bloquea los *named pipes* de MSYS2 | `-c credential.helper=` y credencial en la URL, sin invocar shell |

Con ambas correcciones, la conexión llega a GitHub y el único error que queda es el del token,
que git muestra ya redactado (sin exponer la credencial).

> Si Pages se configurara para servir desde `/docs`, la raíz no aplicaría: la vitrina debe servirse
> desde la raíz del repositorio porque vive en `src/gema-v32/`.

## Verificación (gates reales, exit code)

| Módulo | Test | Qué demuestra |
|---|---|---|
| `MOD-GEMA32-DATA` | `tests/gemav32-data.test.js` | 19 verificaciones: 9 capítulos, fidelidad de cifras, cobertura 100 %, determinismo, cero marcadores markdown |
| `MOD-GEMA32-SHELL` | `tests/gemav32-shell.test.js` | 19 verificaciones: router, tema dual, 9 tiles, **contraste WCAG medido**, estructura accesible, tablas navegables |
| `MOD-GEMA32-CONTENT` | `tests/gemav32-content.test.js` | 12 verificaciones: texto íntegro, tablas, anidamiento, buscador |
| `MOD-GEMA32-VIZ` | `tests/gemav32-viz.test.js` | 28 verificaciones: aritmética de los 6 diagramas, fidelidad de cifras, accesibilidad de controles |
| `MOD-GEMA32-MAPS` | `tests/gemav32-maps.test.js` | 12 verificaciones: 4 zonas que suman 10.00 HA, **proporcionalidad geométrica medida**, distancia y aviso de esquema |
| `MOD-GEMA32-FLOWS` | `tests/gemav32-flows.test.js` | 11 verificaciones: fondos por nivel, cadena de valor en orden, escalera de autorización, movimiento reducido |
| `MOD-GEMA32-PEDAGOGY` | `tests/gemav32-pedagogy.test.js` | 12 verificaciones: glosario con definiciones **literales del documento**, tiempos de lectura, atajos implementados |
| `MOD-GEMA32-PUBLISH` | `tests/gemav32-publish.test.js` | 15 verificaciones: cero CDN, recursos, peso, **legibilidad de impresión (AAA)** y guardia de regresión |

Total: **128 verificaciones**, todas en verde, más los **24 gates** del framework (8 módulos × tests → security → audit, exit code 0).

Auditoría de accesibilidad manual: `node scripts/gema-v32-a11y.js` (calcula el contraste real de ambos temas
y revisa la estructura: landmarks, foco visible, movimiento reducido, texto alternativo).

Verificación end-to-end en navegador real (Edge headless → PDF → texto):

```bash
python scripts/gema-v32-render-check.py <pdf> <hub|cap-07|cap-08>
```
