# KurwaDROP: промпты для всей графики (ChatGPT)

Для каждой картинки: прикрепи образец стиля `public/img/hero/chicken.webp`, вставь **общий блок**, потом промпт картинки. Прозрачный фон: GPT Image с transparent background, PNG. Готовые файлы клади в чат или в `public/img/_new/`, я порежу, сожму в webp и подключу.

## Общий блок (вставлять в каждый промпт)

```
Style: the attached chicken is the brand mascot and the exact style reference — glossy 3D cartoon render, white fluffy
chicken with a big spiky orange-red crest, huge round googly eyes with small black pupils, a wide orange beak, chunky
proportions, soft studio light from the top left, a warm orange rim light, crisp edges. Bold, loud, game-like, like a
mobile game splash; not realistic, not flat, no anime, no neon, no rainbow holograms. CS2 weapon skins, if any, look
like real CS2 skins. Transparent background, no ground, no shadow under the subject, no text, no letters, no logos,
no UI, no frame. The subject fits inside the image with a clear margin on every side.
```

---

## 1. Баннеры (3 сцены, одна раскладка)

Каждая сцена собирается из слоёв, поэтому генерируй по одному объекту на картинку. Баннеры одной высоты (320 px на компьютере), арт стоит справа на площадке 620 × 324.

### 1.1 Главная: «курица выскакивает из кейса»
- `hero/chicken.webp` (760×720): `The mascot bursting up out of an open case, wings flung wide, beak wide open in a happy scream, feet kicking, seen from the waist up as if springing out of a box (the box itself is not in the picture). Square 1:1.`
- `hero/case-back.webp` и `hero/case-front.webp` (720×690): `A rugged black loot case with orange metal corners and latches, lid flung open, warm golden light pouring out of it. Three-quarter view from slightly above. Square 1:1.` Это один кейс, из него режу две части: заднюю стенку с крышкой и переднюю стенку.

### 1.2 Бонусы: «курица с подарком»
- `hero/bonus-chicken.webp` (640×780): `The mascot standing, hugging a big open gift box with a gold ribbon, golden sparkles and light bursting out of the box, winking at the viewer, one foot lifted. Full body, portrait 4:5.`
- `hero/bonus-gift.webp` (220×236): `A small black gift box with a shiny gold ribbon and bow, closed, three-quarter view. Square 1:1.`

### 1.3 Provably Fair: «курица-инспектор»
- `hero/pf-chicken.webp` (640×670): `The mascot as an inspector, holding a big magnifying glass up to one eye (the eye hugely magnified behind the lens), serious-funny expression, full body, standing. Square 1:1.`
- `hero/pf-case.webp` (720×620): `A transparent glass loot case with a handle, glowing soft green from inside, a CS2 rifle, a knife and a pile of gold coins visible inside through the glass. Three-quarter view. Square 1:1.`
- `hero/pf-lens.webp` (1:1, прозрачный фон, **пустое стекло**): главный элемент нового баннера. Лупа ходит за курсором, а в её стекле я показываю код (хеш, сиды, номер броска), поэтому стекло должно быть сквозным: `A big magnifying glass, front view, tilted 25° with the handle going down to the bottom right: a thick glossy gold-and-orange metal ring with a dark inner bevel, a chunky black handle with orange grip bands. The lens itself is completely empty and fully transparent, nothing seen through it; only a thin soft white glare arc along the top-left edge of the glass. Square 1:1, the ring centred in the upper-left two thirds.`

---

## 2. Курица-эмоции: пустые состояния и подсказки (3 листа 2×2)

**Готово 28.10:** листы A–C нарезаны в `public/img/moods/` скриптом `scripts/cut-sheet.py` (чистит мусор вокруг вырезки) и подключены: пустой инвентарь, история, поиск, «бросков ещё нет», гость в апгрейде (с 29.10 — `signed-out`, курица с ключом: смех над гостем был не к месту), «на волосок» в апгрейде, пустой список PvP (`empty-pvp`). В запасе, пока негде показать: `guest-upgrade` (смех), `guest-rolls` (гостю карточку бросков больше не показываем), `error`, `check-ok`. Старая `items/chicken-moods.webp` — в `_ARCHIVE/old_versions_2026-10-28/`.

Сейчас на все пустые места одна картинка `items/chicken-moods.webp` (две мордочки, вырезаны грубо, с тёмной подложкой). Вместо неё у каждого места своя сценка: курица делает то, о чём говорит текст под ней. На сайте они стоят в 96–112 px, поэтому:
- один жест и один предмет, крупно; никаких мелких деталей, которые пропадут в 96 px;
- кадр у всех одинаковый: курица от груди до гребня, голова одного размера во всех клетках, взгляд и свет как у образца;
- силуэт читается на тёмном фоне: светлая курица, яркий предмет, без тёмных пятен по краям.

Генерируй **листом 2×2** (квадрат 2048×2048, четыре клетки 1024×1024), прозрачный фон, PNG. Я режу лист скриптом на четыре файла и сжимаю в webp. В начало промпта листа, после общего блока, вставь:

```
A 2×2 sheet of four separate stickers of the same mascot, one per quarter of the image, each centred in its own quarter
with a wide empty margin, nothing crossing into another quarter, no grid lines, no borders. All four at the same scale:
the chicken from the chest up, its head the same size in every quarter, the same light from the top left and the same
orange rim light. Each one has a single clear gesture and at most one prop, big and simple enough to read at 96 px.
```

Потом четыре строки: `Top left: …`, `Top right: …`, `Bottom left: …`, `Bottom right: …`.

