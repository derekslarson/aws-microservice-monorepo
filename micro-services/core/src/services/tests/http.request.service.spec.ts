/* eslint-disable @typescript-eslint/unbound-method */
import { fail } from "assert";
import axiosObj, { AxiosInstance } from "axios";
import { Axios, AxiosFactory } from "../../factories/axios.factory";
import { Spied, TestSupport } from "../../test-support";
import { HttpRequestService, HttpRequestServiceInterface } from "../http.request.service";
import { LoggerService } from "../logger.service";

describe("HttpRequestService", () => {
  let axios: Spied<Axios>;
  const axiosFactory: AxiosFactory = () => axios as unknown as AxiosInstance;
  let loggerService: Spied<LoggerService>;
  let httpRequestService: HttpRequestServiceInterface;

  const mockPath = "/test";
  const mockBody = { foo: "bar" };
  const mockQueryParams = { cat: "dog" };
  const mockHeaders = { a: "b" };
  const mockAxiosConfig = { timeout: 5000 };
  const mockError = new Error("mock error");

  const mockAxiosResponse = {
    data: { x: "y" },
    status: 200,
    headers: { test: "val" },
  };

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    axios = TestSupport.spyOnObject(axiosObj);

    axios.get.and.returnValue(Promise.resolve(mockAxiosResponse));
    axios.post.and.returnValue(Promise.resolve(mockAxiosResponse));
    axios.put.and.returnValue(Promise.resolve(mockAxiosResponse));
    axios.patch.and.returnValue(Promise.resolve(mockAxiosResponse));
    axios.delete.and.returnValue(Promise.resolve(mockAxiosResponse));

    httpRequestService = new HttpRequestService(loggerService, axiosFactory);
  });

  describe("get", () => {
    describe("under normal conditions", () => {
      it("calls axios.get with the correct parameters", async () => {
        await httpRequestService.get(mockPath, mockQueryParams, mockHeaders, mockAxiosConfig);

        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(axios.get).toHaveBeenCalledWith(mockPath, { ...mockAxiosConfig, params: mockQueryParams, headers: mockHeaders });
      });
    });

    describe("under error conditions", () => {
      describe("when axios throws an error", () => {
        beforeEach(() => {
          axios.get.and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct parameters", async () => {
          try {
            await httpRequestService.get(mockPath, mockQueryParams, mockHeaders, mockAxiosConfig);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith(
              "Error in get",
              { error: mockError, path: mockPath, queryParameters: mockQueryParams, headers: mockHeaders },
              httpRequestService.constructor.name,
            );
          }
        });

        it("throws the caught error", async () => {
          try {
            await httpRequestService.get(mockPath, mockQueryParams, mockHeaders, mockAxiosConfig);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("post", () => {
    describe("under normal conditions", () => {
      it("calls axios.post with the correct parameters", async () => {
        await httpRequestService.post(mockPath, mockBody, mockQueryParams, mockHeaders, mockAxiosConfig);

        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(axios.post).toHaveBeenCalledWith(mockPath, mockBody, { ...mockAxiosConfig, params: mockQueryParams, headers: mockHeaders });
      });
    });

    describe("under error conditions", () => {
      describe("when axios throws an error", () => {
        beforeEach(() => {
          axios.post.and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct parameters", async () => {
          try {
            await httpRequestService.post(mockPath, mockBody, mockQueryParams, mockHeaders, mockAxiosConfig);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith(
              "Error in post",
              { error: mockError, path: mockPath, body: mockBody, queryParameters: mockQueryParams, headers: mockHeaders },
              httpRequestService.constructor.name,
            );
          }
        });

        it("throws the caught error", async () => {
          try {
            await httpRequestService.post(mockPath, mockBody, mockQueryParams, mockHeaders, mockAxiosConfig);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("put", () => {
    describe("under normal conditions", () => {
      it("calls axios.put with the correct parameters", async () => {
        await httpRequestService.put(mockPath, mockBody, mockQueryParams, mockHeaders, mockAxiosConfig);

        expect(axios.put).toHaveBeenCalledTimes(1);
        expect(axios.put).toHaveBeenCalledWith(mockPath, mockBody, { ...mockAxiosConfig, params: mockQueryParams, headers: mockHeaders });
      });
    });

    describe("under error conditions", () => {
      describe("when axios throws an error", () => {
        beforeEach(() => {
          axios.put.and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct parameters", async () => {
          try {
            await httpRequestService.put(mockPath, mockBody, mockQueryParams, mockHeaders, mockAxiosConfig);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith(
              "Error in put",
              { error: mockError, path: mockPath, body: mockBody, queryParameters: mockQueryParams, headers: mockHeaders },
              httpRequestService.constructor.name,
            );
          }
        });

        it("throws the caught error", async () => {
          try {
            await httpRequestService.put(mockPath, mockBody, mockQueryParams, mockHeaders, mockAxiosConfig);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("patch", () => {
    describe("under normal conditions", () => {
      it("calls axios.patch with the correct parameters", async () => {
        await httpRequestService.patch(mockPath, mockBody, mockQueryParams, mockHeaders, mockAxiosConfig);

        expect(axios.patch).toHaveBeenCalledTimes(1);
        expect(axios.patch).toHaveBeenCalledWith(mockPath, mockBody, { ...mockAxiosConfig, params: mockQueryParams, headers: mockHeaders });
      });
    });

    describe("under error conditions", () => {
      describe("when axios throws an error", () => {
        beforeEach(() => {
          axios.patch.and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct parameters", async () => {
          try {
            await httpRequestService.patch(mockPath, mockBody, mockQueryParams, mockHeaders, mockAxiosConfig);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith(
              "Error in patch",
              { error: mockError, path: mockPath, body: mockBody, queryParameters: mockQueryParams, headers: mockHeaders },
              httpRequestService.constructor.name,
            );
          }
        });

        it("throws the caught error", async () => {
          try {
            await httpRequestService.patch(mockPath, mockBody, mockQueryParams, mockHeaders, mockAxiosConfig);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("delete", () => {
    describe("under normal conditions", () => {
      it("calls axios.delete with the correct parameters", async () => {
        await httpRequestService.delete(mockPath, mockQueryParams, mockHeaders, mockAxiosConfig);

        expect(axios.delete).toHaveBeenCalledTimes(1);
        expect(axios.delete).toHaveBeenCalledWith(mockPath, { ...mockAxiosConfig, params: mockQueryParams, headers: mockHeaders });
      });
    });

    describe("under error conditions", () => {
      describe("when axios throws an error", () => {
        beforeEach(() => {
          axios.delete.and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct parameters", async () => {
          try {
            await httpRequestService.delete(mockPath, mockQueryParams, mockHeaders, mockAxiosConfig);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith(
              "Error in delete",
              { error: mockError, path: mockPath, queryParameters: mockQueryParams, headers: mockHeaders },
              httpRequestService.constructor.name,
            );
          }
        });

        it("throws the caught error", async () => {
          try {
            await httpRequestService.delete(mockPath, mockQueryParams, mockHeaders, mockAxiosConfig);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("convertAxiosResponseToStandardResponse", () => {
    describe("under normal conditions", () => {
      describe("when passed a non-300 status code", () => {
        const mockMutatedResponse = {
          body: mockAxiosResponse.data,
          statusCode: mockAxiosResponse.status,
          headers: mockAxiosResponse.headers,
        };

        it("mutates and returns the axios response correctly", async () => {
          const response = await httpRequestService.get(mockPath, mockQueryParams, mockHeaders, mockAxiosConfig);

          expect(response).toEqual(mockMutatedResponse);
        });
      });

      describe("when passed a 300 status code and a 'location' header", () => {
        const mockRedirectAxiosResponse = {
          data: { x: "y" },
          status: 301,
          headers: { location: "http://pants.com" },
        };

        const mockMutatedRedirectResponse = {
          body: mockRedirectAxiosResponse.data,
          statusCode: mockRedirectAxiosResponse.status,
          headers: mockRedirectAxiosResponse.headers,
          redirect: { path: mockRedirectAxiosResponse.headers.location },
        };

        beforeEach(() => {
          axios.get.and.returnValue(Promise.resolve(mockRedirectAxiosResponse));
        });

        it("mutates and returns the axios response correctly", async () => {
          const response = await httpRequestService.get(mockPath, mockQueryParams, mockHeaders, mockAxiosConfig);

          expect(response).toEqual(mockMutatedRedirectResponse);
        });
      });
    });
  });
});
