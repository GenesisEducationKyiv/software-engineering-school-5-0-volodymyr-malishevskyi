import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';

let container: StartedPostgreSqlContainer;
let prisma: PrismaClient;

export async function setupTestDatabase(): Promise<{ container: StartedPostgreSqlContainer; prisma: PrismaClient }> {
  // Create a PostgreSQL container for testing
  container = await new PostgreSqlContainer('postgres:17').start();

  const dbConnectionString = buildDbConnectionString(container);

  // Run Prisma migrations to set up the database schema
  execSync(`npx prisma migrate deploy`, {
    env: {
      DATABASE_URL: dbConnectionString,
      PATH: process.env.PATH,
    },
    stdio: 'ignore',
  });

  // Create a Prisma client instance with the test database connection
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: dbConnectionString,
      },
    },
  });

  return { container, prisma };
}

export async function teardownTestDatabase() {
  await prisma.$disconnect();
  if (container) {
    await container.stop();
  }
}

function buildDbConnectionString(container: StartedPostgreSqlContainer): string {
  const username = container.getUsername();
  const password = container.getPassword();
  const host = container.getHost();
  const port = container.getPort();
  const database = container.getDatabase();

  return `postgresql://${username}:${password}@${host}:${port}/${database}`;
}
