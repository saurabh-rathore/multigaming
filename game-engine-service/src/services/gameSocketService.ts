// import { Server as SocketIOServer, Socket } from 'socket.io'; // Actual Socket.IO types
// Mock types for Socket.IO Server and Socket for this conceptual file
type MockSocket = {
    id: string;
    join: (room: string) => void;
    leave: (room: string) => void;
    to: (room: string) => ({ emit: (event: string, ...args: any[]) => void });
    emit: (event: string, ...args: any[]) => void;
    on: (event: string, listener: (...args: any[]) => void) => void;
    disconnect: (close?: boolean) => void;
    handshake: { auth: { token?: string, userId?: string, username?: string } }; // Store authenticated user data here
};
type MockSocketIOServer = {
    on: (event: string, listener: (socket: MockSocket) => void) => void;
    to: (room: string) => ({ emit: (event: string, ...args: any[]) => void });
    // Other server methods if needed
};

import { generateId } from '../utils/helpers';
import { ChatMessage, SendChatMessagePayload, WebRTCSignalPayload, VoiceChatRoomActionPayload } from '../types/game.types';
import pool from '../config/db.config'; // For saving chat messages

// Placeholder for JWT validation function (would call auth-service or use shared secret)
async function validateSocketToken(token: string): Promise<{ userId: string, username: string, roles: string[] } | null> {
    console.log(`[SocketAuth-Mock] Validating token: ${token}`);
    if (token && token.startsWith("placeholder_jwt_for_")) {
        // placeholder_jwt_for_userId_session_sessionId_is_guest_false_expires_1d
        const parts = token.split('_');
        if (parts.length > 3) {
            const userId = parts[3];
            const isGuest = token.includes("_is_guest_true");
            return { userId, username: isGuest ? `Guest_${userId.substring(0,4)}` : `User_${userId.substring(0,4)}`, roles: isGuest ? ['guest'] : ['user'] };
        }
    }
    return null;
}

export class GameSocketService {
    private io: MockSocketIOServer;

    constructor(io: MockSocketIOServer) {
        this.io = io;
        this.initializeSocketEvents();
    }

