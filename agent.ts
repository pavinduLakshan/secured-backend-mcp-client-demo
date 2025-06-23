import dotenv from 'dotenv'
import express from "express"
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage } from "@langchain/core/messages";
import { mcpClient } from './mcp/mcp.js';

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

        console.log(   "Agent response:", agentResponse);
        res.status(200).json({
            reply: extractAIMessage(agentResponse)
        })
    } catch (err) {
        console.error(err)
        res.status(500).send(err)
    }
} )

app.listen(3000, () => {
    console.info("Server is running on port 3000")
})