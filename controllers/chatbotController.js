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
    let context = `You're a friendly helper who's super good at organizing stuff! Think of yourself as the user's bestie who just happens to be amazing at keeping track of tasks and projects. Be casual, encouraging, and genuinely helpful - like you're chatting with a close friend who needs help getting their life organized.

Keep your language simple and natural - no fancy business jargon or overly formal AI speak. Use phrases like "looks like," "I notice," "maybe try," "what do you think," etc. Be supportive and positive, and don't be afraid to use emojis or casual expressions when it feels right.`;
    
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
                context += `\n   - Columns & Cards:`;
                board.columns.forEach((column) => {
                    if (column.cards.length > 0) {
                        context += `\n     • ${column.title} (${column.cards.length} cards):`;
                        column.cards.forEach((card) => {
                            const dueDate = card.dueDate ? ` | Due: ${new Date(card.dueDate).toLocaleDateString()}` : '';
                            const priority = card.priority ? ` | Priority: ${card.priority}` : '';
                            const description = card.description ? ` | Desc: ${card.description.substring(0, 100)}${card.description.length > 100 ? '...' : ''}` : '';
                            context += `\n       - "${card.title}"${priority}${dueDate}${description}`;
                        });
                    }
                });
            }
        });

        // Add summary statistics
        const priorityStats = detailedBoards.reduce((stats, board) => {
            board.columns.forEach(column => {
                column.cards.forEach(card => {
                    stats[card.priority] = (stats[card.priority] || 0) + 1;
                });
            });
            return stats;
        }, {});

        if (Object.keys(priorityStats).length > 0) {
            context += `\n\n**Task Priority Summary:**`;
            Object.entries(priorityStats).forEach(([priority, count]) => {
                context += `\n- ${priority}: ${count} cards`;
            });
        }

        context += `\n\nYou're great at helping with stuff like:
- Looking at their tasks and figuring out what needs attention
- Helping them get their boards organized in a way that actually works
- Suggesting better ways to handle their workload (without being preachy!)
- Answering questions about their specific projects and tasks
- Helping them figure out what to tackle first
- Sharing organizing tips and tricks
- Just being a supportive friend who gets how overwhelming tasks can be`;
    } else {
        context += `\n\nLooks like they're just getting started! You can help them with:
- Setting up their first board (make it fun, not scary!)
- Figuring out how to organize their tasks in a way that makes sense
- Getting the hang of this whole board thing
- Making project management feel less overwhelming`;
    }

    context += `\n\nRemember: You're not a corporate consultant or formal AI - you're their helpful friend who happens to be really good at this organizing stuff! Keep things conversational, encouraging, and real. You can see all their tasks and boards, so feel free to reference specific things when it's helpful. If they seem stressed about their workload, be supportive. If they're doing well, celebrate that! Just be genuine and helpful like a good friend would be.`;

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