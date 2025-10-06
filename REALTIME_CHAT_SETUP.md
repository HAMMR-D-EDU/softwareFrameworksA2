# Real-Time Chat Implementation - Setup Guide

## 🎉 Implementation Complete!

Your a2 application now has **real-time chat** using Socket.IO, MongoDB, and Angular with RxJS Observables!

---

## 📦 What Was Implemented

### Server-Side (Node.js + Express + Socket.IO)

1. **Socket.IO Server** (`config/socket.js`)
   - Channel-based rooms
   - Real-time message broadcasting
   - Chat history (last 50 messages)
   - Typing indicators
   - User join/leave notifications
   - Access control verification

2. **Image Upload Route** (`routes/uploads.js`)
   - Following ZZIMAGEUPLAOD pattern with `formidable`
   - 5MB file size limit
   - Images stored in `userimages/` folder
   - Served via `/images` static route

3. **Updated `server.js`**
   - HTTP server for Socket.IO
   - MongoDB indexes for messages
   - Static image serving

### Client-Side (Angular)

1. **Socket Service** (`services/socket.service.ts`)
   - Socket.IO client connection
   - RxJS Observables for real-time updates
   - Channel join/leave methods
   - Message sending (text + images)
   - Typing indicators

2. **Image Upload Service** (`services/image-upload.service.ts`)
   - FormData upload following ZZIMAGEUPLAOD pattern
   - Returns image path for Socket.IO messages

3. **Updated GroupDetailComponent**
   - Real-time chat UI in channel view
   - Message display with timestamps
   - Image upload and preview
   - Typing indicators
   - Auto-scroll to latest messages
   - Socket.IO lifecycle management

---

## 🚀 How to Run

### 1. Install Dependencies (if not already done)

```bash
# Server dependencies
cd /Users/keyaanhammadi/Desktop/SOFTWARE_FRAMEWORKS/a2/server
npm install

# Client dependencies
cd /Users/keyaanhammadi/Desktop/SOFTWARE_FRAMEWORKS/a2/client
npm install
```

### 2. Start MongoDB

```bash
# Make sure MongoDB is running
brew services start mongodb-community

# Verify
mongosh --eval "db.adminCommand('ping')"
```

### 3. Start Backend Server

```bash
cd /Users/keyaanhammadi/Desktop/SOFTWARE_FRAMEWORKS/a2/server
npm start
```

**Expected output:**
```
✓ Connected to MongoDB at mongodb://localhost:27017/microsoftteams
✓ MongoDB health check passed
✓ Message indexes created
✓ Socket.IO initialized
✓ Server running with Socket.IO on http://localhost:3000
```

### 4. Start Angular Client

```bash
cd /Users/keyaanhammadi/Desktop/SOFTWARE_FRAMEWORKS/a2/client
npm start
```

**Expected output:**
```
✓ Connected to Socket.IO server: [socket-id]
```

---

## 💬 How to Use the Chat

1. **Login** to your app (e.g., username: `super`, password: `123`)

2. **Navigate to a group** from your dashboard

3. **See channels** in the left sidebar

4. **Click on a channel** - This will:
   - Join the Socket.IO room
   - Load chat history (last 50 messages)
   - Display real-time chat interface

5. **Send messages**:
   - Type in the input box
   - Press Enter or click "Send"
   - Messages appear instantly for all users in that channel

6. **Upload images**:
   - Click the image button (📷 icon)
   - Select an image file
   - Preview appears
   - Click "Send Image"
   - Image appears in chat for all users

7. **Typing indicators**:
   - Other users see "X is typing..." when you type

---

## 🗄️ MongoDB Collections

### `messages` Collection Structure

```javascript
{
  _id: ObjectId("..."),
  channelId: "c_1",
  userId: "u_1",
  username: "super",
  text: "Hello everyone!",
  imagePath: "/images/photo.jpg", // or null
  createdAt: ISODate("2025-01-06T...")
}
```

### Indexes Created

- `channelId` (ascending) - Fast retrieval by channel
- `createdAt` (descending) - Sorted history

---

## 🔧 Key Features

### ✅ Real-Time Features

- **Instant messaging** - Messages appear without refresh
- **Socket.IO rooms** - One room per channel
- **Persistent storage** - All messages saved to MongoDB
- **Chat history** - Last 50 messages loaded on join
- **Image sharing** - Upload and share images
- **Typing indicators** - See when others are typing
- **User presence** - Join/leave notifications

### ✅ Access Control

- Only channel members can join chat
- Group admins have full access
- Super admins have full access
- Banned users cannot access channel chat

### ✅ User Experience

- **Auto-scroll** to latest messages
- **Message timestamps** - Show when sent
- **Own vs. others** messages - Different styling
- **Image preview** before sending
- **Responsive design** - Works on all screen sizes

---

## 🎨 UI Components

### Left Sidebar
- **Channel list** - Click to select
- **Selected highlight** - Shows active channel
- **Create channel** button (for admins)

### Right Panel (Chat Area)
- **Message history** - Scrollable
- **Message bubbles** - Own (purple) vs. others (white)
- **Image messages** - Inline display
- **Typing indicator** - "X is typing..."
- **Input area** - Text + image upload + send button

---

## 🧪 Testing the Implementation

### Test 1: Basic Messaging

