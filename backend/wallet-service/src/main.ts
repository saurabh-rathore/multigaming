import express from 'express';
import walletRoutes from './routes/wallet';

const app = express();
app.use(express.json());

app.use('/v1/wallets', walletRoutes);

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  console.log(`Wallet Service running on http://localhost:${PORT}`);
});
