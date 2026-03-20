# Proyecto Final — NYC Taxi Pipeline en AWS

## 1. Objetivo del proyecto
Construir un mini pipeline ETL en AWS usando datos de taxis de NYC para:
- recibir datos crudos en S3,
- procesarlos automáticamente,
- generar datos analíticos,
- y visualizarlos en un dashboard hecho con Streamlit.

La idea no es hacer un sistema de big data complejo, sino un flujo simple, entendible y funcional que demuestre el uso de las tecnologías vistas en el curso.

---

## 2. Dataset base
Se trabajará con el dataset oficial de NYC TLC Trip Record Data.

En principio, el proyecto se enfocará en **Yellow Taxi**.

Características importantes del dataset:
- se publica por mes,
- está en formato Parquet,
- contiene campos de tiempo, distancia, tarifa, zonas de origen/destino, tipo de pago y número de pasajeros,
- puede manejar grandes volúmenes de datos, por lo que conviene procesarlo con PySpark y no directamente en Streamlit.

---

## 3. Alcance recomendado del MVP
Para evitar complejidad innecesaria, el alcance inicial del proyecto será:
- 1 tipo de taxi: Yellow Taxi,
- 1 mes para la primera prueba,
- automatización desde S3,
- 1 Lambda orquestadora,
- procesamiento principal en EC2 con PySpark,
- dashboard sencillo en Streamlit,
- pocas métricas, pero bien explicadas.

Más adelante, el diseño podrá escalar a varios meses o varios años de histórico.

---

## 4. Arquitectura general
Flujo general del proyecto:

```text
S3/raw/  ->  Lambda  ->  EC2 (PySpark)  ->  S3/processed/ y S3/analytics/  ->  Streamlit
```

