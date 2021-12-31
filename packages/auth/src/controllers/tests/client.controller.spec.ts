// /* eslint-disable @typescript-eslint/unbound-method */

// import { Response, generateMockRequest, LoggerService, RequestPortion, Spied, TestSupport, ValidationService } from "@yac/util";

// import { CreateClientInputDto } from "../../models/client/client.creation.input.model";
// import { DeleteClientInputDto } from "../../models/client/client.deletion.input.model";
// import { ClientService } from "../../services/client.service";
// import { ClientController, ClientControllerInterface } from "../client.controller";

// interface ClientControllerWithProtectedMethods extends ClientControllerInterface {
//   [key: string]: any;
// }

// describe("ClientController", () => {
//   let validationService: Spied<ValidationService>;
//   let loggerService: Spied<LoggerService>;
//   let clientService: Spied<ClientService>;
//   let clientController: ClientControllerWithProtectedMethods;

//   const mockError = new Error("mock-error");
//   const mockValidationResponse = { mock: "validation-response" };
//   const mockClientId = "mock-client-id";
//   const mockClientSecret = "mock-client-secret";
//   const mockServiceResponse = {
//     clientId: mockClientId,
//     clientSecret: mockClientSecret,
//   };

//   const mockSuccessResponse = { mock: "success-response" };
//   const mockErrorResponse = { mock: "error-response" };

//   beforeEach(() => {
//     validationService = TestSupport.spyOnClass(ValidationService);
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     clientService = TestSupport.spyOnClass(ClientService);

//     validationService.validate.and.returnValue(Promise.resolve(mockValidationResponse));

//     clientService.createClient.and.returnValue(Promise.resolve(mockServiceResponse));
//     clientService.deleteClient.and.returnValue(Promise.resolve());

//     clientController = new ClientController(validationService, loggerService, clientService);

//     spyOn(clientController, "generateSuccessResponse").and.returnValue(mockSuccessResponse);
//     spyOn(clientController, "generateErrorResponse").and.returnValue(mockErrorResponse);
//   });

//   describe("createClient", () => {
//     const mockRequest = generateMockRequest();

//     describe("under normal conditions", () => {
//       it("calls validationService.validate with the correct params", async () => {
//         await clientController.createClient(mockRequest);

//         expect(validationService.validate).toHaveBeenCalledTimes(1);
//         expect(validationService.validate).toHaveBeenCalledWith(CreateClientInputDto, RequestPortion.Body, mockRequest.body);
//       });

//       it("calls clientService.createClient with the correct params", async () => {
//         await clientController.createClient(mockRequest);

//         expect(clientService.createClient).toHaveBeenCalledTimes(1);
//         expect(clientService.createClient).toHaveBeenCalledWith(mockValidationResponse);
//       });

//       it("calls this.generateSuccessResponse with the correct params", async () => {
//         await clientController.createClient(mockRequest);

//         expect(clientController.generateSuccessResponse).toHaveBeenCalledTimes(1);
//         expect(clientController.generateSuccessResponse).toHaveBeenCalledWith({
//           clientId: mockServiceResponse.clientId,
//           clientSecret: mockServiceResponse.clientSecret,
//         });
//       });

//       it("returns the response of this.generateSuccessResponse", async () => {
//         const response = await clientController.createClient(mockRequest);

//         expect(response).toBe(mockSuccessResponse as Response);
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when an error is thrown", () => {
//         beforeEach(() => validationService.validate.and.throwError(mockError));

//         it("calls loggerService.error with the correct params", async () => {
//           await clientController.createClient(mockRequest);

//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in createClient", { error: mockError, request: mockRequest }, clientController.constructor.name);
//         });

//         it("calls this.generateErrorResponse with the correct params", async () => {
//           await clientController.createClient(mockRequest);

//           expect(clientController.generateErrorResponse).toHaveBeenCalledTimes(1);
//           expect(clientController.generateErrorResponse).toHaveBeenCalledWith(mockError);
//         });

//         it("returns the response of this.generateErrorResponse", async () => {
//           const response = await clientController.createClient(mockRequest);

//           expect(response).toBe(mockErrorResponse as Response);
//         });
//       });
//     });
//   });

//   describe("deleteClient", () => {
//     beforeEach(() => {
//       validationService.validate.and.returnValue(Promise.resolve({ secret: mockClientSecret }));
//     });

//     const mockRequest = generateMockRequest({ pathParameters: { id: mockClientId } });

//     describe("under normal conditions", () => {
//       it("calls validationService.validate with the correct params", async () => {
//         await clientController.deleteClient(mockRequest);

//         expect(validationService.validate).toHaveBeenCalledTimes(1);
//         expect(validationService.validate).toHaveBeenCalledWith(DeleteClientInputDto, RequestPortion.Headers, mockRequest.headers);
//       });

//       it("calls clientService.deleteClient with the correct params", async () => {
//         await clientController.deleteClient(mockRequest);

//         expect(clientService.deleteClient).toHaveBeenCalledTimes(1);
//         expect(clientService.deleteClient).toHaveBeenCalledWith(mockClientId, mockClientSecret);
//       });

//       it("calls this.generateSuccessResponse with the correct params", async () => {
//         await clientController.deleteClient(mockRequest);

//         expect(clientController.generateSuccessResponse).toHaveBeenCalledTimes(1);
//         expect(clientController.generateSuccessResponse).toHaveBeenCalledWith({ message: "Client deleted" });
//       });

//       it("returns the response of this.generateSuccessResponse", async () => {
//         const response = await clientController.deleteClient(mockRequest);

//         expect(response).toBe(mockSuccessResponse as Response);
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when an error is thrown", () => {
//         beforeEach(() => validationService.validate.and.throwError(mockError));

//         it("calls loggerService.error with the correct params", async () => {
//           await clientController.deleteClient(mockRequest);

//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in deleteClient", { error: mockError, request: mockRequest }, clientController.constructor.name);
//         });

//         it("calls this.generateErrorResponse with the correct params", async () => {
//           await clientController.deleteClient(mockRequest);

//           expect(clientController.generateErrorResponse).toHaveBeenCalledTimes(1);
//           expect(clientController.generateErrorResponse).toHaveBeenCalledWith(mockError);
//         });

//         it("returns the response of this.generateErrorResponse", async () => {
//           const response = await clientController.deleteClient(mockRequest);

//           expect(response).toBe(mockErrorResponse as Response);
//         });
//       });
//     });
//   });
// });
