import { AIMessage } from "@langchain/core/messages";

export function extractAIMessage(response: any) {
  const assistantMessages = response.messages.filter(
    (msg: any) => msg instanceof AIMessage
  );
  return assistantMessages[assistantMessages.length - 1]?.content;
}