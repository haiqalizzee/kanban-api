# Kanban API

A RESTful API for a Kanban board application built with Node.js, Express, and MongoDB.

## Features

- User authentication (register/login) with JWT
- Create, read, update, delete boards
- Manage board members
- Create and manage columns within boards
- Create and manage cards within columns
- Move cards between columns
- Card comments and checklists
- Priority levels and due dates
- User assignments and labels

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment variables file:
   ```bash
   cp .env.example .env
   ```
4. Update the `.env` file with your configuration
5. Start the server:
   ```bash
   npm run dev  # For development
   npm start    # For production
   ```

## Environment Variables

- `PORT` - Server port (default: 5000)
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Boards
- `GET /api/boards` - Get all boards for authenticated user
- `GET /api/boards/:id` - Get single board
- `POST /api/boards` - Create new board
- `PUT /api/boards/:id` - Update board
- `DELETE /api/boards/:id` - Delete board
- `POST /api/boards/:id/members` - Add member to board
- `DELETE /api/boards/:id/members` - Remove member from board

### Columns
- `GET /api/columns/board/:boardId` - Get all columns for a board
- `POST /api/columns/board/:boardId` - Create new column
- `PUT /api/columns/:id` - Update column
- `DELETE /api/columns/:id` - Delete column
- `PUT /api/columns/board/:boardId/reorder` - Reorder columns

### Cards
- `GET /api/cards/column/:columnId` - Get all cards for a column
- `GET /api/cards/:id` - Get single card
- `POST /api/cards/column/:columnId` - Create new card
- `PUT /api/cards/:id` - Update card
- `DELETE /api/cards/:id` - Delete card
- `PUT /api/cards/:id/move` - Move card between columns
- `POST /api/cards/:id/comments` - Add comment to card
- `PUT /api/cards/:id/checklist/:itemIndex` - Update checklist item

## Database Schema

### User
- username (String, required)
- email (String, required, unique)
- password (String, required, hashed)

### Board
- title (String, required)
- description (String)
- owner (ObjectId, ref: User)
- members (Array of ObjectId, ref: User)
- columns (Array of ObjectId, ref: Column)
- backgroundColor (String)
- isPublic (Boolean)

### Column
- title (String, required)
- board (ObjectId, ref: Board)
- position (Number, required)
- cards (Array of ObjectId, ref: Card)
- color (String)
- limit (Number)

### Card
- title (String, required)
- description (String)
- column (ObjectId, ref: Column)
- board (ObjectId, ref: Board)
- assignedTo (Array of ObjectId, ref: User)
- position (Number, required)
- priority (String, enum: ['low', 'medium', 'high', 'urgent'])
- dueDate (Date)
- labels (Array of objects with name and color)
- checklist (Array of objects with text and completed status)
- attachments (Array of objects with name, url, and uploadedAt)
- comments (Array of objects with user, text, and createdAt)
- isCompleted (Boolean)

## License

ISC