### Interpretación de cada bloque
- **S3/raw/**: recibe el archivo crudo.
- **Lambda**: detecta la llegada del archivo y orquesta el proceso.
- **EC2 con PySpark**: realiza la limpieza y la transformación.
- **S3/processed/**: almacena datos limpios.
- **S3/analytics/**: almacena tablas agregadas listas para el dashboard.
- **Streamlit**: consume los archivos analíticos y muestra el dashboard.

---

## 5. Ruta exacta del flujo
1. Se sube un archivo crudo a una ruta tipo:
   `s3://bucket/raw/yellow_taxi/2024/01/yellow_tripdata_2024-01.parquet`

2. S3 detecta el nuevo archivo mediante una notificación de evento:
   - evento: `ObjectCreated`
   - prefijo: `raw/`

3. S3 dispara una **Lambda orquestadora**.

4. La Lambda:
   - lee el `bucket` y la `key` del evento,
   - valida el archivo,
   - envía la orden a EC2 para ejecutar el procesamiento.

5. En EC2 se ejecuta un script de **PySpark** con una instrucción tipo:
   `spark-submit process_taxi.py --input ... --output ...`

6. PySpark:
   - lee el archivo de `raw/`,
   - limpia y transforma,
   - genera datos limpios y tablas analíticas.

7. PySpark guarda las salidas en rutas como:
   - `processed/yellow_taxi/...`
   - `analytics/yellow_taxi/...`

8. Streamlit lee los archivos analíticos finales y muestra el dashboard.

---

## 6. Conexiones entre componentes
### S3 -> Lambda
La conexión ocurre por una **notificación de evento** en el bucket S3.

Cuando se sube un archivo a `raw/`, S3 dispara automáticamente la Lambda.

### Lambda -> EC2
La Lambda no hace el procesamiento pesado. Su rol es **orquestar**.

La forma recomendada es que la Lambda mande una orden a la EC2 usando **AWS Systems Manager Run Command** o un mecanismo equivalente para arrancar el script PySpark.

### EC2 -> S3
La EC2 se conecta a S3 para:
- leer los datos crudos,
- escribir los datos procesados,
- escribir las tablas analíticas.

### Streamlit -> S3
Streamlit debe leer **los archivos analíticos finales**, no la data cruda.

---

## 7. Tecnologías seleccionadas y rol de cada una
### S3
- almacenamiento de archivos crudos,
- almacenamiento de salidas limpias,
- almacenamiento de salidas analíticas.

### Lambda
- detectar la llegada de nuevos archivos,
- arrancar la automatización del pipeline,
- realizar validaciones ligeras.

### EC2
- ambiente de ejecución del procesamiento,
- instalación de PySpark,
- posible alojamiento del dashboard en Streamlit.

### PySpark
- limpieza de datos,
- transformación,
- agregación,
- preparación de tablas analíticas.

### Jupyter Notebook
- exploración inicial del dataset,
- pruebas de columnas,
- validación de métricas.

### Streamlit
- visualización del dashboard,
- lectura de archivos analíticos,
- filtros simples por tiempo o categoría.

---

## 8. Decisiones importantes tomadas
1. **La transformación pesada no irá dentro de Lambda**.
   Lambda solo orquesta.

2. **PySpark será el motor principal del ETL**.

3. **Streamlit no leerá la data cruda completa**.
   Solo leerá tablas analíticas ya resumidas.

4. **La salida principal para el dashboard será Parquet**.
   El JSON será solo un apoyo opcional.

5. **El proyecto debe ser automático**, pero con una arquitectura realista para el tiempo disponible.

6. **Se empezará con un MVP pequeño** y después se podrá ampliar.

---

## 9. Estructura recomendada del bucket S3
```text
s3://bucket/
│
├── raw/
│   └── yellow_taxi/...
│
├── processed/
│   └── yellow_taxi/...
│
├── analytics/
│   └── yellow_taxi/...
│
└── latest/
    └── latest_month.json
```

### Significado de cada carpeta
- **raw/**: archivo original sin tocar.
- **processed/**: datos limpios.
- **analytics/**: tablas agregadas listas para dashboard.
- **latest/**: JSON opcional con información técnica o de control.

---

## 10. Métricas recomendadas para el dashboard
### KPIs principales
- Total de viajes
- Ingreso total
- Tarifa promedio
- Distancia promedio

### Gráficas recomendadas
- Viajes por día
- Viajes por hora
- Top 10 zonas de pickup
- Distribución por tipo de pago

### Métricas temporales recomendadas
- viajes diarios,
- viajes por hora,
- viajes por día de la semana,
- comparación por mes o por año.

La métrica de tiempo sí es relevante y aporta valor al análisis.

---

## 11. Diseño de la salida analítica
Para que Streamlit sea flexible y el dashboard pueda cambiar sin rehacer todo, PySpark debe producir salidas suficientemente ricas.

### Salida principal recomendada
Archivos **Parquet** con tablas como:
- `kpis.parquet`
- `trips_by_day.parquet`
- `trips_by_hour.parquet`
- `top_pickup_zones.parquet`
- `payment_distribution.parquet`

### Salida secundaria opcional
Un archivo **JSON** como:
- `latest_month.json`

Este JSON serviría para:
- registrar último archivo procesado,
- cantidad de filas procesadas,
- fecha y hora del último procesamiento,
- información técnica del pipeline.

### Decisión clave
- **Streamlit leerá principalmente Parquet**.
- **El JSON será solo apoyo opcional**, no la base del dashboard.

---

## 12. Flexibilidad del dashboard
Si el profesor pide cambiar una gráfica o añadir una métrica nueva, hay dos escenarios:

### Caso 1. La métrica ya existe en las salidas de PySpark
Solo será necesario modificar **Streamlit**.

### Caso 2. La métrica no existe en las salidas de PySpark
Será necesario modificar:
- PySpark para generar esa agregación,
- y después Streamlit para mostrarla.

Por eso se decidió que PySpark genere desde el inicio salidas con dimensión temporal y otras columnas útiles.

---

## 13. Consideraciones sobre volumen de datos
El profesor mencionó trabajar con varios años de datos, pero eso no significa que Streamlit deba procesar toda la data cruda.

La estrategia correcta será:
- guardar histórico en S3,
- procesar con PySpark,
- generar tablas agregadas,
- dejar que Streamlit filtre sobre esas tablas resumidas.

Esto permite:
- soportar varios años de información,
- usar filtros por año y mes,
- evitar sobrecargar la instancia EC2 que hospeda Streamlit.

---

## 14. Script PySpark de limpieza — alcance documentado
Sí se puede construir un **script PySpark de limpieza base** para el proyecto.

### Propósito del script
Tomar un archivo mensual de Yellow Taxi desde `raw/`, limpiarlo y dejar una base confiable para las agregaciones analíticas y el dashboard.

### Qué hará el script
El script PySpark deberá:
- leer el archivo **Parquet** desde S3,
- seleccionar columnas importantes,
- convertir correctamente las columnas de fecha y hora,
- eliminar nulos críticos,
- eliminar registros con valores imposibles,
- derivar columnas de tiempo,
- dejar un dataset limpio listo para análisis.

### Reglas iniciales de limpieza recomendadas
Las reglas de limpieza base serán simples y explicables:
- eliminar registros con `pickup_datetime` o `dropoff_datetime` nulos,
- eliminar viajes con duración negativa,
- eliminar viajes con distancia negativa,
- eliminar viajes con `total_amount` negativo,
- validar `passenger_count`,
- conservar solo columnas necesarias para las métricas del dashboard,
- derivar `year`, `month`, `day`, `hour` y `trip_duration_minutes`.

### Enfoque recomendado
La limpieza **no debe ser agresiva al principio**.
Conviene hacer una limpieza mínima, clara y fácil de justificar, para mantener el pipeline estable.

### Relación con el dashboard
Este script será la base para producir:
- datos limpios en `processed/`,
- tablas agregadas en `analytics/`,
- y suficiente granularidad para que Streamlit pueda cambiar las gráficas sin rehacer todo el proyecto.

### Decisión asociada
Se deja documentado que:
- **sí se construirá un script PySpark de limpieza**,
- estará orientado a **Yellow Taxi**,
- y servirá como etapa central del ETL.

---

## 15. Flujo del proyecto por tareas
1. Explorar el dataset en Jupyter.
2. Elegir métricas del dashboard.
3. Definir las tablas de salida analítica.
4. Crear el script PySpark.
5. Probar PySpark manualmente en EC2.
6. Construir el dashboard en Streamlit.
7. Probar el dashboard con datos ya procesados.
8. Crear la Lambda orquestadora.
9. Configurar el trigger de S3.
10. Realizar una prueba end-to-end.

---

## 16. Resumen corto del proyecto
**S3 recibe archivo -> Lambda detecta -> EC2 ejecuta PySpark -> PySpark limpia y agrega -> S3 guarda salidas -> Streamlit muestra dashboard**

---

## 17. Estado actual de la planeación
Hasta este punto, el proyecto ya tiene definidos:
- la arquitectura general,
- la ruta exacta del flujo,
- las tecnologías y su rol,
- las métricas del dashboard,
- la decisión de usar Parquet como salida principal,
- la decisión de usar un JSON solo como apoyo,
- la decisión de crear un script PySpark de limpieza,
- el orden recomendado de trabajo.


---

## 18. Decisión confirmada por el profesor
El profesor confirmó que **usar solo Yellow Taxi es válido**, siempre que:
- el pipeline esté bien implementado,
- y el análisis sea claro.

También indicó que, **si da tiempo**, se pueden incorporar datos de Green Taxi como una extensión opcional.

### Implicación para el proyecto
La versión oficial del proyecto queda enfocada en:
- **Yellow Taxi como fuente principal**,
- histórico de **5 años**,
- capacidad de incorporar **un mes adicional** sin rediseñar el pipeline,
- y posibilidad futura de extender el flujo a otros tipos de taxi.

---

## 19. Estado actual del pipeline validado manualmente
Hasta este punto ya se probó manualmente el flujo base:

`S3 raw -> PySpark en EC2 -> S3 processed -> S3 analytics -> Streamlit en EC2`

### Validaciones ya logradas
- lectura y escritura de PySpark con S3,
- carga de un archivo real de Yellow Taxi,
- limpieza base con reglas defendibles,
- corrección temporal de registros atípicos,
- generación de tablas analíticas,
- dashboard de Streamlit leyendo datos reales desde S3.

---

## 20. Hallazgo temporal importante
Durante las primeras pruebas del dashboard se detectaron fechas atípicas en `trips_by_day`, lo que deformaba la visualización temporal.

### Problema detectado
La tabla analítica contenía fechas fuera del rango esperado del archivo mensual, por ejemplo:
- `2002-12-31`
- `2009-01-01`
- `2023-12-31`
- `2024-02-01`

### Solución adoptada
La limpieza temporal se corrigió usando un rango **dinámico por mes objetivo**, validando posteriormente que para el archivo `yellow_tripdata_2024-01.parquet` se obtuviera:
- `min_date = 2024-01-01`
- `max_date = 2024-01-31`
- `distinct_dates = 31`

### Importancia
Esta corrección evita acoplar el pipeline a un parche fijo y sienta la base para reprocesar cualquier mes del histórico o un mes adicional entregado por el profesor.

---

## 21. Dirección inmediata del proyecto
Con la validación temporal ya resuelta, la siguiente fase del proyecto consiste en:
1. convertir la limpieza mensual en un script reutilizable por `year` y `month`,
2. convertir la generación analítica mensual en un script reutilizable,
3. escalar ese flujo a **5 años de histórico Yellow Taxi**,
4. y luego automatizar la llegada de un mes nuevo mediante Lambda.

## 22. Script reutilizable de analytics mensual
Ya existe una segunda pieza flexible del pipeline para generar analytics mensuales de Yellow Taxi mediante un script tipo `generate_yellow_analytics.py`.

### Propósito
Permitir que la generación de métricas y tablas analíticas no dependa de un mes fijo y pueda reutilizarse sobre cualquier salida mensual limpia.

### Parámetros esperados
- `input_path`
- `base_output`

### Salidas que genera
- `kpi_general`
- `trips_by_day`
- `trips_by_hour`
- `payment_type_distribution`
- `top_pickup_zones`

### Validación realizada
Para la salida limpia de enero 2024 se validó que:
- `trips_by_day` contiene 31 días,
- `trips_by_hour` contiene 24 horas,
- `payment_type_distribution` contiene 5 grupos,
- `top_pickup_zones` contiene 10 registros,
- y `kpi_general` contiene una sola fila resumen.

### KPI resumido validado
- `total_trips = 2871948`
- `total_revenue = 7.84865501E7`
- `avg_fare_amount = 18.48`
- `avg_trip_distance = 3.73`
- `avg_trip_duration_minutes = 15.75`

### Estado de la arquitectura flexible
Con esto, el pipeline ya cuenta con dos componentes reutilizables por mes:
1. `process_yellow_month.py` para limpieza y filtrado temporal,
2. `generate_yellow_analytics.py` para generación de analytics.

La siguiente etapa consiste en crear un driver que ejecute ambos componentes a lo largo del histórico de 5 años y que más adelante permita incorporar un mes nuevo sin reescribir la lógica principal.


## Avance nuevo: driver histórico reutilizable

Se creó un orquestador llamado `run_yellow_historical.py` que recorre un rango de meses y, para cada mes de Yellow Taxi:

1. verifica si el archivo raw ya existe en S3,
2. lo descarga desde TLC si hace falta,
3. ejecuta `process_yellow_month.py`,
4. ejecuta `generate_yellow_analytics.py`.

Con esto el pipeline ya no depende de un solo mes fijo y puede procesar histórico por rango.

### Prueba validada
Se probó exitosamente con el rango:
- 2024-01
- 2024-02

Resultados validados:
- Enero 2024: 31 días válidos y analytics generados correctamente.
- Febrero 2024: 29 días válidos y analytics generados correctamente.

Esto confirma que la arquitectura ya puede escalar de una prueba mensual a un histórico multi-mes, paso previo a cargar 5 años completos y después integrar Lambda para el mes nuevo.


## 14. Redefinición de la automatización con Lambda y watcher en EC2

Debido a la restricción o posible limitación para modificar IAM roles o usar una integración más compleja con Systems Manager, se redefinió la automatización final a una versión más simple y compatible con el laboratorio.

### Nuevo principio de arquitectura
- **Lambda no ejecuta PySpark ni controla directamente EC2.**
- **Lambda solo reacciona al evento de S3 y dispara el flujo de forma ligera.**
- **EC2 sigue siendo la máquina de procesamiento**, donde viven PySpark, los scripts reutilizables y Streamlit.
- **S3 vuelve a actuar como puente**, de forma similar al ejercicio inicial de Lambdas conectadas a través de S3.

### Flujo automático redefinido
1. Se sube un archivo nuevo a:
   - `raw/yellow_taxi/YYYY/MM/yellow_tripdata_YYYY-MM.parquet`
2. S3 detecta el `PUT` y activa la Lambda.
3. La Lambda:
   - valida que el archivo sea de `Yellow Taxi`,
   - valida que termine en `.parquet`,
   - extrae `year` y `month` desde la ruta o nombre del archivo,
   - escribe un archivo de control en S3, por ejemplo:
     - `control/requests/YYYY/MM/request.json`
4. En la EC2 corre un **watcher** ligero (por ejemplo, cada 5 minutos con cron) que revisa `control/requests/`.
5. Si encuentra un request nuevo:
   - ejecuta `process_yellow_month.py`
   - ejecuta `generate_yellow_analytics.py`
   - mueve o marca el request como `done` o `failed`
6. Streamlit vuelve a leer los analytics actualizados y el dashboard refleja el nuevo mes.

### Ventajas de esta variante
- No depende de SSM ni de cambios de IAM roles.
- Reutiliza la lógica que ya funciona en EC2.
- Mantiene la automatización pedida por el proyecto.
- Se parece conceptualmente al ejercicio inicial de Lambdas conectadas mediante S3.
- Reduce la complejidad de permisos y deja a Lambda con una responsabilidad pequeña y clara.

### Rol final de cada componente
- **S3**
  - almacena `raw/`, `processed/`, `analytics/` y `control/`
- **Lambda**
  - reacciona al upload y genera el request
- **EC2**
  - procesa el mes solicitado
- **PySpark**
  - limpia y genera analytics
- **Streamlit**
  - visualiza los resultados nuevos

### Automatización por cron en EC2
Se consideró explícitamente que el watcher en EC2 pueda ejecutarse cada 5 minutos, de forma análoga a un cronómetro o tarea programada del ejercicio inicial. Esto permite que el sistema siga siendo automático sin depender de una invocación directa Lambda → EC2.

### Idea mental final
**Lambda orquesta. S3 conecta. EC2 procesa. Streamlit visualiza.**


## 20. Watcher en EC2 validado

Se implementó un watcher manual en EC2 con una sola corrida:
- `watch_requests_once.py`

### Responsabilidad del watcher
- leer requests pendientes desde:
  - `control/requests/`
- validar que el raw exista en S3
- ejecutar:
  - `process_yellow_month.py`
  - `generate_yellow_analytics.py`
- mover el request procesado a:
  - `control/done/YYYY/MM/request_<timestamp>.json`
- o moverlo a `control/failed/` si algo falla

### Request real utilizado en la validación
Se generó un request válido para:
- `raw/yellow_taxi/2025/11/yellow_tripdata_2025-11.parquet`

### Resultado de la validación
El watcher:
- encontró `1` request pendiente
- ejecutó limpieza y analytics para `2025-11`
- escribió correctamente en `processed/` y `analytics/`
- movió el request a:
  - `control/done/2025/11/request_20260319T004635Z.json`

### Resumen reportado
- `success: 1`
- `failed: 0`

### Observación
Se detectó un warning deprecado por `datetime.utcnow()`, pero no afectó el resultado funcional del pipeline.

### Conclusión
El flujo automático ya quedó validado de punta a punta en su versión simplificada:
- S3 recibe el archivo
- Lambda crea el request
- EC2 watcher procesa
- PySpark genera analytics
- Streamlit puede mostrar los datos nuevos

---

## Mejora propuesta: carga de archivos desde Streamlit

### Objetivo
Agregar una nueva puerta de entrada para los datos, evitando la carga manual directa al bucket S3.

### Idea funcional
El usuario subiría un archivo Parquet desde la interfaz de Streamlit. La aplicación validaría el archivo y lo enviaría a la ruta correcta en `raw/` dentro de S3. A partir de ese punto, el flujo ya construido seguiría igual:

```text
Streamlit upload -> S3/raw -> Lambda ligera -> control/requests/request.json -> watcher en EC2 -> PySpark -> analytics -> Streamlit dashboard
```

### Ruta de destino esperada
Si el archivo corresponde a un nuevo mes de Yellow Taxi, debe terminar en una ruta como:

```text
raw/yellow_taxi/YYYY/MM/yellow_tripdata_YYYY-MM.parquet
```

Ejemplo:

```text
raw/yellow_taxi/2026/02/yellow_tripdata_2026-02.parquet
```

### Validaciones recomendadas antes de subir desde Streamlit
- confirmar que el archivo sea `.parquet`
- confirmar que sea de `Yellow Taxi`
- validar nombre esperado: `yellow_tripdata_YYYY-MM.parquet`
- validar que año y mes elegidos en la interfaz coincidan con el nombre del archivo
- verificar si el mes ya existe en `raw/` o en `analytics/` para evitar duplicados involuntarios

### Manejo de meses duplicados
Se recomienda validar duplicados antes de subir:
- revisar si ya existe el objeto en `raw/yellow_taxi/YYYY/MM/`
- revisar si ya existe `analytics/yellow_taxi/YYYY/MM/`
- decidir si el comportamiento será:
  - bloquear la subida si el mes ya existe, o
  - permitir reproceso intencional sobrescribiendo `processed/` y `analytics/`

### Viabilidad técnica
Esta mejora es compatible con la arquitectura actual porque:
- Streamlit ya corre en la misma EC2
- la EC2 ya tiene acceso a S3 con `boto3` y credenciales configuradas
- el trigger de S3 ya puede reaccionar al archivo recién subido
- no exige rediseñar el pipeline principal

### Opciones técnicas
#### Opción A: carga directa desde Streamlit con `boto3`
La app recibe el archivo con `st.file_uploader` y lo sube a S3 con `upload_fileobj` o `put_object`.

Ventajas:
- implementación simple
- aprovecha la infraestructura actual
- rápida de integrar

Riesgos / puntos a vigilar:
- el archivo pasa por la memoria del backend Streamlit
- puede requerir revisar el tamaño máximo soportado por Streamlit

#### Opción B: URL prefirmada de S3
Streamlit genera o solicita una URL prefirmada y el navegador sube el archivo directo a S3.

Ventajas:
- descarga carga del backend Streamlit
- más escalable

Desventaja:
- agrega complejidad innecesaria para el alcance actual del proyecto

### Recomendación
Para esta versión del proyecto, la mejora más razonable sería implementar primero la **Opción A**, porque encaja con el MVP y reutiliza exactamente el flujo automático ya validado.

### Guía operativa de uso cuando se agregue esta funcionalidad
1. el usuario selecciona año, mes y archivo Parquet en Streamlit
2. Streamlit valida nombre y tipo de archivo
3. Streamlit sube el archivo a `raw/yellow_taxi/YYYY/MM/`
4. S3 dispara la Lambda ligera
5. Lambda crea `control/requests/YYYY/MM/request.json`
6. cron en EC2 detecta el request en el siguiente ciclo
7. PySpark genera `processed/` y `analytics/`
8. el dashboard ya puede mostrar el mes nuevo

### Estado
Esta mejora quedó identificada como una **extensión natural del proyecto**, pero no fue necesaria para validar el pipeline automático principal.

