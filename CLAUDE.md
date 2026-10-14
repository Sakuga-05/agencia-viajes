# Proyecto final: Sistema RAG NoSQL con MongoDB (agencia de viajes)

Este archivo resume el contexto y las decisiones ya tomadas del proyecto. La fuente de verdad de los requerimientos es el enunciado del profesor: `docs/Proyecto_Sistema_RAG_NoSQL_con_MongoDB_2026.pdf`. Si algo de este archivo contradice el PDF, manda el PDF y hay que avisarlo.

## Contexto

- Proyecto final del curso "Bases de datos no relacionales" (Universidad de Caldas), desarrollado en equipo.
- Estado actual: se está preparando la **Entrega 1 (Diseño y Configuración)**. Todavía no hay código.
- Dominio elegido: **agencia de viajes**.
- Requisito adicional del curso que no está en el PDF: el diseño debe tener **20 entidades**.
- Idioma de trabajo: español (respuestas, documentación y nombres de campos).

## Cómo trabajar en este repositorio

- Responder siempre en español y explicar las decisiones técnicas en lenguaje claro: es un proyecto académico y el equipo debe poder sustentar cada parte.
- No tomar por cuenta propia las decisiones listadas en "Decisiones pendientes": preguntar primero.
- Antes de implementar cualquier punto de "Datos del PDF por verificar", consultar la documentación oficial vigente.
- Credenciales (URI de MongoDB, API keys del LLM) solo en `.env`, nunca en el código ni en commits. Mantener un `.env.example`.
- Avanzar por entregas: no implementar lo de la Entrega 2 mientras se trabaja la Entrega 1, salvo que se pida.

## Requerimientos obligatorios del PDF

| Área | Exigencia |
|---|---|
| Infraestructura | MongoDB Atlas M0 (512 MB) o MongoDB 7.0+ local con Docker Compose |
| Modelado | Uso justificado de embedded, referenced e híbrido |
| Ingesta | Scripts en Python o Node.js que carguen desde JSON/CSV; MongoDB Schema Validation |
| Agregación | Pipelines con `$match`, `$project`, `$group`, `$lookup`; con Atlas Search, `$search` |
| Índices | Compuesto `{ fecha: 1, idioma: 1 }`; de texto en `contenido_texto`; vectorial en el campo de embeddings |
| API | Node/Express o Python/FastAPI con `POST /search` (híbrida o vectorial) y `POST /rag` |
| Pipeline RAG | Embeddings de texto, colección de embeddings, recuperación con filtros por metadatos, LLM por API gratuita, prompt con contexto recuperado |
| Chunking | Cada chunk es un documento independiente con el campo `estrategia_chunking`; experimento comparativo |
| Multimodal | Vectorizar texto e imágenes; casos texto-texto, imagen-imagen y multimodal |

### Cifras clave

- 100 documentos de texto y 50 imágenes asociadas (mínimos).
- 10 consultas de prueba para el experimento de chunking, las mismas para todas las estrategias.
- 5 consultas de demostración con evidencias.
- 5 tipos de caso de prueba: búsqueda semántica, filtros híbridos, multimodal, RAG complejo, comparativo de chunking.
- Chunking: mínimo 2 estrategias implementadas (el PDF describe 3).
  - Fixed-size: 256 tokens, overlap 32.
  - Sentence-aware: máximo 5 oraciones, overlap 1.
  - Semantic: umbral de similitud coseno entre 0.75 y 0.85.
- Nota extra (opcional): RAGAS con 20 pares (pregunta, ground_truth) y scores guardados en una colección `evaluaciones`.

### Estructura mínima del chunk (según el PDF)

`_id`, `doc_id`, `chunk_index`, `estrategia_chunking`, `chunk_texto`, `embedding` (384 dimensiones), `modelo`, `fecha_ingesta`.

## Entregas

### Entrega 1: Diseño y Configuración (en curso)

1. Documento de análisis: universo del discurso, requerimientos, justificación del modelado NoSQL, comparación embedding vs. referencing.
2. Diseño de esquema: colecciones con documentos de ejemplo (incluida la de chunks), índices planificados, reglas de schema validation.
3. Entorno: cluster configurado, scripts de inicialización, conexión verificada desde la aplicación.
4. Plan del experimento de chunking: estrategias con parámetros y las 10 consultas de prueba.

### Entrega 2: Implementación RAG Completa

5. Dataset preparado en JSON válido.
6. Sistema RAG funcional: ingesta con embeddings, API documentada, LLM integrado.
7. Demostración de 5 consultas con evidencias.
8. Experimento de chunking: resultados, cantidad y longitud promedio de chunks, conclusión.
9. Repositorio Git ordenado, README con instalación, scripts de carga.
10. Informe final: arquitectura, experimento interpretado, evaluación, lecciones aprendidas, comparación con enfoque relacional.

