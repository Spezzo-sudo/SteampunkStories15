# Multiplayer Realtime Testing Guide

This document describes how to test the implemented Realtime multiplayer features.

## Prerequisites

- Supabase project with populated database
- At least 2 test accounts
- Modern browser with multiple tab support
- Browser console access for debug logs

## Test Setup

### Multi-Tab Testing

1. **Create 2 Test Accounts**:
   ```
   Account A: player1@test.com / password123
   Account B: player2@test.com / password123
   ```

2. **Open 2 Browser Tabs**:
   - Tab 1: Login as player1@test.com
   - Tab 2: Login as player2@test.com

3. **Enable Console Logging**:
   - Press F12 to open DevTools
   - Go to Console tab
   - All Realtime events will be logged with `[use*RealtimeSync]` prefix

---

## Feature Tests

### ✅ 1. Tile Ownership Realtime Sync

**Purpose**: Verify that settlement placement is visible to all players in real-time.

**Steps**:
1. Tab 1 (Player 1): Navigate to GalaxyView
2. Tab 1: Select a region (click on a region hex)
3. Tab 1: Click "Besiedeln" on an empty tile
4. Tab 1: Confirm settlement creation
5. **Expected Result**:
   - Tab 2 (Player 2) should see the tile ownership change **immediately**
   - The tile should show Player 1's color/name
   - No page reload required

**Debug Logs to Check**:
```
[useTileRealtimeSync] Tile updated: {...}
[useTileRealtimeSync] Reloading current region due to tile update
```

---

### ✅ 2. Message Realtime Sync

**Purpose**: Verify that chat messages appear in real-time across all clients.

**Steps**:
1. Tab 1 & 2: Navigate to AllianceView (to open chat sidebar)
2. Tab 1: Send a message in the "Bande" (alliance) chat
3. **Expected Result**:
   - Tab 2 should receive the message **instantly**
   - Message should appear at the bottom of the chat
   - No duplicate messages

**Steps (Direct Messages)**:
1. Tab 1: Open "Direkt" tab in chat
2. Tab 1: Send a direct message
3. **Expected Result**:
   - Tab 2 should see the DM in their "Direkt" tab

**Debug Logs to Check**:
```
[messageStore] Message sent to database successfully
[useMessageRealtimeSync] New message received: {...}
[useMessageRealtimeSync] Message added to room: alliance-room
```

---

### ✅ 3. Convoy Realtime Tracking

**Purpose**: Verify that convoy movements and arrivals trigger notifications.

**Steps (Own Convoy)**:
1. Tab 1 (Player 1): Launch a convoy (scout/attack/transport mission)
2. **Expected Result (Status: Preparing → En Route)**:
   - Toast: "Flotte gestartet - Deine [Mission]-Mission ist unterwegs"

3. Wait for convoy to arrive
4. **Expected Result (Status: En Route → Arrived)**:
   - Toast: "✅ Flotte angekommen - Deine [Mission]-Mission hat ihr Ziel erreicht"

**Steps (Incoming Hostile Convoy)**:
1. Tab 1 (Player 1): Launch an attack convoy targeting Player 2's settlement
2. **Expected Result (Tab 2)**:
   - Toast: "⚠️ Eingehende Flotte! - Angriff zielt auf [settlement name]"

3. Wait for convoy to arrive
4. **Expected Result (Tab 2)**:
   - Toast: "🚨 Feindliche Flotte eingetroffen! - Angriff bei [settlement name]"

**Debug Logs to Check**:
```
[useConvoyRealtimeSync] New convoy detected: {...}
[useConvoyRealtimeSync] Convoy updated: { oldStatus: 'preparing', newStatus: 'en_route' }
```

---

### ✅ 4. Manual Resource Refresh

**Purpose**: Verify that the manual refresh button fetches latest data from server.

**Steps**:
1. Tab 1 (Player 1): Note current resource values
2. **In Supabase Dashboard**:
   - Go to Table Editor → settlements
   - Find Player 1's settlement
   - Manually edit `resources` JSONB field
   - Change `Orichalkum` to a different value (e.g., 9999)

3. Tab 1: Click the blue "Aktualisieren" button in TopBar
4. **Expected Result**:
   - Resources should update to new values from database
   - Toast: "Ressourcen aktualisiert - Daten vom Server geladen"
   - Refresh icon should spin during load

**Debug Logs to Check**:
```
[TopBar] Fetching settlements...
[TopBar] Resources updated from server
```

---

### ✅ 5. Online Status & Activity Heartbeat

**Purpose**: Verify that players are marked as online and heartbeat updates work.

**Steps**:
1. Tab 1 (Player 1): Login and stay active
2. **In Supabase Dashboard**:
   - Go to Table Editor → players
   - Find Player 1's row
   - Watch the `last_active` timestamp

