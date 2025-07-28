const API_BASE_URL = 'http://localhost:5001/api';

export const messageService = {
  // Get static users
  getStaticUsers: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get-static-users`);
      if (!response.ok) {
        throw new Error('Failed to fetch static users');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching static users:', error);
      throw error;
    }
  },

  // Get conversations for user type
  getConversations: async (userType) => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations?user_type=${userType}`);
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  },

  // Get messages for a conversation
  getMessages: async (conversationId, userType) => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages?user_type=${userType}`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  },

  // Send a message
  sendMessage: async (conversationId, message, senderType) => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          message: message,
          sender_type: senderType 
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to send message: ${response.status} ${errorData}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Start conversation
  startConversation: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to start conversation');
      }

      return await response.json();
    } catch (error) {
      console.error('Error starting conversation:', error);
      throw error;
    }
  },

  // Format timestamp for display
  formatTime: (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
    }
  },

  // Format timestamp for message display
  formatMessageTime: (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
};