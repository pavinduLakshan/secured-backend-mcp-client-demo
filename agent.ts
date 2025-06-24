import dotenv from 'dotenv'
import express from "express"
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage } from "@langchain/core/messages";
import { mcpClient, vetAssistMcpAuthProvider } from './mcp/mcp.js';
import axios from 'axios';
import qs from "querystring";

dotenv.config();

const app = express();

function extractAIMessage(response: any) {
    const assistantMessages = response.messages.filter((msg: any) => msg instanceof AIMessage)
    return assistantMessages[assistantMessages.length -1]?.content
}

// Add this line BEFORE your routes
app.use(express.json());

// Initialize the ChatOpenAI model
const model = new ChatOpenAI({ modelName: "gpt-4" });

const tools = await mcpClient.getTools();

// Create and run the agent
const agent = createReactAgent({ llm: model, tools });

app.post("/message", async (req: any, res: any) => {
    console.log(req.body)
    try {
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

  const clientInfo = await vetAssistMcpAuthProvider.clientInformation();


  try {
    const tokenResponse = await axios.post(
      "https://api.asgardeo.io/t/pavindu119/oauth2/token",
      qs.stringify({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: "http://localhost:8000/oauth/callback",
        client_id: clientInfo?.client_id
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
    vetAssistMcpAuthProvider.saveTokens({
      access_token,
      refresh_token,
      token_type: "JWT",
      expires_in: tokenResponse.data.expires_in,
      scope: tokenResponse.data.scope,
    });
  } catch (err: any) {
    console.error("Token exchange failed", err.response?.data || err.message);
    res.status(500).send("Failed to exchange code for access token.");
  }
} )

app.listen(3000, () => {
    console.info("Server is running on port 3000")
})