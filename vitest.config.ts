// Unit tests only; e2e/ holds the Playwright browser tests.
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({ test: { exclude: [...configDefaults.exclude, "e2e/**"] } });
