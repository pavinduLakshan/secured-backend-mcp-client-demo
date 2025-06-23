import { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import { OAuthClientInformation, OAuthClientInformationSchema, OAuthClientMetadata, OAuthTokens, OAuthTokensSchema } from "@modelcontextprotocol/sdk/shared/auth.js";

// Utility function to generate a server-specific session storage key
function getServerSpecificKey(baseKey: string, serverUrl: string): string {
  return `${baseKey}:${serverUrl}`;
}

enum SESSION_KEYS {
    SERVER_URL = "mcp-inspector-server-url",
    CLIENT_INFORMATION = "mcp-inspector-client-information",
    TOKENS = "mcp-inspector-tokens",
    CODE_VERIFIER = "mcp-inspector-code-verifier",
}

export class PetVetMcpClientOAuthClientProvider implements OAuthClientProvider {
  serverUrl: string;
  storedTokens: any;
  storedClientInformation: any;
  storedCodeVerifier: string | null;

constructor(serverUrl: string) {
    // Save the server URL to session storage
    this.serverUrl = serverUrl;
  }

  get redirectUrl() {
    return window.location.origin + "/oauth/callback";
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

    return await OAuthClientInformationSchema.parseAsync(JSON.parse(value));
  }

  saveClientInformation(clientInformation: OAuthClientInformation) {
    this.storedClientInformation = JSON.stringify(clientInformation);
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
    window.location.href = authorizationUrl.href;
  }

  saveCodeVerifier(codeVerifier: string) {
    const key = getServerSpecificKey(
      SESSION_KEYS.CODE_VERIFIER,
      this.serverUrl,
    );
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