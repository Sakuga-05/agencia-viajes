# Modelo de datos NoSQL (agencia de viajes)

Documento de trabajo de la Entrega 1. Formaliza el modelo de 20 entidades acordado en `CLAUDE.md` y explica por qué cada entidad va embebida, referenciada o híbrida. De aquí salen dos partes de la entrega:

- Documento de análisis: justificación del modelado y comparación embedding vs. referencing.
- Diseño de esquema: base para los documentos de ejemplo, los validadores `$jsonSchema` y los índices.

## 1. Criterio de clasificación

En MongoDB, embeber o referenciar se decide para cada relación. Para clasificar las entidades usamos tres categorías:

| Categoría | Qué significa |
|---|---|
| Embebida | No tiene colección propia. Vive como subdocumento o arreglo dentro del documento de otra entidad. |
| Referenciada | Tiene colección propia y se relaciona con las demás solo por `_id`, sin copiar datos de otras colecciones. |
| Híbrida | Tiene colección propia, guarda referencias por `_id` y además copia algunos campos del documento referenciado para no hacer `$lookup` en su consulta más frecuente. Es el patrón *Extended Reference* de MongoDB. |

Que una colección referenciada contenga entidades embebidas no la vuelve híbrida. Por ejemplo, Hotel es referenciada; la que va embebida es la Habitación.

### Preguntas que se hicieron para cada entidad

1. ¿Se consulta por sí sola o siempre junto a otra?
2. ¿Cuántas hay por cada documento padre y crecen sin límite?
3. ¿La comparten varios documentos?
4. ¿Es pesada (texto largo, vectores)?
5. ¿Cambia con frecuencia?

### Reglas aplicadas

| Situación | Decisión | Ejemplo en el modelo |
|---|---|---|
| 1 a pocos, se lee con el padre y no se comparte | Embeber | Pagos dentro de la Reserva |
| 1 a muchos sin límite | Colección aparte; el hijo guarda el `_id` del padre | La Reseña guarda `destino_id` |
| N a M con un lado acotado | Arreglo de referencias en el lado acotado | El Paquete guarda la lista de sus destinos |
| Se comparte o se consulta sola | Colección propia | Destino, Imagen |
| Dato que se lee mucho y casi no cambia | Copiarlo junto a la referencia | Nombre del destino dentro de la Guía |
| Dato que no debe cambiar aunque cambie el original | Copiarlo y no sincronizarlo | Precio pactado en la Reserva |

Un documento de MongoDB no puede pasar de 16 MB. Por eso ningún arreglo embebido puede crecer sin control.

## 2. Las 20 entidades

| # | Entidad | Tipo | Dónde vive | Por qué |
|---|---|---|---|---|
| 1 | Destino | Referenciada | `destinos` | La comparten guías, hoteles, paquetes y reseñas. Embebida en cada uno se repetiría y habría que actualizar todas las copias. |
| 2 | Imagen | Referenciada | `imagenes` | Es pesada: lleva su propio vector CLIP de 512 dimensiones con un índice vectorial aparte. Se consulta sola (búsqueda imagen a imagen) y varias guías comparten la misma imagen. El archivo queda fuera de MongoDB; aquí solo van la URL, los metadatos y el vector. |
| 3 | Usuario | Referenciada | `usuarios` | Existe por sí mismo. Sus reservas y reseñas crecen con el tiempo, así que son ellas las que lo referencian. |
| 4 | Hotel | Referenciada | `hoteles` | Lo usan muchos paquetes (N:M). |
| 5 | Proveedor | Referenciada | `proveedores` | Lo usan muchos paquetes y sus transportes. |
| 6 | Reseña | Referenciada | `resenas` | Crece sin límite. Embebida, empujaría al Destino hacia el límite de 16 MB. Además se consulta paginada. |
| 7 | Agente | Referenciada | `agentes` | Pocos agentes referenciados desde muchas reservas. Embebido se repetiría en cada reserva. |
| 8 | Guía | Híbrida | `guias` | Es el documento padre del RAG. Referencia a su destino y a sus imágenes, y copia lo que muestra de ellos: el nombre del destino y la miniatura y el pie de cada imagen. Es el ejemplo de modelo híbrido que da el PDF. |
| 9 | Chunk | Híbrida | `chunks` | El PDF exige que cada chunk sea un documento independiente. Referencia a su guía (`doc_id`) y copia idioma, fecha y etiquetas, porque el filtro previo de `$vectorSearch` solo usa campos indexados de la misma colección. Filtrar después con `$lookup` y `$match` reduciría los resultados. |
| 10 | Reserva | Híbrida | `reservas` | Referencia usuario, paquete y agente. Copia nombre y precio del paquete: es el precio pactado y no debe cambiar si después cambia el paquete. |
| 11 | Paquete | Híbrida | `paquetes` | Referencia destinos, hoteles y proveedores (N:M) y copia sus nombres para mostrarse sin `$lookup`. |
| 12 | País/Región | Embebida | en Destino | Dato pequeño que se lee siempre con el destino y casi nunca cambia. |
| 13 | Habitación | Embebida | en Hotel | Pocos tipos por hotel; no se consulta sin el hotel. |
| 14 | Itinerario | Embebida | en Paquete | Un elemento por día del paquete; está acotado por la duración y siempre se lee con él. |
| 15 | Actividad | Embebida | en Itinerario | Segundo nivel de anidación; pocas por día. |
| 16 | Historial de consultas | Embebida | en Usuario | Lo pide el PDF. Se guardan solo las últimas 50 con `$push` y `$slice` (patrón *Subset*) para que no crezca sin límite. |
| 17 | Pasajero | Embebida | en Reserva | Solo existe dentro de la reserva y guarda los datos tal como estaban al reservar. |
| 18 | Pago | Embebida | en Reserva | Pocas cuotas. Al estar en el mismo documento, la reserva y sus pagos se actualizan de forma atómica sin necesidad de transacciones. |
| 19 | Transporte | Embebida | en Paquete | Tramos del paquete. Va embebido, pero guarda `proveedor_id` como referencia. |
| 20 | Etiquetas | Embebida | en Guía | Lista corta de palabras. Se filtra con un índice multikey y se copia a los chunks. |

