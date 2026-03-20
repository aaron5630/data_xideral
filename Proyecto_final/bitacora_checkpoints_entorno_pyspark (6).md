# Bitácora técnica de checkpoints: entorno PySpark en EC2

## Contexto
Se validó el entorno base de la instancia EC2 para confirmar que puede ejecutar el proyecto de taxis con PySpark, Jupyter y acceso a S3.

## Checkpoint 1: validación del entorno base
### Objetivo
Confirmar si la instancia EC2 tiene Python, Java, PySpark y acceso al bucket de S3.

### Comandos ejecutados
```bash
python3 --version
java -version
python3 -c "import pyspark; print(pyspark.__version__)"
aws s3 ls s3://xideralaws-curso-aaronxideral
```

### Resultados observados
- Python global disponible: `Python 3.12.3`
- Java disponible: `openjdk version "11.0.30"`
- PySpark **no disponible** en el Python global (`ModuleNotFoundError`)
- Acceso a S3 correcto: se pudieron listar objetos del bucket `xideralaws-curso-aaronxideral`

### Hallazgo
La instancia sí tiene conectividad con S3 y dependencias base, pero PySpark no está instalado en el entorno global.

### Hipótesis
PySpark probablemente está instalado en el entorno virtual `venv`.

---

## Checkpoint 2: validación del entorno virtual
### Objetivo
Comprobar si PySpark y Jupyter están instalados dentro del entorno virtual `venv`.

### Comandos ejecutados
```bash
source venv/bin/activate
python -c "import pyspark; print(pyspark.__version__)"
which python
jupyter --version
```

### Resultados observados
- PySpark disponible en `venv`: `3.5.8`
- Python activo del entorno virtual: `/home/ubuntu/venv/bin/python`
- Jupyter disponible dentro de `venv`

### Hallazgo
El entorno virtual `venv` es el entorno correcto de trabajo para el proyecto.

### Decisión tomada
Todo el proyecto se ejecutará dentro de `venv`, incluyendo:
- PySpark
- Jupyter Notebook
- futuros scripts del ETL
- pruebas relacionadas con el pipeline de datos

---

## Estado actual
El siguiente checkpoint pendiente es validar que Spark levante correctamente dentro de `venv` con una prueba local simple antes de conectarlo con S3.

---

## Checkpoint 9: generación de capa analítica para dashboard

### Objetivo
Tomar la salida limpia del mes `2024-01` y producir una primera capa analítica en S3, lista para ser consumida por Streamlit.

### Entrada
- `s3a://xideralaws-curso-aaronxideral/processed/yellow_taxi/2024/01/cleaned`

### Salidas creadas
- `s3a://xideralaws-curso-aaronxideral/analytics/yellow_taxi/2024/01/kpi_general`
- `s3a://xideralaws-curso-aaronxideral/analytics/yellow_taxi/2024/01/trips_by_day`
- `s3a://xideralaws-curso-aaronxideral/analytics/yellow_taxi/2024/01/trips_by_hour`
- `s3a://xideralaws-curso-aaronxideral/analytics/yellow_taxi/2024/01/payment_type_distribution`
- `s3a://xideralaws-curso-aaronxideral/analytics/yellow_taxi/2024/01/top_pickup_zones`

### Validación observada
- `kpi_general: 1`
- `trips_by_day: 35`
- `trips_by_hour: 24`
- `payment_type_distribution: 5`
- `top_pickup_zones: 10`

### Hallazgo
Spark escribió múltiples rutas/prefixes en S3, una por cada tabla analítica. Esto es normal: al escribir Parquet, Spark guarda una ruta con archivos internos `part-*` en lugar de un solo archivo plano.

### Estado
Con este checkpoint quedó lista la primera capa analítica que después podrá leer Streamlit sin hacer transformación pesada.

---

## Checkpoint 10: revisión inicial de Streamlit en EC2

### Objetivo
Verificar si Streamlit ya existía en el entorno virtual y si el puerto por defecto (`8501`) estaba disponible.

### Comandos ejecutados
```bash
source /home/ubuntu/venv/bin/activate
python -c "import streamlit as st; print(st.__version__)"
which streamlit
ss -ltnp | grep 8501 || true
```

