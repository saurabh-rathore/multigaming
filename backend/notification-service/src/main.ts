import express from 'express';
import notificationRoutes from './routes/notification';

const app = express();
app.use(express.json());

app.use('/v1', notificationRoutes);

const PORT = process.env.PORT || 3009;

app.listen(PORT, () => {
  console.log(`Notification Service running on http://localhost:${PORT}`);
});
