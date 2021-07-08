"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.createRandomUser = exports.getAccessTokenByEmail = exports.generateRandomString = exports.setEnvVars = exports.getSsmParameters = void 0;
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-floating-promises */
const aws_sdk_1 = require("aws-sdk");
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const ssm = new aws_sdk_1.SSM({ region: "us-east-1" });
const cognito = new aws_sdk_1.CognitoIdentityServiceProvider({ region: "us-east-1" });
const documentClient = new aws_sdk_1.DynamoDB.DocumentClient({ region: "us-east-1" });
async function getSsmParameters(environment, paramNames) {
    try {
        const params = await Promise.all(paramNames.map(async (param) => {
            const prefix = "/yac-api-v4";
            let env = environment;
            if (param === "secret" && !["dev", "stage", "prod"].includes(environment)) {
                env = "dev";
            }
            try {
                const { Parameter } = await ssm.getParameter({ Name: `${prefix}/${env}/${param}` }).promise();
                return Parameter || {};
            }
            catch (error) {
                console.log(`Error fetching ${prefix}/${env}/${param}:\n`, error);
                return {};
            }
        }));
        const paramObj = params.reduce((acc, param) => {
            var _a;
            const [, , , key] = ((_a = param.Name) === null || _a === void 0 ? void 0 : _a.split("/")) || [];
            const val = param.Value;
            if (key && val) {
                acc[key] = val;
            }
            return acc;
        }, {});
        return paramObj;
    }
    catch (error) {
        console.log("Error in getSsmParameters:\n", error);
        throw error;
    }
}
exports.getSsmParameters = getSsmParameters;
function setEnvVars(vars) {
    try {
        Object.entries(vars).forEach(([key, val]) => {
            process.env[key] = val;
        });
    }
    catch (error) {
        console.log("Error in getSsmParameters:\n", error);
        throw error;
    }
}
exports.setEnvVars = setEnvVars;
function generateRandomString(length = 8) {
    return crypto_1.default.randomBytes(length / 2).toString("hex");
}
exports.generateRandomString = generateRandomString;
function createSecretHash(email) {
    return crypto_1.default.createHmac("SHA256", process.env["yac-client-secret"]).update(`${email}${process.env["yac-client-id"]}`).digest("base64");
}
async function getXsrfToken() {
    try {
        const queryParameters = {
            response_type: "code",
            client_id: process.env["yac-client-id"],
            redirect_uri: process.env["yac-client-redirect-uri"],
        };
        const authorizeResponse = await axios_1.default.get(`${process.env["user-pool-domain-url"]}/oauth2/authorize`, { params: queryParameters });
        const setCookieHeader = authorizeResponse.headers["set-cookie"];
        if (!Array.isArray(setCookieHeader)) {
            throw new Error("Malformed 'set-cookie' header in response.");
        }
        const [xsrfTokenHeader] = setCookieHeader.filter((header) => header.substring(0, 10) === "XSRF-TOKEN");
        const xsrfToken = xsrfTokenHeader.split(";")[0].split("=")[1];
        return { xsrfToken };
    }
    catch (error) {
        console.log("Error in getXsrfToken:\n", error);
        throw error;
    }
}
async function getAuthorizationCode(email, xsrfToken) {
    try {
        const data = `_csrf=${xsrfToken}&username=${email}&password=YAC-${process.env.secret}`;
        const queryParameters = {
            response_type: "code",
            client_id: process.env["yac-client-id"],
            redirect_uri: process.env["yac-client-redirect-uri"],
        };
        const headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: `XSRF-TOKEN=${xsrfToken}; Path=/; Secure; HttpOnly; SameSite=Lax`,
        };
        const loginResponse = await axios_1.default.post(`${process.env["user-pool-domain-url"]}/login`, data, {
            params: queryParameters,
            headers,
            validateStatus(status) {
                return status >= 200 && status < 600;
            },
            maxRedirects: 0,
        });
        const redirectPath = loginResponse.headers.location;
        if (!redirectPath) {
            throw new Error("redirect path missing in response");
        }
        const [, authorizationCode] = redirectPath.split("=");
        return { authorizationCode };
    }
    catch (error) {
        console.log("Error in getAuthorizationCode:\n", error);
        throw error;
    }
}
async function getToken(authorizationCode) {
    try {
        const oauth2AuthorizeBody = `grant_type=authorization_code&code=${authorizationCode}&client_id=${process.env["yac-client-id"]}&redirect_uri=${process.env["yac-client-redirect-uri"]}`;
        const headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${process.env["yac-client-id"]}:${process.env["yac-client-secret"]}`).toString("base64")}`,
        };
        const { data: { access_token: accessToken } } = await axios_1.default.post(`${process.env["user-pool-domain-url"]}/oauth2/token`, oauth2AuthorizeBody, { headers });
        return { accessToken };
    }
    catch (error) {
        console.log("Error in getTokens:\n", error);
        throw error;
    }
}
async function getAccessTokenByEmail(email) {
    try {
        const { xsrfToken } = await getXsrfToken();
        const { authorizationCode } = await getAuthorizationCode(email, xsrfToken);
        const { accessToken } = await getToken(authorizationCode);
        return { accessToken };
    }
    catch (error) {
        console.log("Error in getAccessTokenByEmail:\n", error);
        throw error;
    }
}
exports.getAccessTokenByEmail = getAccessTokenByEmail;
async function createRandomUser() {
    try {
        const email = `${generateRandomString(8)}@${generateRandomString(8)}.com`;
        const { UserSub } = await cognito.signUp({
            ClientId: process.env["yac-client-id"],
            SecretHash: createSecretHash(email),
            Username: email,
            Password: `YAC-${process.env.secret}`,
        }).promise();
        return { id: `user-${UserSub}`, email };
    }
    catch (error) {
        console.log("Error in createRandomUser:\n", error);
        throw error;
    }
}
exports.createRandomUser = createRandomUser;
async function deleteUser(id) {
    if (!id.startsWith("user-")) {
        throw new Error("must be a valid user id");
    }
    try {
        const { Item } = await documentClient.get({
            TableName: process.env["core-table-name"],
            Key: { pk: id, sk: id },
        }).promise();
        if (Item) {
            await Promise.all([
                cognito.adminDeleteUser({
                    UserPoolId: process.env["user-pool-id"],
                    Username: Item.email,
                }).promise(),
                documentClient.delete({
                    TableName: process.env["core-table-name"],
                    Key: { pk: id, sk: id },
                }).promise(),
            ]);
        }
    }
    catch (error) {
        console.log("Error in deleteUser:\n", error);
        throw error;
    }
}
exports.deleteUser = deleteUser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZTJlLnV0aWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9jb25maWcvamFzbWluZS9lMmUudXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSwrQkFBK0I7QUFDL0IsNERBQTREO0FBQzVELHFDQUF3RTtBQUN4RSxvREFBNEI7QUFDNUIsa0RBQTBCO0FBRTFCLE1BQU0sR0FBRyxHQUFHLElBQUksYUFBRyxDQUFDLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFDN0MsTUFBTSxPQUFPLEdBQUcsSUFBSSx3Q0FBOEIsQ0FBQyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQzVFLE1BQU0sY0FBYyxHQUFHLElBQUksa0JBQVEsQ0FBQyxjQUFjLENBQUMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQztBQUVyRSxLQUFLLFVBQVUsZ0JBQWdCLENBQUMsV0FBbUIsRUFBRSxVQUFvQjtJQUM5RSxJQUFJO1FBQ0YsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQzlELE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQztZQUM3QixJQUFJLEdBQUcsR0FBRyxXQUFXLENBQUM7WUFFdEIsSUFBSSxLQUFLLEtBQUssUUFBUSxJQUFJLENBQUMsQ0FBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBRSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsRUFBRTtnQkFDM0UsR0FBRyxHQUFHLEtBQUssQ0FBQzthQUNiO1lBRUQsSUFBSTtnQkFDRixNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsTUFBTSxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsTUFBTSxJQUFJLEdBQUcsSUFBSSxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FB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O29CQUNwQixTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBVztvQkFDbkQsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO2lCQUN4QixDQUFDLENBQUMsT0FBTyxFQUFFO2FBQ2IsQ0FBQyxDQUFDO1NBQ0o7S0FDRjtJQUFDLE9BQU8sS0FBSyxFQUFFO1FBQ2QsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUU3QyxNQUFNLEtBQUssQ0FBQztLQUNiO0FBQ0gsQ0FBQztBQTVCRCxnQ0E0QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG4vKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZmxvYXRpbmctcHJvbWlzZXMgKi9cbmltcG9ydCB7IENvZ25pdG9JZGVudGl0eVNlcnZpY2VQcm92aWRlciwgRHluYW1vREIsIFNTTSB9IGZyb20gXCJhd3Mtc2RrXCI7XG5pbXBvcnQgY3J5cHRvIGZyb20gXCJjcnlwdG9cIjtcbmltcG9ydCBheGlvcyBmcm9tIFwiYXhpb3NcIjtcblxuY29uc3Qgc3NtID0gbmV3IFNTTSh7IHJlZ2lvbjogXCJ1cy1lYXN0LTFcIiB9KTtcbmNvbnN0IGNvZ25pdG8gPSBuZXcgQ29nbml0b0lkZW50aXR5U2VydmljZVByb3ZpZGVyKHsgcmVnaW9uOiBcInVzLWVhc3QtMVwiIH0pO1xuY29uc3QgZG9jdW1lbnRDbGllbnQgPSBuZXcgRHluYW1vREIuRG9jdW1lbnRDbGllbnQoeyByZWdpb246IFwidXMtZWFzdC0xXCIgfSk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRTc21QYXJhbWV0ZXJzKGVudmlyb25tZW50OiBzdHJpbmcsIHBhcmFtTmFtZXM6IHN0cmluZ1tdKTogUHJvbWlzZTxSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgcGFyYW1zID0gYXdhaXQgUHJvbWlzZS5hbGwocGFyYW1OYW1lcy5tYXAoYXN5bmMgKHBhcmFtKSA9PiB7XG4gICAgICBjb25zdCBwcmVmaXggPSBcIi95YWMtYXBpLXY0XCI7XG4gICAgICBsZXQgZW52ID0gZW52aXJvbm1lbnQ7XG5cbiAgICAgIGlmIChwYXJhbSA9PT0gXCJzZWNyZXRcIiAmJiAhWyBcImRldlwiLCBcInN0YWdlXCIsIFwicHJvZFwiIF0uaW5jbHVkZXMoZW52aXJvbm1lbnQpKSB7XG4gICAgICAgIGVudiA9IFwiZGV2XCI7XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHsgUGFyYW1ldGVyIH0gPSBhd2FpdCBzc20uZ2V0UGFyYW1ldGVyKHsgTmFtZTogYCR7cHJlZml4fS8ke2Vudn0vJHtwYXJhbX1gIH0pLnByb21pc2UoKTtcblxuICAgICAgICByZXR1cm4gUGFyYW1ldGVyIHx8IHt9O1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5sb2coYEVycm9yIGZldGNoaW5nICR7cHJlZml4fS8ke2Vudn0vJHtwYXJhbX06XFxuYCwgZXJyb3IpO1xuXG4gICAgICAgIHJldHVybiB7fTtcbiAgICAgIH1cbiAgICB9KSk7XG5cbiAgICBjb25zdCBwYXJhbU9iaiA9IHBhcmFtcy5yZWR1Y2UoKGFjYzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiwgcGFyYW0pID0+IHtcbiAgICAgIGNvbnN0IFsgLCAsICwga2V5IF0gPSBwYXJhbS5OYW1lPy5zcGxpdChcIi9cIikgfHwgW107XG4gICAgICBjb25zdCB2YWwgPSBwYXJhbS5WYWx1ZTtcblxuICAgICAgaWYgKGtleSAmJiB2YWwpIHtcbiAgICAgICAgYWNjW2tleV0gPSB2YWw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBhY2M7XG4gICAgfSwge30pO1xuXG4gICAgcmV0dXJuIHBhcmFtT2JqO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUubG9nKFwiRXJyb3IgaW4gZ2V0U3NtUGFyYW1ldGVyczpcXG5cIiwgZXJyb3IpO1xuXG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldEVudlZhcnModmFyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPik6IHZvaWQge1xuICB0cnkge1xuICAgIE9iamVjdC5lbnRyaWVzKHZhcnMpLmZvckVhY2goKFsga2V5LCB2YWwgXSkgPT4ge1xuICAgICAgcHJvY2Vzcy5lbnZba2V5XSA9IHZhbDtcbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmxvZyhcIkVycm9yIGluIGdldFNzbVBhcmFtZXRlcnM6XFxuXCIsIGVycm9yKTtcblxuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVJhbmRvbVN0cmluZyhsZW5ndGggPSA4KTogc3RyaW5nIHtcbiAgcmV0dXJuIGNyeXB0by5yYW5kb21CeXRlcyhsZW5ndGggLyAyKS50b1N0cmluZyhcImhleFwiKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlU2VjcmV0SGFzaChlbWFpbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNyeXB0by5jcmVhdGVIbWFjKFwiU0hBMjU2XCIsIHByb2Nlc3MuZW52W1wieWFjLWNsaWVudC1zZWNyZXRcIl0gYXMgc3RyaW5nKS51cGRhdGUoYCR7ZW1haWx9JHtwcm9jZXNzLmVudltcInlhYy1jbGllbnQtaWRcIl0gYXMgc3RyaW5nfWApLmRpZ2VzdChcImJhc2U2NFwiKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0WHNyZlRva2VuKCk6IFByb21pc2U8eyB4c3JmVG9rZW46IHN0cmluZyB9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgcXVlcnlQYXJhbWV0ZXJzID0ge1xuICAgICAgcmVzcG9uc2VfdHlwZTogXCJjb2RlXCIsXG4gICAgICBjbGllbnRfaWQ6IHByb2Nlc3MuZW52W1wieWFjLWNsaWVudC1pZFwiXSxcbiAgICAgIHJlZGlyZWN0X3VyaTogcHJvY2Vzcy5lbnZbXCJ5YWMtY2xpZW50LXJlZGlyZWN0LXVyaVwiXSxcbiAgICB9O1xuXG4gICAgY29uc3QgYXV0aG9yaXplUmVzcG9uc2UgPSBhd2FpdCBheGlvcy5nZXQoYCR7cHJvY2Vzcy5lbnZbXCJ1c2VyLXBvb2wtZG9tYWluLXVybFwiXSBhcyBzdHJpbmd9L29hdXRoMi9hdXRob3JpemVgLCB7IHBhcmFtczogcXVlcnlQYXJhbWV0ZXJzIH0pO1xuXG4gICAgY29uc3Qgc2V0Q29va2llSGVhZGVyID0gKGF1dGhvcml6ZVJlc3BvbnNlLmhlYWRlcnMgYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nW10+KVtcInNldC1jb29raWVcIl07XG5cbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoc2V0Q29va2llSGVhZGVyKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWFsZm9ybWVkICdzZXQtY29va2llJyBoZWFkZXIgaW4gcmVzcG9uc2UuXCIpO1xuICAgIH1cblxuICAgIGNvbnN0IFsgeHNyZlRva2VuSGVhZGVyIF0gPSBzZXRDb29raWVIZWFkZXIuZmlsdGVyKChoZWFkZXI6IHN0cmluZykgPT4gaGVhZGVyLnN1YnN0cmluZygwLCAxMCkgPT09IFwiWFNSRi1UT0tFTlwiKTtcblxuICAgIGNvbnN0IHhzcmZUb2tlbiA9IHhzcmZUb2tlbkhlYWRlci5zcGxpdChcIjtcIilbMF0uc3BsaXQoXCI9XCIpWzFdO1xuXG4gICAgcmV0dXJuIHsgeHNyZlRva2VuIH07XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgY29uc29sZS5sb2coXCJFcnJvciBpbiBnZXRYc3JmVG9rZW46XFxuXCIsIGVycm9yKTtcblxuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdldEF1dGhvcml6YXRpb25Db2RlKGVtYWlsOiBzdHJpbmcsIHhzcmZUb2tlbjogc3RyaW5nKTogUHJvbWlzZTx7IGF1dGhvcml6YXRpb25Db2RlOiBzdHJpbmc7IH0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBkYXRhID0gYF9jc3JmPSR7eHNyZlRva2VufSZ1c2VybmFtZT0ke2VtYWlsfSZwYXNzd29yZD1ZQUMtJHtwcm9jZXNzLmVudi5zZWNyZXQgYXMgc3RyaW5nfWA7XG5cbiAgICBjb25zdCBxdWVyeVBhcmFtZXRlcnMgPSB7XG4gICAgICByZXNwb25zZV90eXBlOiBcImNvZGVcIixcbiAgICAgIGNsaWVudF9pZDogcHJvY2Vzcy5lbnZbXCJ5YWMtY2xpZW50LWlkXCJdLFxuICAgICAgcmVkaXJlY3RfdXJpOiBwcm9jZXNzLmVudltcInlhYy1jbGllbnQtcmVkaXJlY3QtdXJpXCJdLFxuICAgIH07XG5cbiAgICBjb25zdCBoZWFkZXJzID0ge1xuICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWRcIixcbiAgICAgIENvb2tpZTogYFhTUkYtVE9LRU49JHt4c3JmVG9rZW59OyBQYXRoPS87IFNlY3VyZTsgSHR0cE9ubHk7IFNhbWVTaXRlPUxheGAsXG4gICAgfTtcblxuICAgIGNvbnN0IGxvZ2luUmVzcG9uc2UgPSBhd2FpdCBheGlvcy5wb3N0KGAke3Byb2Nlc3MuZW52W1widXNlci1wb29sLWRvbWFpbi11cmxcIl0gYXMgc3RyaW5nfS9sb2dpbmAsIGRhdGEsIHtcbiAgICAgIHBhcmFtczogcXVlcnlQYXJhbWV0ZXJzLFxuICAgICAgaGVhZGVycyxcbiAgICAgIHZhbGlkYXRlU3RhdHVzKHN0YXR1czogbnVtYmVyKSB7XG4gICAgICAgIHJldHVybiBzdGF0dXMgPj0gMjAwICYmIHN0YXR1cyA8IDYwMDtcbiAgICAgIH0sXG4gICAgICBtYXhSZWRpcmVjdHM6IDAsXG4gICAgfSk7XG5cbiAgICBjb25zdCByZWRpcmVjdFBhdGggPSAobG9naW5SZXNwb25zZS5oZWFkZXJzIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4pLmxvY2F0aW9uO1xuXG4gICAgaWYgKCFyZWRpcmVjdFBhdGgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcInJlZGlyZWN0IHBhdGggbWlzc2luZyBpbiByZXNwb25zZVwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBbICwgYXV0aG9yaXphdGlvbkNvZGUgXSA9IHJlZGlyZWN0UGF0aC5zcGxpdChcIj1cIik7XG5cbiAgICByZXR1cm4geyBhdXRob3JpemF0aW9uQ29kZSB9O1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGNvbnNvbGUubG9nKFwiRXJyb3IgaW4gZ2V0QXV0aG9yaXphdGlvbkNvZGU6XFxuXCIsIGVycm9yKTtcblxuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdldFRva2VuKGF1dGhvcml6YXRpb25Db2RlOiBzdHJpbmcpOiBQcm9taXNlPHsgYWNjZXNzVG9rZW46IHN0cmluZyB9PiB7XG4gIHRyeSB7XG4gICAgY29uc3Qgb2F1dGgyQXV0aG9yaXplQm9keSA9IGBncmFudF90eXBlPWF1dGhvcml6YXRpb25fY29kZSZjb2RlPSR7YXV0aG9yaXphdGlvbkNvZGV9JmNsaWVudF9pZD0ke3Byb2Nlc3MuZW52W1wieWFjLWNsaWVudC1pZFwiXSBhcyBzdHJpbmd9JnJlZGlyZWN0X3VyaT0ke3Byb2Nlc3MuZW52W1wieWFjLWNsaWVudC1yZWRpcmVjdC11cmlcIl0gYXMgc3RyaW5nfWA7XG5cbiAgICBjb25zdCBoZWFkZXJzID0ge1xuICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWRcIixcbiAgICAgIEF1dGhvcml6YXRpb246IGBCYXNpYyAke0J1ZmZlci5mcm9tKGAke3Byb2Nlc3MuZW52W1wieWFjLWNsaWVudC1pZFwiXSBhcyBzdHJpbmd9OiR7cHJvY2Vzcy5lbnZbXCJ5YWMtY2xpZW50LXNlY3JldFwiXSBhcyBzdHJpbmd9YCkudG9TdHJpbmcoXCJiYXNlNjRcIil9YCxcbiAgICB9O1xuXG4gICAgY29uc3QgeyBkYXRhOiB7IGFjY2Vzc190b2tlbjogYWNjZXNzVG9rZW4gfSB9ID0gYXdhaXQgYXhpb3MucG9zdDx7IGFjY2Vzc190b2tlbjogc3RyaW5nOyB9PihgJHtwcm9jZXNzLmVudltcInVzZXItcG9vbC1kb21haW4tdXJsXCJdIGFzIHN0cmluZ30vb2F1dGgyL3Rva2VuYCwgb2F1dGgyQXV0aG9yaXplQm9keSwgeyBoZWFkZXJzIH0pO1xuXG4gICAgcmV0dXJuIHsgYWNjZXNzVG9rZW4gfTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBjb25zb2xlLmxvZyhcIkVycm9yIGluIGdldFRva2VuczpcXG5cIiwgZXJyb3IpO1xuXG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEFjY2Vzc1Rva2VuQnlFbWFpbChlbWFpbDogc3RyaW5nKTogUHJvbWlzZTx7IGFjY2Vzc1Rva2VuOiBzdHJpbmc7IH0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCB7IHhzcmZUb2tlbiB9ID0gYXdhaXQgZ2V0WHNyZlRva2VuKCk7XG5cbiAgICBjb25zdCB7IGF1dGhvcml6YXRpb25Db2RlIH0gPSBhd2FpdCBnZXRBdXRob3JpemF0aW9uQ29kZShlbWFpbCwgeHNyZlRva2VuKTtcblxuICAgIGNvbnN0IHsgYWNjZXNzVG9rZW4gfSA9IGF3YWl0IGdldFRva2VuKGF1dGhvcml6YXRpb25Db2RlKTtcblxuICAgIHJldHVybiB7IGFjY2Vzc1Rva2VuIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5sb2coXCJFcnJvciBpbiBnZXRBY2Nlc3NUb2tlbkJ5RW1haWw6XFxuXCIsIGVycm9yKTtcblxuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVSYW5kb21Vc2VyKCk6IFByb21pc2U8eyBpZDogc3RyaW5nOyBlbWFpbDogc3RyaW5nOyB9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgZW1haWwgPSBgJHtnZW5lcmF0ZVJhbmRvbVN0cmluZyg4KX1AJHtnZW5lcmF0ZVJhbmRvbVN0cmluZyg4KX0uY29tYDtcblxuICAgIGNvbnN0IHsgVXNlclN1YiB9ID0gYXdhaXQgY29nbml0by5zaWduVXAoe1xuICAgICAgQ2xpZW50SWQ6IHByb2Nlc3MuZW52W1wieWFjLWNsaWVudC1pZFwiXSBhcyBzdHJpbmcsXG4gICAgICBTZWNyZXRIYXNoOiBjcmVhdGVTZWNyZXRIYXNoKGVtYWlsKSxcbiAgICAgIFVzZXJuYW1lOiBlbWFpbCxcbiAgICAgIFBhc3N3b3JkOiBgWUFDLSR7cHJvY2Vzcy5lbnYuc2VjcmV0IGFzIHN0cmluZ31gLFxuICAgIH0pLnByb21pc2UoKTtcblxuICAgIHJldHVybiB7IGlkOiBgdXNlci0ke1VzZXJTdWJ9YCwgZW1haWwgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmxvZyhcIkVycm9yIGluIGNyZWF0ZVJhbmRvbVVzZXI6XFxuXCIsIGVycm9yKTtcblxuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkZWxldGVVc2VyKGlkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKCFpZC5zdGFydHNXaXRoKFwidXNlci1cIikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJtdXN0IGJlIGEgdmFsaWQgdXNlciBpZFwiKTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc3QgeyBJdGVtIH0gPSBhd2FpdCBkb2N1bWVudENsaWVudC5nZXQoe1xuICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudltcImNvcmUtdGFibGUtbmFtZVwiXSBhcyBzdHJpbmcsXG4gICAgICBLZXk6IHsgcGs6IGlkLCBzazogaWQgfSxcbiAgICB9KS5wcm9taXNlKCk7XG5cbiAgICBpZiAoSXRlbSkge1xuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgICBjb2duaXRvLmFkbWluRGVsZXRlVXNlcih7XG4gICAgICAgICAgVXNlclBvb2xJZDogcHJvY2Vzcy5lbnZbXCJ1c2VyLXBvb2wtaWRcIl0gYXMgc3RyaW5nLFxuICAgICAgICAgIFVzZXJuYW1lOiAoSXRlbSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KS5lbWFpbCxcbiAgICAgICAgfSkucHJvbWlzZSgpLFxuICAgICAgICBkb2N1bWVudENsaWVudC5kZWxldGUoe1xuICAgICAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnZbXCJjb3JlLXRhYmxlLW5hbWVcIl0gYXMgc3RyaW5nLFxuICAgICAgICAgIEtleTogeyBwazogaWQsIHNrOiBpZCB9LFxuICAgICAgICB9KS5wcm9taXNlKCksXG4gICAgICBdKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5sb2coXCJFcnJvciBpbiBkZWxldGVVc2VyOlxcblwiLCBlcnJvcik7XG5cbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuIl19