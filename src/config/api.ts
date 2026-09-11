import Constants from 'expo-constants';

const API_PORT = 5000;

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

    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return host;
    }
  }

  return null;
};

const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
const lanHost = lanHostFromExpo();

export const API_BASE_URL =
  fromEnv || (lanHost ? `http://${lanHost}:${API_PORT}` : `http://192.168.68.108:${API_PORT}`);

console.log('TipidBuddy API_BASE_URL:', API_BASE_URL);