## Modelo de datos decidido

20 entidades repartidas en 11 colecciones (7 referenciadas puras y 4 híbridas) más 9 entidades embebidas.

### Colecciones referenciadas

| Entidad | Justificación |
|---|---|
| Destino | Lo comparten guías, hoteles, paquetes y reseñas |
| Imagen | Pesada y con su propio vector CLIP; el archivo va fuera de MongoDB (URL) y aquí solo metadatos y vector |
| Usuario | Existe por sí mismo; lo referencian reservas y reseñas |
| Hotel | Compartido por muchos paquetes |
| Proveedor | Compartido por muchos paquetes y transportes |
| Reseña | Crece sin límite; embebida inflaría el documento del destino |
| Agente | Pocos documentos referenciados desde muchas reservas |

### Colecciones híbridas (referencia más copia de datos)

| Entidad | Referencia a | Copia o embebe |
|---|---|---|
| Guía | Destino, Imagen | Nombre del destino; miniatura y pie de cada imagen. Embebe etiquetas |
| Chunk | Guía (`doc_id`) | `metadatos`: idioma, fecha y etiquetas de la guía, para filtrar dentro de la búsqueda vectorial |
| Reserva | Usuario, Paquete, Agente | Nombre y precio del paquete al momento de reservar. Embebe pasajeros y pagos |
| Paquete | Destino, Hotel, Proveedor | Nombre de cada destino y hotel. Embebe itinerario y transportes |

### Entidades embebidas

| Entidad | Dentro de | Nota |
|---|---|---|
| País/Región | Destino | Dato pequeño que siempre se lee con el destino |
| Habitación | Hotel | Pocos tipos por hotel |
| Itinerario | Paquete | Se consulta junto al paquete |
| Actividad | Itinerario | Segundo nivel de anidación |
| Historial de consultas | Usuario | Lo pide el PDF; limitar a las últimas 50 con `$push` y `$slice` |
| Pasajero | Reserva | Solo existe dentro de la reserva |
| Pago | Reserva | Pocas cuotas |
| Transporte | Paquete | Lleva `proveedor_id` como referencia |
| Etiquetas | Guía | Lista corta de palabras |

### Relaciones principales

- Destino 1:N Guía, Hotel y Reseña.
- Guía 1:N Chunk (una tanda de chunks por cada estrategia). Guía N:M Imagen.
- Paquete N:M Destino, Hotel y Proveedor.
- Usuario 1:N Reserva y Reseña. Paquete 1:N Reserva. Agente 1:N Reserva.

### Papel de la Guía

Es el "documento padre" del PDF: el texto largo sobre un destino que alimenta el RAG. Los 100 documentos mínimos son 100 guías. Contiene `contenido_texto`, `fecha` e `idioma`.

### Ejemplos de documentos

```json
{
  "_id": "ObjectId",
  "titulo": "Cartagena de Indias: guía completa",
  "idioma": "es",
  "fecha": "ISODate(2024-08-15)",
  "etiquetas": ["playa", "historia"],
  "destino": { "destino_id": "ObjectId", "nombre": "Cartagena" },
  "imagenes": [
    { "imagen_id": "ObjectId", "miniatura_url": "...", "pie": "Torre del Reloj" }
  ],
  "contenido_texto": "..."
}
```

```json
{
  "_id": "ObjectId",
  "doc_id": "ObjectId (ref a Guía)",
  "chunk_index": 3,
  "estrategia_chunking": "sentence-aware",
  "chunk_texto": "...",
  "embedding": [0.023, -0.117],
  "modelo": "all-MiniLM-L6-v2",
  "fecha_ingesta": "ISODate",
  "metadatos": { "idioma": "es", "fecha": "ISODate(2024-08-15)", "etiquetas": ["playa", "historia"] }
}
```

```json
{
  "_id": "ObjectId",
  "usuario_id": "ObjectId",
  "agente_id": "ObjectId",
  "paquete": { "paquete_id": "ObjectId", "nombre": "Caribe 5 días", "precio": 2400000 },
  "pasajeros": [ { "nombre": "Ana Ruiz", "documento": "..." } ],
  "pagos": [ { "fecha": "ISODate", "monto": 1200000, "metodo": "tarjeta" } ],
  "estado": "confirmada"
}
```

## Consideraciones de diseño que no se deben pasar por alto

