const makeItem = (title, mediaType, heroTags = [], extra = {}) => ({
  title,
  mediaType,
  heroTags,
  ...extra,
})

const movie = (title, heroTags = [], extra = {}) => makeItem(title, 'movie', heroTags, extra)
const tv = (title, heroTags = [], extra = {}) => makeItem(title, 'tv', heroTags, extra)

const HERO_LANES = [
  { key: 'all', label: 'All Marvel', query: 'Marvel', anchor: true },
  { key: 'mcu', label: 'MCU', query: 'Marvel Studios' },
  { key: 'spider-man', label: 'Spider-Man', query: 'Spider-Man' },
  { key: 'iron-man', label: 'Iron Man', query: 'Iron Man' },
  { key: 'avengers', label: 'Avengers', query: 'Avengers' },
  { key: 'x-men', label: 'X-Men', query: 'X-Men' },
  { key: 'daredevil', label: 'Daredevil', query: 'Daredevil' },
  { key: 'deadpool', label: 'Deadpool', query: 'Deadpool' },
  { key: 'guardians', label: 'Guardians', query: 'Guardians of the Galaxy' },
  { key: 'fantastic-four', label: 'Fantastic Four', query: 'Fantastic Four' },
  { key: 'thor', label: 'Thor', query: 'Thor' },
  { key: 'captain-america', label: 'Captain America', query: 'Captain America' },
]

