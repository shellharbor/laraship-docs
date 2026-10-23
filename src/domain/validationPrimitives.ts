export const validSlug = (value: string) => /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value) && value.toLowerCase() !== 'nginxproxy';
