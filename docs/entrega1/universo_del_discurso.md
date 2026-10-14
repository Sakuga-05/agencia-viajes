# Universo del discurso: agencia de viajes

Primera parte del documento de análisis de la Entrega 1. Describe en lenguaje del negocio la organización, la información que maneja y las reglas que la gobiernan. De este texto se derivan las 20 entidades del modelo de datos (ver `modelo_nosql.md`).

## 1. La agencia

Una agencia de viajes colombiana diseña y vende paquetes turísticos a destinos nacionales e internacionales. Para armar sus paquetes trabaja con hoteles y con proveedores de transporte y servicios turísticos, como aerolíneas, empresas de transporte terrestre y operadores turísticos. La venta la hacen agentes de viajes, que atienden a los clientes y registran sus reservas.

Además de vender, la agencia asesora. Sus clientes llegan con preguntas como "¿qué destinos son buenos para ecoturismo?" o "¿cómo me muevo entre Cartagena y Santa Marta?". La respuesta suele estar repartida en guías de viaje extensas, escritas en varios idiomas, y en colecciones de fotografías. Buscar esa información a mano es lento y depende de la experiencia de cada agente.

Por eso la agencia quiere un sistema que reúna su información en una sola base de datos y que incluya un asistente capaz de responder preguntas en lenguaje natural a partir de sus guías. El asistente usa la técnica RAG (generación aumentada por recuperación): primero recupera los pasajes de las guías más relacionados con la pregunta, y después un modelo de lenguaje redacta la respuesta usando solo esos pasajes.

## 2. Destinos y guías de viaje

Un destino es un lugar que la agencia ofrece o sobre el que tiene información, por ejemplo Cartagena o Santa Marta. De cada destino se registra su nombre, una descripción breve y su ubicación, es decir, el país y la región a los que pertenece.

Sobre cada destino existen guías de viaje: textos largos que explican qué ver, cómo llegar, cómo moverse, dónde comer y qué precauciones tomar. Cada guía trata sobre un solo destino, pero un destino puede tener varias guías, por ejemplo una en español y otra en inglés. De cada guía se registra su título, el idioma en que está escrita, la fecha de su última actualización, el texto completo y la fuente de donde se obtuvo, con su nombre, su dirección web y su licencia de uso. También se registra una lista corta de etiquetas que resumen sus temas, como "playa", "historia" o "ecoturismo".

El personal de la agencia incorpora las guías desde fuentes de información de libre uso y las actualiza cuando cambian. Las guías son la base de conocimiento del asistente; la base inicial tendrá al menos 100 guías.

## 3. Imágenes

Las guías se acompañan de fotografías de sus destinos. Los archivos de las imágenes se guardan fuera de la base de datos y se accede a ellos por una dirección web. De cada imagen se registra esa dirección, la de una versión en miniatura, un pie de foto que describe lo que muestra, su autor y su licencia. Una guía puede tener varias imágenes, y una misma imagen puede aparecer en varias guías, por ejemplo en la versión en español y en la versión en inglés de la guía de un mismo destino. La base inicial tendrá al menos 50 imágenes.

Para encontrar fotos parecidas, el sistema calcula para cada imagen una representación numérica de su contenido visual, llamada vector o *embedding*, y registra con qué modelo la calculó y en qué fecha. Gracias a ella, un cliente puede subir una foto, por ejemplo de una calle de arquitectura colonial, y recibir imágenes y destinos similares. También puede describir con palabras lo que busca y recibir las imágenes que mejor coincidan.

## 4. Fragmentos de las guías

Una guía completa es demasiado larga para entregársela entera al modelo de lenguaje, y casi nunca es relevante toda para una misma pregunta. Por eso el sistema divide cada guía en fragmentos (*chunks*) y calcula para cada fragmento un vector que representa su significado. Cuando llega una pregunta, el sistema calcula el vector de la pregunta y busca los fragmentos con vectores más parecidos.

Hay varias formas de dividir un texto: en trozos de un número fijo de tokens con un pequeño solapamiento entre ellos, respetando los límites de las oraciones, o agrupando las oraciones que hablan del mismo tema. Cada una de estas formas es una estrategia de fragmentación. La agencia quiere saber cuál produce mejores respuestas con sus guías, así que cada guía se divide una vez con cada estrategia y todos los resultados conviven en la misma base de datos para poder compararlos.

De cada fragmento se registra la guía de la que proviene, su posición dentro de ella, la estrategia que lo produjo, su texto, su vector, el modelo con que se calculó el vector y la fecha en que se procesó. Además, cada fragmento conserva el idioma, la fecha y las etiquetas de su guía, porque las búsquedas suelen filtrar por esos datos, como en "guías en inglés sobre playas actualizadas en 2024".

## 5. Hoteles y proveedores

La agencia trabaja con hoteles ubicados en sus destinos. De cada hotel registra su nombre, su categoría en estrellas, su dirección y el destino donde se encuentra. Cada hotel ofrece pocos tipos de habitación, como sencilla, doble o familiar, y de cada tipo se conoce su capacidad y su precio por noche.