const MARVEL_UNIVERSE = {
  key: 'marvel',
  label: 'Marvel',
  title: 'Marvel Universe',
  tagline: 'A chapter-by-chapter Marvel map with the MCU main saga, side universes, cartoons, anime, and specials.',
  phaseLabel: 'Phase',
  accent: 'red',
  logoImage: 'https://www.marvel.com/assets/marvel-logo.svg',
  heroLanes: HERO_LANES,
  sections: [
    {
      key: 'mcu-main-saga',
      label: 'MCU Main Saga',
      groups: [
        {
          key: 'phase-1',
          label: 'Phase 1',
          items: [
            movie('Iron Man', ['mcu', 'iron-man'], { featured: true }),
            movie('The Incredible Hulk', ['mcu', 'hulk']),
            movie('Iron Man 2', ['mcu', 'iron-man']),
            movie('Thor', ['mcu', 'thor']),
            movie('Captain America: The First Avenger', ['mcu', 'captain-america']),
            movie('The Avengers', ['mcu', 'avengers'], { featured: true }),
          ],
        },
        {
          key: 'phase-2',
          label: 'Phase 2',
          items: [
            movie('Iron Man 3', ['mcu', 'iron-man']),
            movie('Thor: The Dark World', ['mcu', 'thor']),
            movie('Captain America: The Winter Soldier', ['mcu', 'captain-america']),
            movie('Guardians of the Galaxy', ['mcu', 'guardians'], { featured: true }),
            movie('Avengers: Age of Ultron', ['mcu', 'avengers']),
            movie('Ant-Man', ['mcu', 'ant-man']),
          ],
        },
        {
          key: 'phase-3',
          label: 'Phase 3',
          items: [
            movie('Captain America: Civil War', ['mcu', 'captain-america']),
            movie('Doctor Strange', ['mcu', 'doctor-strange']),
            movie('Guardians of the Galaxy Vol. 2', ['mcu', 'guardians']),
            movie('Spider-Man: Homecoming', ['mcu', 'spider-man'], { featured: true }),
            movie('Thor: Ragnarok', ['mcu', 'thor']),
            movie('Black Panther', ['mcu', 'black-panther']),
            movie('Avengers: Infinity War', ['mcu', 'avengers'], { featured: true }),
            movie('Ant-Man and the Wasp', ['mcu', 'ant-man']),
            movie('Captain Marvel', ['mcu', 'captain-marvel']),
            movie('Avengers: Endgame', ['mcu', 'avengers'], { featured: true }),
            movie('Spider-Man: Far From Home', ['mcu', 'spider-man']),
          ],
        },
      ],
    },
    {
      key: 'multiverse-saga',
      label: 'Multiverse Saga',
      groups: [
        {
          key: 'phase-4',
          label: 'Phase 4',
          items: [
            tv('WandaVision', ['mcu', 'wanda']),
            tv('The Falcon and the Winter Soldier', ['mcu', 'captain-america']),
            movie('Black Widow', ['mcu', 'black-widow']),
            tv('Loki', ['mcu', 'loki'], { featured: true }),
            movie('Shang-Chi and the Legend of the Ten Rings', ['mcu', 'shang-chi']),
            movie('Eternals', ['mcu', 'eternals']),
            movie('Spider-Man: No Way Home', ['mcu', 'spider-man'], { featured: true }),
            movie('Doctor Strange in the Multiverse of Madness', ['mcu', 'doctor-strange']),
            tv('Moon Knight', ['mcu', 'moon-knight']),
            movie('Thor: Love and Thunder', ['mcu', 'thor']),
            tv('Ms. Marvel', ['mcu', 'ms-marvel']),
            movie('Black Panther: Wakanda Forever', ['mcu', 'black-panther']),
          ],
        },
        {
          key: 'phase-5',
          label: 'Phase 5',
          items: [
            movie('Ant-Man and the Wasp: Quantumania', ['mcu', 'ant-man']),
            movie('Guardians of the Galaxy Vol. 3', ['mcu', 'guardians']),
            tv('Secret Invasion', ['mcu']),
            movie('The Marvels', ['mcu', 'captain-marvel']),
            tv('Loki', ['mcu', 'loki']),
            tv('Echo', ['mcu', 'daredevil']),
            tv('Agatha All Along', ['mcu', 'wanda']),
            movie('Captain America: Brave New World', ['mcu', 'captain-america']),
            movie('Thunderbolts*', ['mcu']),
          ],
        },
        {
          key: 'phase-6',
          label: 'Phase 6',
          items: [
            movie('The Fantastic Four: First Steps', ['mcu', 'fantastic-four']),
            movie('Avengers: Doomsday', ['mcu', 'avengers']),
            movie('Avengers: Secret Wars', ['mcu', 'avengers']),
          ],
        },
      ],
    },
    {
      key: 'marvel-netflix-universe',
      label: 'Marvel Netflix Universe',
      groups: [
        {
          key: 'watch-order',
          label: 'Watch Order',
          items: [
            tv('Daredevil', ['daredevil'], { featured: true }),
            tv('Jessica Jones', ['jessica-jones']),
            tv('Luke Cage', ['luke-cage']),
            tv('Iron Fist', ['iron-fist']),
            tv('The Defenders', ['daredevil', 'defenders']),
            tv('The Punisher', ['punisher'], { featured: true }),
            tv('Daredevil: Born Again', ['daredevil']),
          ],
        },
      ],
    },
    {
      key: 'shield-abc',
      label: 'Agents of S.H.I.E.L.D / ABC Side',
      groups: [
        {
          key: 'abc-side',
          label: 'ABC / Streaming',
          items: [
            tv('Agents of S.H.I.E.L.D.', ['shield']),
            tv('Agent Carter', ['shield']),
            tv('Inhumans', ['inhumans']),
            tv('Runaways', ['runaways']),
            tv('Cloak & Dagger', ['cloak-dagger']),
          ],
        },
      ],
    },
    {
      key: 'dark-side',
      label: 'Marvel Horror / Dark Side',
      groups: [
        {
          key: 'dark-side',
          label: 'Dark Side',
          items: [
            movie('Blade', ['blade']),
            movie('Blade II', ['blade']),
            movie('Blade: Trinity', ['blade']),
            movie('Ghost Rider', ['ghost-rider']),
            movie('Ghost Rider: Spirit of Vengeance', ['ghost-rider']),
            movie('Morbius', ['morbius'], { featured: true }),
            movie('Werewolf by Night', ['werewolf'], { featured: true }),
          ],
        },
      ],
    },
    {
      key: 'x-men-fox',
      label: 'X-Men / Fox Universe',
      groups: [
        {
          key: 'original-era',
          label: 'Original X-Men Era',
          items: [
            movie('X-Men', ['x-men'], { featured: true }),
            movie('X2', ['x-men']),
            movie('X-Men: The Last Stand', ['x-men']),
            movie('X-Men Origins: Wolverine', ['x-men', 'wolverine']),
          ],
        },
        {
          key: 'reboot-era',
          label: 'Reboot / Timeline Era',
          items: [
            movie('X-Men: First Class', ['x-men']),
            movie('The Wolverine', ['x-men', 'wolverine']),
            movie('X-Men: Days of Future Past', ['x-men'], { featured: true }),
            movie('X-Men: Apocalypse', ['x-men']),
            movie('Logan', ['x-men', 'wolverine'], { featured: true }),
            movie('Dark Phoenix', ['x-men']),
            movie('The New Mutants', ['x-men']),
          ],
        },
        {
          key: 'deadpool-side',
          label: 'Deadpool Side',
          items: [
            movie('Deadpool', ['deadpool'], { featured: true }),
            movie('Deadpool 2', ['deadpool']),
            movie('Deadpool & Wolverine', ['deadpool', 'wolverine'], { featured: true }),
          ],
        },
      ],
    },
    {
      key: 'spider-man-live-action',
      label: 'Spider-Man Live Action Universe',
      groups: [
        {
          key: 'raimi-trilogy',
          label: 'Raimi Trilogy',
          items: [
            movie('Spider-Man', ['spider-man'], { featured: true }),
            movie('Spider-Man 2', ['spider-man'], { featured: true }),
            movie('Spider-Man 3', ['spider-man']),
          ],
        },
        {
          key: 'amazing-spider-man',
          label: 'Amazing Spider-Man',
          items: [
            movie('The Amazing Spider-Man', ['spider-man']),
            movie('The Amazing Spider-Man 2', ['spider-man']),
          ],
        },
        {
          key: 'mcu-spider-man',
          label: 'MCU Spider-Man',
          items: [
            movie('Spider-Man: Homecoming', ['spider-man']),
            movie('Spider-Man: Far From Home', ['spider-man']),
            movie('Spider-Man: No Way Home', ['spider-man'], { featured: true }),
          ],
        },
      ],
    },
    {
      key: 'sony-villain-universe',
      label: 'Sony Villain Universe',
      groups: [
        {
          key: 'sony-villains',
          label: 'Sony Villains',
          items: [
            movie('Venom', ['venom'], { featured: true }),
            movie('Venom: Let There Be Carnage', ['venom']),
            movie('Morbius', ['morbius']),
            movie('Madame Web', ['madame-web']),
            movie('Kraven the Hunter', ['kraven']),
          ],
        },
      ],
    },
    {
      key: 'spider-verse',
      label: 'Spider-Verse Animated Movies',
      groups: [
        {
          key: 'animated-movies',
          label: 'Spider-Verse',
          items: [
            movie('Spider-Man: Into the Spider-Verse', ['spider-man', 'spider-verse', 'animated'], { featured: true }),
            movie('Spider-Man: Across the Spider-Verse', ['spider-man', 'spider-verse', 'animated'], { featured: true }),
            movie('Spider-Man: Beyond the Spider-Verse', ['spider-man', 'spider-verse', 'animated']),
          ],
        },
      ],
    },
    {
      key: 'legendary-cartoons',
      label: 'Legendary Marvel Cartoons',
      groups: [
        {
          key: 'spider-man-cartoons',
          label: 'Spider-Man',
          items: [
            tv('Spider-Man', ['spider-man', 'cartoons'], { featured: true, query: 'Spider-Man 1967' }),
            tv('Spider-Man and His Amazing Friends', ['spider-man', 'cartoons']),
            tv('Spider-Man', ['spider-man', 'cartoons'], { featured: true, query: 'Spider-Man 1994' }),
            tv('Spider-Man Unlimited', ['spider-man', 'cartoons']),
            tv('The Spectacular Spider-Man', ['spider-man', 'cartoons'], { featured: true }),
            tv('Ultimate Spider-Man', ['spider-man', 'cartoons']),
            tv("Marvel's Spider-Man", ['spider-man', 'cartoons']),
            tv('Your Friendly Neighborhood Spider-Man', ['spider-man', 'cartoons']),
          ],
        },
        {
          key: 'avengers-cartoons',
          label: 'Avengers',
          items: [
            tv("The Avengers: Earth's Mightiest Heroes", ['avengers', 'cartoons'], { featured: true }),
            tv('Avengers Assemble', ['avengers', 'cartoons']),
            tv('Marvel Disk Wars: The Avengers', ['avengers', 'cartoons']),
          ],
        },
        {
          key: 'x-men-cartoons',
          label: 'X-Men',
          items: [
            tv('X-Men', ['x-men', 'cartoons'], { featured: true, query: 'X-Men 1992' }),
            tv('X-Men: Evolution', ['x-men', 'cartoons']),
            tv('Wolverine and the X-Men', ['x-men', 'wolverine', 'cartoons']),
            tv("X-Men '97", ['x-men', 'cartoons'], { featured: true }),
          ],
        },
        {
          key: 'other-classics',
          label: 'Other Classics',
          items: [
            tv('Fantastic Four', ['fantastic-four', 'cartoons'], { query: 'Fantastic Four 1994' }),
            tv("Fantastic Four: World's Greatest Heroes", ['fantastic-four', 'cartoons']),
            tv('Iron Man', ['iron-man', 'cartoons'], { featured: true }),
            tv('The Incredible Hulk', ['hulk', 'cartoons']),
            tv('Silver Surfer', ['fantastic-four', 'cartoons']),
            tv('The Super Hero Squad Show', ['avengers', 'fantastic-four', 'cartoons']),
          ],
        },
      ],
    },
    {
      key: 'marvel-anime',
      label: 'Marvel Anime',
      groups: [
        {
          key: 'anime',
          label: 'Anime',
          items: [
            tv('Marvel Anime: Iron Man', ['iron-man', 'anime']),
            tv('Marvel Anime: Wolverine', ['wolverine', 'anime']),
            tv('Marvel Anime: X-Men', ['x-men', 'anime']),
            tv('Marvel Anime: Blade', ['blade', 'anime']),
          ],
        },
      ],
    },
    {
      key: 'animated-movies',
      label: 'Animated Movies',
      groups: [
        {
          key: 'animated-films',
          label: 'Animated Films',
          items: [
            movie('Ultimate Avengers', ['avengers', 'animated']),
            movie('Ultimate Avengers 2', ['avengers', 'animated']),
            movie('Doctor Strange: The Sorcerer Supreme', ['doctor-strange', 'animated']),
            movie('Next Avengers: Heroes of Tomorrow', ['avengers', 'animated']),
            movie('Hulk Vs.', ['hulk', 'animated']),
            movie('Planet Hulk', ['hulk', 'animated']),
            movie('Thor: Tales of Asgard', ['thor', 'animated']),
          ],
        },
      ],
    },
    {
      key: 'multiverse-specials',
      label: 'Multiverse / Specials',
      groups: [
        {
          key: 'specials',
          label: 'Specials',
          items: [
            tv('What If...?', ['what-if', 'animated'], { featured: true }),
            tv('Marvel Zombies', ['zombies', 'animated']),
            tv('I Am Groot', ['guardians', 'groot', 'animated']),
            movie('Werewolf by Night', ['werewolf']),
            movie('The Guardians of the Galaxy Holiday Special', ['guardians']),
          ],
        },
      ],
    },
  ],
}

module.exports = { MARVEL_UNIVERSE }
