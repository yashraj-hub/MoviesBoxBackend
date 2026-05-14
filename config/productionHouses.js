// Master config — add a new page by adding a new key here
// TMDB genre IDs: 16=Animation, 28=Action, 35=Comedy, 18=Drama
// excludeGenres: genres to filter OUT from results

const PRODUCTION_HOUSES = {
  bollywood: [
    { id: 19146, name: 'Dharma Productions',       slug: 'dharma' },
    { id: 1569,  name: 'Yash Raj Films',            slug: 'yashraj' },
    { id: 2343,  name: 'Red Chillies Entertainment', slug: 'redchillies' },
    { id: 2934,  name: 'Excel Entertainment',        slug: 'excel' },
    { id: 3522,  name: 'T-Series',                  slug: 'tseries' },
    { id: 86699, name: 'Maddock Films',             slug: 'maddock' },
    { id: 115477,name: 'Jio Studios',               slug: 'jiostudios' },
  ],
  hollywood: [
    { id: 33,    name: 'Universal Pictures',    slug: 'universal' },
    { id: 4,     name: 'Paramount Pictures',    slug: 'paramount' },
    { id: 174,   name: 'Warner Bros.',          slug: 'warnerbros' },
    { id: 923,   name: 'Legendary Pictures',    slug: 'legendary' },
    { id: 41077, name: 'A24',                   slug: 'a24' },
    { id: 5,     name: 'Columbia Pictures',     slug: 'columbia' },
    { id: 420,   name: 'Marvel Studios',        slug: 'marvel' },
    { id: 82819, name: 'Skydance Media',        slug: 'skydance' },
  ],
  animation: [
    { id: 3,     name: 'Pixar',                 slug: 'pixar' },
    { id: 2,     name: 'Walt Disney Pictures',  slug: 'disney-anim' },
    { id: 521,   name: 'DreamWorks Animation',  slug: 'dreamworks' },
    { id: 6704,  name: 'Illumination',          slug: 'illumination' },
    { id: 10342, name: 'Studio Ghibli',         slug: 'ghibli' },
    { id: 2251,  name: 'Sony Pictures Animation', slug: 'sony-anim' },
    { id: 9383,  name: 'Blue Sky Studios',      slug: 'bluesky' },
    { id: 11537, name: 'LAIKA',                 slug: 'laika' },
    { id: 297,   name: 'Aardman',               slug: 'aardman' },
    { id: 23948, name: 'Cartoon Saloon',        slug: 'cartoonsaloon' },
  ],
}

// Per-category TMDB discover filters
const CATEGORY_FILTERS = {
  bollywood: { with_original_language: 'hi' },
  hollywood: { with_original_language: 'en', without_genres: '16' }, // exclude animation
  animation: { with_genres: '16' },
}

module.exports = { PRODUCTION_HOUSES, CATEGORY_FILTERS }
