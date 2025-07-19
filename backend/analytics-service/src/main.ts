import express from 'express';
import analyticsRoutes from './routes/analytics';

const app = express();
app.use(express.json());

app.use('/v1/analytics', analyticsRoutes);

const PORT = process.env.PORT || 3010;

app.listen(PORT, () => {
  console.log(`Analytics Service running on http://localhost:${PORT}`);
});
