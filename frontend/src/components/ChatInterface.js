import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMessages } from '../hooks/useMessages';
import { messageService } from '../services/messageService';

const ChatInterface = () => {
  const { userType } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');

  const {
    conversations,
    activeConversation,
    messages,
    loading,
    error,
    sendMessage,
    startConversation,
    selectConversation,
    getUnreadCount,
    clearError
  } = useMessages(userType);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await messageService.getStaticUsers();
        const users = response.users;
        
        if (userType === 'patient') {
          setCurrentUser(users.patient);
          setOtherUser(users.doctor);
        } else if (userType === 'doctor') {
          setCurrentUser(users.doctor);
          setOtherUser(users.patient);
        } else {
          navigate('/');
          return;
        }

        // Start conversation if none exists
        if (conversations.length === 0) {
          await startConversation();
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        navigate('/');
      }
    };

    fetchUsers();
  }, [userType, navigate, conversations.length, startConversation]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;

    const success = await sendMessage(activeConversation.conversation_id, newMessage);
    if (success) {
      setNewMessage('');
    }
  };

  const handleBackToSelection = () => {
    navigate('/');
  };

  if (!currentUser || !otherUser) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100" style={{
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
    }}>
      {/* Header */}
      <header className="sticky-top" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div className="container-fluid px-4">
          <div className="row align-items-center py-3">
            <div className="col-12 col-md-8">
              <div className="d-flex align-items-center">
                <button 
                  className="btn btn-outline-light me-3"
                  onClick={handleBackToSelection}
                  style={{ borderRadius: '10px' }}
                >
                  <i className="fas fa-arrow-left me-2"></i>Back
                </button>
                <div className="me-3">
                  <div 
                    className="bg-white rounded-circle p-2 d-flex align-items-center justify-content-center"
                    style={{ width: '50px', height: '50px' }}
                  >
                    <i 
                      className={`fas ${currentUser.role === 'patient' ? 'fa-user' : 'fa-user-md'} text-primary`}
                      style={{ fontSize: '1.5rem' }}
                    ></i>
                  </div>
                </div>
                <div>
                  <h4 className="mb-1 fw-bold text-white">
                    Chat as {currentUser.name}
                  </h4>
                  <p className="text-white-50 mb-0 small">
                    {currentUser.role} • {currentUser.email}
                  </p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4 text-md-end mt-3 mt-md-0">
              <span className="badge bg-light text-dark px-3 py-2" style={{ borderRadius: '20px' }}>
                <i className="fas fa-comments me-2"></i>
                {getUnreadCount()} new messages
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="container-fluid px-4 py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-10">
            {error && (
              <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
                {error}
                <button type="button" className="btn-close" onClick={clearError}></button>
              </div>
            )}

            <div className="card" style={{
              borderRadius: '20px',
              border: 'none',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              minHeight: '70vh'
            }}>
              {/* Chat Header */}
              {activeConversation && (
                <div className="card-header d-flex align-items-center" style={{
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                  borderRadius: '20px 20px 0 0',
                  border: 'none',
                  padding: '1.5rem'
                }}>
                  <div 
                    className="rounded-circle me-3 d-flex align-items-center justify-content-center"
                    style={{
                      width: '50px',
                      height: '50px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white'
                    }}
                  >
                    <i className={`fas ${otherUser.role === 'patient' ? 'fa-user' : 'fa-user-md'}`}></i>
                  </div>
                  <div className="flex-grow-1">
                    <h5 className="mb-1 fw-bold text-dark">{otherUser.name}</h5>
                    <small className="text-success">{otherUser.role} • {otherUser.email}</small>
                  </div>
                  <div className="text-end">
                    <small className="text-muted">
                      <i className="fas fa-circle text-success me-1"></i>Online
                    </small>
                  </div>
                </div>
              )}

              {/* Messages Area */}
              <div className="card-body" style={{ 
                height: '50vh', 
                overflowY: 'auto',
                padding: '2rem'
              }}>
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className="text-muted mt-3">Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fas fa-comment fa-4x text-muted mb-4"></i>
                    <h5 className="text-muted">No messages yet</h5>
                    <p className="text-muted">Start the conversation by sending a message to {otherUser.name}</p>
                  </div>
                ) : (
                  <div className="messages-container">
                    {messages.map(message => {
                      const isCurrentUser = message.sender_role === currentUser.role;
                      return (
                        <div key={message.id} className={`d-flex mb-4 ${isCurrentUser ? 'justify-content-end' : ''}`}>
                          {!isCurrentUser && (
                            <div 
                              className="rounded-circle me-3 flex-shrink-0 d-flex align-items-center justify-content-center"
                              style={{
                                width: '40px',
                                height: '40px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white'
                              }}
                            >
                              <i className={`fas ${message.sender_role === 'patient' ? 'fa-user' : 'fa-user-md'}`}></i>
                            </div>
                          )}
                          <div 
                            className={`p-3 rounded-3 ${isCurrentUser ? 'text-white' : 'bg-light'}`}
                            style={{
                              background: isCurrentUser 
                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                                : undefined,
                              maxWidth: '70%',
                              borderRadius: isCurrentUser ? '20px 20px 5px 20px' : '20px 20px 20px 5px'
                            }}
                          >
                            <div className="d-flex align-items-center mb-1">
                              <strong className={`small ${isCurrentUser ? 'text-white' : 'text-primary'}`}>
                                {message.sender_name}
                              </strong>
                              <small className={`ms-2 ${isCurrentUser ? 'text-white-50' : 'text-muted'}`}>
                                {messageService.formatMessageTime(message.timestamp)}
                              </small>
                            </div>
                            <p className="mb-0">
                              {message.message}
                            </p>
                          </div>
                          {isCurrentUser && (
                            <div 
                              className="rounded-circle ms-3 flex-shrink-0 d-flex align-items-center justify-content-center"
                              style={{
                                width: '40px',
                                height: '40px',
                                background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                                color: 'white'
                              }}
                            >
                              <i className={`fas ${currentUser.role === 'patient' ? 'fa-user' : 'fa-user-md'}`}></i>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Message Input */}
              {activeConversation && (
                <div className="card-footer" style={{ 
                  background: 'white', 
                  borderRadius: '0 0 20px 20px',
                  border: 'none',
                  padding: '1.5rem'
                }}>
                  <form onSubmit={handleSendMessage}>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder={`Type your message to ${otherUser.name}...`}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        style={{ 
                          borderRadius: '15px 0 0 15px',
                          border: '2px solid #e9ecef',
                          padding: '12px 20px'
                        }}
                      />
                      <button
                        type="submit"
                        className="btn text-white"
                        disabled={!newMessage.trim() || loading}
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          border: 'none',
                          borderRadius: '0 15px 15px 0',
                          padding: '12px 25px'
                        }}
                      >
                        {loading ? (
                          <span className="spinner-border spinner-border-sm" role="status"></span>
                        ) : (
                          <>
                            <i className="fas fa-paper-plane me-2"></i>Send
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChatInterface;