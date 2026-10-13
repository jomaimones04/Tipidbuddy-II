import Constants from 'expo-constants';

const API_PORT = 5000;

const isLanIPv4 = (host: string) => {
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

const isUnusableApiHost = (host: string) =>
  !host ||
  host === 'localhost' ||
  host === '127.0.0.1' ||
  /\.exp\.direct$/i.test(host) ||
  /\.exp\.host$/i.test(host) ||
  /ngrok/i.test(host);

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

    if (isUnusableApiHost(host)) {
      continue;
    }

    if (isLanIPv4(host)) {
      return host;
    }
  }

  return null;
};

const configuredApiUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
const configuredApiHost = configuredApiUrl
  ?.replace(/^[a-zA-Z]+:\/\//, '')
  .split('/')[0]
  .split(':')[0]
  .trim();
const fromEnv = configuredApiUrl && configuredApiHost && !isUnusableApiHost(configuredApiHost)
  ? configuredApiUrl
  : null;
const lanHost = lanHostFromExpo();

export const API_BASE_URL =
  fromEnv || (lanHost ? `http://${lanHost}:${API_PORT}` : `http://192.168.1.16:${API_PORT}`);

export const isLikelyLocalBackendUrl = (url: string = API_BASE_URL) =>
  !/\.exp\.direct|\.exp\.host|ngrok/i.test(url);

console.log('TipidBuddy API_BASE_URL:', API_BASE_URL);
