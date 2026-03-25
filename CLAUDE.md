# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Клиентское React-приложение для визуализации интерьеров с помощью AI. Пользователь загружает фото помещения с предчистовой отделкой и одно или несколько фото мебели, выбирает стиль, и приложение через Polza AI API генерирует реалистичное изображение мебели в интерьере. Поддерживаются любые помещения (кухня, ванная, гостиная и т.д.). Интерфейс на русском языке.

## Commands

```bash
npm run dev       # Dev-сервер с HMR (Vite)
npm run build     # Production-сборка в dist/
npm run lint      # ESLint (flat config, v9)
npm run preview   # Превью production-сборки
```

Тесты не настроены — нет ни фреймворка, ни тестовых файлов.

## Architecture

Фронтенд-only SPA без бэкенда. Вся логика в одном компоненте `src/App.jsx` (~267 строк):

- **Стек:** React 19 + Vite 8, чистый JavaScript (без TypeScript), CSS с переменными (без препроцессоров)
- **Состояние:** локальный `useState` — нет стейт-менеджера
- **API:** прямой `fetch` к `polza.ai/api/v1/media` из браузера; Bearer-токен хранится в `localStorage`
- **Компоненты:** `ImageCard` (одиночное изображение), `FurnitureList` (множественные фото мебели) и `App` — все в `src/App.jsx`
- **Стили:** `src/index.css` (глобальные CSS-переменные, тема) + `src/App.css` (стили компонентов)
- **Загрузка изображений:** поддержка URL и base64 (загрузка файла через FileReader)
- **Async-генерация:** POST-запрос с `async: true`, затем polling GET-запросами до получения результата

Массив `STYLES` (8 предустановленных стилей интерьера) определён как константа в начале `App.jsx`.

## Key Conventions

- ES Modules (`"type": "module"` в package.json)
- ESLint 9 flat config (`eslint.config.js`) — включены `react-hooks` и `react-refresh` плагины
- Без точки с запятой в JS не используется (semicolons присутствуют неявно — нет Prettier-конфига)
- Функциональные компоненты с хуками, без классовых компонентов