### Лист A: пустые списки (`moods/empty-*.webp`)
- **Top left: `empty-inventory`** (пустой инвентарь: профиль, апгрейд, ящик кошелька): `the chicken holding an open loot case upside down and shaking it, nothing falls out, eyes wide in disbelief.`
- **Top right: `empty-history`** (пустая история): `the chicken holding up a long blank paper scroll with nothing written on it, one eyebrow raised, a pencil behind its ear.`
- **Bottom left: `empty-search`** (кейсы не нашлись по фильтрам, «ничего не подходит» в апгрейде): `the chicken peering through a big magnifying glass held in one wing, its eye hugely magnified, searching, puzzled.`
- **Bottom right: `empty-pvp`** (нет битв в PvP): `the chicken holding a CS2 knife up in a challenge pose, looking around for an opponent, impatient, foot tapping.`

### Лист B: гость и Provably Fair (`moods/*.webp`)
- **Top left: `guest-rolls`** (гость на странице Provably Fair: «войди, чтобы увидеть свои броски»): `the chicken peeking out from behind a big green shield with a white check mark, waving the viewer in with one wing.`
- **Top right: `no-rolls`** (бросков ещё нет): `the chicken holding a big glossy white dice with orange pips close to its face, eyes lit up with excitement, about to roll.`
- **Bottom left: `guest-upgrade`** (гость в апгрейде, сейчас «смеётся»): `the chicken laughing hard, beak wide open, eyes squeezed into happy arcs with tears of laughter, one wing pointing at the viewer, teasing but friendly.`
- **Bottom right: `signed-out`** (запасная для других «войди»): `the chicken holding up a glowing round grey-blue key badge (no logo), smiling, inviting.`

### Лист C: апгрейд, «на волосок» (`moods/*.webp`)
Они выглядывают из-под шкалы апгрейда, видна верхняя половина. Голову держи в верхней половине клетки.
- **Top left: `near-win`** (выиграл на волосок): `the chicken relieved, "phew": wiping sweat off its forehead with one wing, a big sweat drop on the side of the head, eyes half-closed, exhaling.`
- **Top right: `near-lose`** (проиграл на волосок): `the chicken laughing at the viewer, beak wide open, one wing slapping its own knee out of frame, tears of laughter.`
- **Bottom left: `error`** (что-то сломалось, ошибка загрузки): `the chicken tangled in a black cable with a small spark, feathers ruffled, embarrassed grin.`
- **Bottom right: `check-ok`** (проверка броска сошлась): `the chicken giving a proud thumbs-up with one wing, a green check mark badge pinned on its chest.`

Последние две пока негде показать. Если кредитов жалко, вместо них поставь на лист любые две из листа A в другой позе: выберу лучшую.

---

## 3. Иллюстрации

- **Готово 28.10:** новая сценка (курица над ящиком со скинами) стоит в окне входа, старая — в архиве.
- `illustrations/sign-in.webp` (3:2): `The mascot holding up a glowing Steam-style round key badge (a plain round grey-blue badge, no Steam logo), smiling, inviting the viewer in. Bust from the waist up, landscape 3:2.`
- Шаги Provably Fair (`pf-commit`, `pf-randomness`, `pf-verify`, 5:2, иконки-сцены без курицы):
  - `A chunky 3D server block with a padlock, an arrow pointing to a green tile with a # sign. Landscape 5:2, objects in a row.`
  - `A chunky 3D slider control in orange, a plus sign, and three green number tiles 1 2 3. Landscape 5:2, objects in a row.`
  - `A big orange magnifying glass over two # tiles, next to a green shield with a white check mark. Landscape 5:2, objects in a row.`

---

## 4. Значки источника дропа (лента, история)

Маленькие, читаются в 16–20 px, без подложки, 1:1:
- **Апгрейд:** `A chunky glossy 3D up arrow in orange-to-gold gradient with a dark outline, game icon. Square 1:1.`
- **PvP:** `Two crossed chunky swords, steel blades and gold guards, dark outline, game icon. Square 1:1.`

---

## 5. Пакеты монет (пополнение, 10 штук, 512×512)

Монета бренда: золотая, со звездой в круге. От меньшего к большему, одна подача:

```
A pile of gold coins with a star in a circle stamped on each, game shop item, three-quarter view. Square 1:1.
```

Меняй первую фразу на:
1. `A single gold coin standing on its edge` (`coin`)
2. `A neat stack of 8 gold coins` (`stack`)
3. `A small heap of gold coins` (`heap`)
4. `A tied burlap sack overflowing with gold coins` (`sack`)
5. `An open wooden crate full of gold coins` (`crates`)
6. `A big mound of gold coins with gems` (`mound`)
7. `An open black loot case full of gold coins` (`case`)
8. `A wooden pallet stacked with coin crates` (`pallet`)
9. `An orange shipping container bursting with gold coins` (`container`)
10. `A black armored van with its back doors open, spilling gold coins` (`van`)

---

## 6. Кейсы (13 штук)

Каждый кейс — курица в образе. Нужны три кадра одного кейса: квадрат (карточка), высокий 3:4 и широкий 2:1 (крупные карточки на главной). Шаблон:

```
The mascot as <образ>, <поза>, holding <предмет>, surrounded by <антураж>. Centered, full body. <Square 1:1 | Portrait 3:4 | Landscape 2:1, the chicken on the right and the props spreading to the left>.
```