Total: 7 referenciadas + 4 híbridas + 9 embebidas = 20 entidades en 11 colecciones.

## 3. Correspondencia con el PDF

| El PDF pide | En nuestro modelo |
|---|---|
| Embedded: metadatos pequeños | País/Región en Destino; Etiquetas en Guía |
| Embedded: historial de consultas del usuario | Historial de consultas en Usuario |
| Referenced: imágenes grandes | Imagen |
| Referenced: documentos compartidos entre usuarios | Destino, Hotel y Proveedor |
| Híbrido: documento principal con referencias a imágenes y metadatos embebidos | Guía |
| Sección 5.3: cada chunk es un documento independiente con `estrategia_chunking` | Chunk |

## 4. Estructura de cada colección

Convenciones:

- `→ coleccion`: referencia por `_id`.
- `*`: campo copiado de otra colección.
- `[ ]`: arreglo.
- `«Entidad»`: entidad embebida.

Solo se muestran los campos necesarios para entender el modelo. Los tipos, los campos obligatorios y los validadores van en el diseño de esquema.

### Referenciadas

```
destinos
├─ _id
├─ nombre, descripcion
└─ ubicacion { pais, region }                     «País/Región»
```

```
imagenes
├─ _id
├─ url, miniatura_url                             el archivo está fuera de MongoDB
├─ pie, autor, licencia
├─ embedding [512]                                CLIP ViT-B/32
├─ modelo
└─ fecha_ingesta
```

```
usuarios
├─ _id
├─ nombre, email, idioma_preferido, fecha_registro
└─ historial_consultas [ máx. 50 ]                «Historial de consultas»
     └─ { texto, endpoint, fecha }
```

```
hoteles
├─ _id
├─ nombre, estrellas, direccion
├─ destino_id → destinos
└─ habitaciones [ ]                               «Habitación»
     └─ { tipo, capacidad, precio_noche }
```

```
proveedores
├─ _id
├─ nombre, tipo                                   aerolínea, transporte terrestre, operador
└─ contacto { email, telefono }
```

```
resenas
├─ _id
├─ usuario_id → usuarios
├─ destino_id → destinos
└─ calificacion (1 a 5), comentario, fecha
```

```
agentes
├─ _id
└─ nombre, email, codigo, sede
```

### Híbridas

```
guias
├─ _id
├─ titulo, idioma, fecha, contenido_texto
├─ fuente { nombre, url, licencia }
├─ destino { destino_id → destinos, nombre* }
├─ imagenes [ { imagen_id → imagenes, miniatura_url*, pie* } ]
└─ etiquetas [ string ]                           «Etiquetas»
```

```
chunks
├─ _id
├─ doc_id → guias
├─ chunk_index, estrategia_chunking, chunk_texto
├─ embedding [384], modelo, fecha_ingesta
└─ metadatos { idioma*, fecha*, etiquetas* }      copiados de la guía
```

