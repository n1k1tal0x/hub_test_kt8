# Notes API — отчёт по настройке CI/CD конвейера

Учебный проект: настройка простого CI/CD конвейера для автоматического запуска
интеграционных тестов при каждом изменении кодовой базы.

- **Репозиторий:** https://github.com/n1k1tal0x/hub_test_kt8
- **CI:** GitHub Actions

## 1. Цель и выбор проекта

Цель — на практике пройти полный цикл настройки простого CI/CD конвейера: от
пустого репозитория до конвейера, который автоматически запускает
интеграционные тесты при каждом изменении кода и фиксирует их результат.

В качестве проекта написана небольшая REST-служба **Notes API** — минимальный,
но реалистичный кейс, где есть смысл говорить именно об «интеграционных»
тестах, а не о чистых юнит-тестах.

Стек: `Node.js 20`, `Express 4.19`, `Jest 29`, `Supertest 7`, `jest-junit`,
`GitHub Actions`.

Сервис хранит заметки в памяти процесса и предоставляет пять эндпоинтов:
`GET /health`, `GET /notes` (с фильтром `?search=`), `GET /notes/:id`,
`POST /notes`, `PUT /notes/:id`, `DELETE /notes/:id`.

## 2. Интеграционные тесты

Тесты в [`tests/notes.integration.test.js`](tests/notes.integration.test.js)
не мокают внутренние модули — через **Supertest** они поднимают реальное
Express-приложение и отправляют настоящие HTTP-запросы, проверяя полный цикл:
маршрутизацию, валидацию, работу хранилища и сериализацию ответа. Это и
делает их интеграционными, а не юнит-тестами отдельных функций.

```js
test("full lifecycle: create -> read -> update -> delete", async () => {
  const created = await request(app).post("/notes").send({ title: "Lifecycle" });
  const id = created.body.id;

  await request(app).get(`/notes/${id}`);             // 200
  await request(app).put(`/notes/${id}`).send({...}); // 200
  await request(app).delete(`/notes/${id}`);           // 204
  await request(app).get(`/notes/${id}`);              // 404
});
```

## 3. Настройка конвейера

Конвейер описан в [`.github/workflows/ci.yml`](.github/workflows/ci.yml) и
запускается на события `push` и `pull_request` для всех веток. Каждый запуск
выполняет пять шагов:

1. **Checkout code** — получение исходного кода коммита, вызвавшего запуск
2. **Set up Node.js 20** — установка рантайма с кешированием npm-зависимостей
3. **npm ci** — чистая, воспроизводимая установка зависимостей по `package-lock.json`
4. **npm test** — запуск Jest с репортёром `jest-junit` → `test-results/junit.xml`
5. **Publish & upload report** — `dorny/test-reporter` публикует сводку в
   Actions Summary, `junit.xml` прикладывается как артефакт запуска

```yaml
on:
  push:
    branches: ["**"]
  pull_request:
    branches: ["**"]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci
      - run: npm test
      - uses: dorny/test-reporter@v1
        if: always()
        with: { path: test-results/junit.xml, reporter: jest-junit }
```

Триггер на `push`/`pull_request` по всем веткам — это и есть требование
«запускать тесты автоматически при каждом изменении кодовой базы»: коммит не
нужно ничем дополнительно запускать вручную.

## 4. Проверка: два запуска подряд

Чтобы убедиться, что конвейер действительно реагирует на изменения, в
репозиторий дважды запушен код — сначала базовая версия, затем реальное
изменение (фильтр поиска по заметкам).

| Прогон | Коммит | Тестов | Статус | Длительность |
|---|---|---|---|---|
| 1 — базовая версия | `ea4b41c` | 6 / 6 | ✅ success | 24s |
| 2 — фильтр поиска | `1913489` | 7 / 7 | ✅ success | 23s |

Второй запуск стартовал автоматически через секунды после `git push`, без
какого-либо ручного вмешательства — именно это и демонстрирует
работоспособность конвейера.

## 5. Результаты тестов

Журнал `jest-junit` из запуска 2 (CI):

```
PASS tests/notes.integration.test.js
  Notes API — integration tests
    ✓ GET /health returns ok
    ✓ GET /notes returns an empty list initially
    ✓ POST /notes creates a note and it appears in GET /notes
    ✓ POST /notes without title is rejected
    ✓ GET /notes/:id returns 404 for unknown id
    ✓ GET /notes?search filters notes by title and body
    ✓ full lifecycle: create -> read -> update -> delete

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```

GitHub Actions вывел два информационных annotation-предупреждения (о будущем
прекращении поддержки Node 20 в раннере и о миграции `ubuntu-latest` на
Ubuntu 26). Оба некритичны и не влияют на результат текущих запусков.

## 6. Выводы

- Конвейер настроен полностью декларативно одним YAML-файлом и не требует
  ручных шагов после push.
- Интеграционные тесты через Supertest дали уверенность в реальном поведении
  API, а не только во внутренней логике функций.
- `dorny/test-reporter` и `upload-artifact` фиксируют результат каждого
  прогона в самом GitHub — историю не нужно собирать вручную.
- Изменение кода (эндпоинт поиска) было подхвачено конвейером автоматически,
  что подтверждает выполнение задачи «запуск тестов при каждом изменении».

## Запуск локально

```bash
npm install
npm test
```
