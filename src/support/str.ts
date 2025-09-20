export const kebab = (str: string): string => str
    .replace(/([a-z])([A-Z0-9])/g, '$1-$2')
    .replace(/([0-9])([a-zA-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();