import { joinMatchQueue, getRoomInfo, leaveMatchQueue } from '../controllers/matchmakingController';

export const matchmakingRoutes = {
  post_join_queue: (req: any, res: any) => joinMatchQueue(req, res),    // POST /match/join
  get_room_details: (req: any, res: any) => getRoomInfo(req, res),      // GET /match/room/:roomId
  post_leave_queue: (req: any, res: any) => leaveMatchQueue(req, res),  // POST /match/leave
};
