# Иллюстрации кабинета

Сгенерированы встроенным инструментом imagegen. Gemini не использовался. Финальные файлы лежат в `public/cabinet/`, метаданные, размеры и blur — в `src/content/cabinet-art.json`. Исходные PNG сохранены инструментом в локальном каталоге generated_images. Скрипт `scripts/prepare-cabinet-art.mjs` выполняет только оптимизацию размера/формата через Sharp, сохраняет прозрачность персонажей и не изменяет оригиналы.

| Файл        | Размер, байт | Назначение       |
| ----------- | -----------: | ---------------- |
| island.webp |       197010 | Пять зон острова |
| volt.webp   |        28198 | Вольтик          |
| oma.webp    |        23310 | Ома              |
| rezik.webp  |        33532 | Резик            |
| shina.webp  |        33274 | Шина             |
| banner.webp |        26464 | Баннер уровня    |

Все изображения меньше 250 КБ. `CabinetArt` использует next/image с размерами, alt и blur; при ошибке загрузки показывает встроенный SVG с теми же размерами. Персонажи повторяются в чате, разборе ошибки, на карте и на кнопке быстрого чата.

Промпты для воспроизведения:

1. **Остров.** Use case: stylized-concept. Create a polished game map illustration for ArduHub, a Russian school Arduino learning app. No text, no letters, no logos, no UI. Wide 16:9 composition. An isometric living island shaped like a green printed circuit board in deep dark forest-green sea (#14241d). Five distinct zones spread LEFT TO RIGHT: lower-left small LED lighthouse bay, upper-left button-shaped tiny village houses, center hills with sensor antenna trees, upper-right servo motor port with gears, lower-right glowing large microchip peak. Amber copper paths link the five areas. Charming original soft 3D cartoon, clean rounded geometry, warm amber (#e9a93b) and rich green palette, cream rocks, soft shadows, restrained luminous details. Fill the frame with the island but leave dark negative space in the upper-left corner for heading. Landscape asset for an educational product, detailed enough for 1200px browser display.
2. **Общая часть четырёх портретов.** Use case: stylized-concept. Asset: character portrait for ArduHub school electronics learning app. [CHARACTER]. Clean soft 3D cartoon graphics, warm amber and forest green palette with cream highlights, soft studio lighting, rounded tactile shapes, consistent premium educational game mascot style. Full body centered with generous 10% margin, readable at 80px. No text, no letters, no logos. Square format, transparent background. Original character, unlike any existing franchise.
3. **Вольтик, CHARACTER.** An original adorable smiling lightning bolt mascot named Voltik, amber golden soft rounded lightning body, expressive dark forest green eyes, tiny green gloves and green sneakers, energetic friendly welcoming pose.
4. **Ома, CHARACTER.** An original adorable wise round resistor mascot named Oma, cream and amber cylindrical resistor body with subtle colored bands, round forest green glasses, small friendly arms and feet, calm welcoming expression.
5. **Резик, CHARACTER.** An original adorable meticulous little inspector robot named Rezik, forest green and cream rounded metal body, amber face with curious eyes, holding a magnifying glass, friendly attentive expression.
6. **Шина, CHARACTER.** An original adorable young inventor mascot named Shina, cartoon girl with colorful insulated wires for hair in amber and forest green, cream overalls with green pockets, holding a screwdriver, creative friendly confident pose.
7. **Баннер, с портретом Вольтика как входным изображением.** Create a wide 3:1 landscape banner illustration for an ArduHub electronics learning level. Use the attached Voltik lightning mascot exactly as the recurring original character, preserving its yellow lightning body, friendly eyes, green gloves and shoes. Put Voltik on the right third waving. The LEFT TWO THIRDS must be empty warm amber (#e9a93b) background with only very subtle printed circuit traces; this is space for live interface headings, no text generated. Clean premium soft 3D cartoon, warm amber and forest green, cream highlights, friendly school learning product. No letters, no numbers, no logos. Full opaque amber background.

Значки навигации и замка получены через better-icons из [Tabler Icons](https://github.com/tabler/tabler-icons), лицензия MIT. Идентификаторы: home, map, puzzle, message-circle, school, clipboard-check, book, lock. Локальный спрайт — `public/icons/cabinet-sprite.svg`.