| Кейс | Образ и антураж |
|---|---|
| Pierogi Pack | puffy pierogi-dough chicken, a screaming face, holding a candy-pink pistol, little pierogi friends around |
| Kurwa Classic | the plain mascot pointing at the viewer with one wing (classic pose) |
| Zloty Rush | chicken diving into a shower of huge gold "K" coins, holding a gold-pink rifle |
| Babcia's Box | grandma chicken in a red flowered headscarf and round glasses, holding an AK-47 |
| Warsaw Nights | cool chicken in sunglasses with a blue-purple rifle, the Palace of Culture glowing purple behind, a crescent moon and stars |
| Vodka Drop | angry chicken with a big frosted vodka bottle and an ice-blue pistol, ice cubes flying |
| Krakow Knife | chicken holding a fan of knives (karambit, butterfly, bayonet), dragon-knife vibe |
| Golden Kielbasa | chicken wrapped around a giant glazed kielbasa, a gold-engraved rifle, gold coins |
| Budget Boom | chicken on a pile of cheap rifles, explosions of confetti, a "sale" mood (no text) |
| High Roller | rich chicken with a gold crown and a fur collar, gold chains, a gold pistol |
| Piekło | devil chicken with small horns, flames around, a red-black rifle |
| Wiosna | spring chicken with a flower crown, cherry blossom petals, a mint-green rifle |
| Mafia | mafia boss chicken in a fedora and pinstripe suit, a tommy gun, a cigar (unlit) |

Если нужен только один кадр, бери квадрат: широкий и высокий я соберу из него раздвижкой фона.

---

## 7. Главный баннер: «курица тащит ящики» (параллакс)

Справа в баннере, на площадке примерно 620 × 420. Курица тащит на санях шаткую башню из кейсов CS2, из щелей торчат и вылетают скины. Сцена собирается из слоёв, и каждый слой двигается за курсором на свою глубину. Поэтому всё, что связано верёвкой, лежит в одном слое: курица, верёвка, сани и ящики. Отдельно генерируются только предметы, которые летят сами по себе.

Порядок: сначала основной слой (7.1). Потом к нему, приложив его в чат как образец света и масштаба, остальные слои. Для каждого слоя: образец `hero/chicken.webp`, **общий блок** сверху, потом промпт слоя.

### 7.1 Основной слой: курица с санями (`hero/haul.webp`, 3:2, прозрачный фон)
```
The mascot hauling a heavy load: it leans far forward toward the left of the frame, full body in three-quarter side view,
a thick rope over its shoulder gripped with both wings, feet dug in and skidding, beak wide open in a strained, furious
scream, eyes huge, crest flying back, sweat drops. The rope runs back to a small wooden sled on the right holding a tall,
wobbly tower of 5 stacked CS2 weapon cases (rugged dark crates with orange metal corners and latches, like real CS2
cases, no logos, no text), the top two leaning dangerously. Lids cracked open: golden light leaks out of the gaps, the
barrel of an AK-47 and the handle of a knife stick out of the crates. Motion: dust kicked up behind the sled, short speed
streaks. The chicken takes the left 40% of the frame, the sled and tower the right 60%; the whole group fits inside the
frame with a clear margin. Landscape 3:2.
```

### 7.2 Летящие скины (по одному на картинку, прозрачный фон, 1:1)
Они слетают с верхушки башни. В баннере я разведу их по глубине: ближние крупнее и быстрее.
- `hero/haul-knife.webp`: `A CS2 Butterfly Knife with a Doppler finish (deep purple-blue with a pink glow), open, spinning in the air, slight motion blur on the blade tip, lit like the reference. Square 1:1.`
- `hero/haul-awp.webp`: `A CS2 AWP sniper rifle with the Dragon Lore finish (gold dragon on light green-beige), tumbling through the air at a 30° tilt, lit like the reference. Square 1:1.`
- `hero/haul-gloves.webp`: `A pair of CS2 Sport Gloves with the Pandora's Box finish (purple and black), flung in the air, fingers spread, lit like the reference. Square 1:1.`

### 7.3 Ближний план (прозрачный фон, 1:1)
- `hero/haul-coins.webp`: `Five gold coins with a star in a circle, scattered mid-air at different angles and distances, two of them big and slightly blurred as if very close to the camera. Square 1:1.`
- `hero/haul-dust.webp`: `A low cloud of warm brown dust and small pebbles kicked up from the ground, soft edges, seen from the side, wide and flat. Landscape 3:1.`

### Как соберу
По глубине, от дальнего к ближнему: пыль за санями → основной слой (курица с башней) → скины (AWP дальше, нож и перчатки ближе) → монеты. Курсор сдвигает слои на разную величину. Скины медленно кувыркаются, верхушка башни покачивается. Если ткнуть в курицу, она дёргает верёвку, башня вздрагивает и с неё слетает ещё один скин.

---

## 8. Моковые кейсы: 30 штук, 6 линеек

Новые кейсы для витрины, по пять в линейке. Линейки идут от дешёвых к хайроллерским, у каждой своя тема и своя палитра, чтобы ряд из пяти карточек читался как набор. Картинка — квадратная карточка кейса (как `public/img/cases/*.webp`): курица в образе, **один жест и один предмет, крупно**, прозрачный фон. На сайте карточка от 96–112 px (лента, история, телефон) до 240 px (каталог), поэтому всё мелкое пропадёт: никаких надписей, тонких деталей и предметов в кадре сверх одного.

### Как генерировать

1. **Образец стиля:** прикрепи `public/img/cases/vodka-drop.webp` (глянцевая 3D-курица в полный рост, один крупный предмет, чистый прозрачный фон). Когда первая картинка линейки одобрена, прикладывай её вторым образцом ко всем остальным той же линейки: так держатся палитра и масштаб.
2. **Промпт** собирается из трёх кусков: **общий блок кейсов** (ниже) → **палитра линейки** → **промпт кейса**.
3. **Сначала пробы**, по одной на 4 линейки: `zapiekanka`, `maluch`, `perun`, `husaria`. Весь набор — после одобрения стиля.
4. **Файл:** PNG, 1024×1024, прозрачный фон (в ChatGPT: «transparent background, PNG»). Сохраняй как `<slug>.png` в `public/img/_new/cases/`.
5. **Конвертация:** `python scripts/case-art.py` — обрежет пустые поля, поставит предмет по центру квадрата, сожмёт в `public/img/cases/<slug>.webp` (480×480, WebP, прозрачный) и соберёт `public/img/_new/cases/_preview.png`: все кейсы в 104 px на тёмном фоне сайта — проверка, что читается. Картинку, где ChatGPT нарисовал шашечку вместо прозрачности, скрипт пропустит и скажет об этом.
   Если захочешь быстрее, листами 2×2 (четыре кейса линейки на листе, пятый отдельно): `python scripts/case-art.py лист.png slug1 slug2 slug3 slug4` (порядок: верх-лево, верх-право, низ-лево, низ-право). Клетка листа выходит около 512 px — впритык для карточки в 240 px, поэтому по умолчанию по одной картинке.
