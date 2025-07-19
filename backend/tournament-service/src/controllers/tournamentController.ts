import { TournamentService } from '../services/tournamentService';
import { TournamentStatus, FinalizeTournamentRequestBody } from '../types/tournament.types';

type Request = any; // { params: { tournamentId: string }, body: any, query: any, user?: { id: string, name?: string }, adminUser?: {id: string} }
type Response = any;

const tournamentService = new TournamentService();

export const listAvailableTournaments = async (req: Request, res: Response) => {
  try {
    const filters: { gameId?: string; status?: TournamentStatus } = {};
    if (req.query?.gameId) filters.gameId = String(req.query.gameId);
    if (req.query?.status) filters.status = String(req.query.status) as TournamentStatus;

    const tournaments = await tournamentService.listTournaments(filters);
    return { statusCode: 200, body: tournaments };
  } catch (error: any) {
    return { statusCode: 500, body: { message: 'Failed to retrieve tournaments.' } };
  }
};

export const getTournamentDetails = async (req: Request, res: Response) => {
  try {
    const tournamentId = req.params?.tournamentId;
    if (!tournamentId) return { statusCode: 400, body: { message: 'Tournament ID is required.'}};

    const tournament = await tournamentService.getTournamentById(tournamentId);
    if (!tournament) return { statusCode: 404, body: { message: 'Tournament not found.'}};

    return { statusCode: 200, body: tournament };
  } catch (error: any) {
    return { statusCode: 500, body: { message: 'Failed to retrieve tournament details.'}};
  }
};

export const registerUserForTournament = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id; // From user auth middleware
    const displayName = req.user?.name; // Optional, from user auth middleware
    if (!userId) return { statusCode: 401, body: { message: 'User not authenticated.'}};

    const tournamentId = req.params?.tournamentId;
    if (!tournamentId) return { statusCode: 400, body: { message: 'Tournament ID is required.'}};

    const participantEntry = await tournamentService.registerForTournament(tournamentId, userId, displayName);
    return { statusCode: 201, body: participantEntry };
  } catch (error: any) {
    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('not open') || error.message.includes('ended') ||
                       error.message.includes('full') || error.message.includes('already registered') ||
                       error.message.includes('payment failed') ? 400 : 500; // More specific error codes
    return { statusCode, body: { message: error.message }};
  }
};

export const getTournamentParticipantList = async (req: Request, res: Response) => {
    try {
        const tournamentId = req.params?.tournamentId;
        if (!tournamentId) return { statusCode: 400, body: { message: 'Tournament ID is required.'}};
        const participants = await tournamentService.getTournamentParticipants(tournamentId);
        return { statusCode: 200, body: participants };
    } catch (error: any) {
        const statusCode = error.message.includes('not found') ? 404 : 500;
        return { statusCode, body: { message: error.message }};
    }
};

// Admin Endpoints
export const startTournamentAdmin = async (req: Request, res: Response) => {
    try {
        const adminUserId = req.adminUser?.id; // From admin auth middleware
        if (!adminUserId) return { statusCode: 401, body: { message: 'Admin not authenticated.'}};
        const tournamentId = req.params?.tournamentId;
        if (!tournamentId) return { statusCode: 400, body: { message: 'Tournament ID is required.'}};

        const tournament = await tournamentService.startTournament(tournamentId, adminUserId);
        return { statusCode: 200, body: tournament };
    } catch (error: any) {
        const statusCode = error.message.includes('not found') ? 404 :
                           error.message.includes('cannot be started') || error.message.includes('Minimum') ? 400 : 500;
        return { statusCode, body: { message: error.message }};
    }
};

export const finalizeTournamentAdmin = async (req: Request, res: Response) => {
    try {
        const adminUserId = req.adminUser?.id;
        if (!adminUserId) return { statusCode: 401, body: { message: 'Admin not authenticated.'}};
        const tournamentId = req.params?.tournamentId;
        if (!tournamentId) return { statusCode: 400, body: { message: 'Tournament ID is required.'}};

        const body: FinalizeTournamentRequestBody = req.body;
        if (!body || !Array.isArray(body.participantResults) || body.participantResults.length === 0) {
            return { statusCode: 400, body: { message: 'Participant results are required.'}};
        }

        const tournament = await tournamentService.finalizeTournament(tournamentId, adminUserId, body.participantResults);
        return { statusCode: 200, body: tournament };
    } catch (error: any) {
        const statusCode = error.message.includes('not found') ? 404 :
                           error.message.includes('cannot be finalized') ? 400 : 500;
        return { statusCode, body: { message: error.message }};
    }
};