Los proveedores prestan el transporte y otros servicios incluidos en los paquetes: aerolíneas, empresas de transporte terrestre y operadores turísticos. De cada proveedor se registra su nombre, su tipo y sus datos de contacto (correo electrónico y teléfono). Un mismo proveedor puede participar en muchos paquetes.

## 6. Paquetes turísticos

Un paquete turístico es un producto que la agencia vende a un precio por persona. De cada paquete se registra su nombre, una descripción, su duración en días, su precio y los cupos disponibles. Un paquete incluye uno o varios destinos y uno o varios hoteles, y un mismo destino u hotel puede formar parte de muchos paquetes.

Cada paquete tiene un itinerario organizado por días. Para cada día se indica su número, un título y las actividades programadas, cada una con su nombre, su hora y una descripción. El paquete también detalla sus tramos de transporte: el tipo de transporte (aéreo, terrestre o marítimo), el lugar de salida, el lugar de llegada y el proveedor que presta el servicio.

## 7. Clientes y agentes

Los clientes se registran como usuarios del sistema. De cada usuario se guarda su nombre, su correo electrónico, su idioma preferido y la fecha de registro. Los usuarios pueden hacer búsquedas y preguntas al asistente, y el sistema conserva sus 50 consultas más recientes con el texto de cada consulta, si fue una búsqueda o una pregunta al asistente, y la fecha en que se hizo.

Los agentes de viajes son empleados de la agencia. De cada uno se registra su nombre, su correo electrónico, un código interno y la sede donde trabaja. La agencia tiene pocos agentes, y cada uno gestiona muchas reservas.

## 8. Reservas, pasajeros y pagos

Cuando un cliente decide comprar, un agente registra la reserva. Cada reserva corresponde a un usuario, a un paquete y a un agente. De ella se registra la fecha en que se hizo, la fecha del viaje, su estado (pendiente, confirmada o cancelada) y su valor total. La reserva guarda también el nombre y el precio que tenía el paquete en ese momento: si más adelante la agencia cambia el precio del paquete, el valor pactado en la reserva se mantiene.

Una reserva incluye uno o varios pasajeros, que no tienen que ser usuarios registrados. De cada pasajero se registra su nombre, su documento de identidad y su fecha de nacimiento, tal como se informaron al reservar. El cliente puede pagar en una o varias cuotas, y de cada pago se registra la fecha, el monto y el método (tarjeta, transferencia o efectivo). El sistema registra los pagos, pero no los procesa: el cobro se hace por fuera del sistema.

## 9. Reseñas

Los usuarios pueden dejar reseñas sobre los destinos. Cada reseña tiene una calificación de 1 a 5, un comentario y la fecha en que se escribió. Un destino puede acumular un número ilimitado de reseñas, y la agencia quiere saber cuáles son sus destinos mejor calificados.

## 10. Consultas que debe resolver el sistema

El sistema debe atender cuatro tipos de consulta:

- **Búsqueda por significado:** encontrar información relacionada con una pregunta aunque no use las mismas palabras que las guías. Ejemplo: "¿Qué destinos son buenos para ecoturismo?".
- **Búsqueda con filtros:** combinar la búsqueda por significado con condiciones sobre el idioma, la fecha o las etiquetas. Ejemplo: "Guías en inglés sobre destinos de playa actualizadas en 2024".
- **Búsqueda por imagen:** a partir de una foto o de una descripción, encontrar imágenes y destinos parecidos. Ejemplo: "Destinos similares a esta foto de arquitectura colonial".
- **Preguntas complejas al asistente:** respuestas redactadas a partir de varias guías. Ejemplo: "Compara las opciones de transporte entre Cartagena y Santa Marta según las guías".

Las respuestas del asistente deben basarse en los fragmentos recuperados e indicar de qué guías provienen. Para elegir la estrategia de fragmentación, el equipo ejecutará las mismas preguntas con cada estrategia y comparará los fragmentos que recupera cada una.

Además de estas consultas, la agencia necesita reportes de gestión, como las ventas por agente y los destinos mejor calificados.

## 11. Reglas del negocio

**Destinos, guías e imágenes**

- **RN-01.** Cada guía trata sobre un único destino; un destino puede tener varias guías.
- **RN-02.** Cada guía está escrita en un solo idioma y registra la fecha de su última actualización.
- **RN-03.** Una guía puede tener varias imágenes y una imagen puede aparecer en varias guías.
- **RN-04.** Los archivos de imagen no se guardan en la base de datos; solo su dirección, sus datos descriptivos y su vector.

**Fragmentos y asistente**

- **RN-05.** Cada fragmento pertenece a una sola guía y fue producido por una sola estrategia de fragmentación.
- **RN-06.** Los fragmentos de una misma guía y una misma estrategia se numeran según su posición en el texto y, juntos, cubren la guía completa.
- **RN-07.** Un fragmento conserva el idioma, la fecha y las etiquetas de su guía. Si la guía cambia, sus fragmentos se regeneran.
- **RN-08.** Todos los fragmentos se vectorizan con el mismo modelo de texto, para que sus vectores se puedan comparar con el de la pregunta.
- **RN-09.** Las respuestas del asistente se construyen solo con información recuperada de las guías.