### Resultado
- `ModuleNotFoundError: No module named 'streamlit'`
- El puerto `8501` sí estaba ocupado.

### Investigación adicional
```bash
sudo lsof -iTCP:8501 -sTCP:LISTEN -P -n
sudo ss -ltnp | grep 8501
```

### Hallazgo
El puerto `8501` estaba siendo usado por `docker-proxy`, asociado a un ejercicio anterior. Se decidió no tocar ese despliegue previo y mover la nueva app a otro puerto.

### Decisión
Se eligió la **opción B**:
- no modificar Docker
- no usar `8501`
- levantar el nuevo Streamlit en `8502`

---

## Checkpoint 10B: instalación de Streamlit en `venv`

### Objetivo
Instalar Streamlit dentro del entorno virtual oficial del proyecto y preparar el camino para levantar la app en el puerto `8502`.

### Comandos ejecutados
```bash
source /home/ubuntu/venv/bin/activate
pip install streamlit
python -c "import streamlit as st; print(st.__version__)"
which streamlit
```

### Resultado
- Streamlit instalado correctamente
- Versión detectada: `1.55.0`
- Ejecutable detectado en:
  - `/home/ubuntu/venv/bin/streamlit`

### Estado
La EC2 ya tiene Streamlit instalado en el mismo entorno virtual donde viven PySpark y Jupyter. El siguiente checkpoint será levantar una app mínima de prueba en el puerto `8502`.

---

## Checkpoint 10C: app mínima de Streamlit visible desde navegador

### Objetivo
Validar que Streamlit puede levantarse correctamente en la EC2 y ser accesible desde el navegador usando un puerto distinto al `8501`.

### Archivo de prueba creado
```python
import streamlit as st

st.set_page_config(page_title="Checkpoint Streamlit", layout="centered")
st.title("Streamlit en EC2 funcionando :3")
st.write("Si ves esto en el navegador, el checkpoint pasó.")
```

### Comando ejecutado
```bash
source /home/ubuntu/venv/bin/activate
streamlit run /home/ubuntu/app_test.py --server.address 0.0.0.0 --server.port 8502
```

### Resultado
Streamlit levantó correctamente y mostró las URLs de acceso:
- `Local URL: http://localhost:8502`
- `Network URL: http://172.31.23.66:8502`
- `External URL: http://52.53.250.103:8502`

La aplicación fue visible desde el navegador externo, confirmando que:
- Streamlit corre bien dentro del `venv`
- el puerto `8502` funciona
- el Security Group permite acceder al servicio
- la EC2 ya puede hospedar el dashboard del proyecto

### Estado
La capa de visualización base ya quedó validada. El siguiente paso natural será conectar Streamlit con los archivos analíticos generados por PySpark en `S3/analytics/`.


## Checkpoint 11A — Validación de `trips_by_day`

**Objetivo:** Revisar por qué la gráfica de viajes por día se veía incorrecta en Streamlit.

**Hallazgo:** La tabla analítica `trips_by_day` contiene fechas fuera del mes esperado (`2024-01`).

### Evidencia
- `distinct_dates`: 35
- `min_date`: `2002-12-31`
- `max_date`: `2024-02-01`

### Ejemplos de fechas atípicas detectadas
- `2002-12-31`
- `2009-01-01`
- `2023-12-31`
- `2024-02-01`

### Conclusión
El problema principal **no está en Streamlit**, sino en la capa analítica/datos: existen registros atípicos en el archivo procesado que expanden el eje X de la gráfica hacia años no esperados.

### Decisión
Corregir el pipeline filtrando explícitamente el rango temporal esperado del archivo mensual:
- Para `yellow_tripdata_2024-01.parquet`, conservar solo registros con `pickup_date` entre `2024-01-01` y `2024-01-31`.
- Después, regenerar la capa analítica (`analytics/`) para que el dashboard refleje solo enero 2024.

---

## Checkpoint 11: Streamlit conectado a los analytics reales en S3

### Objetivo
Validar que Streamlit pueda leer las salidas analíticas reales generadas por PySpark y renderizar un dashboard funcional desde la EC2.

