/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // Clean Architecture: Controllers should not directly access repositories
    {
      name: 'no-controller-to-repository',
      comment: 'Controllers should not directly depend on repositories - use services instead',
      severity: 'error',
      from: {
        path: '\\.controller\\.(ts|js)$',
      },
      to: {
        path: 'repository/.*\\.(ts|js)$',
      },
    },

    // Clean Architecture: Controllers should not directly access domain entities
    {
      name: 'no-controller-to-domain-entities',
      comment: 'Controllers should not directly depend on domain entities - use DTOs/interfaces',
      severity: 'error',
      from: {
        path: '\\.controller\\.(ts|js)$',
      },
      to: {
        path: 'domain/entities/.*\\.(ts|js)$',
      },
    },

    // Infrastructure should not depend on application services
    {
      name: 'no-infrastructure-to-application',
      comment: 'Infrastructure layer should not depend on application services',
      severity: 'error',
      from: {
        path: '(repository|providers)/.*\\.(ts|js)$',
      },
      to: {
        path: '\\.service\\.(ts|js)$',
      },
    },

    // Domain entities should not depend on external services
    {
      name: 'no-domain-to-external',
      comment: 'Domain entities should not depend on external services or infrastructure',
      severity: 'error',
      from: {
        path: 'domain/entities/.*\\.(ts|js)$',
      },
      to: {
        path: '(repository|providers|services)/.*\\.(ts|js)$',
      },
    },

    // Prevent circular dependencies
    {
      name: 'no-circular',
      comment: 'Circular dependencies are not allowed',
      severity: 'warn',
      from: {
        pathNot: '^(node_modules|tests|dist)',
      },
      to: {
        circular: true,
      },
    },

    // Module isolation: Weather module should not depend on Subscription module
    {
      name: 'no-weather-to-subscription',
      comment: 'Weather module should not depend on Subscription module',
      severity: 'error',
      from: {
        path: 'modules/weather/.*\\.(ts|js)$',
      },
      to: {
        path: 'modules/subscription/.*\\.(ts|js)$',
      },
    },

    // Module isolation: Subscription module should not depend on Weather module
    {
      name: 'no-subscription-to-weather',
      comment: 'Subscription module should not depend on Weather module',
      severity: 'error',
      from: {
        path: 'modules/subscription/.*\\.(ts|js)$',
      },
      to: {
        path: 'modules/weather/.*\\.(ts|js)$',
      },
    },

    // No direct database access from controllers
    {
      name: 'no-controller-to-database',
      comment: 'Controllers should not directly access database - use repositories via services',
      severity: 'error',
      from: {
        path: '\\.controller\\.(ts|js)$',
      },
      to: {
        path: '(lib/prisma|prisma).*\\.(ts|js)$',
      },
    },

    // Prevent accessing test files from source code
    {
      name: 'no-source-to-test',
      comment: 'Source code should not depend on test files',
      severity: 'error',
      from: {
        path: '^src/',
      },
      to: {
        path: '^tests/',
      },
    },
  ],

  required: [
    // All controllers must depend on their corresponding service or service interface
    {
      name: 'controllers-must-use-services',
      comment: 'Controllers must use their corresponding service or service interface',
      severity: 'error',
      module: {
        path: '\\.controller\\.(ts|js)$',
        pathNot: '^tests/',
      },
      to: {
        path: '(\\.service\\.(ts|js)$|types/.*service\\.(ts|js)$)',
      },
    },
  ],

  options: {
    // Include only source files, exclude tests and node_modules for main analysis
    includeOnly: '^src/',

    // Don't follow dependencies in these directories
    doNotFollow: {
      path: '^(node_modules|tests|dist|coverage)',
    },

    // TypeScript configuration
    tsConfig: {
      fileName: 'tsconfig.json',
    },

    // Enhanced resolve options for better module resolution
    enhancedResolveOptions: {
      mainFields: ['main', 'types', 'typings'],
    },

    // Cache configuration for faster subsequent runs
    cache: {
      folder: 'node_modules/.cache/dependency-cruiser',
      strategy: 'metadata',
    },

    // Reporter options
    reporterOptions: {
      dot: {
        theme: {
          graph: {
            splines: 'ortho',
            bgcolor: 'white',
            fontcolor: 'black',
          },
          node: {
            color: 'black',
            fillcolor: 'lightgray',
            fontcolor: 'black',
          },
          edge: {
            arrowhead: 'vee',
            color: 'black',
            fontcolor: 'black',
          },
          modules: [
            {
              criteria: { source: '\\.controller\\.(ts|js)$' },
              attributes: {
                shape: 'rectangle',
                fillcolor: 'lightblue',
                style: 'filled',
              },
            },
            {
              criteria: { source: '\\.service\\.(ts|js)$' },
              attributes: {
                shape: 'ellipse',
                fillcolor: 'lightgreen',
                style: 'filled',
              },
            },
            {
              criteria: { source: 'repository/.*\\.(ts|js)$' },
              attributes: {
                shape: 'cylinder',
                fillcolor: 'lightyellow',
                style: 'filled',
              },
            },
            {
              criteria: { source: 'domain/entities/.*\\.(ts|js)$' },
              attributes: {
                shape: 'hexagon',
                fillcolor: 'lightcoral',
                style: 'filled',
              },
            },
          ],
        },
      },
    },
  },
};
