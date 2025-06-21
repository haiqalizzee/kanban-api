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
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Users
- `GET /api/users/search?query=username&limit=10` - Search users by username
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update username
- `PUT /api/users/change-password` - Change user password

### Boards
- `GET /api/boards` - Get all boards (owned or member of)
- `GET /api/boards/:id` - Get board details
- `POST /api/boards` - Create new board
- `PUT /api/boards/:id` - Update board (owner only)
- `DELETE /api/boards/:id` - Delete board (owner only)
- `POST /api/boards/:id/members` - Add member to board (owner only)
- `DELETE /api/boards/:id/members` - Remove member from board (owner only)

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

### Board Member Management Usage

To add members to a board, follow these steps:

1. **Search for users by username:**
```javascript
// Frontend code example
const searchUsers = async (query) => {
    const response = await fetch(`/api/users/search?query=${query}&limit=10`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.json();
};
```

2. **Add selected user to board:**
```javascript
const addMemberToBoard = async (boardId, userId) => {
    const response = await fetch(`/api/boards/${boardId}/members`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
    });
    return response.json();
};
```

3. **Frontend implementation example:**
```javascript
// Search and select user component
const MemberSearch = ({ boardId, onMemberAdded }) => {
    const [query, setQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (searchQuery) => {
        if (searchQuery.length < 2) {
            setUsers([]);
            return;
        }
        
        setLoading(true);
        try {
            const results = await searchUsers(searchQuery);
            setUsers(results);
        } catch (error) {
            console.error('Search failed:', error);
        }
        setLoading(false);
    };

    const handleAddMember = async (userId) => {
        try {
            await addMemberToBoard(boardId, userId);
            onMemberAdded();
            setQuery('');
            setUsers([]);
        } catch (error) {
            console.error('Failed to add member:', error);
        }
    };

    return (
        <div>
            <input
                type="text"
                placeholder="Search users by username..."
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    handleSearch(e.target.value);
                }}
            />
            {loading && <div>Searching...</div>}
            <div>
                {users.map(user => (
                    <div key={user._id} className="user-result">
                        <span>{user.username} ({user.email})</span>
                        <button onClick={() => handleAddMember(user._id)}>
                            Add to Board
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
```

### User Profile Management

#### Update Username
```javascript
const updateUsername = async (newUsername) => {
    const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: newUsername })
    });
    return response.json();
};
```

#### Change Password
```javascript
const changePassword = async (currentPassword, newPassword) => {
    const response = await fetch('/api/users/change-password', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
            currentPassword,
            newPassword 
        })
    });
    return response.json();
};
```

#### Complete Profile Management Component Example
```javascript
const ProfileSettings = () => {
    const [username, setUsername] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleUsernameUpdate = async () => {
        try {
            if (username.length < 3) {
                alert('Username must be at least 3 characters');
                return;
            }
            
            const result = await updateUsername(username);
            alert('Username updated successfully!');
        } catch (error) {
            alert('Failed to update username: ' + error.message);
        }
    };

    const handlePasswordChange = async () => {
        try {
            if (newPassword.length < 6) {
                alert('New password must be at least 6 characters');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                alert('New passwords do not match');
                return;
            }
            
            const result = await changePassword(currentPassword, newPassword);
            alert('Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            alert('Failed to change password: ' + error.message);
        }
    };

    return (
        <div>
            {/* Username Update */}
            <div>
                <h3>Update Username</h3>
                <input
                    type="text"
                    placeholder="New username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <button onClick={handleUsernameUpdate}>Update Username</button>
            </div>

            {/* Password Change */}
            <div>
                <h3>Change Password</h3>
                <input
                    type="password"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button onClick={handlePasswordChange}>Change Password</button>
            </div>
        </div>
    );
};
```

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