3. **Expected Result**:
   - `last_active` should update every **30 seconds**
   - Timestamp should always be very recent (< 30s old)

4. Tab 2 (Player 2): Navigate to DirectoryView (or player list)
5. **Expected Result**:
   - Player 1 should be marked as "Online" (if using helper functions)
   - Or `last_active` should be < 5 minutes

**Debug Logs to Check**:
```
[useActivityHeartbeat] Heartbeat started (interval: 30000 ms)
[useActivityHeartbeat] Heartbeat sent
```

---

## Performance Tests

### Load Testing: Multiple Tabs

**Steps**:
1. Open 5+ browser tabs with different accounts
2. Perform various actions (send messages, place settlements, launch convoys)
3. **Expected Result**:
   - No lag or freezing
   - All events propagate to all tabs
   - Console shows no errors
   - Supabase Realtime connection status: "SUBSCRIBED"

### Network Resilience

**Steps**:
1. Tab 1: Open DevTools → Network tab
2. Tab 1: Set throttling to "Slow 3G"
3. Tab 2: Send a chat message
4. **Expected Result**:
   - Tab 1 should still receive the message (may take longer)
   - No errors in console
   - Realtime connection should auto-reconnect if dropped

---

## Common Issues & Debugging

### Issue: "Tile not updating in Tab 2"

**Debugging**:
1. Check console for `[useTileRealtimeSync]` logs
2. Verify Realtime is enabled in Supabase dashboard
3. Check RLS policies on `tiles` table (SELECT should be public)
4. Verify both tabs are viewing the same region

### Issue: "Messages not appearing"

**Debugging**:
1. Check `[useMessageRealtimeSync]` logs in console
2. Verify message was inserted into database (Supabase → Table Editor → messages)
3. Check RLS policy on `messages` table
4. Verify both users are in the same room (room_id matches)

### Issue: "Convoy notifications not showing"

**Debugging**:
1. Check `[useConvoyRealtimeSync]` logs
2. Verify convoy was inserted into database (Supabase → convoys table)
3. Check that `target_tile_id` matches a settlement owned by the target player
4. Verify Realtime publication includes `convoys` table

### Issue: "Heartbeat not updating last_active"

**Debugging**:
1. Check `[useActivityHeartbeat]` logs every 30s
2. Verify RLS policy allows UPDATE on `players` table for own row
3. Check network tab for failed requests to Supabase
4. Ensure user is authenticated (auth.uid() is set)

---

## Expected Console Output (Normal Operation)

```
[useActivityHeartbeat] Heartbeat started (interval: 30000 ms)
[useActivityHeartbeat] Heartbeat sent

[useTileRealtimeSync] Tile Realtime sync enabled
[useRealtimeSubscription] Subscribing to realtime:tiles:*:all
[useRealtimeSubscription] Status: SUBSCRIBED

[useMessageRealtimeSync] Message Realtime sync enabled
[useRealtimeSubscription] Subscribing to realtime:messages:INSERT:all
[useRealtimeSubscription] Status: SUBSCRIBED

[useConvoyRealtimeSync] Convoy Realtime sync enabled
[useRealtimeSubscription] Subscribing to realtime:convoys:*:all
[useRealtimeSubscription] Status: SUBSCRIBED
```

---

## Test Coverage Summary

| Feature | Status | Multi-Tab | Edge Cases | Notes |
|---------|--------|-----------|------------|-------|
| Tile Ownership Sync | ✅ Ready | Required | Region switching, simultaneous claims | Test with 2+ players |
| Message Realtime | ✅ Ready | Required | Empty messages, duplicates | Test alliance + DM |
| Convoy Tracking | ✅ Ready | Recommended | Status transitions, cancellations | Test all mission types |
| Manual Refresh | ✅ Ready | Optional | No settlements, DB errors | Test error states |
| Activity Heartbeat | ✅ Ready | Recommended | Network drops, auth expiry | Check 30s interval |

---

## Next Steps

After successful testing, the following features can be added:

1. **Player Realtime Sync** - Subscribe to `players` table for resource updates
2. **Battle Realtime** - Subscribe to `battles` table for combat resolution
3. **Settlement Realtime** - Subscribe to `settlements` for production updates
4. **Alliance Realtime** - Subscribe to `alliances` and `alliance_members`

---

## Troubleshooting Checklist

- [ ] Supabase project URL and Anon Key configured in `.env.local`
- [ ] All migrations applied (check Supabase → SQL Editor → Migrations)
- [ ] RLS policies enabled on all tables
- [ ] Realtime publication includes: `tiles`, `messages`, `convoys`, `players`
- [ ] Browser supports WebSockets (check: https://websocket.org/echo.html)
- [ ] No firewall blocking WebSocket connections
- [ ] Supabase project not paused (free tier pauses after inactivity)

---

**Last Updated**: 2025-11-16
**Version**: Phase 1.5 - Realtime Features + Testing