6. Широкие, высокие и полные кадры (`wide/`, `tall/`, `full/`) для моков не нужны: при подключении кейсу ставится `art: { wide: null, tall: null, full: null }`, и карточка остаётся квадратной.

### Общий блок кейсов (в начало каждого промпта)

```
Style: the attached image is the exact style reference for a loot-case card of a CS2 case-opening site. Same mascot:
glossy 3D cartoon render, a white fluffy chicken with a big spiky orange-red crest, huge round eyes with small black
pupils, a wide orange beak, orange feet, chunky proportions. Soft studio light from the top left, a warm orange rim
light, crisp edges, saturated colours. Loud, bold and game-like, like a mobile-game shop icon; not realistic, not flat,
no anime. CS2 weapons or knives, if any, look like real CS2 skins.
Composition: one character, one clear gesture, one big prop. The chicken and its prop fill about 80% of the square,
centred, with a clear margin on every side. Nothing thin or tiny that would vanish at 100 px. A strong silhouette that
reads on a near-black background: no dark parts along the outer edge.
Background: fully transparent (real alpha, not a painted checkerboard). No ground, no cast shadow, no glow ring, no
light rays or sunburst behind the subject. No text, letters, numbers, logos or brand names anywhere, no UI, no frame.
Square 1:1, 1024×1024, PNG.
```

Потом строка палитры линейки, потом промпт кейса.

### Сводка

Цена — поле `price` в моке, в сотых долях монеты (`29` = 0,29 монеты, `249900` = 2499 монет). Риск — поле `risk`. Файл у всех: `public/img/_new/cases/<slug>.png` (1024×1024, PNG, прозрачный) → `public/img/cases/<slug>.webp` (480×480, WebP).

| Линейка | Тема | Цена, монет | Риск | Кейсы |
|---|---|---|---|---|
| 1. Nocny Sklep | ночной ларёк: еда за копейки | 0,29–2,49 | low | Zapiekanka, Kebab na Cienkim, Oranżada, Parówa, Bar Mleczny |
| 2. Ryzyk-Fizyk | дёшево, но всё или ничего | 1,99–9,99 | high–extreme | Złote Jajo, Muchomor, Sylwester, Cienki Lód, Va Banque |
| 3. PRL | ностальгия по 70-м | 5,90–24,90 | medium | Papier Gold, Maluch, Trzepak, Kaseta, Kartki |
| 4. Sport Narodowy | польский спорт, всё в прыжке | 19,90–79,90 | high | Skoki, Żużel, Siłacz, Przewrotka, Atak |
| 5. Słowiańskie Mity | славянские легенды | 99–399 | high–extreme | Smok Wawelski, Perun, Kwiat Paproci, Baba Jaga, Leszy |
| 6. Złoty Wiek | золотой век Речи Посполитой, хайроллер | 499–2499 | extreme | Husaria, Szczerbiec, Bursztyn, Solny Tron, Hetman |

---

### Линейка 1. Nocny Sklep — бюджетные, low

Палитра линейки:
```
Line palette: ketchup red, mustard yellow and warm fluorescent-white highlights; the food looks hot, greasy and delicious.
```

| slug | Имя | Цена | Риск | Файл |
|---|---|---|---|---|
| `zapiekanka` | Zapiekanka | 29 | low | `zapiekanka.png` → `zapiekanka.webp` |
| `kebab-na-cienkim` | Kebab na Cienkim | 49 | low | `kebab-na-cienkim.png` → `kebab-na-cienkim.webp` |
| `oranzada` | Oranżada | 79 | low | `oranzada.png` → `oranzada.webp` |
| `parowa` | Parówa | 149 | low | `parowa.png` → `parowa.webp` |
| `bar-mleczny` | Bar Mleczny | 249 | low | `bar-mleczny.png` → `bar-mleczny.webp` |

- **zapiekanka:** `The mascot lifting a huge half-metre open-faced baguette pizza (melted cheese, mushrooms, a thick zigzag of ketchup) high above its head with both wings like a trophy, a long string of melted cheese stretching down into its open beak, eyes squeezed shut in bliss. Full body.`
- **kebab-na-cienkim:** `The mascot biting into a giant kebab wrap in thin flatbread, stuffed with lettuce and red cabbage, a big splash of white garlic sauce bursting out of the other end, eyes popping wide in shock at how good it is. Full body, the wrap held in both wings, almost as big as the chicken.`
- **oranzada:** `The mascot chugging an orange fizzy soda straight from a big swing-top glass bottle tipped vertically, orange bubbles fountaining out of the corners of its beak, its crest shot straight up from the sugar rush. Full body.`
- **parowa:** `The mascot in a fencing lunge, thrusting a giant hot dog like a sword: a long baguette with a pink sausage sticking far out of its end, a drop of mustard flying off the tip. Full body, side three-quarter view, fierce face.`
- **bar-mleczny:** `The mascot balancing one overloaded canteen tray on one wing above its head: a bowl of bright red borscht, a plate of dumplings and a glass of fruit compote, all wobbling, the chicken on one foot with its tongue out in concentration. Full body.`

