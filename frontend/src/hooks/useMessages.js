import { useState, useEffect, useCallback } from 'react';
import { messageService } from '../services/messageService';

export const useMessages = (userType) => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load conversations on component mount
  const loadConversations = useCallback(async () => {
    if (!userType) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await messageService.getConversations(userType);
      setConversations(response.conversations || []);
      
      // Auto-select the first conversation if available
      if (response.conversations && response.conversations.length > 0) {
        setActiveConversation(response.conversations[0]);
      }
    } catch (err) {
      setError('Failed to load conversations');
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [userType]);

  // Load messages for a specific conversation
  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId || !userType) {
      setMessages([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await messageService.getMessages(conversationId, userType);
      setMessages(response.messages || []);
    } catch (err) {
      setError('Failed to load messages');
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  }, [userType]);

  // Send a message
  const sendMessage = useCallback(async (conversationId, messageText) => {
    if (!conversationId || !messageText.trim() || !userType) return;

    try {
      await messageService.sendMessage(conversationId, messageText.trim(), userType);
      
      // Reload messages and conversations to get updated data
      await Promise.all([
        loadMessages(conversationId),
        loadConversations()
      ]);
      
      return true;
    } catch (err) {
      setError('Failed to send message');
      console.error('Error sending message:', err);
      return false;
    }
  }, [userType, loadMessages, loadConversations]);

  // Start conversation
  const startConversation = useCallback(async () => {
    try {
      const response = await messageService.startConversation();
      await loadConversations(); // Refresh conversations list
      return response.conversation_id;
    } catch (err) {
      setError('Failed to start conversation');
      console.error('Error starting conversation:', err);
      return null;
    }
  }, [loadConversations]);

  // Select a conversation
  const selectConversation = useCallback((conversation) => {
    setActiveConversation(conversation);
    if (conversation) {
      loadMessages(conversation.conversation_id);
    } else {
      setMessages([]);
    }
  }, [loadMessages]);

  // Get unread message count
  const getUnreadCount = useCallback(() => {
    return conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0);
  }, [conversations]);

  // Initialize conversations on mount
  useEffect(() => {
    if (userType) {
      loadConversations();
    }
  }, [userType, loadConversations]);

  // Auto-refresh messages every 3 seconds
  useEffect(() => {
    if (activeConversation && userType) {
      const interval = setInterval(() => {
        loadMessages(activeConversation.conversation_id);
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [activeConversation, userType, loadMessages]);

  return {
    conversations,
    activeConversation,
    messages,
    loading,
    error,
    loadConversations,
    loadMessages,
    sendMessage,
    startConversation,
    selectConversation,
    getUnreadCount,
    clearError: () => setError(null)
  };
};