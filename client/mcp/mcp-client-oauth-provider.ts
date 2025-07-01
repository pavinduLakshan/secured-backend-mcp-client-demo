import { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import { OAuthClientInformation, OAuthClientInformationSchema, OAuthClientMetadata, OAuthTokens, OAuthTokensSchema } from "@modelcontextprotocol/sdk/shared/auth.js";

export class McpClientOAuthProvider implements OAuthClientProvider {
  serverUrl: string;
  request: any;
  response: any;
  storedTokens: any;
  sessionId: string;
  storedClientInformation: OAuthClientInformation | null = {
    client_id:"f4fivy7Ga375B3oRso4jb3j6LyMa"
  };
  storedCodeVerifier: string | null;
  scopes: string;

constructor(serverUrl: string, request: any, response: any, sessionId: string, scopes: string) {
    this.serverUrl = serverUrl;
    this.request = request;
    this.response = response;
    this.sessionId = sessionId;
    this.scopes = scopes;
  }

  get redirectUrl() {
    return "http://localhost:3000/oauth/callback";
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      redirect_uris: [this.redirectUrl],
      token_endpoint_auth_method: "none",
      scope: this.scopes, // set of scopes as a space-separated string
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_name: "Healthcare Assistant",
      client_uri: "http://localhost:3000",
    };
  }

  async clientInformation() {
    const value = this.storedClientInformation;
    if (!value) {
      return undefined;
    }

    return await OAuthClientInformationSchema.parseAsync(value);
  }

  saveClientInformation(clientInformation: OAuthClientInformation) {
    this.storedClientInformation = clientInformation;
  }

  async tokens() {
    const tokens = this.storedTokens;
    if (!tokens) {
      return undefined;
    }

    return await OAuthTokensSchema.parseAsync(JSON.parse(tokens));
  }

  saveTokens(tokens: OAuthTokens) {
    this.storedTokens = JSON.stringify(tokens);
  }

  redirectToAuthorization(authorizationUrl: URL) {
    console.log("redirecting to authorizationUrl: ", authorizationUrl.href);
    this.response.status(200).send({
      authorizationUrl: authorizationUrl.href + `&state=${this.sessionId}`,
    })
  }

  saveCodeVerifier(codeVerifier: string) {
    this.storedCodeVerifier = codeVerifier;
  }

  codeVerifier() {
    const verifier = this.storedCodeVerifier;
    if (!verifier) {
      throw new Error("No code verifier saved for session");
    }

    return verifier;
  }

  clear() {
    this.storedTokens = null;
    this.storedClientInformation = null;
    this.storedCodeVerifier = null;
  }
}