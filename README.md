# YEEET - File Sharing Platform

YEEET is a secure file sharing platform built with modern web technologies. It features user authentication, chunked file uploads, real-time progress tracking, and secure file downloads.

## 🚀 Features

- User authentication (register/login)
- Secure file upload with chunk processing
- Real-time upload progress tracking
- File management and downloads
- Protected routes and sessions
- Secure file storage with unique download tokens

## 🛠 Tech Stack

### Backend
- Node.js with Express
- TypeScript
- PostgreSQL with Drizzle ORM
- Socket.IO for real-time communications
- bcrypt for password hashing
- express-session for session management

### Frontend
- React 18
- TypeScript
- Vite
- React Router v7
- Socket.IO Client
- Axios

### Desktop Application
- Tauri
- Rust
- React
- TypeScript
- Vite
- React Router v7
- Socket.IO Client
- Axios

## 📋 Prerequisites

- Node.js (v18 or higher recommended)
- pnpm
- PostgreSQL
- Rust (for Tauri desktop app)

## 📁 Project Structure

```
├── backend/
│ ├── src/
│ │ ├── db/ # Database schemas and migrations
│ │ ├── index.ts # Main server file
│ │ └── database.ts # Database configuration
│ └── uploads/ # File storage directory
│
├── client/ # Web client application
│ ├── src/
│ │ ├── components/ # React components
│ │ ├── contexts/ # React contexts
│ │ ├── types/ # TypeScript types
│ │ └── App.tsx # Main application component
│ └── public/ # Static assets
│
└── app/ # Tauri desktop application
├── src/
│ ├── components/ # React components
│ ├── contexts/ # React contexts
│ └── App.tsx # Main application component
└── src-tauri/ # Rust/Tauri backend
```

## 🔧 Installation

1. Clone the repository:

```bash
git clone https://github.com/your-repo/yeeet.git
cd yeeet
```

2. Install backend dependencies
```bash
cd backend
pnpm install
```

3. Configure environment variables:

Create a `.env` file in the backend directory:

```bash
cd backend
touch .env
```

Add the following variables:

```bash
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
SESSION_SECRET=your_session_secret
```

4. Install frontend dependencies
```bash
cd ../client
pnpm install
```

5. Install app dependencies
```bash
cd ../app
pnpm install
```

6. Run database migrations:

Please note that you need to have a PostgreSQL database created.

```bash
pnpm init-db
```

## 🚀 Development

You can run the dev environment using the following command:

```bash
pnpm dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### Desktop Application

```bash
cd app
pnpm tauridev
```

## 🏗️ Building

### Web Application

```bash
cd client
pnpm build
```

### Desktop Application

```bash
cd app
pnpm tauri build
``` 

## 🔧 IDE Setup

For the best development experience, we recommend:
- VS Code with the following extensions:
  - Tauri
  - rust-analyzer
  - ESLint
  - Prettier


## 🔒 Security Features

- Password hashing with bcrypt
- Session-based authentication
- Protected API routes
- Secure file downloads with unique tokens
- CORS protection
- File chunking for large uploads

## 📝 License

[MIT License](LICENSE)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request