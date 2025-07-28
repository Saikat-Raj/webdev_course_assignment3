# Assignment 3 - Chat Frontend

This is a React-based chat frontend for the assignment. It allows communication between a static patient and doctor user.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

The application will run on `http://localhost:3000`

## Features

- User selection screen to choose between patient and doctor
- Real-time chat interface
- Clean, responsive design with Bootstrap
- Message timestamps and user identification
- Auto-refresh for new messages every 3 seconds

## Usage

1. Open `http://localhost:3000` in your browser
2. Select either "Patient" or "Doctor" user
3. Start chatting!
4. Open another browser window/tab and select the other user to see the conversation from both sides

## Architecture

- **React Router** for navigation between user selection and chat
- **Custom hooks** for message management
- **Service layer** for API communication
- **Bootstrap** for styling and responsive design

## Note

This is a simplified implementation for educational purposes. In a real application, you would have proper authentication, user management, and real-time WebSocket connections.