throw new Error(
  [
    'Do not run Expo from the backend/ folder.',
    'The Express API is:  cd backend && npm start   (node src/server.js)',
    'The mobile app is:   cd the repo root && npx expo start',
  ].join('\n')
);