---

### Линейка 2. Ryzyk-Fizyk — дёшево, но риск на максимум

Палитра линейки:
```
Line palette: hazard yellow and black, toxic green accents and hot red sparks; dangerous, but funny.
```

| slug | Имя | Цена | Риск | Файл |
|---|---|---|---|---|
| `zlote-jajo` | Złote Jajo | 199 | extreme | `zlote-jajo.png` → `zlote-jajo.webp` |
| `muchomor` | Muchomor | 299 | extreme | `muchomor.png` → `muchomor.webp` |
| `sylwester` | Sylwester | 499 | high | `sylwester.png` → `sylwester.webp` |
| `cienki-lod` | Cienki Lód | 699 | extreme | `cienki-lod.png` → `cienki-lod.webp` |
| `va-banque` | Va Banque | 999 | extreme | `va-banque.png` → `va-banque.webp` |

- **zlote-jajo:** `The mascot hugging a golden egg as big as itself that it has just laid, staring at a fresh crack running across the shell, golden light leaking out of the crack, one big nervous sweat drop on its forehead. Full body.`
- **muchomor:** `The mascot proudly holding up a giant red fly agaric mushroom with white spots in both wings, like a prize catch, cross-eyed with a wide goofy grin. Full body; the mushroom cap as big as the chicken's body.`
- **sylwester:** `The mascot holding a giant red firecracker at arm's length with one wing, its fuse fizzing with bright sparks, the other wing covering its eyes, peeking through its feathers. Full body.`
- **cienki-lod:** `The mascot tiptoeing on a small floating slab of blue ice, wings spread wide for balance, a jagged crack zigzagging across the ice right toward its feet, eyes huge, beak clenched. Full body, the ice slab under it is its only prop.`
- **va-banque:** `The mascot leaning in with its whole body to push a tall tower of gold coins forward with both wings (each coin stamped with a star in a circle), the tower tilting toward the viewer, the chicken's eyes glittering with madness. Full body.`

---

### Линейка 3. PRL — средние, medium

Палитра линейки:
```
Line palette: faded 1970s mustard, olive, brown and tomato orange, a light film grain; retro, but still glossy 3D.
```

| slug | Имя | Цена | Риск | Файл |
|---|---|---|---|---|
| `papier-gold` | Papier Gold | 590 | medium | `papier-gold.png` → `papier-gold.webp` |
| `maluch` | Maluch | 890 | medium | `maluch.png` → `maluch.webp` |
| `trzepak` | Trzepak | 1290 | medium | `trzepak.png` → `trzepak.webp` |
| `kaseta` | Kaseta | 1690 | medium | `kaseta.png` → `kaseta.webp` |
| `kartki` | Kartki | 2490 | medium | `kartki.png` → `kartki.webp` |

- **papier-gold:** `The mascot wearing a long necklace of grey toilet-paper rolls strung on a rope, draped over its chest like heavy gold chains, one wing up in a proud "I made it" rapper pose, chin raised. Full body.`
- **maluch:** `The mascot squeezed into a tiny cream-coloured 1970s two-door boxy car with round headlights (no badges, no plates), driving straight at the viewer, its crest sticking out of the open sunroof and both wings poking out of the side windows. Front three-quarter view, the car and chicken as one big shape.`
- **trzepak:** `The mascot swinging a big wicker carpet beater like a tennis racket in a full backhand, a big puff of grey dust exploding where it hits, a fierce determined face. Full body.`
- **kaseta:** `The mascot holding a big audio cassette up to its face and rewinding it by spinning a yellow pencil in one of the reels, its tongue out in concentration, a loop of brown tape spilling down. Chest-up, the cassette big in the frame, no writing on its label.`
- **kartki:** `The mascot fanning out a hand of five old paper ration coupons like a winning poker hand, a smug half-closed-eye grin. The coupons are pale green and pink with stamped grid squares and no readable text. Chest-up, the fan of coupons big in the frame.`

---

### Линейка 4. Sport Narodowy — высокий риск

Палитра линейки:
```
Line palette: Polish red and white with bold speed streaks, sweat drops and bright stadium-light highlights.
```

| slug | Имя | Цена | Риск | Файл |
|---|---|---|---|---|
| `skoki` | Skoki | 1990 | high | `skoki.png` → `skoki.webp` |
| `zuzel` | Żużel | 2990 | high | `zuzel.png` → `zuzel.webp` |
| `silacz` | Siłacz | 3990 | high | `silacz.png` → `silacz.webp` |
| `przewrotka` | Przewrotka | 4990 | high | `przewrotka.png` → `przewrotka.webp` |
| `atak` | Atak | 7990 | high | `atak.png` → `atak.webp` |

- **skoki:** `The mascot as a ski jumper in full flight: leaning far forward over a pair of red skis spread in a V, wings pressed back along its sides, a red-white helmet and big goggles, crest streaming in the wind. Side three-quarter view, diagonal from bottom left to top right.`
- **zuzel:** `The mascot as a speedway rider sliding a brakeless red-white dirt-track motorbike sideways into a turn, one foot down, a big fan of cinder dirt spraying from the back wheel, red-white leathers and helmet. Three-quarter view, the bike leaning hard.`
- **silacz:** `The mascot as a strongman lifting a huge round grey stone above its head with both wings, legs trembling, veins and sweat drops, a red-white wrestling singlet and a lifting belt, face screaming red with effort. Full body.`
- **przewrotka:** `The mascot upside down in mid-air doing an overhead bicycle kick, one foot striking a red-and-white football, feathers flying off, a red-white football shirt. Full body, the whole body diagonal, the ball at the top.`
- **atak:** `The mascot leaping high and smashing a red-and-white volleyball downward with one wing, the ball squashed flat from the hit, the other wing back for balance, a red-white jersey, a battle-cry face. Full body.`

