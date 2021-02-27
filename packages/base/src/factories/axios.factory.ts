import axios, { AxiosRequestConfig, AxiosInstance } from "axios";

export type Axios = AxiosInstance;

export type AxiosFactory = (config?: AxiosRequestConfig) => AxiosInstance;

export const axiosFactory: AxiosFactory = (config?: AxiosRequestConfig) => axios.create(config);
