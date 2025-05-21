import express from 'express';
import cors from 'cors'; // Import CORS
import brandQaRoutes from './routes/brandQaRoutes';
import conversationRouter from './routes/conversation';
import brandOutputRoute from './routes/brandOutput'; 
// import logoRouter from "./routes/logoGeneration"

const app = express();

app.use(cors()); // Use CORS middleware
app.use(express.json());

// Mount brandQaRoutes on '/api/brand'
app.use('/api/brand', brandQaRoutes);
app.use('/api/',brandOutputRoute); // Plug the route in  
// Mount conversationRouter on '/api/conversation'
// app.use("/api/logo",logoRouter);
app.use('/api/conversation', conversationRouter); // ✅ correct

export default app;
