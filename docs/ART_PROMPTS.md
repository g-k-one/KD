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

---

## 2. Эмоции курицы (пустые состояния и подсказки)

Один спрайт на три эмоции: генерируй каждую отдельно, 1:1, бюст от груди. Заменят `items/chicken-moods.webp`.

- **Смеётся** (гость в апгрейде, «почти проиграл»): `The mascot, bust from the chest up, laughing hard, beak wide open, eyes squeezed into happy arcs with tears of laughter, one wing pointing at the viewer — teasing but friendly.`
- **Фух** («почти выиграл»): `The mascot, bust from the chest up, relieved "phew": wiping sweat off its forehead with one wing, a big sweat drop on the side of the head, eyes half-closed, beak slightly open, exhaling.`
- **Пожимает плечами** (пустые списки): `The mascot, bust from the chest up, shrugging with both wings out to the sides, eyebrows raised, puzzled half-smile, looking at an empty space next to it.`

---

## 3. Иллюстрации

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
