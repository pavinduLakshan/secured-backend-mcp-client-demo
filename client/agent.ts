import dotenv from "dotenv";
import express from "express";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import axios from "axios";
import qs from "querystring";
import { getMcpClient } from "./mcp/mcp.js";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

import cookies from "cookie-parser";
import { extractAIMessage } from "./utils.js";

const app = express();

// Add this line BEFORE your routes
app.use(express.json());
app.use(cookies());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

const tokenSessionStore: Record<string, any> = {};

const sessionStore: any = {};

// Initialize the ChatOpenAI model
const model = new ChatOpenAI({ modelName: "gpt-4" });

app.post("/init", async (req, res) => {
  const sessionId = uuidv4();

  const { mcpClient, mcpClientOAuthProvider } = getMcpClient(
    req,
    res,
    sessionId,
    "SYSTEM"
  );

  sessionStore[sessionId] = {
    mcpClient,
    mcpClientOAuthProvider,
  };

  // this is to trigger the oauth authorization flow for the connected secure MCP server
  await mcpClient.getTools();
});

// Endpoint to render the chat interface
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "chat.html"));
});

// Endpoint to handle user messages and return responses from the agent
app.post("/message", async (req: any, res: any) => {
  const sessionId = req.cookies.session_id;

  if (!sessionId) {
    return res
      .status(401)
      .send("Unauthorized: No valid session found. Please log in.");
  }

  try {
    const agent = sessionStore[sessionId]?.agent;

    if (!agent) {
      return res
        .status(500)
        .send("Agent is not initialized. Please call /init first.");
    }
    const agentResponse = await agent.invoke({
      messages: [{ role: "user", content: req.body.message }],
    });

    res.status(200).json({
      reply: extractAIMessage(agentResponse),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

// Endpoint to process the oauth callback and exchange the authorization code for tokens
app.get("/oauth/callback", async (req: any, res: any) => {
  const code = req.query.code;
  const sessionId = req.query.state;

  if (!code) {
    return res.status(400).send("Authorization code is missing.");
  }

  if (!sessionId) {
    return res.status(400).send("Session ID is missing.");
  }

  const mcpClientAuthProvider =
    sessionStore[sessionId]?.vetAssistMcpAuthProvider;
  const clientInfo = await mcpClientAuthProvider?.clientInformation();
  const codeVerifier = mcpClientAuthProvider?.codeVerifier();

  try {
    const tokenResponse = await axios.post(
      "https://api.asgardeo.io/t/openmcpauthdemo/oauth2/token",
      qs.stringify({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: "http://localhost:3000/oauth/callback",
        client_id: clientInfo?.client_id,
        code_verifier: codeVerifier,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    // save tokens in global variable
    mcpClientAuthProvider?.saveTokens({
      access_token,
      refresh_token,
      token_type: "JWT",
      expires_in: tokenResponse.data.expires_in,
      scope: tokenResponse.data.scope,
    });

    //    res.status(200).send("Token exchange successful. You can close this window.");
    tokenSessionStore[sessionId] = access_token;

    const mcpClient = sessionStore[sessionId].mcpClient;
    const tools = await mcpClient.getTools();

    // Initialize an agent instance with the model and tools
    const agent = createReactAgent({
      llm: model,
      tools,
      prompt: `You are a helpful assistant for a restaurant. ## Formatting Guidelines
            - Use concise Markdown (lists, headings, bold)`,
    });

    sessionStore[sessionId].agent = agent;

    res
      .cookie("session_id", sessionId, {
        httpOnly: false,
        secure: true,
        sameSite: "Lax",
      })
      .status(200).send(`
    <html>
      <head>
        <title>Redirecting...</title>
        <style>
          body {
            font-family: sans-serif;
            padding: 20px;
            text-align: center;
          }
          #countdown {
            font-weight: bold;
            font-size: 24px;
          }
        </style>
      </head>
      <body>
        <p>Token exchange successful. Redirecting to home in <span id="countdown">3</span> seconds...</p>
        <script>
          let count = 3;
          const countdownEl = document.getElementById('countdown');

          const interval = setInterval(() => {
            count--;
            countdownEl.textContent = count;
            if (count <= 0) {
              clearInterval(interval);
              window.location.href = '/';
            }
          }, 1000);
        </script>
      </body>
    </html>
  `);
  } catch (err: any) {
    console.error("Token exchange failed", err.response?.data || err.message);
    res.status(500).send("Failed to exchange code for access token.");
  }
});

app.listen(process.env.PORT, () => {
  console.info(`Server is running on http://localhost:${process.env.PORT}`);
});
