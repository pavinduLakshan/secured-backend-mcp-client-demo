import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { PetVetMcpClientOAuthClientProvider } from "../PetVetMcpOAuthProvider.js";

// Create client and connect to server
const mcpClient = new MultiServerMCPClient({
  // Global tool configuration options
  // Whether to throw on errors if a tool fails to load (optional, default: true)
  throwOnLoadError: true,
  // Whether to prefix tool names with the server name (optional, default: true)
  prefixToolNameWithServerName: true,
  // Optional additional prefix for tool names (optional, default: "mcp")
  additionalToolNamePrefix: "mcp",

  // Server configuration
  mcpServers: {
    // adds a STDIO connection to a server named "math"
    // math: {
    //   transport: "stdio",
    //   command: "npx",
    //   args: ["-y", "@modelcontextprotocol/server-math"],
    //   // Restart configuration for stdio transport
    //   restart: {
    //     enabled: true,
    //     maxAttempts: 3,
    //     delayMs: 1000,
    //   },
    // },

    // here's a filesystem server
    filesystem: {
      transport: "stdio",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem","/Users/pavindu/Desktop"],
    },

    // Sreamable HTTP transport example, with auth headers and automatic SSE fallback disabled (defaults to enabled)
    // weather: {
    //   url: "https://example.com/weather/mcp",
    //   headers: {
    //     Authorization: "Bearer token123",
    //   }
    // },

    // OAuth 2.0 authentication (recommended for secure servers)
    "oauth-protected-server": {
      url: "http://localhost:8000/mcp",
      authProvider: new PetVetMcpClientOAuthClientProvider("http://localhost:8000/mcp"),
      // Can still include custom headers for non-auth purposes
      headers: {
        "User-Agent": "PetVet-MCP-Client/1.0"
      }
    },

    // // how to force SSE, for old servers that are known to only support SSE (streamable HTTP falls back automatically if unsure)
    // github: {
    //   transport: "sse", // also works with "type" field instead of "transport"
    //   url: "https://example.com/mcp",
    //   reconnect: {
    //     enabled: true,
    //     maxAttempts: 5,
    //     delayMs: 2000,
    //   },
    // },
  },
});

export { mcpClient };