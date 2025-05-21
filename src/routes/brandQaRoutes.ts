import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const router = Router();


// Start a new brand session
router.post('/start', async (req, res) => {
  const { isVoice } = req.body;  // Get isVoice from the request body

  try {
    const session = await prisma.brands_Session.create({
      data: {
        id: uuidv4(),
        status: 'draft',
        currentIndex: 0,
        voiceMode: isVoice ?? false,  // Default to false if isVoice is not provided
      },
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});


// Save or update a question/answer
interface AnswerRequestBody {
  sessionId: string;
  stepKey: string;
  question: string;
  answer: string;
  index: number;
}

interface SessionParams {
  id: string;
}
router.patch('/:sessionId/voice', async (req:any, res:any) => {
  const { sessionId } = req.params;
  const { voiceMode } = req.body;

  if (typeof voiceMode !== 'boolean') {
    return res.status(400).json({ error: "voiceMode must be a boolean" });
  }

  try {
    const updatedSession = await prisma.brands_Session.update({
      where: { id: sessionId },
      data: { voiceMode },
    });

    return res.json({
      message: 'Voice mode updated successfully',
      voiceMode: updatedSession.voiceMode,
    });
  } catch (error) {
    console.error('Failed to update voiceMode:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
router.post('/answers', async (req: any, res: any) => {
  try {
    const { sessionId, stepKey, question, answer } = req.body; // ❗ no more `index`

    console.log('Session ID:', sessionId);

    const session = await prisma.brands_Session.findUnique({
      where: { id: sessionId },
    });

    console.log('Session:', session);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Save new answer
    await prisma.brand_QA.create({
      data: { sessionId, stepKey, question, answer },
    });

    // Update current index (+1)
    await prisma.brands_Session.update({
      where: { id: sessionId },
      data: { currentIndex: session.currentIndex + 1 }, // increment
    });

    return res.json({ message: 'Saved and current index updated' });
  } catch (error) {
    console.error('Error in /answers:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/qa/:sessionId/:stepKey', async (req:any, res:any) => {
  const { sessionId, stepKey } = req.params;

  try {
    const qa = await prisma.brand_QA.findUnique({
      where: {
        sessionId_stepKey: {
          sessionId,
          stepKey,
        },
      },
    });

    if (!qa) {
      return res.status(404).json({ message: 'QA not found' });
    }

    res.json(qa);
  } catch (error) {
    console.error('Error fetching QA:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});




// Get all answers by session ID
router.get('/answers/:sessionId', async (req, res) => {
  const sessionId = req.params.sessionId;

  const answers = await prisma.brand_QA.findMany({
    where: { sessionId },
    select: { stepKey: true, question: true, answer: true },
  });

  res.json(answers.map(a => ({
    key: a.stepKey,
    question: a.question,
    answer: a.answer,
  })));
});
// Get all sessions
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const sessions = await prisma.brands_Session.findMany({
      select: {
        id: true,
        status: true,
        currentIndex: true,
        voiceMode:true
        // createdAt: true,
        // updatedAt: true,F
      },
      // orderBy: {
      //   createdAt: 'desc', // latest first
      // },
    });

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.get('/sessions/:id', async (req, res) => {
  
  const id = req.params.id;
  try {
    const session = await prisma.brands_Session.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        currentIndex: true,
        voiceMode:true,
        // createdAt: true,
        // updatedAt: true,
      },
    });

      // if (!session) {
      //   return res.status(404).json({ error: 'Session not found' });
      // }

    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});
router.put('/update-answer', async (req, res) => {
  const { sessionId, key, newAnswer } = req.body;
  console.log(sessionId, key, newAnswer);  // Log to verify the values

  await prisma.brand_QA.updateMany({
    where: { sessionId, stepKey: key },
    data: { answer: newAnswer },
  });

  res.json({ success: true });
});


export default router;
