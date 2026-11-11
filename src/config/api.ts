import Constants from 'expo-constants';

const API_PORT = 5000;

const isPrivateIPv4 = (host: string) => {
  const octets = host.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
};

const isLocalApiHost = (host: string) =>
  host === 'localhost' ||
  host === '::1' ||
  ['.localhost', '.local', '.lan', '.internal'].some((suffix) =>
    host.endsWith(suffix)
  ) ||
  host.startsWith('0.') ||
  host.startsWith('127.') ||
  host.startsWith('169.254.') ||
  /^(?:fc|fd)[0-9a-f]{2}:/i.test(host) ||
  /^fe[89ab][0-9a-f]:/i.test(host) ||
  (host.startsWith('::ffff:') && isPrivateIPv4(host.slice(7))) ||
  isPrivateIPv4(host);

const lanHostFromExpo = (): string | null => {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    Constants.linkingUri,
  ].filter((value): value is string => Boolean(value));

  for (const raw of candidates) {
    const host = raw
      .replace(/^[a-zA-Z]+:\/\//, '')
      .split('/')[0]
      .split(':')[0]
      .trim();

    if (isPrivateIPv4(host)) {
      return host;
    }
  }

  return null;
};

const isDevelopment = typeof __DEV__ !== 'undefined' && __DEV__;
const configuredApiUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

const validateApiUrl = (value: string): string | null => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !hostname ||
    hostname === 'your-deployed-backend-url' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (!isDevelopment && (url.protocol !== 'https:' || isLocalApiHost(hostname)))
  ) {
    return null;
  }

  return url.toString().replace(/\/+$/, '');
};

const configuredUrl = configuredApiUrl
  ? validateApiUrl(configuredApiUrl)
  : null;
const developmentHost = !configuredApiUrl && isDevelopment ? lanHostFromExpo() : null;

export const API_BASE_URL =
  configuredUrl || (developmentHost ? `http://${developmentHost}:${API_PORT}` : '');

export const API_CONFIGURATION_ERROR = configuredApiUrl
  ? isDevelopment
    ? 'EXPO_PUBLIC_API_BASE_URL must be a valid HTTP(S) URL without credentials, a query, or a fragment.'
    : 'EXPO_PUBLIC_API_BASE_URL must be a valid public HTTPS URL without credentials, a query, or a fragment. Production builds cannot use localhost or a private IP address.'
  : isDevelopment
    ? 'Set EXPO_PUBLIC_API_BASE_URL in the root .env file, or start Expo on a LAN with the backend running on port 5000.'
    : 'EXPO_PUBLIC_API_BASE_URL is missing. Configure it in the EAS environment before building the production app.';
