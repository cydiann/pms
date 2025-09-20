import { TFunction } from 'react-i18next';

/**
 * Translates Django permission names to localized versions
 * @param permissionName - The Django permission name (e.g., "Can add user")
 * @param t - Translation function from useTranslation hook
 * @returns Translated permission name or original if no translation found
 */
export function translatePermissionName(permissionName: string, t: TFunction): string {
  // Try to get translation from permissions namespace
  const translationKey = `permissions.${permissionName}`;
  const translated = t(translationKey);

  // If translation exists and is different from the key, return it
  if (translated !== translationKey) {
    return translated;
  }

  // Fallback: return original permission name
  return permissionName;
}

/**
 * Translates permission codename to localized version
 * @param codename - The Django permission codename (e.g., "add_user")
 * @param t - Translation function from useTranslation hook
 * @returns Translated permission codename or original if no translation found
 */
export function translatePermissionCodename(codename: string, t: TFunction): string {
  // Try to get translation from permissions namespace
  const translationKey = `permissions.${codename}`;
  const translated = t(translationKey);

  // If translation exists and is different from the key, return it
  if (translated !== translationKey) {
    return translated;
  }

  // Fallback: return original codename
  return codename;
}