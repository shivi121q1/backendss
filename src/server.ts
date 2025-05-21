import http from 'http';
import app from './app';
import { WebSocketServer } from 'ws';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { sleep } from 'openai/core';

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
type Message = { role: 'user' | 'assistant'; content: string };

interface BuildBrandPromptProps {
  question: string;
  history: Message[];
  userMessage: string;
}

export function buildBrandPrompt({
  question,
  history,
  userMessage,
}: BuildBrandPromptProps): string {
  const systemPrompt = `
You are a helpful brand naming assistant guiding users through the brand name selection process.

Analyze the user's most recent message and respond ONLY in this strict JSON format:

{
  "content": "<friendly response (max 50 words). If the user is unsure, gently suggest next steps. If the user gives a clear name or idea, politely ask for confirmation — but only once. After confirmation, do not ask again. If confirmed, also include a friendly transition to the next branding step.>",
  "status": "confirm" | "unsure",
  "answer": "<clear brand name or idea if confident; if not, infer based on message>"
}

Rules:

1. If the user’s message is vague, indecisive, or includes uncertainty (e.g., “maybe”, “not sure”, “I don’t know”):
   - Set "status": "unsure"
   - Offer 2–3 creative suggestions or a guiding question
   - Infer the user’s intent and set "answer" accordingly

2. If the user suggests a name or gives a clear preference:
   - If this is the first time the idea is mentioned, respond with status: "unsure"
     - Politely confirm the idea ONCE with a warm message like:
       “Nice choice! Should we go ahead with <brand name>?”
   - If the user has already confirmed the same idea in a previous turn, respond with status: "confirm"
     - DO NOT ask for confirmation again
     - DO include a friendly transition like:
       “Perfect, we’ve locked that in!" or "Lets forward to the next Question"

3. ONLY respond with "status": "confirm" if the assistant has previously asked for confirmation, and the user replies positively with phrases like:
“Yes, go with it”, “That’s perfect”, “Let’s do that”, or “Confirmed”.

4. General:
   - Keep tone supportive and professional
   - Avoid asking open-ended or vague questions like “Do you want help?”
   - Use short, emotionally intelligent sentences
   - Pull from previous chat history if relevant

Examples:

User: “Something fresh and fun, maybe?”
{
  "content": "How about trying names like Zesti, Bloomly, or SnapSeed? Which direction feels right to you?",
  "status": "unsure",
  "answer": "fresh and fun brand"
}

User: “I like SnapSeed”
{
  "content": "Nice choice! Should we go ahead with SnapSeed?",
  "status": "unsure",
  "answer": "SnapSeed"
}

User: “Yes, go with SnapSeed”
{
  "content": "Perfect, we’ve locked that in!",
  "status": "confirm",
  "answer": "SnapSeed"
}
`;

  const conversation = history
    .map((m) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
    .join('\n');

  return `
${systemPrompt}

Current step: ${question}

Chat history:
${conversation}

Most recent user message:
User: "${userMessage}"

Respond in strict JSON format as described above.
`;
}

type GenericPromptProps = {
  extraPrompt?: string;
  previousQA?: { question: string; answer: string | undefined }[] | undefined;
  currentQuestion: { question: string };
  history: string;
  userMessage: string;
};

const buildGenericPrompt = ({
  extraPrompt = "",
  previousQA = [],
  currentQuestion,
  history,
  userMessage,
}: GenericPromptProps): string => {
  return `
You are a friendly and emotionally intelligent branding assistant. Your job is to guide the user step-by-step in building their brand identity in a way that feels warm, confident, and clear.

Analyze the user's most recent message and respond ONLY in this strict JSON format:

{
  "content": "<friendly response (max 50 words). If the user is unsure, gently suggest next steps. If the user gives a clear name or idea, politely ask for confirmation — but only once. After confirmation, do not ask again. If confirmed, also include a friendly transition to the next branding step.>",
  "status": "confirm" | "unsure",
  "answer": "<clear brand name or idea if confident; if not, infer based on message>"
}

${extraPrompt}

Rules:

1. If the user’s message is vague, indecisive, or includes uncertainty (e.g., “maybe”, “not sure”, “I don’t know”):
   - Set "status": "unsure"
   - Offer 2–3 creative suggestions or a guiding question
   - Infer the user’s intent and set "answer" accordingly

2. If the user suggests a name or gives a clear preference:
   - If this is the first time the idea is mentioned, respond with status: "unsure"
     - Politely confirm the idea ONCE with a warm message like:
       “Nice choice! Should we go ahead with <brand name>?” Ask the user and help him with the suggestion
   

   - If the user has already confirmed the same idea in a previous turn, respond with status: "confirm"
     - DO NOT ask for confirmation again
     - DO include a friendly transition like:
       “Perfect, we’ve locked that in Lets forward to the next Question". Don't ask core value or tagline. 
    

3. ONLY respond with "status": "confirm" if the assistant has previously asked for confirmation, and the user replies positively with phrases like:
   “Yes, go with it”, “That’s perfect”, “Let’s do that”, or “Confirmed”.

4. General:
   - Keep tone supportive and professional
   - Avoid asking open-ended or vague questions like “Do you want help?”
   - Use short, emotionally intelligent sentences
   - Pull from previous chat history if relevant

Previous Q&A: ${previousQA}
Current branding question: ${currentQuestion.question}

Conversation history:
${history}

User's latest message: ${userMessage}
`;
};


const questions = [
  { key: "brandName", question: "Hey! What's the name of your brand?" },
  { key: "brandInspiration", question: "Have you seen any site which  inspired you to start this brand?" },
  { key: "brandCategory", question: "If you had to pick a category for your brand, what would it be?" },
  { key: "brandTone", question: "How would you like your brand to sound — fun, professional, bold, or something else?" },
  { key: "targetAudience", question: "Who are you building this brand for? Tell us about your ideal customer." },
  { key: "socialPlatforms", question: "Which social platforms do you think your audience hangs out on the most?" },
  { key: "brandStory", question: "We’d love to hear your story — how did it all begin?" },
];


wss.on('connection', (ws) => {
  let sessionId: string | null = null;

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === 'start') {
        sessionId = data.sessionId;
        if (!sessionId) {
          return ws.send(JSON.stringify({ type: 'error', message: 'Missing sessionId' }));
        }

        const session = await prisma.brands_Session.findUnique({ where: { id: sessionId } });
        if (!session) {
          return ws.send(JSON.stringify({ type: 'error', message: 'Invalid session' }));
        }

        await prisma.brands_Session.update({
          where: { id: sessionId },
          data: { voiceMode: true },
        });

        const index = session.currentIndex ?? 0;
        if (index < questions.length) {
          const nextQ = questions[index];
          return ws.send(JSON.stringify({
            type: 'bot_message',
            content: nextQ.question,
            status: 'ask',
          }));
        } else {
          return ws.send(JSON.stringify({ type: 'end', message: 'All questions are complete!' }));
        }
      }

      if (data.type === 'user_message' && sessionId) {
        const userMessage = data.message;

        await prisma.conversation.create({
          data: { sessionId, role: 'user', content: userMessage },
        });

        const session = await prisma.brands_Session.findUnique({ where: { id: sessionId } });
        const currentIndex = session!.currentIndex ?? 0;
        const currentQuestion = questions[currentIndex];
        const isBrandNameStep = questions[currentIndex].key === "brandName";
        let extraPrompt;

        let previousQAArray;
        if (currentIndex > 0) {
          extraPrompt = `"Instructions:

          1. Ask one question at a time
          2. Track which questions have already been asked and answered.Do not ask the same question again unless the user wants to change their response.
3. When the user switches modes(chat -> voice), do the following:
          - Remember all previously asked questions and answers.
   - Speak or type a natural transition line followed by the next question.
   - Start the next unanswered question immediately.

4. Use a friendly, conversational, and engaging tone to keep the user experience smooth and human - like.

            Examples:

** If switching from chat to voice:**
            Say:  
  “Great, you’re on voice now.Let’s keep going.What’s your brand’s tone ? Like playful, bold, professional… how would you describe it ?”
          `
          const previousQAArray = await getAllPreviousQA(sessionId, currentIndex);


        }
        const messages = await prisma.conversation.findMany({
          where: { sessionId },
          orderBy: { createdAt: 'asc' },
        });

        const history = messages.map((msg) => `${msg.role}: ${msg.content}`).join('\n');
        //         const prompt = `
        // You are a friendly and emotionally intelligent branding assistant. Your job is to guide the user step-by-step in building their brand identity in a way that feels warm, confident, and clear.

        // Analyze the user's most recent message and respond ONLY in this strict JSON format:

        // {
        //   "content": "<friendly response (max 50 words). If the user is unsure, gently suggest next steps. If the user gives a clear name or idea, politely ask for confirmation — but only once. After confirmation, do not ask again. If confirmed, also include a friendly transition to the next branding step.>",
        //   "status": "confirm" | "unsure",
        //   "answer": "<clear brand name or idea if confident; if not, infer based on message>"
        // }

        // ${extraPrompt}

        // Rules:

        // 1. If the user’s message is vague, indecisive, or includes uncertainty (e.g. “maybe”, “not sure”, “I don’t know”):
        //    - Set "status": "unsure"
        //    - Offer 2–3 creative suggestions or a guiding question
        //    - Infer the user’s intent and set "answer" accordingly

        // 2. If the user suggests a name or gives a clear preference:
        //    - If this is the first time the idea is mentioned, respond with status: "unsure"
        //      - Politely confirm the idea ONCE with a warm message like:
        //        “Nice choice! Should we go ahead with <brand name>?”
        //    - If the user has already confirmed the same idea in a previous turn, respond with status: "confirm"
        //      - DO NOT ask for confirmation again
        //      - DO include a friendly transition like:
        //        “Perfect, we’ve locked that in! Now let’s move on to your tagline…”

        // 3. ONLY respond with "status": "confirm" if the assistant has previously asked for confirmation, and the user replies positively with phrases like:
        // “Yes, go with it”, “That’s perfect”, “Let’s do that”, or “Confirmed”.

        // 4. General:
        //    - Keep tone supportive and professional
        //    - Avoid asking open-ended or vague questions like “Do you want help?”
        //    - Use short, emotionally intelligent sentences
        //    - Pull from previous chat history if relevant


        // previous question and answer : ${previousQA}
        // Current branding question: ${currentQuestion.question}

        // Conversation history:
        // ${history}

        // User's latest message: ${userMessage}
        // `;

        const prompt = isBrandNameStep
          ? buildGenericPrompt({ extraPrompt, previousQA:previousQAArray, currentQuestion, history, userMessage })
          : buildBrandPrompt({
            question: currentQuestion.question,
            history: messages.map((msg) => ({ role: msg.role as 'user' | 'assistant', content: msg.content })),
            userMessage
          });

          

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        const rawText = result.response.text();

        let parsed;
        try {
          parsed = JSON.parse(rawText);
          if (!isValidAIResponse(parsed)) throw new Error('Invalid format');
        } catch (e1) {
          const match = rawText.match(/```json\s*([\s\S]*?)\s*```/);
          if (match && match[1]) {
            parsed = JSON.parse(match[1]);
            if (!isValidAIResponse(parsed)) throw new Error('Invalid JSON inside markdown');
          } else {
            console.error('Failed to parse AI response:', rawText);
            return ws.send(JSON.stringify({ type: 'error', message: 'AI response is invalid. Try again.' }));
          }
        }

        const { content, status, answer } = parsed;

        await prisma.conversation.create({
          data: { sessionId, role: 'assistant', content },
        });

        if (status !== 'confirm') {
          return ws.send(JSON.stringify({
            type: 'bot_message',
            content,
            status,
          }));
        }

        // Store confirmed answer
        if (status === 'confirm' && currentQuestion.key) {
          await prisma.brand_QA.create({
            data: {
              sessionId,
              stepKey: currentQuestion.key,
              question: currentQuestion.question,
              answer: answer.trim(),
            },
          });

          const nextIndex = currentIndex + 1;
          await prisma.brands_Session.update({
            where: { id: sessionId },
            data: { currentIndex: nextIndex },
          });

          if (nextIndex >= questions.length) {
            // await sleep(1000);
            return ws.send(JSON.stringify({ type: 'end', message: 'All questions answered. Great job!' }));
          }

          const nextQ = questions[nextIndex];
          return ws.send(JSON.stringify({
            type: 'bot_message',
            content: `${content} ${nextQ.question}`,
            status,
          }));
        }
      }
    } catch (err) {
      console.error('WebSocket Error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Something went wrong. Please try again.' }));
    }
  });

});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Helper function to validate AI response format
function isValidAIResponse(obj: any): obj is { content: string; status: 'confirm' | 'unsure'; answer: string } {
  return (
    obj &&
    typeof obj.content === 'string' &&
    (obj.status === 'confirm' || obj.status === 'unsure') &&
    typeof obj.answer === 'string'
  );
}
async function getAllPreviousQA(sessionId: string, currentIndex: number) {
  const previousQuestions = questions.slice(0, currentIndex); // All previous steps
  const keys = previousQuestions.map((q) => q.key);

  const answers = await prisma.brand_QA.findMany({
    where: {
      sessionId,
      stepKey: { in: keys },
    },
  });

  // Map questions with their answers
  const qaList = previousQuestions.map((q) => ({
    question: q.question,
    answer: answers.find((a) => a.stepKey === q.key)?.answer ?? undefined,
  }));

  return qaList;
}

