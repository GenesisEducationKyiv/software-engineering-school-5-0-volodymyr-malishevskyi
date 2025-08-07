export interface HttpRequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string | object | FormData;
  queryParams?: Record<string, string>;
  timeout?: number;
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  url: string;
}

export abstract class HttpClient {
  abstract request<T = unknown>(config: HttpRequestConfig): Promise<HttpResponse<T>>;

  async get<T = unknown>(url: string, config?: Omit<HttpRequestConfig, 'url' | 'method'>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'GET' });
  }

  async post<T>(
    url: string,
    body?: HttpRequestConfig['body'],
    config?: Omit<HttpRequestConfig, 'url' | 'method' | 'body'>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'POST', body });
  }

  async put<T>(
    url: string,
    body?: HttpRequestConfig['body'],
    config?: Omit<HttpRequestConfig, 'url' | 'method' | 'body'>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PUT', body });
  }

  async delete<T>(url: string, config?: Omit<HttpRequestConfig, 'url' | 'method'>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'DELETE' });
  }

  async patch<T>(
    url: string,
    body?: HttpRequestConfig['body'],
    config?: Omit<HttpRequestConfig, 'url' | 'method' | 'body'>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PATCH', body });
  }
}

export class FetchHttpClient extends HttpClient {
  async request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const { url, method, headers, body, queryParams, timeout } = config;

    const urlWithParams = new URL(url);
    if (queryParams) {
      for (const key in queryParams) {
        if (Object.prototype.hasOwnProperty.call(queryParams, key)) {
          urlWithParams.searchParams.append(key, queryParams[key]);
        }
      }
    }

    const controller = new AbortController();
    const signal = controller.signal;
    const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : undefined;

    try {
      const response = await fetch(urlWithParams.toString(), {
        method,
        headers,
        body: body
          ? typeof body === 'object' && !(body instanceof FormData)
            ? JSON.stringify(body)
            : body
          : undefined,
        signal,
      });

      clearTimeout(timeoutId);

      // if (!response.ok) {
      //   const errorBody = await response.text();
      //   throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
      // }

      const data = response.headers.get('Content-Type')?.includes('application/json')
        ? ((await response.json()) as T)
        : ((await response.text()) as T);

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        url: response.url,
      };
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}
