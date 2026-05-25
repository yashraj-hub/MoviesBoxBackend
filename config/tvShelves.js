const TV_SHELVES = {
  trending: {
    label: 'Trending Now',
    type: 'trending',
  },
  topRated: {
    label: 'Top Rated of All Time',
    query: {
      sort_by: 'vote_average.desc',
      'vote_count.gte': '250',
    },
  },
  popular: {
    label: 'Popular Right Now',
    query: {
      sort_by: 'popularity.desc',
      'vote_count.gte': '50',
    },
  },
  hindi: {
    label: 'Hindi Originals',
    query: {
      with_original_language: 'hi',
      sort_by: 'popularity.desc',
    },
  },
  animation: {
    label: 'Animated TV',
    query: {
      with_genres: '16',
      sort_by: 'popularity.desc',
    },
  },
  actionAdventure: {
    label: 'Action & Adventure',
    query: {
      with_genres: '10759',
      sort_by: 'popularity.desc',
    },
  },
  crime: {
    label: 'Crime Stories',
    query: {
      with_genres: '80',
      sort_by: 'popularity.desc',
    },
  },
  drama: {
    label: 'Drama',
    query: {
      with_genres: '18',
      sort_by: 'popularity.desc',
    },
  },
  family: {
    label: 'Family & Kids',
    query: {
      with_genres: '10751,10762',
      sort_by: 'popularity.desc',
    },
  },
  kids: {
    label: 'Kids Only',
    query: {
      with_genres: '10762',
      sort_by: 'popularity.desc',
    },
  },
  documentary: {
    label: 'Documentary',
    query: {
      with_genres: '99',
      sort_by: 'popularity.desc',
    },
  },
  sciFiFantasy: {
    label: 'Sci-Fi & Fantasy',
    query: {
      with_genres: '10765',
      sort_by: 'popularity.desc',
    },
  },
  mystery: {
    label: 'Mystery',
    query: {
      with_genres: '9648',
      sort_by: 'popularity.desc',
    },
  },
  reality: {
    label: 'Reality',
    query: {
      with_genres: '10764',
      sort_by: 'popularity.desc',
    },
  },
  talk: {
    label: 'Talk',
    query: {
      with_genres: '10767',
      sort_by: 'popularity.desc',
    },
  },
  news: {
    label: 'News',
    query: {
      with_genres: '10763',
      sort_by: 'popularity.desc',
    },
  },
  soap: {
    label: 'Soap',
    query: {
      with_genres: '10766',
      sort_by: 'popularity.desc',
    },
  },
  warPolitics: {
    label: 'War & Politics',
    query: {
      with_genres: '10768',
      sort_by: 'popularity.desc',
    },
  },
  western: {
    label: 'Western',
    query: {
      with_genres: '37',
      sort_by: 'popularity.desc',
    },
  },
  japanese: {
    label: 'Japanese Hits',
    query: {
      with_original_language: 'ja',
      sort_by: 'popularity.desc',
    },
  },
  korean: {
    label: 'Korean Hits',
    query: {
      with_original_language: 'ko',
      sort_by: 'popularity.desc',
    },
  },
  spanish: {
    label: 'Spanish Favorites',
    query: {
      with_original_language: 'es',
      sort_by: 'popularity.desc',
    },
  },
}

module.exports = { TV_SHELVES }