1. Open two browser windows
2. Login as different users in each
3. Both join the same channel
4. Send a message from one user
5. **Result:** Message appears instantly in both windows

### Test 2: Image Upload

1. Click image button
2. Select an image
3. See preview
4. Click "Send Image"
5. **Result:** Image appears in chat for all users

### Test 3: Chat History

1. Send several messages
2. Refresh the page
3. Navigate back to the channel
4. **Result:** All messages are preserved

### Test 4: Typing Indicators

1. Two users in same channel
2. One user starts typing
3. **Result:** Other user sees "X is typing..."

### Test 5: Multiple Channels

1. Create multiple channels
2. Send messages in each
3. **Result:** Messages stay in their respective channels

---

## 📁 Files Modified/Created

### Server Files

- ✅ `config/socket.js` - Socket.IO configuration
- ✅ `routes/uploads.js` - Image upload route
- ✅ `server.js` - Updated with Socket.IO
- ✅ `package.json` - Added dependencies

### Client Files

- ✅ `services/socket.service.ts` - Socket.IO client
- ✅ `services/image-upload.service.ts` - Image upload
- ✅ `components/group-detail/group-detail.component.ts` - Chat logic
- ✅ `components/group-detail/group-detail.component.html` - Chat UI
- ✅ `components/group-detail/group-detail.component.css` - Chat styles
- ✅ `package.json` - Added dependencies

---

## 🔍 Troubleshooting

### Chat not connecting?

**Check:**
```bash
# Backend running?
curl http://localhost:3000/api/echo -H "Content-Type: application/json" -d '{"test": "hello"}'

# Socket.IO endpoint accessible?
curl http://localhost:3000/socket.io/
```

### Messages not appearing?

1. Check browser console for errors
2. Check server terminal for Socket.IO logs
3. Verify MongoDB connection
4. Check `messages` collection in MongoDB:
   ```bash
   mongosh
   use microsoftteams
   db.messages.find().pretty()
   ```

### Images not uploading?

1. Check `userimages/` folder exists in server directory
2. Check file size (must be < 5MB)
3. Check server logs for upload errors
4. Verify `/images` route is serving files:
   ```bash
   ls /Users/keyaanhammadi/Desktop/SOFTWARE_FRAMEWORKS/a2/server/userimages/
   ```

### Socket.IO not connecting?

1. Check CORS configuration in `server.js`
2. Verify `http://localhost:4200` is in allowed origins
3. Check browser console for connection errors
4. Try accessing `http://localhost:3000/socket.io/socket.io.js`

---

## 📊 Architecture

```
┌─────────────────┐
│  Angular Client │
│                 │
│  ┌───────────┐  │
│  │  Socket   │◄─┼─────┐
│  │  Service  │  │     │
│  └───────────┘  │     │
│                 │     │
│  ┌───────────┐  │     │    WebSocket
│  │   Group   │  │     │    Connection
│  │  Detail   │  │     │
│  │ Component │  │     │
│  └───────────┘  │     │
└─────────────────┘     │
                        │
                        ▼
┌─────────────────────────────┐
│     Express + Socket.IO     │
│                             │
│  ┌─────────┐  ┌──────────┐ │
│  │  HTTP   │  │ Socket.IO│ │
│  │ Routes  │  │  Rooms   │ │
│  └─────────┘  └──────────┘ │
│                             │
│      ▼          ▼           │
│  ┌─────────────────────┐   │
│  │      MongoDB        │   │
│  │   - messages        │   │
│  │   - users           │   │
│  │   - channels        │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

---

## 🎓 Academic Interview Points

### ES6 Modules
- Used `import/export` throughout
- Matches week 9 workshop structure
- Modern JavaScript practices

### Socket.IO Implementation
- **Rooms** - One per channel for isolation
- **Namespaces** - Default namespace used
- **Events** - join, message, leave, typing
- **Acknowledgments** - Error handling via emit

### MongoDB Integration
- **Native driver** - No Mongoose
- **Async/await** - Modern async patterns
- **Indexes** - Optimized queries
- **Aggregation** - Ready for advanced queries

### RxJS Observables
- **Reactive programming** - Real-time data streams
- **Observable pattern** - Clean subscription management
- **Memory management** - Proper unsubscribe in ngOnDestroy

### Image Upload (ZZIMAGEUPLAOD Pattern)
- **FormData** - Multipart form data
- **Formidable** - Server-side parsing
- **File system** - Static file serving
- **Path handling** - Cross-platform compatibility

---

## 🚀 Future Enhancements (Phase 2)

Ready for these additions:

1. **Video Chat** - PeerJS integration
2. **File Sharing** - Support for documents
3. **Message Reactions** - Emoji reactions
4. **Message Editing** - Edit/delete messages
5. **Read Receipts** - Track who's read messages
6. **User Status** - Online/offline indicators
7. **Direct Messages** - 1-on-1 chat
8. **Push Notifications** - Browser notifications

---

## ✅ Summary

Your a2 application now has:

✅ Real-time chat with Socket.IO
✅ MongoDB message persistence
✅ Image uploads (ZZIMAGEUPLAOD pattern)
✅ Channel-based rooms
✅ RxJS Observables
✅ Typing indicators
✅ Chat history
✅ Access control
✅ Modern UI/UX

**You're ready for your demo!** 🎉
