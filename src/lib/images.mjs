/**
 * Реестр фотографий.
 *
 * Все изображения лежат локально в public/images/photos и отдаются с нашего
 * домена: правило «ноль внешних запросов» распространяется и на картинки.
 *
 * Лицензия Unsplash разрешает коммерческое использование без разрешения и без
 * атрибуции. Авторы всё равно перечислены на /credits/ — это вопрос приличия,
 * а не требования, и заодно сигнал того, что источники у сайта прослеживаются.
 */
import data from '../data/images.json' with { type: 'json' };

export const PHOTOS = Object.fromEntries(data.photos.map((p) => [p.slug, p]));
export const ALL_PHOTOS = data.photos;

export function photo(slug) {
  return PHOTOS[slug] ?? null;
}

/** Сектор → фотография. Там, где честного соответствия нет, изображения нет. */
export const SECTOR_PHOTO = {
  technology: 'data-centre',
  transportation: 'container-port',
  manufacturing: 'factory',
  hospitality: 'hotel-lobby',
  healthcare: 'hospital',
  'government-defense': 'government',
  'energy-utilities': 'substation',
  'financial-services': 'financial-district',
  'professional-services': 'abu-dhabi',
  'retail-ecommerce': 'dubai-skyline',
};

export function sectorPhoto(slug) {
  return photo(SECTOR_PHOTO[slug]);
}
