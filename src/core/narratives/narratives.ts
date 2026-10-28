import { ForensicAsset } from '../forensics/types';
import { SupportedLocale } from './types';
import enLocale from '../../locales/en.json';
import idLocale from '../../locales/id.json';
import arLocale from '../../locales/ar.json';

const LOCALES: Record<SupportedLocale, Record<string, Record<string, string>>> = {
  en: enLocale as unknown as Record<string, Record<string, string>>,
  id: idLocale as unknown as Record<string, Record<string, string>>,
  ar: arLocale as unknown as Record<string, Record<string, string>>
};

/**
 * Translates a key with parameter substitution and strips HTML tags to produce pure plain text.
 */
export function translate(
  key: string,
  params: Record<string, unknown> = {},
  locale: string = 'en',
  section: string = 'narratives'
): string {
  const activeLocale: SupportedLocale =
    locale in LOCALES ? (locale as SupportedLocale) : 'en';
  const dictionary = LOCALES[activeLocale]?.[section] || LOCALES.en[section] || {};
  let template = dictionary[key] || LOCALES.en[section]?.[key] || key;

  for (const [k, v] of Object.entries(params)) {
    template = template.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v ?? ''));
  }

  // Strip HTML tags for clean plain text output
  return template
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .trim();
}

const EDIT_SOFTWARE = [
  'adobe',
  'photoshop',
  'lightroom',
  'gimp',
  'canva',
  'snapseed',
  'pixlr',
  'corel',
  'affinity',
  'picsart'
];

/**
 * Generates plain-text hardware profile and software tampering narrative.
 */
export function generateHardwareNarrative(
  props: Record<string, unknown>,
  locale: string = 'en'
): string {
  const make = String(props.Make || 'an unknown manufacturer');
  const model = String(props.Model || 'an unspecified device');
  const lensModel = props.LensModel ? String(props.LensModel) : '';
  const lens = lensModel ? ` ${translate('with_lens', { lens: lensModel }, locale)}` : '';
  const softwareName = props.Software ? String(props.Software) : '';

  const isModified =
    softwareName && EDIT_SOFTWARE.some((s) => softwareName.toLowerCase().includes(s));

  if (isModified) {
    return translate('hardware_mod', { make, model, lens, software: softwareName }, locale);
  }

  let narrative = translate('hardware', { make, model, lens }, locale);
  if (softwareName) {
    narrative += ` ${translate('hardware_software', { software: softwareName }, locale)}`;
  }
  narrative += ` ${translate('hardware_analysis', {}, locale)}`;

  return narrative.trim();
}

/**
 * Generates plain-text digital integrity narrative for a single forensic asset.
 */
export function generateIntegrityNarrative(asset: ForensicAsset, locale: string = 'en'): string {
  if (asset.integrityAlerts && asset.integrityAlerts.length > 0) {
    return asset.integrityAlerts.map((a) => a.defaultMessage).join(' | ');
  }

  const hasGps =
    asset.exifData.latitude !== undefined && asset.exifData.longitude !== undefined;
  const hasDate = Boolean(
    asset.exifData.DateTimeOriginal ||
      asset.exifData.DateTimeDigitized ||
      asset.exifData.DateTime
  );
  const hasDevice = Boolean(asset.exifData.Make || asset.exifData.Model);

  if (!hasGps && hasDate && hasDevice) {
    return translate('integrity_clean_no_gps', {}, locale);
  }
  if (!hasDate && hasGps && hasDevice) {
    return translate('integrity_clean_no_datetime', {}, locale);
  }
  if (!hasDevice && hasGps && hasDate) {
    return translate('integrity_clean_no_device', {}, locale);
  }

  return translate('integrity_clean', {}, locale);
}
