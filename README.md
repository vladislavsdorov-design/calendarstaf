# NightShift Manager

Веб-приложение для ночного клуба: заявки барменов на смены, автоматическое распределение,
ручная правка и публикация расписания. Интерфейс — на польском языке.

**Стек:** React 19 + Vite + TypeScript, Firebase Auth, Cloud Firestore. Без Tailwind,
без react-router и lucide — всё своё и лёгкое.

## Быстрый старт

```bash
npm install
cp .env.example .env     # если .env ещё нет — впишите значения из Firebase
npm run dev
```

Откройте http://localhost:5173

## Скрипты
- `npm run dev` — разработка
- `npm run build` — production-сборка в `dist/`
- `npm run typecheck` — проверка типов TypeScript
- `npm run preview` — просмотр собранной версии

## Настройка Firebase
1. Authentication → Sign-in method → включить **Email/Password**.
2. Firestore Database → создать базу.
3. Firestore → Rules → вставить `firestore.rules` → Publish
   (или `firebase deploy --only firestore:rules`).
4. Индексы не нужны.

## Как назначить менеджера
1. Зарегистрируйтесь в приложении как бармен.
2. Firestore → `users` → ваш документ → поле `role`: `bartender` → `manager`.
3. Обновите страницу — появятся «Barmani» и «Ustawienia».

## Как работает
1. **Ustawienia** — сколько баров и барменов нужно в каждый день недели.
2. **Kalendarz** — менеджер открывает даты, бармены отмечают, когда могут работать
   (клик по дате или «Zgłoś się na wszystkie otwarte»).
3. **Grafik** — «Wygeneruj szkic», при необходимости ручная правка, «Opublikuj».
4. Бармены видят только опубликованные смены.

### Алгоритм
Приоритет у тех, у кого меньше смен; в пятницу/субботу — у кого меньше пятниц и суббот.
Один бармен — одно место в день. Опубликованные дни алгоритм не трогает.

## Что изменено в v2
- **Дизайн**: чёрно-белый «стеклянный» интерфейс, подсветка карточек под курсором,
  анимированный фон, плавные переходы страниц, анимированные счётчики, скользящее меню,
  нижнее меню на телефоне, свои диалоги подтверждения вместо `window.confirm`, уведомления.
- **Скорость**:
  - один `DataProvider` вместо отдельных подписок на каждой странице
    (раньше календарь открывал 5 слушателей Firestore одновременно, и они пересоздавались
    при каждом переходе) — теперь переключение страниц мгновенное;
  - офлайн-кэш Firestore (IndexedDB) — приложение открывается сразу из кэша;
  - каждая страница — отдельный чанк (lazy loading);
  - убраны Tailwind, react-router-dom и lucide-react — меньше зависимостей и размер сборки;
  - React и Firebase в отдельных кэшируемых чанках; мемоизация тяжёлых вычислений.
- **Удобство**: заявка одним кликом с индикатором, «zgłoś się na wszystkie», сортировка и
  поиск барменов, список ближайших дней на панели, сброс пароля, панель сохранения настроек.

## Структура
```
src/
  lib/            firebase.ts, dates.ts, router.tsx, utils.ts
  components/     Layout, MonthNav, DayRow, ui (иконки, кнопки, тосты, диалоги)
  features/
    auth/         AuthContext, AuthPage (вход + регистрация)
    data/         DataContext — все подписки Firestore в одном месте
    dashboard/    Panel
    calendar/     Kalendarz
    schedule/     Grafik, алгоритм, карточка дня
    bartenders/   Barmani
    settings/     Ustawienia
  styles.css      дизайн-система
firestore.rules
```
Структура Firestore и правила безопасности не менялись.
