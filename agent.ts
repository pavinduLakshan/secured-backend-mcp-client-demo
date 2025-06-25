import dotenv from 'dotenv'
import express from "express"
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage } from "@langchain/core/messages";
import axios from 'axios';
import qs from "querystring";
import { getMcpClient } from './mcp/mcp.js';
import { PetVetMcpClientOAuthClientProvider } from './PetVetMcpOAuthProvider.js';
import path from 'path';
import { fileURLToPath } from 'url';

import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

function extractAIMessage(response: any) {
    const assistantMessages = response.messages.filter((msg: any) => msg instanceof AIMessage)
    return assistantMessages[assistantMessages.length -1]?.content
}

// Add this line BEFORE your routes
app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

let agent: any = null;
let mcpClientAuthProvider: PetVetMcpClientOAuthClientProvider | null = null;

const tokenSessionStore: Record<string, any> = {

};

// Initialize the ChatOpenAI model
const model = new ChatOpenAI({ modelName: "gpt-4" });

app.post('/init', async (req, res) => {
    const { mcpClient, vetAssistMcpAuthProvider } = getMcpClient(req, res);
    mcpClientAuthProvider = vetAssistMcpAuthProvider

    const tools = await mcpClient.getTools();

    // Create and run the agent
    agent = createReactAgent({ llm: model, tools, prompt: "You are a helpful assistant." });
});

// Endpoint to render chat.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});


app.post("/message", async (req: any, res: any) => {
    const sessionId = req.cookies.session_id;

    if (!sessionId || !tokenSessionStore[sessionId]) {
        return res.status(401).send("Unauthorized: No valid session found. Please log in.");
    }
    
    try {
        if (!agent) {
            return res.status(500).send("Agent not initialized. Please call /init first.");
        }
        const agentResponse = await agent.invoke({
            messages: [{ role: "user", content: req.body.message }],
        });    

        console.log("Agent response:", agentResponse);
        res.status(200).json({
            reply: extractAIMessage(agentResponse)
        })
    } catch (err) {
        console.error(err)
        res.status(500).send(err)
    }
} )

app.get("/oauth/callback", async (req: any, res: any) => {
    const code = req.query.code;

  if (!code) {
    return res.status(400).send("Authorization code is missing.");
  }

  const clientInfo = await mcpClientAuthProvider?.clientInformation();
  const codeVerifier = mcpClientAuthProvider?.codeVerifier();

console.log("client Information: ", clientInfo)

  try {
    const tokenResponse = await axios.post(
      "https://api.asgardeo.io/t/openmcpauthdemo/oauth2/token",
      qs.stringify({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: "http://localhost:3000/oauth/callback",
        client_id: clientInfo?.client_id,
        code_verifier: codeVerifier
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    console.log({
      access_token,
      refresh_token,
      token_type: "JWT",
      expires_in: tokenResponse.data.expires_in,
      scope: tokenResponse.data.scope,
    });

    // save tokens in global variable
    mcpClientAuthProvider?.saveTokens({
      access_token,
      refresh_token,
      token_type: "JWT",
      expires_in: tokenResponse.data.expires_in,
      scope: tokenResponse.data.scope,
    });

//    res.status(200).send("Token exchange successful. You can close this window.");
const sessionId = uuidv4(); // Generate a unique session ID
tokenSessionStore[sessionId] = access_token

res
  .cookie('access_token', access_token, { httpOnly: true, secure: true, sameSite: 'Lax' })
  .cookie('session_id', sessionId, { httpOnly: false, secure: true, sameSite: 'Lax' })
  .status(200)
  .send(`
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
} )

app.listen(3000, () => {
    console.info("Server is running on http://localhost:3000")
})