**Hoteles, proveedores y paquetes**

- **RN-10.** Cada hotel está en un único destino.
- **RN-11.** Un paquete incluye al menos un destino; un destino o un hotel puede estar en muchos paquetes.
- **RN-12.** El itinerario de un paquete tiene un día por cada día de duración.
- **RN-13.** Cada tramo de transporte de un paquete lo presta un único proveedor.

**Usuarios, agentes y reservas**

- **RN-14.** El correo electrónico de cada usuario y el código de cada agente son únicos.
- **RN-15.** El sistema conserva solo las 50 consultas más recientes de cada usuario.
- **RN-16.** Cada reserva pertenece a un único usuario, un único paquete y un único agente.
- **RN-17.** Una reserva tiene al menos un pasajero, y no puede incluir más pasajeros que los cupos disponibles del paquete.
- **RN-18.** El precio pactado en una reserva no cambia aunque cambie el precio del paquete.
- **RN-19.** El valor total de una reserva es el precio pactado por persona multiplicado por el número de pasajeros.
- **RN-20.** La suma de los pagos de una reserva no puede superar su valor total.
- **RN-21.** El estado de una reserva solo puede ser pendiente, confirmada o cancelada.

**Reseñas**

- **RN-22.** Cada reseña la escribe un único usuario sobre un único destino, con una calificación entera de 1 a 5.

## 12. Glosario

| Término | Significado |
|---|---|
| Agente | Empleado de la agencia que registra y gestiona reservas. |
| Chunk o fragmento | Porción de una guía que se vectoriza y se recupera de forma independiente. |
| Embedding o vector | Lista de números que representa el significado de un texto o el contenido de una imagen. Textos o imágenes parecidos tienen vectores cercanos. |
| Estrategia de fragmentación | Regla para dividir una guía en fragmentos: por tamaño fijo, por oraciones o por tema. |
| Guía de viaje | Texto largo sobre un destino. Es el documento base del asistente. |
| Modelo de lenguaje (LLM) | Programa que redacta la respuesta a partir de la pregunta y de los fragmentos recuperados. |
| Paquete turístico | Producto que combina destinos, hoteles, transporte e itinerario por un precio por persona. |
| Precio pactado | Precio del paquete en el momento en que se hizo la reserva. |
| RAG | Técnica que primero recupera información relevante de una base de datos y después se la entrega a un modelo de lenguaje para que genere la respuesta. |
| Token | Unidad en que un modelo de lenguaje divide el texto; suele ser una palabra o una parte de ella. |

## 13. De dónde salen las 20 entidades

| # | Entidad | Sección donde aparece | Tipo en el modelo |
|---|---|---|---|
| 1 | Destino | 2 | Referenciada |
| 2 | País/Región | 2 | Embebida en Destino |
| 3 | Guía | 2 | Híbrida |
| 4 | Etiquetas | 2 | Embebida en Guía |
| 5 | Imagen | 3 | Referenciada |
| 6 | Chunk | 4 | Híbrida |
| 7 | Hotel | 5 | Referenciada |
| 8 | Habitación | 5 | Embebida en Hotel |
| 9 | Proveedor | 5 | Referenciada |
| 10 | Paquete | 6 | Híbrida |
| 11 | Itinerario | 6 | Embebida en Paquete |
| 12 | Actividad | 6 | Embebida en Itinerario |
| 13 | Transporte | 6 | Embebida en Paquete |
| 14 | Usuario | 7 | Referenciada |
| 15 | Historial de consultas | 7 | Embebida en Usuario |
| 16 | Agente | 7 | Referenciada |
| 17 | Reserva | 8 | Híbrida |
| 18 | Pasajero | 8 | Embebida en Reserva |
| 19 | Pago | 8 | Embebida en Reserva |
| 20 | Reseña | 9 | Referenciada |

## 14. Supuestos por validar con el equipo

Estos puntos no salen del enunciado ni de las decisiones ya tomadas. Se agregaron para que el texto quede completo y deben confirmarse:

1. La agencia es colombiana y sus precios están en pesos colombianos.
2. El precio del paquete es por persona y el total de la reserva se calcula con el número de pasajeros (RN-19).
3. Los estados de una reserva son pendiente, confirmada y cancelada (RN-21).
4. Los pasajeros no tienen que ser usuarios registrados.
5. Una reserva no puede tener más pasajeros que los cupos disponibles del paquete (RN-17).
6. El sistema registra los pagos, pero no los procesa.
7. Las guías están en al menos dos idiomas, como español e inglés. Esto depende de la decisión pendiente sobre el dataset.
8. Las respuestas del asistente indican de qué guías provienen.
9. Valores de ejemplo para los campos con opciones cerradas: tipos de proveedor (aerolínea, transporte terrestre, operador turístico), tipos de transporte (aéreo, terrestre, marítimo) y métodos de pago (tarjeta, transferencia, efectivo).

El texto no nombra la fuente concreta de las guías ni el número de estrategias de fragmentación, porque son decisiones pendientes.