---

### Линейка 5. Słowiańskie Mity — дорогие, high–extreme

Палитра линейки:
```
Line palette: deep forest green, storm blue and ember orange, old carved wood and bronze details; a soft magical glow on the prop only.
```

| slug | Имя | Цена | Риск | Файл |
|---|---|---|---|---|
| `smok-wawelski` | Smok Wawelski | 9900 | high | `smok-wawelski.png` → `smok-wawelski.webp` |
| `perun` | Perun | 14900 | extreme | `perun.png` → `perun.webp` |
| `kwiat-paproci` | Kwiat Paproci | 19900 | extreme | `kwiat-paproci.png` → `kwiat-paproci.webp` |
| `baba-jaga` | Baba Jaga | 29900 | high | `baba-jaga.png` → `baba-jaga.webp` |
| `leszy` | Leszy | 39900 | extreme | `leszy.png` → `leszy.webp` |

- **smok-wawelski:** `The mascot in a fluffy green dragon onesie with small horns, a spiky tail and little bat wings, breathing a big blast of orange fire forward out of its beak, fists clenched. Full body, three-quarter view, the flame going off to one side but inside the frame.`
- **perun:** `The mascot as a thunder god in a bronze helmet, raising a heavy bronze war axe high overhead with both wings, blue lightning crackling around the axe head, a furious shout. Full body.`
- **kwiat-paproci:** `The mascot cupping a legendary glowing fern flower in both wings, a fiery red-gold blossom on a curled fern stem, its warm light shining up on the chicken's awed face, eyes wide and sparkling. Chest-up, the flower big in the frame.`
- **baba-jaga:** `The mascot as a forest witch with a ragged black headscarf, flying in a big wooden mortar and steering with a long wooden pestle, a crooked toothy grin, leaning into a turn. Full body, three-quarter view.`
- **leszy:** `The mascot as a forest spirit: a crown of mossy antlers, bark and leaves on its shoulders, eyes glowing green, holding a gnarled wooden staff with a mushroom growing on top, a mischievous grin. Full body.`

---

### Линейка 6. Złoty Wiek — хайроллер, extreme

Палитра линейки:
```
Line palette: polished gold, crimson velvet and deep amber, rich sparkle on metal; the most expensive-looking line.
```

| slug | Имя | Цена | Риск | Файл |
|---|---|---|---|---|
| `husaria` | Husaria | 49900 | extreme | `husaria.png` → `husaria.webp` |
| `szczerbiec` | Szczerbiec | 79900 | extreme | `szczerbiec.png` → `szczerbiec.webp` |
| `bursztyn` | Bursztyn | 99900 | extreme | `bursztyn.png` → `bursztyn.webp` |
| `solny-tron` | Solny Tron | 149900 | extreme | `solny-tron.png` → `solny-tron.webp` |
| `hetman` | Hetman | 249900 | extreme | `hetman.png` → `hetman.webp` |

- **husaria:** `The mascot as a winged hussar in polished steel-and-gold armour, two tall arcs of white feathers rising from its back, charging toward the viewer with a long red-white lance lowered, its crest bursting out of the helmet, a battle scream. Full body, three-quarter view.`
- **szczerbiec:** `The mascot raising a glowing golden coronation sword straight up overhead with both wings, a gold hilt set with red gems, a crimson velvet cape flowing, a proud victorious face. Full body.`
- **bursztyn:** `The mascot hugging a giant glowing chunk of honey-coloured amber, and frozen inside the amber like a prehistoric insect is a tiny CS2 karambit knife with a fade finish, the chicken pressing its face to the amber with greedy wide eyes. Full body, the amber as big as the chicken's body.`
- **solny-tron:** `The mascot lounging on a throne carved from glowing pink rock-salt crystal, one leg thrown over the armrest, a gold crown tilted on its crest, a bored, filthy-rich half-lidded look. Full body, the throne and chicken as one big shape.`
- **hetman:** `The mascot as a grand hetman in an ermine-trimmed crimson coat, resting a heavy golden mace studded with rubies on its shoulder, a menacing smirk, chin up. Full body.`

---

### Как подключу

Когда картинки лежат в `public/img/cases/`, кейсы добавляются в `CASE_DEFS` в `server/utils/mock-db.ts` (slug, имя, картинка, цена, риск и `art: { wide: null, tall: null, full: null }`), а на главную — шесть рядов, по ряду на линейку, в порядке сводки.

---

## 9. CS-кейсы: 20 штук, 4 линейки, у каждой свой стиль

Кейсы про сам Counter-Strike: мемы, карты и 1.6, про-сцена, легендарные скины. Карточка та же, что в разделе 8: квадрат, одна идея и один крупный предмет, прозрачный фон, читается в 104 px.

Главное отличие от раздела 8: **у каждой линейки свой мини-стиль**, а курица не обязательна. Ряд на главной узнаётся по стилю с первого взгляда, бренд держится на одной и той же курице (глаза навыкате, без бровей, никогда не злая), которая появляется в стиле своей линейки.

Роль курицы в каждом кейсе одна из трёх:
- **нет** — герой карточки предмет (горящий роутер, клавиатура);
- **мелькает** — видны только лапы, клюв или перо (из-под бан-хаммера, из кубка);
- **главная** — курица и есть гэг (бьёт тазером, прыгает в заячьих ушах).

FACEIT и NAVI здесь только намёком: цвета и настроение, без логотипов и названий (это чужие бренды). Имена кейсов тоже намёки, на настоящие поменяешь сам, если будет можно.

### Как генерировать

