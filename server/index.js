import express from 'express';
import cors from 'cors';
import followUpRoutes from './routes/followUps.js';
import customerRoutes from './routes/customers.js';
import opportunityRoutes from './routes/opportunities.js';
import userRoutes from './routes/users.js';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API v1 路由
app.use('/api/v1/crm', followUpRoutes);
app.use('/api/v1/crm', customerRoutes);
app.use('/api/v1/crm', opportunityRoutes);
app.use('/api/v1', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`CRM Server running on http://localhost:${PORT}`);
  console.log(`API Base: http://localhost:${PORT}/api/v1/crm`);
});