1. Texto e imágenes usan vectores distintos: MiniLM da 384 dimensiones y CLIP ViT-B/32 da 512. Van en campos e índices vectoriales separados. La búsqueda texto a imagen usa el codificador de texto de CLIP.
2. Los filtros de la búsqueda híbrida (idioma, fecha) viven en la Guía y los embeddings en Chunk; por eso Chunk copia esos metadatos.
3. `estrategia_chunking` debe declararse como campo filtrable en el índice vectorial, y la API debe aceptar la estrategia como parámetro.
4. Fixed-size se mide en tokens, no en caracteres.
5. all-MiniLM-L6-v2 trunca la entrada alrededor de 256 tokens y está entrenado sobre todo en inglés. Si el dataset es en español conviene evaluar un modelo multilingüe de 384 dimensiones.
6. Las guías deben ser largas; con textos de un párrafo las estrategias de chunking producen lo mismo.
7. La "calidad percibida" del experimento necesita una escala definida (por ejemplo 1 a 5 con criterios).
8. El análisis de cantidad y longitud promedio de chunks se resuelve con un pipeline `$group` por `estrategia_chunking`.
9. `/search` debe poder recibir una imagen como entrada, o hay que añadir un endpoint.
10. Los datos copiados en las colecciones híbridas deben ser datos que casi nunca cambian, o que no deben cambiar (precio pactado). Un Atlas Trigger opcional puede mantenerlos sincronizados.
11. El informe final exige comparación con el enfoque relacional: estas 20 entidades serían unas 20 tablas más las intermedias de las relaciones N:M.

## Dataset (propuesto, pendiente de confirmar con el equipo)

- Textos: guías de destinos de Wikivoyage (largas, en varios idiomas, licencia CC BY-SA; citar la fuente en el informe).
- Imágenes: Wikimedia Commons, asociadas a cada guía.
- Los datos de negocio (usuarios, reservas, paquetes, hoteles, proveedores, agentes, reseñas) serían sintéticos.

### Casos de prueba adaptados al dominio

- Semántica: "¿Qué destinos son buenos para ecoturismo?"
- Filtros híbridos: "Guías en inglés sobre destinos de playa actualizadas en 2024"
- Multimodal: "Destinos similares a esta foto de arquitectura colonial"
- RAG complejo: "Compara las opciones de transporte entre Cartagena y Santa Marta según las guías"
- Comparativo de chunking: la misma consulta con cada estrategia, registrando los chunks recuperados.

## Decisiones pendientes

- MongoDB Atlas M0 o local con Docker.
- Lenguaje y framework: Python/FastAPI o Node/Express. Las librerías recomendadas por el PDF (sentence-transformers, CLIP, langchain, ragas) son de Python.
- Dos o tres estrategias de chunking.
- Modelo de embeddings de texto: all-MiniLM-L6-v2 o uno multilingüe.
- Proveedor y modelo del LLM gratuito.
- Si se implementan los opcionales: Atlas Triggers y RAGAS.
- Fuente definitiva del dataset.

## Preguntas abiertas para el profesor

- ¿Se exigen dos o tres estrategias de chunking? (el PDF dice ambas cosas)
- ¿Las 20 entidades pueden repartirse entre colecciones y documentos embebidos?
- ¿Los casos de prueba del PDF son literales o se adaptan al dominio?
- ¿Las 5 consultas de demostración pueden salir de las 10 del experimento?
- Fechas de entrega, pesos de la nota y puntos de RAGAS.

## Datos del PDF por verificar antes de implementar

- `knnVector` parece ser el nombre antiguo del índice; revisar el tipo de índice vectorial y la etapa `$vectorSearch` vigentes.
- Modelos disponibles hoy en Groq (el PDF menciona Llama 3.1 y Mixtral).
- El PDF menciona un nivel gratuito de OpenAI; confirmar si existe.
- RAGAS: el código del PDF es de la versión 0.1; revisar la API actual y cómo configurar un LLM juez gratuito.
- Búsqueda vectorial en MongoDB local: confirmar qué imagen Docker la soporta.
- Límite de índices de búsqueda en Atlas M0 (se necesitan al menos uno vectorial de texto y uno de imágenes).

## Próximos pasos (Entrega 1)

1. Redactar el universo del discurso y el análisis de requerimientos.
2. Escribir un documento de ejemplo y las reglas de schema validation (`$jsonSchema`) para cada una de las 11 colecciones.
3. Definir los índices: compuesto, de texto y vectoriales.
4. Configurar el entorno, los scripts de inicialización y una prueba de conexión desde la aplicación.
5. Escribir el plan del experimento de chunking con las 10 consultas de prueba.