### Acciones realizadas
- Se creó el archivo `/home/ubuntu/app_dashboard.py`.
- La app se conectó a los prefixes analíticos en S3:
  - `analytics/yellow_taxi/2024/01/kpi_general/`
  - `analytics/yellow_taxi/2024/01/trips_by_day/`
  - `analytics/yellow_taxi/2024/01/trips_by_hour/`
  - `analytics/yellow_taxi/2024/01/payment_type_distribution/`
  - `analytics/yellow_taxi/2024/01/top_pickup_zones/`
- La lectura se hizo con `boto3` + `pyarrow`, concatenando todos los archivos parquet de cada prefix.
- Se levantó la app en la EC2 usando el puerto `8502`.

### Resultado
La aplicación Streamlit mostró correctamente:
- KPI cards
- gráfica de viajes por día
- gráfica de viajes por hora
- distribución por tipo de pago
- top 10 zonas de pickup

### Hallazgo
La gráfica de viajes por día se veía extraña. Esto motivó la inspección de `trips_by_day`, lo que llevó al hallazgo documentado en el Checkpoint 11A.

### Estado
El dashboard quedó funcional y conectado a datos reales. La anomalía detectada quedó localizada en la capa de datos, no en Streamlit.

---

## Checkpoint 12: limpieza temporal dinámica por mes objetivo

### Objetivo
Eliminar el acoplamiento a un filtro fijo y validar una limpieza temporal coherente con el archivo mensual procesado.

### Parámetros usados en la prueba
- `input_path`: `s3a://xideralaws-curso-aaronxideral/raw/yellow_taxi/2024/01/yellow_tripdata_2024-01.parquet`
- `target_year`: `2024`
- `target_month`: `1`
- `output_path`: `s3a://xideralaws-curso-aaronxideral/processed/yellow_taxi/2024/01/cleaned`

### Regla temporal aplicada
Después de la limpieza base, se filtró el DataFrame para conservar solo registros con `pickup_date` entre:
- `2024-01-01`
- `2024-01-31`

### Resultado validado
- `min_date`: `2024-01-01`
- `max_date`: `2024-01-31`
- `distinct_dates`: `31`
- `total_rows`: `2871948`

### Conclusión
La corrección temporal funcionó correctamente. El pipeline ya no depende de fechas atípicas del dataset y quedó listo para generalizarse a cualquier mes/año objetivo.

### Estado
Se confirmó la viabilidad de una limpieza mensual parametrizable, base clave para procesar 5 años de histórico y luego un mes nuevo sin rehacer el código.

---

## Checkpoint 13: regeneración de analytics con la salida limpia corregida

### Objetivo
Regenerar la capa analítica usando el `cleaned` ya corregido temporalmente y validar que las tablas queden coherentes para el dashboard.

### Resultado de validación sobre `trips_by_day`
- `min_date`: `2024-01-01`
- `max_date`: `2024-01-31`
- `distinct_dates`: `31`
- `rows_in_table`: `31`

### Validación de lectura final
- `kpi_general`: `1`
- `trips_by_day`: `31`
- `trips_by_hour`: `24`
- `payment_type_distribution`: `5`
- `top_pickup_zones`: `10`

### Conclusión
La capa analítica quedó consistente con enero de 2024. Esto corrige la anomalía del eje temporal en el dashboard y confirma que el flujo:

`raw -> cleaned -> analytics -> Streamlit`

funciona correctamente con datos mensuales bien filtrados.

### Estado
El proyecto ya cuenta con:
- limpieza real validada,
- analytics corregidos,
- dashboard funcional conectado a datos consistentes.

El siguiente paso lógico es generalizar la limpieza y la generación analítica para múltiples meses del histórico (5 años) y luego conectar la automatización con Lambda.

## Checkpoint 15
Se convirtió la generación analítica mensual en un script reutilizable llamado `generate_yellow_analytics.py`.

### Objetivo
Evitar una lógica fija para un solo mes y generar automáticamente las tablas analíticas a partir de cualquier salida mensual limpia de Yellow Taxi.

### Parámetros del script
- `--input_path`
- `--base_output`

### Salidas generadas
- `kpi_general`
- `trips_by_day`
- `trips_by_hour`
- `payment_type_distribution`
- `top_pickup_zones`

### Validación obtenida
- `total_rows = 2871948`
- `min_date = 2024-01-01`
- `max_date = 2024-01-31`
- `distinct_dates = 31`
- `kpi_general = 1`
- `trips_by_day = 31`
- `trips_by_hour = 24`
- `payment_type_distribution = 5`
- `top_pickup_zones = 10`

