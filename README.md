# Banco mega bilingüe para Virginia Contractor Class A / Class B

## Qué incluye
- `data/question-bank.json` → archivo principal para usar directamente en tu web
- `data/question-bank.csv` → versión editable en Excel o CSV editor

## Tamaño del banco
- Total de preguntas: **950**
- Parte 1 Virginia: **180**
- Parte 2 General: **487**
- Parte 3 Advanced: **283**

## Dónde editar
El archivo que debes ampliar en el futuro es:

`data/question-bank.json`

Si tu app ya lee `data/question-bank.json`, puedes reemplazar el archivo viejo por este.

## Estructura de cada pregunta
Cada pregunta tiene estas claves:
- `id`
- `section`
- `category`
- `topicEn`
- `topicEs`
- `difficulty`
- `source`
- `questionEn`
- `questionEs`
- `options`
- `correctKey`
- `explanationEn`
- `explanationEs`

## Reglas para agregar más preguntas
1. Mantén exactamente **4 opciones**.
2. Las opciones deben usar las claves `A`, `B`, `C`, `D`.
3. `correctKey` debe apuntar a una de esas cuatro letras.
4. `section` debe ser:
   - `1` para Virginia
   - `2` para General
   - `3` para Advanced
5. Escribe siempre:
   - pregunta en inglés
   - pregunta en español
   - explicación en inglés
   - explicación en español

## Ejemplo mínimo
```json
{
  "id": "Q2-0951",
  "section": 2,
  "category": "Estimating and Bidding",
  "topicEn": "Allowances",
  "topicEs": "las partidas allowance",
  "difficulty": "medium",
  "source": "Original practice",
  "questionEn": "Which statement is most accurate about allowances?",
  "questionEs": "¿Qué afirmación es más precisa sobre las partidas allowance?",
  "options": [
    {"key": "A", "textEn": "Correct answer in English", "textEs": "Respuesta correcta en español"},
    {"key": "B", "textEn": "Wrong answer 1", "textEs": "Respuesta incorrecta 1"},
    {"key": "C", "textEn": "Wrong answer 2", "textEs": "Respuesta incorrecta 2"},
    {"key": "D", "textEn": "Wrong answer 3", "textEs": "Respuesta incorrecta 3"}
  ],
  "correctKey": "A",
  "explanationEn": "Explain why A is correct.",
  "explanationEs": "Explica por qué A es correcta."
}
```

## Nota importante
Este banco es **original** y está hecho para estudio realista. No es una copia textual de preguntas oficiales ni de libros con copyright.
