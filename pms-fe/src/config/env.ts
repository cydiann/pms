import { Platform } from 'react-native';

// Simple environment configuration without native dependencies
const ENV_CONFIG = {
  // Development Environment Configuration
  NODE_ENV: __DEV__ ? 'development' : 'production',

  // Backend API Configuration
  API_HOST_LOCAL: 'localhost',
  API_HOST_NETWORK: '192.168.1.103',
  API_PORT: '8000',
  API_PROTOCOL: 'http',

  // Debug Settings
  DEBUG_MODE: __DEV__,
  LOG_LEVEL: 'debug',

  // Feature Flags
  ENABLE_DEV_MENU: __DEV__,
};

export default ENV_CONFIG;