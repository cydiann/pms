# Repository Guidelines

## Project Structure & Module Organization
This mono-repo hosts the Django backend in `pms-be` and the React Native client in `pms-fe`. Backend apps such as `authentication/`, `organization/`, `requisition/`, and shared `core/` keep code modular, with global routing in `backend/urls.py` and deployment helpers like `docker-compose.yml` at the root. Tests stay alongside their apps in `*/tests/`, while scripts (`run_tests.sh`, `entrypoint.sh`) and fixtures (`fixture.sh`, `railway_dump.sql`) support local setup. The client keeps shared logic under `pms-fe/src` (feature folders for `screens/`, `navigation/`, `services/`, `store/`), static assets in `public/`, and platform shells in `android/` and `ios/`. Jest specs live in `pms-fe/__tests__`.

## Build, Test, and Development Commands
Backend: `pip install -r pms-be/requirements.txt`, then `python manage.py migrate` and `python manage.py runserver` from `pms-be` to expose the API; `./run_tests.sh models` runs the supported suite; `docker compose -f pms-be/docker-compose.yml up` provisions Postgres, MinIO, and supporting services. Front end: `npm install` in `pms-fe`, `npm run ios|android|web` target platforms, `npm start` attaches the Metro bundler, `npm test` executes Jest, and `npm run lint` checks ESLint. Use `npm run build:web` for a production bundle.

## Coding Style & Naming Conventions
Use 4-space indentation for Python, `PascalCase` classes/models, and `snake_case` functions and fields; align serializers and views with their model names for traceability. TypeScript React components and screens stay in `PascalCase.tsx`, hooks/utilities in `camelCase.ts`, and Redux slices/services in descriptive folders. ESLint (`@react-native` preset) and Prettier 2.8.x (`npx prettier --check .`) enforce formatting—run both before committing.

## Testing Guidelines
Django tests reside in each app’s `tests` package (`test_models.py`, `test_views.py`). Prefer unit coverage for new business rules and flag any view tests because DRF view specs are temporarily disabled (see `run_tests.sh`). For the client, colocate specs under `__tests__` or alongside components as `*.test.tsx`; mock API calls via React Query providers and refresh snapshots after UI changes.

## Commit & Pull Request Guidelines
Commits mostly follow Conventional Commits (`feat`, `fix`, `chore`), so stick to `<type>: <imperative summary>` with scoped changes. Squash noisy work-in-progress commits locally. Pull requests should link the tracking issue, describe behavioural changes, list manual test steps (e.g., `npm run web` and scenario), and attach screenshots/recordings for UI updates. Request reviews from both backend and frontend owners when touching shared contracts.