Los ocho primeros campos son los que exige el PDF; `metadatos` es la parte híbrida.

```
paquetes
├─ _id
├─ nombre, descripcion, duracion_dias, precio, cupos
├─ destinos [ { destino_id → destinos, nombre* } ]
├─ hoteles  [ { hotel_id → hoteles, nombre* } ]
├─ itinerario [ ]                                 «Itinerario»
│    └─ { dia, titulo, actividades [ ] }
│                      └─ { nombre, hora, descripcion }   «Actividad»
└─ transportes [ ]                                «Transporte»
     └─ { tipo, desde, hasta, proveedor_id → proveedores }
```

```
reservas
├─ _id
├─ usuario_id → usuarios
├─ agente_id → agentes
├─ paquete { paquete_id → paquetes, nombre*, precio* }
├─ fecha_reserva, fecha_viaje, estado, total
├─ pasajeros [ ]                                  «Pasajero»
│    └─ { nombre, documento, fecha_nacimiento }
└─ pagos [ ]                                      «Pago»
     └─ { fecha, monto, metodo }
```

Convención propuesta: nombres de colección en plural, en español y sin tildes ni ñ (`resenas`, `guias`, `imagenes`), para evitar problemas de codificación en scripts y URIs.

## 5. Relaciones entre colecciones

| Relación | Cardinalidad | Dónde vive la referencia | Por qué ahí |
|---|---|---|---|
| Destino – Guía | 1:N | `guias.destino.destino_id` | Un destino puede tener varias guías (por ejemplo, una por idioma); la referencia va en el lado "muchos". |
| Destino – Hotel | 1:N | `hoteles.destino_id` | Igual que la anterior. |
| Destino – Reseña | 1:N sin límite | `resenas.destino_id` | Un arreglo de reseñas dentro del destino crecería sin límite. |
| Guía – Chunk | 1:N (decenas por estrategia) | `chunks.doc_id` | Cada guía produce decenas de chunks por cada estrategia. |
| Guía – Imagen | N:M | `guias.imagenes[].imagen_id` | Una guía tiene pocas imágenes (lado acotado), y la misma imagen sirve a la guía en español y a la guía en inglés de un destino. |
| Paquete – Destino | N:M | `paquetes.destinos[].destino_id` | Un paquete tiene pocos destinos. |
| Paquete – Hotel | N:M | `paquetes.hoteles[].hotel_id` | Un paquete tiene pocos hoteles. |
| Paquete – Proveedor | N:M | `paquetes.transportes[].proveedor_id` | El proveedor se asocia a cada tramo de transporte. |
| Usuario – Reserva | 1:N | `reservas.usuario_id` | Las reservas crecen con el tiempo. |
| Usuario – Reseña | 1:N | `resenas.usuario_id` | Igual que la anterior. |
| Paquete – Reserva | 1:N | `reservas.paquete.paquete_id` | Un paquete se vende muchas veces. |
| Agente – Reserva | 1:N | `reservas.agente_id` | Un agente gestiona muchas reservas. |

Las relaciones con entidades embebidas (1:1 o 1 a pocos) están en la tabla de la sección 2.

En un modelo relacional, cada relación N:M necesitaría una tabla intermedia (Guía_Imagen, Paquete_Destino, Paquete_Hotel, Guía_Etiqueta). Aquí se resuelven con arreglos. Este punto sirve para la comparación con el enfoque relacional que pide el informe final.

## 6. Consultas frecuentes que guían el diseño

| # | Consulta | Colección | ¿Necesita `$lookup`? |
|---|---|---|---|
| 1 | Recuperar los chunks más parecidos a una pregunta, filtrando por idioma, fecha y estrategia | `chunks` | No: los filtros están copiados en `metadatos` |
| 2 | Mostrar una guía con sus imágenes | `guias` | No: miniatura y pie copiados |
| 3 | Buscar imágenes parecidas a una imagen o a un texto | `imagenes` | No |
| 4 | Ver un paquete completo (itinerario, transportes, destinos, hoteles) | `paquetes` | No: nombres copiados |
| 5 | Ver las reservas de un usuario | `reservas` | No: nombre y precio del paquete copiados |
| 6 | Ver las últimas consultas de un usuario | `usuarios` | No: historial embebido |
| 7 | Ver las reseñas de un destino, paginadas | `resenas` | No: basta un índice sobre `destino_id` |
| 8 | Citar la guía de origen de los chunks que recuperó el RAG | `chunks` → `guias` | Sí, por `doc_id` (pocos documentos) |
| 9 | Reporte de ventas por agente | `reservas` → `agentes` | Sí, con `$group` y `$lookup` |
| 10 | Reporte de destinos mejor calificados | `resenas` → `destinos` | Sí, con `$group` y `$lookup` |

