# Сторонние библиотеки обучения v2

- Wokwi Elements 1.9.2 — MIT, Uri Shaked. [Исходники](https://github.com/wokwi/wokwi-elements).
  Полный текст: `public/licenses/wokwi-elements.txt`.
- AVR8js 0.21.1 — MIT, Uri Shaked и участники. [Исходники](https://github.com/wokwi/avr8js).
  Полный текст: `public/licenses/avr8js.txt`.
- CodeMirror 6 — MIT, Marijn Haverbeke и участники. [Исходники](https://github.com/codemirror/dev).
  Используются state, view, commands, language, legacy-modes (C++), lint; лицензии входят в пакеты.
- Arduino CLI 1.5.1 — GPL-3.0; локальный инструмент сборки, не входит в браузерный бандл.
  [Исходники и лицензия](https://github.com/arduino/arduino-cli).
- Arduino AVR core 1.8.8 — лицензии Arduino core / avr-libc указаны в
  [исходниках](https://github.com/arduino/ArduinoCore-avr). Прошивки примеров
  воспроизводимы из `src/content/sketches.json` скриптом `scripts/build-learning-fixtures.mjs`.

Остальные лицензии шрифтов и Tabler перечислены в `docs/cabinet-art.md` и
соответствующих файлах `public/`. Страница `/app/about` показывает сведения
о Wokwi Elements и AVR8js пользователю.

## Зависимости веб-приложения

| Пакет                          | Лицензия установленной версии |
| ------------------------------ | ----------------------------- |
| @codemirror/commands 6.11.1    | MIT                           |
| @codemirror/language 6.13.1    | MIT                           |
| @codemirror/legacy-modes 6.5.5 | MIT                           |
| @codemirror/lint 6.9.7         | MIT                           |
| @codemirror/state 6.7.6        | MIT                           |
| @codemirror/view 6.43.14       | MIT                           |
| @wokwi/elements 1.9.2          | MIT                           |
| avr8js 0.21.1                  | MIT                           |
| motion 12.43.0                 | MIT                           |
| next 16.4.1                    | MIT                           |
| openai 7.34.0                  | Apache-2.0                    |
| react 19.3.1                   | MIT                           |
| react-dom 19.3.1               | MIT                           |

Макетная плата arduhub-breadboard — собственный компонент проекта, не часть Wokwi Elements.
Библиотеки Arduino устанавливаются только в сервис компиляции; их лицензии хранятся в library.properties и LICENSE установленных пакетов.

## Библиотеки доверенных Arduino-примеров

Версии закреплены в Dockerfile. Лицензии прочитаны из установленных пакетов:

- Servo 1.3.0 — LGPL-2.1; LiquidCrystal 1.0.7 и Stepper 1.1.3 — LGPL (уведомления в исходниках Arduino).
- Keypad 3.1.1 — GPL-3.0; Adafruit NeoPixel 1.15.5 — LGPL-3.0.
- Adafruit GFX 1.12.6 и SSD1306 2.5.17 — BSD; Adafruit BusIO 1.17.4 — MIT.
- Adafruit Unified Sensor 1.1.15 — Apache-2.0; DHT sensor library 1.4.7 — MIT.
- LedControl 1.0.6 — LGPL (уведомление в LedControl.h).

Исходники и полные лицензии устанавливаются Arduino Library Manager вместе с библиотеками. Доверенные прошивки воспроизводятся из сохранённых исходных текстов проекта. В браузерный JavaScript эти библиотеки не включаются.
