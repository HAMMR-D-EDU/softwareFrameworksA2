# Microsoft Teams Clone - Software Frameworks Assignment 2

A full-stack real-time communication application built with Angular 17 (frontend) and Node.js/Express (backend), featuring group chat, video calling, user management, and administrative functions.

## Table of Contents

- [Repository Organization](#repository-organization)
- [Data Structures](#data-structures)
- [Client-Server Architecture](#client-server-architecture)
- [API Documentation](#api-documentation)
- [Angular Architecture](#angular-architecture)
- [Client-Server Interaction](#client-server-interaction)
- [Development Setup](#development-setup)
- [Features](#features)

## Repository Organization

### Git Repository Structure

The repository follows a monorepo structure with clear separation between client and server:

```
softwareFrameworksA2/
├── client/                 # Angular 17 frontend application
│   ├── src/app/
│   │   ├── components/     # Angular components
│   │   ├── services/       # Angular services
│   │   ├── guards/         # Route guards
│   │   └── types/          # TypeScript type definitions
│   └── package.json
├── server/                 # Node.js/Express backend
│   ├── routes/            # API route handlers
│   ├── config/            # Database and socket configuration
│   ├── userimages/        # Static file storage
│   └── package.json
└── README.md
```

### Git Usage During Development

During development, a second branch was utilized to implement and test the video calling feature on a different computer that had camera access, as the primary development device lacked camera functionality. This demonstrates proper Git workflow practices for feature development and testing across multiple environments.

## Data Structures

### Client-Side Data Structures

#### User Interface (`auth.service.ts`)
```typescript
export interface User {
  id: string;
  username: string;
  password: string;
  email?: string;
  roles: Role[];
  groups: string[];
  avatarPath?: string;
}

export type Role = 'super' | 'super_admin' | 'groupAdmin' | 'group_admin' | 'user';
```

#### API User Interface (`api.service.ts`)
```typescript
export interface ApiUser {
  id: string;
  username: string;
  roles: string[];
  groups: string[];
  email?: string;
  avatarPath?: string;
}

export interface Group {
  id: string;
  name: string;
  creatorId: string;
  memberIds: string[];
  adminIds: string[];
}

export interface Channel {
  id: string;
  name: string;
  groupId: string;
  creatorId: string;
  bannedUserIds: string[];
}
```

#### Chat Message Interface (`socket.service.ts`)
```typescript
export interface ChatMessage {
  messageId?: string;
  channelId: string;
  userId: string;
  username: string;
  text: string;
  imagePath?: string | null;
  replyTo?: string | null;
  reactions?: { [emoji: string]: string[] };
  createdAt?: string;
  timestamp?: string;
  isSystemMessage?: boolean;
}
```

### Server-Side Data Structures

#### MongoDB Collections

**Users Collection:**
```javascript
{
  id: "u_1",
  username: "super",
  password: "123",
  email: "super@macrohard.com",
  roles: ["super", "super_admin"],
  groups: [],
  avatarPath: "/images/avatar.jpg"
}
```

**Groups Collection:**
```javascript
{
  id: "g_1",
  name: "Development Team",
  creatorId: "u_1",
  memberIds: ["u_1", "u_2"],
  adminIds: ["u_1"]
}
```

**Channels Collection:**
```javascript
{
  id: "c_1",
  name: "general",
  groupId: "g_1",
  creatorId: "u_1",
  bannedUserIds: [],
  memberIds: ["u_1", "u_2"]
}
```

**Messages Collection:**
```javascript
{
  _id: ObjectId,
  messageId: "msg_1",
  channelId: "c_1",
  userId: "u_1",
  username: "super",
  text: "Hello world!",
  imagePath: "/images/photo.jpg",
  reactions: { "👍": ["u_2"] },
  createdAt: "2024-01-01T12:00:00Z",
  isSystemMessage: false
}
```

## Client-Server Architecture

### Responsibility Division

#### Server Responsibilities
- **Authentication & Authorization**: User login/registration, role-based access control
- **Data Persistence**: MongoDB operations for users, groups, channels, messages
- **File Management**: Image uploads, avatar storage, static file serving
- **Real-time Communication**: Socket.IO server for chat, notifications, typing indicators
- **Video Calling Infrastructure**: PeerJS server for WebRTC connections
- **API Endpoints**: RESTful API for CRUD operations
- **Security**: Input validation, CORS configuration, HTTPS enforcement

#### Client Responsibilities
- **User Interface**: Angular components for all user interactions
- **State Management**: Reactive services for user state, real-time updates
- **Routing & Navigation**: Angular Router with route guards
- **Real-time Updates**: Socket.IO client for live chat and notifications
- **Video Calling**: WebRTC implementation using PeerJS
- **Form Validation**: Client-side validation and error handling
- **Local Storage**: Session management and offline capabilities

### Communication Patterns

1. **HTTP REST API**: Standard CRUD operations for persistent data
2. **WebSocket (Socket.IO)**: Real-time chat, typing indicators, notifications
3. **WebRTC (PeerJS)**: Direct peer-to-peer video calling
4. **Static File Serving**: Image uploads and avatar display

## API Documentation

### Authentication Routes (`/api`)

#### POST `/api/login`
- **Purpose**: User authentication
- **Parameters**: `{ username: string, password: string }`
- **Returns**: `{ id, username, email, roles, groups, avatarPath }` (password excluded)
- **Status Codes**: 200 (success), 401 (invalid credentials), 500 (server error)

#### POST `/api/register`
- **Purpose**: User registration
- **Parameters**: `{ username: string, password: string, email: string }`
- **Returns**: `{ ok: boolean, id?: string, msg?: string }`
- **Status Codes**: 201 (created), 400 (missing fields), 409 (username/email exists)

#### POST `/api/echo`
- **Purpose**: Test endpoint
- **Parameters**: Any JSON object
- **Returns**: `{ youSent: <original object> }`

### User Routes (`/api/users`)

#### GET `/api/users`
- **Purpose**: Get all users (excluding passwords)
- **Returns**: Array of user objects
- **Authentication**: None required

#### DELETE `/api/users/:userId`
- **Purpose**: Remove user account (Super Admin only)
- **Parameters**: `userId` in URL, `{ adminId: string }` in body
- **Returns**: `{ ok: boolean, msg?: string }`
- **Authentication**: Super Admin required

#### POST `/api/users/:userId/promote-super`
- **Purpose**: Promote user to Super Admin
- **Parameters**: `userId` in URL, `{ promoterId: string }` in body
- **Returns**: `{ ok: boolean, msg?: string }`
- **Authentication**: Super Admin required

### Group Routes (`/api/groups`)

#### GET `/api/groups`
- **Purpose**: Get all groups
- **Returns**: Array of group objects

#### POST `/api/groups`
- **Purpose**: Create new group
- **Parameters**: `{ name: string, creatorId: string }`
- **Returns**: Created group object

#### GET `/api/groups/:groupId`
- **Purpose**: Get specific group details
- **Parameters**: `groupId` in URL
- **Returns**: Group object with member details

#### DELETE `/api/groups/:groupId`
- **Purpose**: Delete group (Admin only)
- **Parameters**: `groupId` in URL, `{ adminId: string }` in body
- **Returns**: `{ ok: boolean, msg?: string }`

#### POST `/api/groups/:groupId/members`
- **Purpose**: Add user to group
- **Parameters**: `groupId` in URL, `{ userId: string, adminId: string }` in body
- **Returns**: `{ ok: boolean, msg?: string }`

#### DELETE `/api/groups/:groupId/members/:userId`
- **Purpose**: Remove user from group
- **Parameters**: `groupId` and `userId` in URL, `{ adminId: string }` in body
- **Returns**: `{ ok: boolean, msg?: string }`

#### POST `/api/groups/:groupId/channels`
- **Purpose**: Create channel in group
- **Parameters**: `groupId` in URL, `{ name: string, creatorId: string }` in body
- **Returns**: Created channel object

#### GET `/api/groups/:groupId/channels`
- **Purpose**: Get channels for group
- **Parameters**: `groupId` in URL, optional `userId` query parameter
- **Returns**: Array of channel objects (filtered by user permissions)

### Channel Routes (`/api/channels`)

#### GET `/api/channels/:channelId/messages`
- **Purpose**: Get chat history for channel
- **Parameters**: `channelId` in URL
- **Returns**: Array of message objects

#### POST `/api/channels/:channelId/members`
- **Purpose**: Add user to channel
- **Parameters**: `channelId` in URL, `{ userId: string, adminId: string }` in body
- **Returns**: `{ ok: boolean, msg?: string }`

#### POST `/api/channels/:channelId/ban`
- **Purpose**: Ban user from channel
- **Parameters**: `channelId` in URL, `{ userId: string, adminId: string }` in body
- **Returns**: `{ ok: boolean, msg?: string }`

#### DELETE `/api/channels/:channelId/ban/:userId`
- **Purpose**: Unban user from channel
- **Parameters**: `channelId` and `userId` in URL, `{ adminId: string }` in body
- **Returns**: `{ ok: boolean, msg?: string }`

### Admin Routes (`/admin`)

#### GET `/admin/users`
- **Purpose**: Get all users (Super Admin only)
- **Parameters**: `adminId` query parameter
- **Returns**: Array of user objects
- **Authentication**: Super Admin required

#### POST `/admin/users`
- **Purpose**: Create new user (Super Admin only)
- **Parameters**: `{ adminId: string, username: string, email: string, password?: string }`
- **Returns**: `{ ok: boolean, user?: ApiUser, msg?: string }`
- **Authentication**: Super Admin required

#### PATCH `/admin/users/:userId/role`
- **Purpose**: Toggle group admin role
- **Parameters**: `userId` in URL, `{ add?: string, remove?: string, adminId: string }` in body
- **Returns**: `{ ok: boolean, msg?: string }`
- **Authentication**: Super Admin required

### Upload Routes (`/api`)

#### POST `/api/upload`
- **Purpose**: Upload image for chat messages
- **Parameters**: FormData with `image` field
- **Returns**: `{ ok: boolean, data: { path: string } }`
- **File Size Limit**: 5MB

#### POST `/api/upload/avatar/:userId`
- **Purpose**: Upload user avatar
- **Parameters**: `userId` in URL, FormData with `image` field
- **Returns**: `{ ok: boolean, avatarPath: string, msg: string }`

### Report Routes (`/api/reports`)

#### POST `/api/reports`
- **Purpose**: Create report
- **Parameters**: `{ reporterId: string, subject: string, message: string, type: string, relatedUserId?: string }`
- **Returns**: `{ ok: boolean, msg: string }`

#### GET `/api/reports`
- **Purpose**: Get all reports (Super Admin only)
- **Parameters**: `adminId` query parameter
- **Returns**: Array of report objects
- **Authentication**: Super Admin required

## Angular Architecture

### Components

#### Core Components

**DashboardComponent** (`dashboard/`)
- **Purpose**: Main landing page after login
- **Features**: Group listing, group creation, group browsing, account management
- **Dependencies**: AuthService, ApiService, SocketService, Router

**LoginComponent** (`login/`)
- **Purpose**: User authentication
- **Features**: Username/password login, error handling, navigation
- **Dependencies**: AuthService, ApiService, Router

**RegisterComponent** (`register/`)
- **Purpose**: New user registration
- **Features**: User creation form, validation, success/error messaging
- **Dependencies**: AuthService, ApiService, Router

**GroupDetailComponent** (`group-detail/`)
- **Purpose**: Group chat interface and management
- **Features**: Channel selection, real-time chat, message reactions, image sharing, member management, video calling
- **Dependencies**: AuthService, ApiService, SocketService, ImageUploadService, Router

**VideoChatComponent** (`video-chat/`)
- **Purpose**: WebRTC video calling interface
- **Features**: Peer-to-peer video/audio, screen sharing, call controls
- **Dependencies**: AuthService, PeerService

**AdminPanelComponent** (`admin-panel/`)
- **Purpose**: Administrative interface for Super Admins
- **Features**: User management, role assignment, report viewing
- **Dependencies**: AuthService, ApiService

**NavbarComponent** (`navbar/`)
- **Purpose**: Global navigation and user menu
- **Features**: User avatar, logout, navigation links
- **Dependencies**: AuthService, Router

### Services

#### AuthService (`auth.service.ts`)
- **Purpose**: Authentication and user session management
- **Methods**:
  - `currentUser()`: Get current logged-in user
  - `storeUser(user)`: Store user session data
  - `logout()`: Clear user session
  - `onUserChange()`: Observable for user state changes

#### ApiService (`api.service.ts`)
- **Purpose**: HTTP client for all API communications
- **Features**: RESTful API calls, error handling, type safety
- **Methods**: All HTTP operations for users, groups, channels, admin functions

#### SocketService (`socket.service.ts`)
- **Purpose**: Real-time communication via WebSocket
- **Features**: Chat messages, typing indicators, user join/leave notifications, reactions
- **Methods**:
  - `sendMessage()`: Send chat message
  - `onMessage()`: Receive chat messages
  - `sendTyping()`: Send typing indicator
  - `joinChannel()`: Join chat channel
  - `toggleReaction()`: Add/remove message reactions

#### ImageUploadService (`image-upload.service.ts`)
- **Purpose**: File upload management
- **Features**: Image uploads for chat and avatars
- **Methods**:
  - `uploadImage()`: Upload chat image
  - `uploadAvatar()`: Upload user avatar

#### PeerService (`peer.service.ts`)
- **Purpose**: WebRTC video calling
- **Features**: Peer connection management, video/audio streams
- **Methods**: Peer connection setup, call initiation, stream handling

#### StorageService (`storage.service.ts`)
- **Purpose**: Local storage abstraction
- **Features**: Type-safe localStorage operations
- **Methods**: `get()`, `set()`, `remove()`, `clear()`

### Route Guards

#### AuthGuard (`auth.guard.ts`)
- **Purpose**: Protect routes requiring authentication
- **Logic**: Check if user is logged in via AuthService
- **Redirect**: `/login` if not authenticated

#### RoleGuard (`role.guard.ts`)
- **Purpose**: Protect routes requiring admin privileges
- **Logic**: Check if user has 'super' or 'groupAdmin' role
- **Redirect**: `/` if not authorized

### Routing Configuration (`app.routes.ts`)

```typescript
export const routes: Routes = [
  { path: '', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'admin', component: AdminPanelComponent, canActivate: [AuthGuard, RoleGuard] },
  { path: 'group/:gid', component: GroupDetailComponent, canActivate: [AuthGuard] },
  { path: 'video-chat/:channelId', component: VideoChatComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '' }
];
```

## Client-Server Interaction

### Authentication Flow

1. **User Login**:
   - Client: `LoginComponent` → `ApiService.login()` → HTTP POST `/api/login`
   - Server: Validate credentials → Return user data (password excluded)
   - Client: `AuthService.storeUser()` → Store in localStorage → Navigate to dashboard

2. **Route Protection**:
   - Client: `AuthGuard` → `AuthService.currentUser()` → Check localStorage
   - If no user: Redirect to `/login`
   - If user exists: Allow access

3. **Auto-Login on Refresh**:
   - Client: `AuthService` constructor → `currentUser()` → Restore from localStorage
   - Components: Subscribe to `onUserChange()` → Update UI state

### Real-Time Communication

#### Chat Messages
1. **Send Message**:
   - Client: `GroupDetailComponent` → `SocketService.sendMessage()`
   - Server: Socket.IO receives message → Store in MongoDB → Broadcast to channel
   - Client: All clients in channel receive message → Update UI

2. **Message Reactions**:
   - Client: User clicks emoji → `SocketService.toggleReaction()`
   - Server: Update message in MongoDB → Broadcast reaction change
   - Client: Update reaction display in real-time

#### User Notifications
1. **Join/Leave Channel**:
   - Client: User enters channel → `SocketService.joinChannel()`
   - Server: Add user to channel room → Broadcast join notification
   - Client: Display system message in chat

2. **Typing Indicators**:
   - Client: User types → `SocketService.sendTyping()`
   - Server: Broadcast typing event to channel
   - Client: Show typing indicator → Hide after timeout

### Video Calling

1. **Initiate Call**:
   - Client: `VideoChatComponent` → `PeerService` → Create PeerJS connection
   - Server: PeerJS server facilitates connection
   - Client: Establish WebRTC peer-to-peer connection

2. **Call Management**:
   - Client: Handle video/audio streams, call controls
   - Server: Minimal involvement (just signaling)

### File Uploads

1. **Image Upload**:
   - Client: `ImageUploadService.uploadImage()` → FormData → HTTP POST `/api/upload`
   - Server: `formidable` processes upload → Save to `userimages/` → Return file path
   - Client: Use returned path in chat message

2. **Avatar Upload**:
   - Client: `ImageUploadService.uploadAvatar()` → HTTP POST `/api/upload/avatar/:userId`
   - Server: Save avatar → Update user document → Broadcast avatar change
   - Client: Update avatar display across all components

### Data Persistence

#### Server-Side Changes
- **MongoDB Operations**: All CRUD operations update respective collections
- **File System**: Image uploads stored in `server/userimages/`
- **Real-time Broadcasting**: Socket.IO events notify connected clients
- **Database Indexes**: Optimized queries on `channelId` and `createdAt`

#### Client-Side Updates
- **Component State**: Services update component properties reactively
- **Local Storage**: User session persisted for auto-login
- **Real-time UI**: Socket.IO subscriptions update UI immediately
- **Route Navigation**: Angular Router handles page transitions

## Development Setup

### Prerequisites
- Node.js 18+
- MongoDB 6+
- Angular CLI 17+

### Installation

1. **Clone Repository**:
   ```bash
   git clone <repository-url>
   cd softwareFrameworksA2
   ```

2. **Install Dependencies**:
   ```bash
   # Server dependencies
   cd server
   npm install

   # Client dependencies
   cd ../client
   npm install
   ```

3. **Database Setup**:
   ```bash
   # Start MongoDB
   mongod

   # Initialize database (optional - creates default data)
   cd server
   node config/initDb.js
   ```

4. **SSL Certificates**:
   - Place `key.pem` and `cert.pem` in the server directory
   - Required for HTTPS and PeerJS functionality

### Running the Application

1. **Start Server**:
   ```bash
   cd server
   npm start
   ```
   Server runs on `https://localhost:3000`

2. **Start Client**:
   ```bash
   cd client
   npm start
   ```
   Client runs on `https://localhost:4200`

3. **Access Application**:
   - Open `https://localhost:4200` in browser
   - Default super admin: username `super`, password `123`

### Important: HTTPS Security Warnings

**⚠️ Security Certificate Warnings**: Due to the use of self-signed SSL certificates for HTTPS and PeerJS functionality, you will encounter security warnings in your browser:

1. **First Access to Server** (`https://localhost:3000`):
   - Browser will show "Your connection is not private" warning
   - Click "Advanced" → "Proceed to localhost (unsafe)" to continue
   - This is required for the API server to function properly

2. **PeerJS Server Access** (`https://localhost:3001`):
   - Browser will show similar security warning
   - Click "Advanced" → "Proceed to localhost (unsafe)" to continue
   - This is required for video calling functionality to work

3. **Client Application** (`https://localhost:4200`):
   - May also show security warning initially
   - Accept the security risk to enable full functionality

**Why This Happens**: The application uses self-signed certificates for local development, which browsers flag as potentially unsafe. This is normal for development environments and does not affect the application's functionality once accepted.

**Video Calling Requirements**: 
- Both `https://localhost:3000` and `https://localhost:3001` must be accessible
- PeerJS server (port 3001) handles WebRTC signaling for video calls
- WebRTC requires HTTPS for camera/microphone access in modern browsers

## Features

### Core Features
- ✅ User authentication and registration
- ✅ Role-based access control (User, Group Admin, Super Admin)
- ✅ Group creation and management
- ✅ Channel-based chat system
- ✅ Real-time messaging with Socket.IO
- ✅ Message reactions (emoji)
- ✅ Image sharing in chat
- ✅ User avatar system
- ✅ Typing indicators
- ✅ User join/leave notifications
- ✅ WebRTC video calling
- ✅ Administrative panel
- ✅ User reporting system
- ✅ Group interest system (join requests)

### Technical Features
- ✅ HTTPS/SSL encryption
- ✅ CORS configuration
- ✅ Input validation and error handling
- ✅ Responsive design with Bootstrap
- ✅ TypeScript type safety
- ✅ Angular standalone components
- ✅ Reactive programming with RxJS
- ✅ MongoDB with proper indexing
- ✅ File upload with size limits
- ✅ Real-time notifications
- ✅ Auto-login on page refresh
- ✅ Route guards for security

### User Experience Features
- ✅ Clean, modern interface
- ✅ Real-time updates without page refresh
- ✅ Mobile-responsive design
- ✅ Intuitive navigation
- ✅ Error messaging and success feedback
- ✅ Loading states and progress indicators
- ✅ Keyboard shortcuts and accessibility
- ✅ Smooth animations and transitions

---

