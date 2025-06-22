const axios = require('axios');
const Board = require('../models/board');

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Get detailed boards for AI context
const fetchDetailedBoards = async (userId) => {
    try {
        const boards = await Board.find({
            $or: [
                { owner: userId },
                { members: userId }
            ]
        }).populate('owner', 'username email')
          .populate('members', 'username email')
          .populate({
              path: 'columns',
              populate: {
                  path: 'cards',
                  populate: {
                      path: 'assignedTo',
                      select: 'username email'
                  }
              }
          });

        return boards;
    } catch (error) {
        console.error('Failed to fetch detailed boards:', error);
        return [];
    }
};

// Create detailed board context for AI
const createDetailedBoardContext = (detailedBoards, user) => {
    let context = `You are a friendly Kanban task assistant! Your role is ONLY to help with task management, board organization, and project planning.

IMPORTANT RULES:
- Give SHORT, FRIENDLY answers (2-3 sentences max)
- ONLY answer questions about tasks, boards, projects, and productivity
- If asked about anything else, say: "I only help with your Kanban tasks and boards. What would you like to know about your projects?"
- Be helpful, encouraging, and concise with a friendly tone
- Reference specific tasks/boards when relevant
- IGNORE completed tasks or tasks in "Done" columns - focus on active work only`;
    
    if (user) {
        context += `\n\nUser Information:
- Username: ${user.username}
- Email: ${user.email}`;
    }

    if (detailedBoards && detailedBoards.length > 0) {
        const totalCards = detailedBoards.reduce((total, board) => 
            total + board.columns.reduce((boardTotal, column) => boardTotal + column.cards.length, 0), 0);
        
        context += `\n\nUser's Boards (${detailedBoards.length} total boards, ${totalCards} total cards):\n`;
        
        detailedBoards.forEach((board, index) => {
            const boardCardCount = board.columns.reduce((total, column) => total + column.cards.length, 0);
            
            context += `\n**${index + 1}. "${board.title}"**
   - Description: ${board.description || 'No description'}
   - Public: ${board.isPublic ? 'Yes' : 'No'}
   - Members: ${board.members?.length || 0}
   - Columns: ${board.columns.length}
   - Total Cards: ${boardCardCount}
   - Created: ${new Date(board.createdAt).toLocaleDateString()}`;

            if (boardCardCount > 0) {
                context += `\n   - Active Columns & Cards (excluding Done):`;
                board.columns.forEach((column) => {
                    // Skip "Done" or completed columns
                    const isDoneColumn = column.title.toLowerCase().includes('done') || 
                                       column.title.toLowerCase().includes('complete') ||
                                       column.title.toLowerCase().includes('finished');
                    
                    if (column.cards.length > 0 && !isDoneColumn) {
                        const activeCards = column.cards.filter(card => !card.isCompleted);
                        if (activeCards.length > 0) {
                            context += `\n     • ${column.title} (${activeCards.length} active cards):`;
                            activeCards.forEach((card) => {
                                const dueDate = card.dueDate ? ` | Due: ${new Date(card.dueDate).toLocaleDateString()}` : '';
                                const priority = card.priority ? ` | Priority: ${card.priority}` : '';
                                const description = card.description ? ` | Desc: ${card.description.substring(0, 100)}${card.description.length > 100 ? '...' : ''}` : '';
                                context += `\n       - "${card.title}"${priority}${dueDate}${description}`;
                            });
                        }
                    }
                });
            }
        });

        // Add summary statistics (active tasks only)
        const priorityStats = detailedBoards.reduce((stats, board) => {
            board.columns.forEach(column => {
                // Skip "Done" or completed columns
                const isDoneColumn = column.title.toLowerCase().includes('done') || 
                                   column.title.toLowerCase().includes('complete') ||
                                   column.title.toLowerCase().includes('finished');
                
                if (!isDoneColumn) {
                    column.cards.forEach(card => {
                        if (!card.isCompleted) {
                            stats[card.priority] = (stats[card.priority] || 0) + 1;
                        }
                    });
                }
            });
            return stats;
        }, {});

        if (Object.keys(priorityStats).length > 0) {
            context += `\n\n**Active Task Priority Summary:**`;
            Object.entries(priorityStats).forEach(([priority, count]) => {
                context += `\n- ${priority}: ${count} active cards`;
            });
        }

        context += `\n\nI'm here to help you with:
- Task prioritization and organization
- Board structure optimization  
- Project planning and deadlines
- Workflow improvements`;
    } else {
        context += `\n\nGreat! Let's get you started! I can help with:
- Board setup and organization
- Task management basics
- Getting organized efficiently`;
    }

    context += `\n\nREMEMBER: Keep answers SHORT, FRIENDLY, and FOCUSED. Only discuss Kanban, tasks, and productivity. Reference their active tasks when helpful, but ignore completed work.`;

    return context;
};

// Generate AI response
exports.generateResponse = async (req, res) => {
    try {
        const { messages } = req.body;
        const API_KEY = process.env.OPENROUTER_API_KEY;

        if (!API_KEY) {
            return res.status(500).json({ 
                message: 'OpenRouter API key not configured. Please add OPENROUTER_API_KEY to your environment variables.' 
            });
        }

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ message: 'Messages array is required' });
        }

        // Fetch detailed boards for context
        const detailedBoards = await fetchDetailedBoards(req.user._id);
        
        // Create system context with board data
        const systemContext = createDetailedBoardContext(detailedBoards, req.user);
        
        // Prepare messages with system context
        const messagesWithContext = [
            { role: 'system', content: systemContext },
            ...messages
        ];

        const response = await axios.post(
            OPENROUTER_API_URL,
            {
                model: 'deepseek/deepseek-chat-v3-0324:free',
                messages: messagesWithContext,
                temperature: 0.7,
                max_tokens: 1000,
                stream: false,
            },
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': req.get('origin') || req.get('referer') || '',
                    'X-Title': 'Kanban Assistant',
                },
            }
        );

        const aiResponse = response.data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
        
        res.json({ response: aiResponse });
    } catch (error) {
        console.error('OpenRouter API Error:', error);
        
        if (error.response?.status === 401) {
            return res.status(401).json({ message: 'Invalid API key. Please check your OpenRouter API key.' });
        } else if (error.response?.status === 429) {
            return res.status(429).json({ message: 'Rate limit exceeded. Please try again later.' });
        } else if (error.response?.data?.error?.message) {
            return res.status(500).json({ message: error.response.data.error.message });
        } else {
            return res.status(500).json({ message: 'Failed to get response from AI assistant. Please try again.' });
        }
    }
};

// Get boards context for AI (useful for frontend to understand what data is available)
exports.getBoardsContext = async (req, res) => {
    try {
        const detailedBoards = await fetchDetailedBoards(req.user._id);
        const context = createDetailedBoardContext(detailedBoards, req.user);
        
        res.json({ 
            boards: detailedBoards,
            context: context,
            totalBoards: detailedBoards.length,
            totalCards: detailedBoards.reduce((total, board) => 
                total + board.columns.reduce((boardTotal, column) => boardTotal + column.cards.length, 0), 0)
        });
    } catch (error) {
        console.error('Failed to get boards context:', error);
        res.status(500).json({ message: 'Failed to get boards context' });
    }
}; 