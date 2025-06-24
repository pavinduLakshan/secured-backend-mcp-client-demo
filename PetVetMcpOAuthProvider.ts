import { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import { OAuthClientInformation, OAuthClientInformationSchema, OAuthClientMetadata, OAuthTokens, OAuthTokensSchema } from "@modelcontextprotocol/sdk/shared/auth.js";
export class PetVetMcpClientOAuthClientProvider implements OAuthClientProvider {
  serverUrl: string;
  storedTokens: any;
  storedClientInformation: OAuthClientInformation | null = {
    client_id: "f4fivy7Ga375B3oRso4jb3j6LyMa"
  };
  storedCodeVerifier: string | null;

constructor(serverUrl: string) {
    // Save the server URL to session storage
    this.serverUrl = serverUrl;
  }

  get redirectUrl() {
    return "http://localhost:8000/oauth/callback";
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      redirect_uris: [this.redirectUrl],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_name: "MCP Inspector",
      client_uri: "https://github.com/modelcontextprotocol/inspector",
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
    console.log("authorizationUrl", authorizationUrl.href);
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