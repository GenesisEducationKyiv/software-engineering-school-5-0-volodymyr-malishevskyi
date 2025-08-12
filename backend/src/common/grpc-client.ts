import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import logger from './logging/logger';

export interface GrpcClientConfig {
  serverAddress: string;
  protoPath: string;
  serviceName: string;
  timeout?: number;
  credentials?: grpc.ChannelCredentials;
}

export abstract class GrpcClient {
  protected client!: grpc.Client;
  protected readonly config: GrpcClientConfig;

  constructor(config: GrpcClientConfig) {
    this.config = {
      timeout: 10000,
      credentials: grpc.credentials.createInsecure(),
      ...config,
    };
    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      const packageDefinition = protoLoader.loadSync(this.config.protoPath, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });

      const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
      const serviceConstructor = this.getServiceConstructor(protoDescriptor);

      this.client = new serviceConstructor(this.config.serverAddress, this.config.credentials!);

      logger.info('gRPC client initialized', {
        type: 'grpc-client',
        serverAddress: this.config.serverAddress,
        serviceName: this.config.serviceName,
      });
    } catch (error) {
      logger.error('Failed to initialize gRPC client', {
        type: 'grpc-client',
        error: error instanceof Error ? error.message : 'Unknown error',
        serverAddress: this.config.serverAddress,
      });
      throw error;
    }
  }

  private getServiceConstructor(protoDescriptor: grpc.GrpcObject): grpc.ServiceClientConstructor {
    const parts = this.config.serviceName.split('.');
    let current: grpc.GrpcObject | grpc.ServiceClientConstructor = protoDescriptor;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part] as grpc.GrpcObject | grpc.ServiceClientConstructor;
      } else {
        throw new Error(`Service ${this.config.serviceName} not found in proto definition`);
      }
    }

    return current as grpc.ServiceClientConstructor;
  }

  protected promisifyCall<TRequest, TResponse>(methodName: string, request: TRequest): Promise<TResponse> {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + (this.config.timeout || 10000);

      (this.client as grpc.Client & Record<string, (...args: unknown[]) => void>)[methodName](
        request,
        { deadline },
        (error: grpc.ServiceError | null, response: TResponse) => {
          if (error) {
            logger.error('gRPC call failed', {
              type: 'grpc-client',
              method: methodName,
              error: error.message,
              code: error.code,
            });
            reject(error);
          } else {
            logger.info('gRPC call successful', {
              type: 'grpc-client',
              method: methodName,
            });
            resolve(response);
          }
        },
      );
    });
  }

  public close(): void {
    if (this.client) {
      this.client.close();
      logger.info('gRPC client closed', {
        type: 'grpc-client',
        serverAddress: this.config.serverAddress,
      });
    }
  }
}
