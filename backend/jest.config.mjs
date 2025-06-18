import { createDefaultPreset, pathsToModuleNameMapper } from 'ts-jest';
import tsConfig from './tsconfig.json' assert { type: 'json' };

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
export default {
  testEnvironment: 'node',
  transform: {
    ...tsJestTransformCfg,
  },
  moduleNameMapper: pathsToModuleNameMapper(tsConfig.compilerOptions.paths, {
    prefix: '<rootDir>',
  }),
};
