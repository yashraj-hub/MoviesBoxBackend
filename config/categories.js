// Each slug maps to TMDB discover/movie query params
// genre IDs: 28=Action, 12=Adventure, 35=Comedy, 80=Crime, 18=Drama,
//            10751=Family, 14=Fantasy, 36=History, 27=Horror, 10402=Music,
//            9648=Mystery, 10749=Romance, 878=Sci-Fi, 10770=TV Movie,
//            53=Thriller, 10752=War, 37=Western, 16=Animation

const CATEGORIES = {

  // ── Bollywood ──────────────────────────────────────────────────────────────
  'bollywood-2020s': {
    label: '2020s Bollywood',
    zone: 'bollywood',
    query: { with_original_language: 'hi', 'primary_release_date.gte': '2020-01-01', sort_by: 'popularity.desc' },
  },
  'bollywood-2010s': {
    label: '2010s Bollywood',
    zone: 'bollywood',
    query: { with_original_language: 'hi', 'primary_release_date.gte': '2010-01-01', 'primary_release_date.lte': '2019-12-31', sort_by: 'popularity.desc' },
  },
  'bollywood-2000s': {
    label: '2000s Bollywood',
    zone: 'bollywood',
    query: { with_original_language: 'hi', 'primary_release_date.gte': '2000-01-01', 'primary_release_date.lte': '2009-12-31', sort_by: 'popularity.desc' },
  },
  'bollywood-90s': {
    label: '90s Bollywood',
    zone: 'bollywood',
    query: { with_original_language: 'hi', 'primary_release_date.gte': '1990-01-01', 'primary_release_date.lte': '1999-12-31', sort_by: 'popularity.desc' },
  },
  'bollywood-80s': {
    label: '80s Bollywood',
    zone: 'bollywood',
    query: { with_original_language: 'hi', 'primary_release_date.gte': '1980-01-01', 'primary_release_date.lte': '1989-12-31', sort_by: 'popularity.desc' },
  },
  'bollywood-classic': {
    label: 'Classic Bollywood',
    zone: 'bollywood',
    query: { with_original_language: 'hi', 'primary_release_date.lte': '1979-12-31', sort_by: 'popularity.desc' },
  },
  'bollywood-priyadarshan': {
    label: 'Priyadarshan',
    zone: 'bollywood',
    query: { with_original_language: 'hi', with_people: '80387', sort_by: 'popularity.desc' },
  },
  'bollywood-action': {
    label: 'Bollywood Action',
    zone: 'bollywood',
    query: { with_original_language: 'hi', with_genres: '28', sort_by: 'popularity.desc' },
  },
  'bollywood-adventure': {
    label: 'Bollywood Adventure',
    zone: 'bollywood',
    query: { with_original_language: 'hi', with_genres: '12', sort_by: 'popularity.desc' },
  },
  'bollywood-comedy': {
    label: 'Bollywood Comedy',
    zone: 'bollywood',
    query: { with_original_language: 'hi', with_genres: '35', sort_by: 'popularity.desc' },
  },
  'bollywood-crime': {
    label: 'Bollywood Crime',
    zone: 'bollywood',
    query: { with_original_language: 'hi', with_genres: '80', sort_by: 'popularity.desc' },
  },
  'bollywood-drama': {
    label: 'Bollywood Drama',
    zone: 'bollywood',
    query: { with_original_language: 'hi', with_genres: '18', sort_by: 'popularity.desc' },
  },
  'bollywood-family': {
    label: 'Bollywood Family',
    zone: 'bollywood',
    query: { with_original_language: 'hi', with_genres: '10751', sort_by: 'popularity.desc' },
  },
  'bollywood-fantasy': {
    label: 'Bollywood Fantasy',
    zone: 'bollywood',
    query: { with_original_language: 'hi', with_genres: '14', sort_by: 'popularity.desc' },
  },
  'bollywood-horror': {
    label: 'Bollywood Horror',
    zone: 'bollywood',
    query: { with_original_language: 'hi', with_genres: '27', sort_by: 'popularity.desc' },
  },
  'bollywood-scifi': {
    label: 'Bollywood Science Fiction',
    zone: 'bollywood',
    query: { with_original_language: 'hi', with_genres: '878', sort_by: 'popularity.desc' },
  },
  'bollywood-thriller': {
    label: 'Bollywood Thriller',
    zone: 'bollywood',
    query: { with_original_language: 'hi', with_genres: '53', sort_by: 'popularity.desc' },
  },
  'bollywood-romance': {
    label: 'Bollywood Romance',
    zone: 'bollywood',
    query: { with_original_language: 'hi', with_genres: '10749', sort_by: 'popularity.desc' },
  },

  // ── Hollywood ──────────────────────────────────────────────────────────────
  'hollywood-2020s': {
    label: '2020s Hollywood',
    zone: 'hollywood',
    query: { with_original_language: 'en', without_genres: '16', 'primary_release_date.gte': '2020-01-01', sort_by: 'popularity.desc' },
  },
  'hollywood-2010s': {
    label: '2010s Hollywood',
    zone: 'hollywood',
    query: { with_original_language: 'en', without_genres: '16', 'primary_release_date.gte': '2010-01-01', 'primary_release_date.lte': '2019-12-31', sort_by: 'popularity.desc' },
  },
  'hollywood-2000s': {
    label: '2000s Hollywood',
    zone: 'hollywood',
    query: { with_original_language: 'en', without_genres: '16', 'primary_release_date.gte': '2000-01-01', 'primary_release_date.lte': '2009-12-31', sort_by: 'popularity.desc' },
  },
  'hollywood-90s': {
    label: '90s Hollywood',
    zone: 'hollywood',
    query: { with_original_language: 'en', without_genres: '16', 'primary_release_date.gte': '1990-01-01', 'primary_release_date.lte': '1999-12-31', sort_by: 'popularity.desc' },
  },
  'hollywood-80s': {
    label: '80s Hollywood',
    zone: 'hollywood',
    query: { with_original_language: 'en', without_genres: '16', 'primary_release_date.gte': '1980-01-01', 'primary_release_date.lte': '1989-12-31', sort_by: 'popularity.desc' },
  },
  'hollywood-classic': {
    label: 'Classic Hollywood',
    zone: 'hollywood',
    query: { with_original_language: 'en', without_genres: '16', 'primary_release_date.lte': '1979-12-31', sort_by: 'popularity.desc' },
  },
  'hollywood-action': {
    label: 'Hollywood Action',
    zone: 'hollywood',
    query: { with_original_language: 'en', without_genres: '16', with_genres: '28', sort_by: 'popularity.desc' },
  },
  'hollywood-adventure': {
    label: 'Hollywood Adventure',
    zone: 'hollywood',
    query: { with_original_language: 'en', without_genres: '16', with_genres: '12', sort_by: 'popularity.desc' },
  },
  'hollywood-comedy': {
    label: 'Hollywood Comedy',
    zone: 'hollywood',
    query: { with_original_language: 'en', without_genres: '16', with_genres: '35', sort_by: 'popularity.desc' },
  },
  'hollywood-crime': {
    label: 'Hollywood Crime',
    zone: 'hollywood',
    query: { with_original_language: 'en', without_genres: '16', with_genres: '80', sort_by: 'popularity.desc' },
  },
  'hollywood-drama': {
    label: 'Hollywood Drama',
    zone: 'hollywood',
    query: { with_original_language: 'en', without_genres: '16', with_genres: '18', sort_by: 'popularity.desc' },
  },
  'hollywood-family': {
    label: 'Hollywood Family',
    zone: 'hollywood',
    query: { with_original_language: 'en', without_genres: '16', with_genres: '10751', sort_by: 'popularity.desc' },
  },
  'hollywood-fantasy': {
    label: 'Hollywood Fantasy',
    zone: 'hollywood',
    query: { with_original_language: 'en', without_genres: '16', with_genres: '14', sort_by: 'popularity.desc' },
  },
  'hollywood-history': {
    label: 'Hollywood History',
    zone: 'hollywood',
    query: { with_original_language: 'en', without_genres: '16', with_genres: '36', sort_by: 'popularity.desc' },
  },
  'hollywood-horror': {
    label: 'Hollywood Horror',
    zone: 'hollywood',
    query: { with_original_language: 'en', without_genres: '16', with_genres: '27', sort_by: 'popularity.desc' },
  },
  'hollywood-music': {
    label: 'Hollywood Music',
    zone: 'hollywood',
    query: { with_original_language: 'en', without_genres: '16', with_genres: '10402', sort_by: 'popularity.desc' },
  },
  'hollywood-mystery': {
    label: 'Hollywood Mystery',
    zone: 'hollywood',
    query: { with_original_language: 'en', without_genres: '16', with_genres: '9648', sort_by: 'popularity.desc' },
  },
  'hollywood-romance': {
    label: 'Hollywood Romance',
    zone: 'hollywood',
    query: { with_original_language: 'en', without_genres: '16', with_genres: '10749', sort_by: 'popularity.desc' },
  },
  'hollywood-scifi': {
    label: 'Hollywood Science Fiction',
    zone: 'hollywood',
    query: { with_original_language: 'en', without_genres: '16', with_genres: '878', sort_by: 'popularity.desc' },
  },
  'hollywood-tvmovie': {
    label: 'Hollywood TV Movie',
    zone: 'hollywood',
    query: { with_original_language: 'en', with_genres: '10770', sort_by: 'popularity.desc' },
  },
  'hollywood-thriller': {
    label: 'Hollywood Thriller',
    zone: 'hollywood',
    query: { with_original_language: 'en', without_genres: '16', with_genres: '53', sort_by: 'popularity.desc' },
  },
  'hollywood-war': {
    label: 'Hollywood War',
    zone: 'hollywood',
    query: { with_original_language: 'en', without_genres: '16', with_genres: '10752', sort_by: 'popularity.desc' },
  },
  'hollywood-western': {
    label: 'Hollywood Western',
    zone: 'hollywood',
    query: { with_original_language: 'en', without_genres: '16', with_genres: '37', sort_by: 'popularity.desc' },
  },

  // ── Animation ─────────────────────────────────────────────────────────────
  'animation-modern': {
    label: 'Modern Masterpieces',
    zone: 'animation',
    query: { with_genres: '16', 'primary_release_date.gte': '2020-01-01', sort_by: 'vote_average.desc', 'vote_count.gte': '200' },
  },
  'animation-2010s': {
    label: 'The 2010s Era',
    zone: 'animation',
    query: { with_genres: '16', 'primary_release_date.gte': '2010-01-01', 'primary_release_date.lte': '2019-12-31', sort_by: 'popularity.desc' },
  },
  'animation-2000s': {
    label: 'The 2000s Era',
    zone: 'animation',
    query: { with_genres: '16', 'primary_release_date.gte': '2000-01-01', 'primary_release_date.lte': '2009-12-31', sort_by: 'popularity.desc' },
  },
  'animation-90s': {
    label: '90s Classics',
    zone: 'animation',
    query: { with_genres: '16', 'primary_release_date.gte': '1990-01-01', 'primary_release_date.lte': '1999-12-31', sort_by: 'popularity.desc' },
  },
  'animation-vintage': {
    label: 'Vintage Cartoons',
    zone: 'animation',
    query: { with_genres: '16', 'primary_release_date.lte': '1989-12-31', sort_by: 'popularity.desc' },
  },
  'animation-stopmotion': {
    label: 'Stop Motion',
    zone: 'animation',
    query: { with_genres: '16', with_keywords: '9882', sort_by: 'popularity.desc' },
  },
  'animation-anime': {
    label: 'Anime',
    zone: 'animation',
    query: { with_genres: '16', with_keywords: '210024', sort_by: 'popularity.desc' },
  },
  'animation-3d': {
    label: '3D Animation',
    zone: 'animation',
    query: { with_genres: '16', with_keywords: '278823|10159', sort_by: 'popularity.desc' },
  },
  'animation-puppet': {
    label: 'Puppet Animation',
    zone: 'animation',
    query: { with_genres: '16', with_keywords: '290380', sort_by: 'popularity.desc' },
  },
  'animation-2d': {
    label: '2D / Hand Drawn',
    zone: 'animation',
    query: { with_genres: '16', with_keywords: '9717', sort_by: 'popularity.desc' },
  },
}

// Grouped by zone for easy page-level access
const CATEGORIES_BY_ZONE = {
  bollywood: Object.entries(CATEGORIES).filter(([, v]) => v.zone === 'bollywood').map(([slug, v]) => ({ slug, ...v })),
  hollywood: Object.entries(CATEGORIES).filter(([, v]) => v.zone === 'hollywood').map(([slug, v]) => ({ slug, ...v })),
  animation: Object.entries(CATEGORIES).filter(([, v]) => v.zone === 'animation').map(([slug, v]) => ({ slug, ...v })),
}

module.exports = { CATEGORIES, CATEGORIES_BY_ZONE }
