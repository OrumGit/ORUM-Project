# Plan de limpieza de la base de datos — 09/10/2026

> **Estado: SOLO PLAN. No se ha ejecutado nada.** Cada bloque se ejecuta
> únicamente tras aprobación explícita, uno a la vez, con el conteo de
> verificación al lado.

## Decisiones del propietario (09/10/2026)

- Los miembros **1, 3, 4, 5, 9, 10, 11, 12, 13, 14 y 16** son de prueba → se borran.
- El miembro **2** (Juan Veloza, `danbu737@gmail.com`, rol *Empleado administrativo*) **se deja entero**: es un acceso al panel.
- Los números del pozo `numeros_registro` asignados a miembros borrados **se devuelven al pozo**.
- Comercios: **pendiente de decisión** (ver §3). Nada de esa sección se ejecuta sin respuesta.

## Estado de partida (medido hoy)

| Tabla | Filas |
|---|---|
| miembros | 12 (se borran 11, queda 1) |
| membresias | 14 (13 de los 11 miembros; queda 1, la del miembro 2) |
| ventas | 21 (las 21 pertenecen a los miembros 3 y 4: 20 + 1) |
| numeros_registro | 10 (7 asignados, 3 libres) |
| favoritos | 4 (se borran en cascada con el miembro, si son de ellos) |
| perfiles | 37 |
| storage `avatares` | 3 objetos (fotos de los miembros 3 y 12, y uno más por identificar) |

Llaves foráneas que fijan el orden:
`ventas → miembros/membresias` (sin cascada), `membresias → miembros` (sin cascada),
`numeros_registro → miembros` (**RESTRICT**), `favoritos → miembros` (CASCADE),
`miembros.perfil_id → perfiles` (SET NULL).

## 0. Antes de tocar nada

1. **Copia de seguridad.** Exportar a un archivo fuera de OneDrive las filas que se van a borrar
   (`miembros`, `membresias`, `ventas`, `favoritos`, `numeros_registro`, `perfiles` de esos 11),
   o confirmar que el proyecto de Supabase tiene respaldo diario/PITR vigente.
2. **Confirmar un administrador de reserva.** Comprobar que el miembro 2 puede entrar al panel
   (`danbu737@gmail.com`, último acceso 21/07/2026) **o** que existe otro perfil de rol administrador
   con acceso. Nada de lo siguiente toca su perfil, pero conviene saberlo antes.
3. **Congelar escritura.** No registrar socios ni ventas mientras se ejecuta.
4. Confirmar si la sesión que empuja a `main` (ver memoria *merge limite-de-uso*) no está
   creando miembros en ese momento.

## 1. Miembros (orden obligatorio)

Lista: `1, 3, 4, 5, 9, 10, 11, 12, 13, 14, 16`.

| # | Paso | Filas esperadas |
|---|---|---|
| 1.1 | Guardar los `perfil_id` de esos miembros (para el paso 1.6) | 11 |
| 1.2 | Liberar el pozo: `update numeros_registro set miembro_id=null, asignado_at=null where miembro_id in (…)` | **7** |
| 1.3 | `delete from ventas where miembro_id in (…)` | **21** |
| 1.4 | `delete from membresias where miembro_id in (…)` — borrar primero las que tengan `membresia_anterior_id` (la renovación apunta a la anterior) | **13** |
| 1.5 | `delete from miembros where id in (…)` (arrastra `favoritos` por cascada) | **11** |
| 1.6 | Borrar `perfiles` y el usuario de acceso (`auth.users`) de esos 11, **por la API de administración de Supabase**, no por SQL suelto | **11** |
| 1.7 | Storage `avatares`: borrar `miembros/3/…` y `miembros/12/…` **por la API de Storage** (borrar la fila de `storage.objects` por SQL deja el archivo huérfano) | 2 |

**Verificación posterior**

```sql
select count(*) from miembros;                          -- 1
select count(*) from membresias;                        -- 1
select count(*) from ventas;                            -- 0
select count(*) from numeros_registro where miembro_id is null;  -- 10
select count(*) from numeros_registro;                  -- 10
select count(*) from perfiles p where not exists (select 1 from miembros m where m.perfil_id=p.id) and rol = Miembro;  -- 0 huérfanos de rol Miembro
```

**Por qué el paso 1.6 va el último de la base:** si se borra el perfil antes que el miembro,
`miembros.perfil_id` queda en `null` y se pierde la forma de saber qué usuario de acceso
había que borrar. Y borrar `auth.users` por SQL se salta la limpieza de sesiones y tokens.

## 2. Pozo de números (`numeros_registro`)

- Tras 1.2 quedan los 10 libres: `00090001 … 00090010`.
- **Los miembros 1, 2, 3, 4 y 9 tienen números fuera del pozo** (`00016977`, `00029417`, `00031324`,
  `00044150`, `00065252`). Al borrar a 1, 3, 4 y 9 esos números desaparecen sin pasar por el pozo
  y **no se reutilizan**. El miembro 2 conserva el suyo.
- ⚠️ **Solo hay 10 números.** Con el pozo vacío de usos reales, entran 10 socios y se agota.
  Falta leer en `src/lib/miembros/` qué hace la aplicación cuando no queda ninguno antes de
  decidir si hay que sembrar más (tarea aparte; no entra en esta limpieza).
- `creado_por` queda como está (todos `null`).

## 3. Comercios — PENDIENTE DE DECISIÓN

Nada se ejecuta aquí sin respuesta. Propuesta, de menor a mayor riesgo:

| Grupo | Ids | Qué cuelga | Propuesta |
|---|---|---|---|
| Borrados lógicos vacíos | 2, 4, 5, 6, 7 | nada (0 sucursales, 0 promos, 0 ventas) | Borrar del todo |
| Duplicado vacío | 20 («Casta», inactivo) | nada | Borrar del todo |
| Borrados lógicos con historial | 1, 3, 8 | sucursales 1+1+3, promos 2+1+1, ventas 1+1+2 | Las ventas ya se van en el paso 1.3 (las 4 son de los miembros borrados). Después se pueden borrar del todo con sus sucursales y promociones |
| Dudosos | 16 («Los Payas», inactivo, sin motivo claro), 18 («Dominos», inactivo, 2 sucursales, 2 promos) | datos reales | **No tocar**; preguntar |
| Activos sin sucursal ni promoción | 21–29 | recién creados | **No tocar** |

Preguntas abiertas:
1. ¿Borrar del todo los comercios de prueba (1–8) o dejarlos como borrados lógicos (reversible)?
2. ¿«Dominos» y «Los Payas» están inactivos a propósito?
3. Al borrar comercios hay que limpiar también sus imágenes en el bucket `imagenes-comercios`
   (53 objetos en total) por la API de Storage.

Orden si se aprueba: `promociones` → `sucursales` → `comercio_imagenes` → `comercios`,
después las imágenes del bucket. Las ventas de 1, 3 y 8 deben haberse borrado antes (§1.3).

## 4. Fuera de alcance, a decidir aparte

- `bitacora_actividad` (273 filas) menciona a estos miembros y comercios. No tiene llave foránea,
  no estorba al borrar. Decidir si se vacía o se conserva como auditoría.
- `limite_uso` (4 filas) y `anuncios` / `recursos_sitio`: no tocar.

## 5. Después

- Probar en el navegador: entrar como el miembro 2, registrar un miembro nuevo (debe recibir
  `00090001`) y comprobar que el catálogo y el panel cargan sin errores.
- Anotar en este archivo la fecha, los conteos reales y qué se hizo.