    private initializeSocketEvents(): void {
        this.io.on('connection', async (socket: MockSocket) => {
            console.log(`[GameSocketService] User connected: ${socket.id}`);

            // --- Socket Authentication Middleware (Conceptual) ---
            const token = socket.handshake.auth?.token;
            if (!token) {
                console.log(`[GameSocketService] No token provided by ${socket.id}, disconnecting.`);
                socket.emit('auth_error', { message: 'Authentication token required.' });
                socket.disconnect(true);
                return;
            }

            const authUser = await validateSocketToken(token);
            if (!authUser) {
                console.log(`[GameSocketService] Invalid token for ${socket.id}, disconnecting.`);
                socket.emit('auth_error', { message: 'Invalid authentication token.' });
                socket.disconnect(true);
                return;
            }
            // Store authenticated user details on the socket object
            socket.handshake.auth.userId = authUser.userId;
            socket.handshake.auth.username = authUser.username;
            console.log(`[GameSocketService] User ${authUser.userId} (${authUser.username}) authenticated for socket ${socket.id}`);
            socket.emit('authenticated', { userId: authUser.userId, username: authUser.username });
            // --- End Socket Authentication ---


            socket.on('join_game_room', (roomId: string) => {
                console.log(`[GameSocketService] User ${socket.handshake.auth.username} joining game room: ${roomId}`);
                socket.join(roomId);
                // Notify others in room (optional)
                socket.to(roomId).emit('user_joined_room', { userId: socket.handshake.auth.userId, username: socket.handshake.auth.username });
            });

            socket.on('leave_game_room', (roomId: string) => {
                console.log(`[GameSocketService] User ${socket.handshake.auth.username} leaving game room: ${roomId}`);
                socket.leave(roomId);
                // Notify others in room (optional)
                socket.to(roomId).emit('user_left_room', { userId: socket.handshake.auth.userId, username: socket.handshake.auth.username });
            });

            // --- Chat Message Handling ---
            socket.on('send_chat_message', async (payload: SendChatMessagePayload) => {
                const { room_id, message_content } = payload;
                const senderId = socket.handshake.auth.userId;
                const senderUsername = socket.handshake.auth.username || 'UnknownUser';

                if (!senderId) {
                    socket.emit('chat_error', { room_id, message: "Authentication error, cannot send message." });
                    return;
                }
                if (!room_id || !message_content || message_content.trim() === '') {
                    socket.emit('chat_error', { room_id, message: "Room ID and message content are required." });
                    return;
                }

                const chatMessage: ChatMessage = {
                    message_id: generateId('msg'),
                    room_id,
                    user_id: senderId,
                    username: senderUsername,
                    message_content: message_content.trim(),
                    timestamp: new Date().toISOString()
                };

                try {
                    // Store message in DB
                    const insertSql = 'INSERT INTO chat_messages (message_id, room_id, user_id, username, message_content, timestamp) VALUES (?, ?, ?, ?, ?, ?)';
                    await pool.query(insertSql, [chatMessage.message_id, chatMessage.room_id, chatMessage.user_id, chatMessage.username, chatMessage.message_content, chatMessage.timestamp]);

                    // Broadcast message to all clients in the room
                    this.io.to(room_id).emit('new_chat_message', chatMessage);
                    console.log(`[GameSocketService] Message from ${senderUsername} in room ${room_id}: ${message_content}`);
                } catch (error: any) {
                    console.error(`[GameSocketService] Error saving/broadcasting chat message: ${error.message}`);
                    socket.emit('chat_error', { room_id, message: "Failed to send message." });
                }
            });

            // --- WebRTC Signaling Message Relaying ---
            socket.on('webrtc_signal', (payload: WebRTCSignalPayload) => {
                const { room_id, recipient_id, signal_type, data } = payload;
                const sender_id = socket.handshake.auth.userId;

                if (!sender_id) {
                    console.warn(`[GameSocketService] WebRTC signal received from unauthenticated socket ${socket.id}`);
                    return;
                }

                console.log(`[GameSocketService] WebRTC signal '${signal_type}' from ${sender_id} in room ${room_id}. Target: ${recipient_id || 'all_in_room_except_sender'}`);

                if (recipient_id) {
                    // Direct message to a specific user in the room
                    // Server needs a way to map userId to socket.id if recipient_id is a userId
                    // For simplicity, assuming clients manage this mapping or server has a lookup
                    // This mock just broadcasts to room, client would filter.
                    // A real implementation: io.to(socketIdOfRecipient).emit(...)
                    socket.to(room_id).emit('webrtc_signal_received', { ...payload, sender_id });
                } else {
                    // Broadcast to everyone else in the room (e.g., for ICE candidates)
                    socket.to(room_id).emit('webrtc_signal_received', { ...payload, sender_id });
                }
            });

            socket.on('voice_chat_join', (payload: VoiceChatRoomActionPayload) => {
                const { room_id } = payload;
                const userId = socket.handshake.auth.userId;
                const username = socket.handshake.auth.username;
                if (!userId || !username) return;

                console.log(`[GameSocketService] User ${username} joining voice chat for room ${room_id}`);
                socket.join(`${room_id}_voice`); // Separate Socket.IO room for voice participants if needed
                // Notify others in the game room (or voice room) that this user is ready for WebRTC
                socket.to(room_id).emit('webrtc_signal_received', {
                    room_id,
                    sender_id: userId,
                    signal_type: 'user_joined_voice',
                    data: { userId, username }
                });
            });

            socket.on('voice_chat_leave', (payload: VoiceChatRoomActionPayload) => {
                const { room_id } = payload;
                 const userId = socket.handshake.auth.userId;
                if (!userId) return;

                console.log(`[GameSocketService] User ${socket.handshake.auth.username} leaving voice chat for room ${room_id}`);
                socket.leave(`${room_id}_voice`);
                socket.to(room_id).emit('webrtc_signal_received', {
                    room_id,
                    sender_id: userId,
                    signal_type: 'user_left_voice',
                    data: { userId }
                });
            });


            socket.on('disconnect', () => {
                const userId = socket.handshake.auth.userId;
                console.log(`[GameSocketService] User ${userId || socket.id} disconnected.`);
                // TODO: Handle user leaving all their joined rooms, including voice rooms.
                // Example:
                // For each room this socket was in:
                //   socket.to(room).emit('user_left_room', { userId });
                //   socket.to(room).emit('webrtc_signal_received', { room_id: room, sender_id: userId, signal_type: 'user_left_voice', data: { userId } });
            });
        });
    }

    // Method to be called from GameEngineService to broadcast game state updates
    public broadcastGameStateUpdate(roomId: string, gameState: any): void {
        console.log(`[GameSocketService] Broadcasting game state update for room ${roomId}`);
        this.io.to(roomId).emit('game_state_update', { room_id: roomId, game_state: gameState });
    }
}

// --- How to integrate with main Express server (conceptual in main.ts) ---
// import { createServer } from 'http';
// import { Server } from 'socket.io';
// import express from 'express';
//
// const app = express();
// const httpServer = createServer(app);
// const io = new Server(httpServer, {
//   cors: {
//     origin: "http://localhost:4200", // Frontend URL
//     methods: ["GET", "POST"]
//   }
// });
//
// const gameSocketService = new GameSocketService(io as any as MockSocketIOServer); // Cast for mock
//
// // httpServer.listen(3000); // Your game engine HTTP server port
// // GameEngineService could then get gameSocketService injected to call broadcastGameStateUpdate.
// --- End Conceptual Integration ---