1. **Образцы:** первым всегда `public/img/_new/ref-chicken.png` (курица в панике); он задаёт только характер курицы, не стиль. Вторым — одобренная проба своей линейки: `vac-sticker`, `one-six`, `major`, `dragon-lore`. Она держит стиль внутри линейки.
2. **Промпт:** общий блок → блок курицы (один из двух) → стиль линейки → сцена кейса → палитра линейки.
3. **Файл и конвертация** — как в разделе 8: `public/img/_new/cases/<slug>.png` (1024×1024, прозрачный) → `python scripts/case-art.py` → `public/img/cases/<slug>.webp`.
4. **Через fal** (Claude делает сам): `openai/gpt-image-2.5/sunburst/edit`, `quality: medium`, `background: transparent`, 1024×1024, оба образца в `image_urls`.

### Правила приёмки (GK, 2026-10-29)

- **Ничего не обрезано** ни с одной из четырёх сторон: ручка, ствол, вспышка, хвост, подставка целиком в кадре. `case-art.py` такие картинки не пропускает (`SKIP … cut off`).
- **Нет повторов:** два кейса не держатся на одном гэге или одной позе (лапы из-под чего-то, курица с раскинутыми крыльями на плитке).
- **Естественные позы:** крылья держат предмет, ничего не висит в воздухе и не выгнуто странно.

### Общий блок (в начало каждого промпта)

```
Square icon for a loot case card on a dark website. Transparent background, one clear idea, one big hero object,
must read at 100 px. Framing: the WHOLE subject sits inside the square with a clear empty margin of at least 8% on
all four sides; no part of it (handles, barrels, muzzle flashes, tails, stands, floor slabs) touches or is cut by
the edge. Long objects are angled diagonally and kept short enough to fit. Natural, believable pose: characters
stand or move the way a cartoon character really would, wings actually grip what they hold, nothing floats or bends
unnaturally. No text, no letters, no numbers, no logos, no rotating rays or sunburst.
```

### Блок курицы (один из двух)

Курица есть (мелькает или главная):
```
The first attached image defines ONLY the mascot's character design: a round panicked chicken with big googly eyes
and NO eyebrows, never angry. Do NOT copy its rendering style; redraw everything in the style below. The second
attached image is the approved style reference for this line: match its rendering exactly.
```

Курицы нет:
```
The first attached chicken is the brand mascot; it does NOT appear in this image at all. Do not copy its rendering
style. The second attached image is the approved style reference for this line: match its rendering exactly.
```

### Сводка

| Линейка | Стиль | Цена, монет | Риск | Кейсы |
|---|---|---|---|---|
| 7. Memy | стикер | 0,99–7,99 | high | Ping 999, Flashbang, VAC, Negev, Zeus |
| 8. Old School | low-poly 2003 | 4,90–29,90 | medium | Dust II, Stuck, Banana, Bhop, 1.6 |
| 9. Pro Scene | хром на сцене | 39–199 | high | Level 10, Yellow Army, Smurf, Tryhard, Major |
| 10. Skiny | живопись, витрина | 299–1999 | extreme | Blue Again, Asiimov, Howl, Fade, Dragon Lore |

---

### Линейка 7. Memy — стикер, дёшево, high

Стиль:
```
Style: die-cut meme sticker. Flat 2D cartoon, thick black ink outlines, bold flat colours with one hard cel shadow,
oversaturated 'deep-fried' colours, comic motion lines and impact stars, and a thick white sticker border running
around the whole silhouette. Like a chat sticker pack.
```
Палитра:
```
Palette: alarm red, toxic chat-green, flashbang white, black ink.
```

| slug | Имя | Цена | Риск | Курица |
|---|---|---|---|---|
| `ping-999` | Ping 999 | 99 | high | нет |
| `flashbang` | Flashbang | 199 | high | главная |
| `vac` | VAC | 299 | high | мелькает |
| `negev` | Negev | 499 | high | нет |
| `zeus` | Zeus | 799 | high | главная |

- **ping-999:** `Scene: a home Wi-Fi router on fire: its antennas melted and drooping, flames and black smoke puffing out of the top, its little status lights blinking red, a pair of big panicked googly eyes on its front.`
- **flashbang:** `Scene: the chicken mascot, full body, standing coolly with huge black sunglasses on, totally unbothered, holding up a CS2 flashbang grenade with the pin pulled in one wing, the pin ring hanging off its other wing; the grenade glows bright white. A smug closed-beak grin.`
- **vac** (стиль линейки взят с него): `Scene: a red ban hammer with a SHORT stubby wooden handle, the whole hammer drawn complete and angled diagonally, slamming down; only the chicken's two yellow feet stick out from under the hammer head, feathers flying; a white circle-slash 'prohibited' symbol on the hammer head. The end of the handle is fully visible inside the frame.`
- **negev:** `Scene: a Negev light machine gun on its bipod, angled diagonally and drawn complete from stock to muzzle, standing on a huge heap of shiny brass shell casings; a compact comic muzzle flash at the barrel tip, kept well inside the frame; a few casings flying.`
- **zeus:** `Scene: the chicken mascot, full body, holding a small yellow Zeus taser in its own wing and accidentally zapping itself: its whole body flashing with electric-blue lightning, a cartoon x-ray showing its skeleton through the feathers, feathers standing on end, googly eyes spinning, beak wide open. The taser is fully visible in its wing.`

---

### Линейка 8. Old School — low-poly 2003, средние, medium

Стиль:
```
Style: a 2003 PC game asset. Low-poly 3D model with clearly visible flat-shaded triangles (about 300 polygons in
total), blurry low-resolution pixelated textures, hard vertex lighting, no smooth shading, no modern effects. Like a
render from an early-2000s shooter model viewer. Everything, including the chicken's head, is faceted.
```
Палитра:
```
Palette: dusty sand, olive green, faded orange, muted early-2000s colours.
```

