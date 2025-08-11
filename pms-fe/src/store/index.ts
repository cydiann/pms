import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, PersistConfig } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from '@reduxjs/toolkit';

import authSlice from './slices/authSlice';
import requestsSlice from './slices/requestsSlice';
import organizationSlice from './slices/organizationSlice';
import appSlice from './slices/appSlice';
import adminSlice from './slices/adminSlice';

// Root state type
export type RootState = {
  auth: ReturnType<typeof authSlice>;
  requests: ReturnType<typeof requestsSlice>;
  organization: ReturnType<typeof organizationSlice>;
  app: ReturnType<typeof appSlice>;
  admin: ReturnType<typeof adminSlice>;
};

// Persist configuration
const persistConfig: PersistConfig<RootState> = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'organization'], // Only persist auth and organization data
  blacklist: ['requests', 'app', 'admin'], // Don't persist requests, app, and admin state
};

// Root reducer
const rootReducer = combineReducers({
  auth: authSlice,
  requests: requestsSlice,
  organization: organizationSlice,
  app: appSlice,
  admin: adminSlice,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/FLUSH',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PERSIST',
          'persist/PURGE',
          'persist/REGISTER',
        ],
      },
    }),
});

// Persistor
export const persistor = persistStore(store);

// Types
export type AppDispatch = typeof store.dispatch;
export type AppGetState = typeof store.getState;