### KPI validado
- `total_trips = 2871948`
- `total_revenue = 7.84865501E7`
- `avg_fare_amount = 18.48`
- `avg_trip_distance = 3.73`
- `avg_trip_duration_minutes = 15.75`

### Conclusión
La segunda pieza flexible del pipeline quedó lista. A partir de este punto ya existe un flujo reutilizable por mes para:
- limpieza (`process_yellow_month.py`)
- analytics (`generate_yellow_analytics.py`)

El siguiente paso lógico es crear un driver que recorra múltiples meses del histórico Yellow Taxi y ejecute ambos scripts para poblar los 5 años requeridos.


## Checkpoint 16 - Driver histórico reutilizable

### Objetivo
Crear un script orquestador para procesar varios meses de Yellow Taxi sin depender de una ejecución manual mes por mes.

### Script creado
`/home/ubuntu/run_yellow_historical.py`

### Qué hace
- Recorre un rango `start_year/start_month` a `end_year/end_month`.
- Verifica si el archivo raw ya existe en S3.
- Si no existe, lo descarga desde la fuente pública TLC.
- Ejecuta `process_yellow_month.py`.
- Ejecuta `generate_yellow_analytics.py`.

### Error encontrado
Primer intento falló con:
- `UnsupportedFileSystemException: No FileSystem for scheme "s3"`

### Causa
El driver estaba pasando rutas `s3://` a scripts PySpark. Spark en este proyecto debe usar `s3a://`.

### Corrección aplicada
Se separaron rutas:
- `s3://` para AWS CLI (`aws s3 ls`, `aws s3 cp`)
- `s3a://` para PySpark

### Prueba validada
Rango probado:
- 2024-01 a 2024-02

### Resultado enero 2024
- raw ya existía en S3
- limpieza correcta
- rango válido: `2024-01-01` a `2024-01-31`
- `distinct_dates = 31`
- `rows_before = 2964624`
- `rows_after = 2871948`
- analytics correctos:
  - `kpi_general = 1`
  - `trips_by_day = 31`
  - `trips_by_hour = 24`
  - `payment_type_distribution = 5`
  - `top_pickup_zones = 10`

### Resultado febrero 2024
- raw no existía y se descargó desde TLC
- limpieza correcta
- rango válido: `2024-02-01` a `2024-02-29`
- `distinct_dates = 29`
- `rows_before = 3007526`
- `rows_after = 2906316`
- analytics correctos:
  - `kpi_general = 1`
  - `trips_by_day = 29`
  - `trips_by_hour = 24`
  - `payment_type_distribution = 5`
  - `top_pickup_zones = 10`

### Estado al cierre del checkpoint
El pipeline ya soporta procesamiento histórico por rango de meses para Yellow Taxi.
El siguiente paso natural es decidir si:
1. se ejecuta el histórico completo de 5 años,
2. se crea una capa agregada global para el dashboard,
3. o se integra Lambda para automatizar el procesamiento del mes nuevo.


---

## Redefinición de la automatización final

### Motivo del cambio
Al investigar la parte final de Lambda → EC2, surgió la posible restricción de no modificar IAM roles o de no depender de una integración compleja con Systems Manager. Además, ya se confirmó que la EC2 se conecta con S3 usando access keys locales, no necesariamente con role de instancia.

### Decisión tomada
Se redefinió la parte final de automatización a una versión más simple:
- S3 dispara una Lambda
- La Lambda genera un archivo de control en S3
- EC2 revisa periódicamente ese control y ejecuta el procesamiento

### Nueva ruta propuesta
1. Upload del nuevo archivo a `raw/`
2. S3 activa la Lambda
3. Lambda crea `control/requests/YYYY/MM/request.json`
4. Un watcher en EC2 revisa `control/requests/` cada cierto tiempo
5. Si encuentra un request pendiente:
   - corre `process_yellow_month.py`
   - corre `generate_yellow_analytics.py`
6. El dashboard refleja el nuevo mes

### Beneficio principal
La automatización sigue existiendo, pero sin depender de permisos avanzados ni de una integración Lambda → SSM → EC2.