Las consultas 1 a 7 son las del uso diario y se resuelven sin `$lookup`. Las 8 a 10 son reportes u operaciones poco frecuentes, donde un `$lookup` es aceptable. Además cubren el uso de `$group` y `$lookup` que pide el PDF.

## 7. Datos copiados y su consistencia

| Dato copiado | En | Viene de | ¿Cambia? | Cómo se mantiene |
|---|---|---|---|---|
| `destino.nombre` | `guias` | `destinos` | Casi nunca | `updateMany` cuando cambie, o un Atlas Trigger (opcional) |
| `imagenes[].miniatura_url`, `pie` | `guias` | `imagenes` | Casi nunca | Igual que el anterior |
| `metadatos` (idioma, fecha, etiquetas) | `chunks` | `guias` | Solo si se edita la guía | Al volver a cargar la guía se regeneran sus chunks |
| `destinos[].nombre`, `hoteles[].nombre` | `paquetes` | `destinos`, `hoteles` | Casi nunca | `updateMany` o Atlas Trigger |
| `paquete.nombre`, `paquete.precio` | `reservas` | `paquetes` | El paquete sí puede cambiar | No se sincroniza a propósito: guarda lo que se pactó |

## 8. Comparación embedding vs. referencing

| Aspecto | Embeber | Referenciar |
|---|---|---|
| Lectura | Una sola consulta trae todo | Hace falta `$lookup` o una segunda consulta |
| Escritura | Atómica, porque es un solo documento | Cambiar varios documentos de forma atómica requiere una transacción |
| Duplicación | Puede repetir datos | Cada dato está en un solo lugar |
| Crecimiento | Limitado por los 16 MB; solo sirve para arreglos acotados | Sin límite |
| Acceso independiente | Hay que entrar por el documento padre | Se consulta directamente |
| Actualizar un dato compartido | Hay que actualizar cada copia | Se actualiza una sola vez |
| Índices | Sobre campos del padre (multikey en arreglos) | Cada colección tiene sus propios índices |
| Cuándo usarlo | 1 a pocos, se lee con el padre y no se comparte | 1 a muchos sin límite, compartido, pesado o consultado solo |
| Ejemplo en el modelo | Pagos y pasajeros dentro de la reserva | Reseñas de un destino; imágenes |

El modelo híbrido combina ambos. La referencia mantiene una sola fuente de verdad, y la copia de los pocos campos que siempre se leen evita el `$lookup` en la consulta frecuente. El costo es mantener esas copias; por eso solo se copian datos estables o que no deben cambiar.

## 9. Puntos abiertos

### Propuestas por confirmar

Estas propuestas no están incluidas en las estructuras de la sección 4.

1. `imagenes.destino_id`: en la búsqueda imagen a imagen el resultado es una imagen, y hay que saber de qué destino es. Sin este campo se resuelve con un `$lookup` a `guias` por `imagenes.imagen_id`.
2. `chunks.metadatos.destino_id`: permitiría filtrar por destino dentro de `$vectorSearch`. Sería útil en el caso de prueba "Compara las opciones de transporte entre Cartagena y Santa Marta".
3. `destinos.calificacion_promedio` y `destinos.total_resenas` (patrón *Computed*): evitan recalcular el promedio en cada consulta. Se mantendrían con el Atlas Trigger opcional del PDF, lo que de paso le daría uso a ese punto.

### Riesgos para la sustentación

- **Entidades débiles.** Etiquetas y País/Región son las entidades más fáciles de cuestionar dentro de las 20, porque son datos pequeños sin identidad propia. Defensa: en un modelo relacional serían tablas (Etiqueta con su tabla intermedia Guía_Etiqueta, y País con relación 1:N a Destino); en MongoDB se embeben porque son pequeñas, se leen siempre con su padre y casi no cambian. Si el profesor no las acepta, hay reemplazos posibles: Amenidad (en Hotel) o Política de cancelación (en Paquete).
- **RAGAS (opcional).** El ejemplo del PDF guarda `id_consulta: ObjectId` en la colección `evaluaciones`, pero en este modelo las consultas viven embebidas en Usuario. Si se hace RAGAS, hay que decidir a qué apunta ese id.
