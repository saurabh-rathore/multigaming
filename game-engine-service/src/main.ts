console.log('Game Engine Service starting...');

const app = {
  get: (path: string, handler: Function) => console.log(`[SimApp] GET ${path}`),
  post: (path: string, handler: Function) => console.log(`[SimApp] POST ${path}`),
  listen: (port: number, callback: () => void) => {
    console.log(`[SimApp] Server would be listening on port ${port}`);
    callback();
  }
};

// Simulate route registration
app.get('/v1/games', (req: any, res: any) => { /* gameEngineRoutes.get_games_list(req, res) */ });
app.get('/v1/games/:gameId', (req: any, res: any) => { /* gameEngineRoutes.get_game_details(req, res) */ });
app.post('/v1/games/:gameId/result', (req: any, res: any) => { /* gameEngineRoutes.post_game_result(req, res) */ });

const PORT = process.env.PORT || 3004; // Different port

app.listen(Number(PORT), () => {
  console.log(`[SimApp] Game Engine Service would be running on http://localhost:${PORT}`);
});
