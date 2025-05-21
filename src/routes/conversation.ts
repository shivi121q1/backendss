import { PrismaClient } from '@prisma/client';
import express from 'express';

const prisma = new PrismaClient();
const router = express.Router();

// POST /api/conversation
router.post("/conversation",async(req,res)=>{
    const { sessionId, role, content } = req.body;
    try {
        const conversation = await prisma.conversation.create({
          data: { sessionId, role, content },
        });
    
        res.status(201).json(conversation);
      } catch (error) {
        console.error('Error creating conversation message:', error);
        res.status(500).json({ error: 'Failed to create conversation messages' });
      }
   
})

// GET /api/conversation/:sessionId
router.get('/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const messages = await prisma.conversation.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    res.status(500).json({ error: 'Failed to fetch conversation messages' });
  }
});

export default router;
