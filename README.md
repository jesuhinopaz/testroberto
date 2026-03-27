# Virginia Contractor Class A / B Exam Simulator

## Qué es
Versión simplificada y rápida, solo enfocada en preguntas del examen de negocios de contratista de Virginia para **Class A** y **Class B**.

## Archivos principales
- `index.html` → la página principal
- `styles.css` → todo el estilo oscuro fijo
- `app.js` → lógica del simulador, temporizador y aleatorización
- `data/question-bank.json` → **aquí están las preguntas**

## Dónde aumentar preguntas
Edita este archivo:

`data/question-bank.json`

Dentro verás la propiedad:

`questions`

Cada pregunta sigue esta estructura:

```json
{
  "id": "S1-01-1",
  "section": 1,
  "category": "Regulation of Contractors",
  "topicEn": "Contractor licensing",
  "topicEs": "La licencia de contratistas",
  "difficulty": "easy",
  "source": "DPOR / Board for Contractors",
  "questionEn": "Which statement is most accurate about contractor licensing?",
  "questionEs": "¿Cuál afirmación es más precisa sobre la licencia de contratistas?",
  "options": [
    { "key": "A", "textEn": "...", "textEs": "..." },
    { "key": "B", "textEn": "...", "textEs": "..." },
    { "key": "C", "textEn": "...", "textEs": "..." },
    { "key": "D", "textEn": "...", "textEs": "..." }
  ],
  "correctKey": "C",
  "explanationEn": "Why it is correct...",
  "explanationEs": "Por qué es correcta..."
}
```

## Reglas importantes al agregar preguntas
- `section`:
  - `1` = Parte 1 Virginia
  - `2` = Parte 2 General
  - `3` = Parte 3 Advanced
- `correctKey` debe coincidir con una de las opciones.
- Mantén siempre 4 opciones por pregunta para que el simulador se vea uniforme.
- Puedes duplicar una pregunta existente y editarla.

## Cómo subirlo a tu web
Sube toda la carpeta tal como está a tu hosting o repositorio GitHub Pages.

## Nota
Las preguntas de este banco son **originales de práctica** y editables. No son una copia literal del examen oficial ni de libros protegidos.
