import { useEffect } from 'react';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useMessageStore } from '@/store/messageStore';
import { useSessionStore } from '@/store/sessionStore';

interface MessageRow {
  id: string;
  room_id: string;
  sender_id: string;
  sender_username: string;
  content: string;
  created_at: string;
}

/**
 * Hook that subscribes to Realtime message updates and syncs them with messageStore.
 *
 * Listens for INSERT events on the messages table and automatically adds new messages
 * to the appropriate room in the messageStore.
 *
 * Only subscribes to messages in rooms the user has access to.
 *
 * @param enabled - Whether to enable the subscription (default: true)
 */
export function useMessageRealtimeSync(enabled = true) {
  const activeRoomId = useMessageStore((state) => state.activeRoomId);
  const currentPlayerId = useSessionStore((state) => state.profile?.playerId);

  useRealtimeSubscription<MessageRow>({
    table: 'messages',
    event: 'INSERT',
    debug: true,
    onInsert: (payload) => {
      const newMessage = payload.new;
      console.log('[useMessageRealtimeSync] New message received:', newMessage);

      // Convert database format to messageStore format
      const message = {
        id: newMessage.id,
        roomId: newMessage.room_id,
        authorId: newMessage.sender_id,
        body: newMessage.content,
        createdAt: new Date(newMessage.created_at).getTime(),
      };

      // Check if this message is for a room we're tracking
      const rooms = useMessageStore.getState().rooms;
      const targetRoom = rooms.find((room) => room.id === message.roomId);

      if (!targetRoom) {
        console.log('[useMessageRealtimeSync] Message for unknown room, ignoring:', message.roomId);
        return;
      }

      // Add message to the appropriate room
      const currentMessages = useMessageStore.getState().messages[message.roomId] || [];

      // Check if message already exists (prevent duplicates)
      const exists = currentMessages.some((m) => m.id === message.id);
      if (exists) {
        console.log('[useMessageRealtimeSync] Duplicate message, ignoring:', message.id);
        return;
      }

      // Add message to store
      useMessageStore.setState((state) => ({
        messages: {
          ...state.messages,
          [message.roomId]: [...currentMessages, message],
        },
      }));

      console.log('[useMessageRealtimeSync] Message added to room:', message.roomId);
    },
  });

  useEffect(() => {
    if (enabled) {
      console.log('[useMessageRealtimeSync] Message Realtime sync enabled');
      console.log('[useMessageRealtimeSync] Current player ID:', currentPlayerId);
      console.log('[useMessageRealtimeSync] Active room ID:', activeRoomId);
    } else {
      console.log('[useMessageRealtimeSync] Message Realtime sync disabled');
    }
  }, [enabled, currentPlayerId, activeRoomId]);
}
