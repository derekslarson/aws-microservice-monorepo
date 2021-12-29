import "reflect-metadata";
import { injectable, inject } from "inversify";
import { AxiosRequestConfig, AxiosResponse } from "axios";
import { Axios, AxiosFactory } from "../factories/axios.factory";
import { TYPES } from "../inversion-of-control/types";
import { LoggerServiceInterface } from "./logger.service";
import { ResponseWithParsedBody } from "../models/http/response.model";

@injectable()
export class HttpRequestService implements HttpRequestServiceInterface {
  private axios: Axios;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.AxiosFactory) axiosFactory: AxiosFactory,
  ) {
    this.axios = axiosFactory();
  }

  public async get<T>(path: string, queryParameters: Record<string, string> | string = {}, headers: Record<string, string> = {}, config: CustomAxiosRequestConfig = {}): Promise<ResponseWithParsedBody<T>> {
    try {
      this.loggerService.trace("get called", { path, queryParameters, headers }, this.constructor.name);

      const axiosResponse = await this.axios.get<T>(path, { ...config, params: queryParameters, headers });

      const response = this.convertAxiosResponseToStandardResponse(axiosResponse);

      return response;
    } catch (error: unknown) {
      this.loggerService.error("Error in get", { error, path, queryParameters, headers }, this.constructor.name);

      throw error;
    }
  }

  public async post<T>(path: string, body: Record<string, any> | string = {}, queryParameters: Record<string, string> = {}, headers: Record<string, string> = {}, config: CustomAxiosRequestConfig = {}): Promise<ResponseWithParsedBody<T>> {
    try {
      this.loggerService.trace("post called", { path, body, queryParameters, headers }, this.constructor.name);

      const axiosResponse = await this.axios.post<T>(path, body, { ...config, params: queryParameters, headers });

      const response = this.convertAxiosResponseToStandardResponse(axiosResponse);

      return response;
    } catch (error: unknown) {
      this.loggerService.error("Error in post", { error, path, body, queryParameters, headers }, this.constructor.name);

      throw error;
    }
  }

  public async put<T>(path: string, body: Record<string, any> | string = {}, queryParameters: Record<string, string> = {}, headers: Record<string, string> = {}, config: CustomAxiosRequestConfig = {}): Promise<ResponseWithParsedBody<T>> {
    try {
      this.loggerService.trace("put called", { path, body, queryParameters, headers }, this.constructor.name);

      const axiosResponse = await this.axios.put<T>(path, body, { ...config, params: queryParameters, headers });

      const response = this.convertAxiosResponseToStandardResponse(axiosResponse);

      return response;
    } catch (error: unknown) {
      this.loggerService.error("Error in put", { error, path, body, queryParameters, headers }, this.constructor.name);

      throw error;
    }
  }

  public async patch<T>(path: string, body: Record<string, any> | string = {}, queryParameters: Record<string, string> = {}, headers: Record<string, string> = {}, config: CustomAxiosRequestConfig = {}): Promise<ResponseWithParsedBody<T>> {
    try {
      this.loggerService.trace("patch called", { path, body, queryParameters, headers }, this.constructor.name);

      const axiosResponse = await this.axios.patch<T>(path, body, { ...config, params: queryParameters, headers });

      const response = this.convertAxiosResponseToStandardResponse(axiosResponse);

      return response;
    } catch (error: unknown) {
      this.loggerService.error("Error in patch", { error, path, body, queryParameters, headers }, this.constructor.name);

      throw error;
    }
  }

  public async delete<T>(path: string, queryParameters: Record<string, string> = {}, headers: Record<string, string> = {}, config: CustomAxiosRequestConfig = {}): Promise<ResponseWithParsedBody<T>> {
    try {
      this.loggerService.trace("delete called", { path, queryParameters, headers }, this.constructor.name);

      const axiosResponse = await this.axios.delete<T>(path, { ...config, params: queryParameters, headers });

      const response = this.convertAxiosResponseToStandardResponse(axiosResponse);

      return response;
    } catch (error: unknown) {
      this.loggerService.error("Error in delete", { error, path, queryParameters, headers }, this.constructor.name);

      throw error;
    }
  }

  private convertAxiosResponseToStandardResponse<T>(axiosResponse: AxiosResponse<T>): ResponseWithParsedBody<T> {
    try {
      this.loggerService.trace("convertAxiosResponseToStandardResponse called", {}, this.constructor.name);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { data, status, headers = {} } = axiosResponse;

      const response: ResponseWithParsedBody<T> = {
        statusCode: status,
        body: data,
        headers: headers as ResponseWithParsedBody<T>["headers"],
      };

      const potentialRedirectPath = response.statusCode >= 300 && response.statusCode < 400 && response.headers.location;
      const redirectPath = typeof potentialRedirectPath === "string" && potentialRedirectPath;

      if (redirectPath) {
        response.redirect = { path: redirectPath };
      }

      return response;
    } catch (error: unknown) {
      this.loggerService.error("Error in convertAxiosResponseToStandardResponse", { error }, this.constructor.name);

      throw error;
    }
  }
}

type CustomAxiosRequestConfig = Omit<AxiosRequestConfig, "headers" | "params">;

export interface HttpRequestServiceInterface {
  get<T>(path: string, queryParameters?: Record<string, string>, headers?: Record<string, string>, config?: CustomAxiosRequestConfig): Promise<ResponseWithParsedBody<T>>;
  post<T>(path: string, body?: Record<string, any> | string, queryParameters?: Record<string, string>, headers?: Record<string, string>, config?: CustomAxiosRequestConfig): Promise<ResponseWithParsedBody<T>>;
  put<T>(path: string, body?: Record<string, any> | string, queryParameters?: Record<string, string>, headers?: Record<string, string>, config?: CustomAxiosRequestConfig): Promise<ResponseWithParsedBody<T>>;
  patch<T>(path: string, body?: Record<string, any> | string, queryParameters?: Record<string, string>, headers?: Record<string, string>, config?: CustomAxiosRequestConfig): Promise<ResponseWithParsedBody<T>>;
  delete<T>(path: string, queryParameters?: Record<string, string>, headers?: Record<string, string>, config?: CustomAxiosRequestConfig): Promise<ResponseWithParsedBody<T>>;
}
