console.log('Tournament Service starting...');

// Simulated Express App
const app = {
  use: (path: string, handler: Function) => console.log(`[SimApp] Using middleware for ${path}`),
  get: (path: string, handler: Function) => console.log(`[SimApp] GET ${path}`),
  post: (path: string, handler: Function) => console.log(`[SimApp] POST ${path}`),
  listen: (port: number, callback: () => void) => {
    console.log(`[SimApp] Server would be listening on port ${port}`);
    callback();
  }
};

// Simulate user authentication middleware for user-specific routes
app.use('/v1/tournaments/:tournamentId/register', (req: any, next: Function) => {
    if (!req.user) req.user = { id: 'sim_user_for_reg', name: 'Simulated RegUser' };
    console.log(`[SimApp] Mock user auth for /register: User ${req.user.id}`);
    // next();
});

// Simulate admin authentication middleware for admin routes
// In a real app, admin routes might have a different prefix like /v1/admin/tournaments
app.use('/v1/tournaments/:tournamentId/start', (req: any, next: Function) => {
    if (!req.adminUser) req.adminUser = { id: 'sim_admin_ops' };
    console.log(`[SimApp] Mock admin auth for /start: Admin ${req.adminUser.id}`);
    // next();
});
app.use('/v1/tournaments/:tournamentId/finalize', (req: any, next: Function) => {
    if (!req.adminUser) req.adminUser = { id: 'sim_admin_ops' };
    console.log(`[SimApp] Mock admin auth for /finalize: Admin ${req.adminUser.id}`);
    // next();
});


// Simulate route registration
app.get('/v1/tournaments', (req: any, res: any) => { /* tournamentRoutes.list_tournaments(req, res) */ });
app.get('/v1/tournaments/:tournamentId', (req: any, res: any) => { /* tournamentRoutes.get_tournament_by_id(req, res) */ });
app.post('/v1/tournaments/:tournamentId/register', (req: any, res: any) => { /* tournamentRoutes.register_for_tournament(req, res) */ });
app.get('/v1/tournaments/:tournamentId/participants', (req: any, res: any) => { /* tournamentRoutes.list_participants(req, res) */ });

// Admin routes
app.post('/v1/tournaments/:tournamentId/start', (req: any, res: any) => { /* tournamentRoutes.admin_start_tournament(req, res) */ });
app.post('/v1/tournaments/:tournamentId/finalize', (req: any, res: any) => { /* tournamentRoutes.admin_finalize_tournament(req, res) */ });


const PORT = process.env.PORT || 3008; // Different port

app.listen(Number(PORT), () => {
  console.log(`[SimApp] Tournament Service would be running on http://localhost:${PORT}`);
});