### Relación con el ejercicio inicial
Esta variante conserva la lógica conceptual del ejercicio de Lambdas conectado mediante S3:
- un evento genera un archivo
- otro proceso reacciona a ese archivo

### Criterio adoptado
Se consideró válido que el watcher en EC2 se ejecute con una frecuencia fija, por ejemplo cada 5 minutos, de manera similar a una tarea programada.


## Checkpoint 21 - Watcher manual en EC2

### Objetivo
Cerrar el flujo automático simplificado sin depender de SSM:
- Lambda crea `request.json`
- EC2 lo consume
- PySpark procesa
- S3 guarda resultados y el request se mueve a `done/` o `failed/`

### Archivo creado
- `/home/ubuntu/watch_requests_once.py`

### Funcionalidad implementada
- listar requests en `control/requests/`
- leer el JSON de cada request pendiente
- validar existencia del raw en S3
- ejecutar:
  - `process_yellow_month.py`
  - `generate_yellow_analytics.py`
- mover a:
  - `control/done/YYYY/MM/request_<timestamp>.json`
- o a `control/failed/...` si falla

### Limpieza previa
Se eliminó el request de prueba falso para `2026/02` porque no correspondía a un raw real.

### Request validado
Se generó un request real para:
- `raw/yellow_taxi/2025/11/yellow_tripdata_2025-11.parquet`

### Resultado del watcher
```text
=== WATCHER EC2 ===
requests encontrados: 1
...
Request procesado correctamente.
Movido a: control/done/2025/11/request_20260319T004635Z.json

=== RESUMEN WATCHER ===
success: 1
failed : 0
```

### Resultado funcional
- el request fue consumido correctamente
- se volvió a ejecutar limpieza y analytics para `2025-11`
- el request ya no quedó en `control/requests/`
- apareció correctamente en `control/done/2025/11/`

### Observación técnica
Apareció este warning:
- `DeprecationWarning: datetime.datetime.utcnow() is deprecated`

No bloqueó el procesamiento. Más adelante conviene cambiarlo por una fecha UTC aware.

### Conclusión
El flujo automático simplificado ya quedó validado de extremo a extremo:
- subida a `raw/`
- Lambda ligera crea request
- watcher en EC2 procesa el request
- PySpark actualiza `processed/` y `analytics/`
- Streamlit puede reflejar los datos nuevos

---

## Mejora documentada: futura carga de archivos desde Streamlit

### Contexto
Una vez validado el pipeline automático completo, surgió la idea de añadir una nueva funcionalidad: permitir que el usuario suba el archivo mensual directamente desde la interfaz de Streamlit, en vez de cargarlo manualmente a S3.

### Objetivo de la mejora
Agregar una interfaz de carga para que Streamlit actúe como punto de entrada de nuevos meses de datos.

### Flujo propuesto
```text
Streamlit upload -> S3/raw -> Lambda ligera -> control/requests -> watcher EC2 -> PySpark -> analytics -> dashboard
```

### Decisiones tomadas
- no reemplazar el pipeline existente
- reutilizar el mismo flujo ya validado a partir de `raw/`
- mantener a Lambda como componente ligero y no como procesador pesado
- conservar a EC2 con PySpark como el motor del procesamiento

### Reglas identificadas para esta mejora
Antes de subir un archivo desde Streamlit, la aplicación debería validar:
- extensión `.parquet`
- nombre esperado: `yellow_tripdata_YYYY-MM.parquet`
- ruta final: `raw/yellow_taxi/YYYY/MM/`
- posible existencia previa del mismo mes para evitar duplicados

### Estrategia para duplicados
Se identificaron dos políticas posibles:
1. **bloquear duplicados** si ya existe el mes en `raw/` o `analytics/`
2. **permitir reproceso** si se quiere sobrescribir un mes existente de forma intencional

### Conclusión técnica
Sí es posible integrar esta funcionalidad sin rediseñar la arquitectura. La opción más simple sería usar `st.file_uploader` en Streamlit y subir el archivo con `boto3` hacia S3, manteniendo igual el resto del pipeline.

### Estado
Esta funcionalidad quedó documentada como **mejora futura / extensión del MVP**. No fue necesaria para completar la validación del pipeline principal, pero sí quedó identificada como una ampliación viable del proyecto.