| slug | Имя | Цена | Риск | Курица |
|---|---|---|---|---|
| `dust-ii` | Dust II | 490 | medium | мелькает |
| `stuck` | Stuck | 990 | medium | мелькает |
| `banana` | Banana | 1490 | medium | нет |
| `bhop` | Bhop | 1990 | medium | главная |
| `one-six` | 1.6 | 2990 | medium | главная |

- **dust-ii:** `Scene: a big weathered wooden double door with iron studs set in a chunky sand-coloured stone wall block; through the gap between the doors only the chicken's orange beak and one googly eye peek out.`
- **stuck:** `Scene: a big wooden supply crate; the chicken mascot is glitched halfway into it, its front half sunk into the crate wall, only its back half, tail feathers and two kicking feet stick out of the side.`
- **banana:** `Scene: a giant ripe yellow banana with a sniper scope strapped on top, lying like a rifle on a small chunky slab of sandy floor tile.`
- **bhop:** `Scene: seen strictly from the SIDE in profile: the low-poly chicken mascot in a long flying leap from one small chunky stone block to another, body stretched forward horizontally, legs stretched back, wings swept back, tall pink low-poly bunny ears streaming backwards, a little puff of sand at the take-off block. Both blocks fully inside the frame.`
- **one-six** (стиль линейки взят с него): `Scene: the chicken mascot standing proud, ENTIRELY low-poly: body, head, wings, feet and comb all faceted; its googly eyes are a flat low-res texture. It stands on a small chunky square slab of sandy floor tile; the whole slab, including its front and bottom edges, is fully visible with empty space below it.`

---

### Линейка 9. Pro Scene — хром на сцене, дорогие, high

Стиль:
```
Style: premium esports broadcast 3D render. Glossy chrome and polished gold, sharp studio rim lights in electric blue
and magenta, crisp reflections, clean geometric bevels, a soft glow around the object (no rays). Like a tournament
trophy reveal on stage.
```
Палитра:
```
Palette: chrome, gold, electric blue, magenta stage light.
```

| slug | Имя | Цена | Риск | Курица | Намёк на |
|---|---|---|---|---|---|
| `level-10` | Level 10 | 3900 | high | нет | FACEIT |
| `yellow-army` | Yellow Army | 5900 | high | главная | NAVI |
| `smurf` | Smurf | 9900 | high | главная | смурф |
| `tryhard` | Tryhard | 14900 | high | нет | тряхард |
| `major` | Major | 19900 | high | мелькает | мейджор |

- **level-10:** `Scene: a huge glowing orange-and-black round rank medal, a thick ring of ten glowing orange segments around its rim, a chrome star in the middle.`
- **yellow-army:** `Scene: the chicken mascot as a die-hard esports fan in a yellow-and-black striped jersey with no logos or text, stretching a chunky yellow-and-black fan scarf high above its head, beak wide open in an ecstatic cheer, a few big yellow and black confetti pieces.`
- **smurf:** `Scene: the chicken mascot, full body, standing in a relaxed three-quarter pose in a cheap disguise: black plastic glasses with a fake nose and moustache and a backwards cap; it rests a gold-plated AK-47 casually on its shoulder, gripped firmly by one wing, and waves hello with the other wing, trying to look innocent.`
- **tryhard:** `Scene: a compact glowing RGB mechanical gaming keyboard seen at an angle, smoking from overuse, a few keycaps flying off, a big RGB gaming headset lying on top of it. The whole keyboard, both of its ends, fully inside the frame.`
- **major** (стиль линейки взят с него): `Scene: a huge gleaming championship trophy cup; the chicken mascot has dived head-first into the cup, only its yellow feet and tail feathers stick out of the top, kicking in panic.`

---

### Линейка 10. Skiny — живопись, витрина, хайроллер, extreme

Стиль:
```
Style: hand-painted digital illustration with visible brush strokes and painterly texture, rich warm oil-painting
light, gilded ornament details. Like fantasy collector's card art. Real CS2 weapons with their real skin finishes.
```
Палитра:
```
Palette: deep velvet red, antique gold, jade green, warm candle light.
```

| slug | Имя | Цена | Риск | Курица |
|---|---|---|---|---|
| `blue-again` | Blue Again | 29900 | extreme | главная |
| `asiimov` | Asiimov | 49900 | extreme | главная |
| `howl` | Howl | 79900 | extreme | нет |
| `fade` | Fade | 119900 | extreme | мелькает |
| `dragon-lore` | Dragon Lore | 199900 | extreme | нет |

- **blue-again:** `Scene: a compact ornate open loot case, its lid thrown back, cold disappointing blue light pouring out of it onto a single plain blue-grey pistol lying inside; the chicken mascot stands behind the case, both wings resting on its rim, leaning over to look in, googly eyes wide in disappointment. The whole case, including its bottom, fully inside the frame.` (мем: опять синька)
- **asiimov:** `Scene: an AWP sniper rifle with the real Asiimov finish (white body, orange and black sci-fi panels) standing upright on a gilded display stand; the chicken mascot hugs the rifle with both wings, cheek pressed to it, googly eyes sparkling with greed.`
- **howl:** `Scene: an M4A4 assault rifle with the real Howl finish (a red-orange snarling wolf) lying diagonally on a deep-red velvet cushion with gold tassels, wreathed in compact painted flames that stay close to the rifle. The rifle's stock and muzzle are fully inside the frame.`
- **fade:** `Scene: a karambit knife with the real Fade finish (a pink, purple and gold gradient) standing tip-down in a deep-red velvet cushion; one white chicken feather beside it, also fading from pink to purple to gold.`
- **dragon-lore** (стиль линейки взят с него): `Scene: a sniper rifle lying diagonally on a plump deep-red velvet cushion with gold tassels; the rifle's stock and body are covered in a medieval-style golden-green dragon painting with ornate gold filigree; a few small gold sparkles.`
