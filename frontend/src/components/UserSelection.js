import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { messageService } from '../services/messageService';

const UserSelection = () => {
  const [users, setUsers] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await messageService.getStaticUsers();
        setUsers(response.users);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleUserSelect = (userType) => {
    navigate(`/chat/${userType}`);
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div className="container-fluid d-flex align-items-center justify-content-center min-vh-100">
        <div className="row w-100 justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="card shadow-lg" style={{
              borderRadius: '20px',
              border: 'none'
            }}>
              <div className="card-body p-5">
                <div className="text-center mb-5">
                  <h1 className="h2 fw-bold text-dark mb-2">Assignment 3 - Chat Application</h1>
                  <p className="text-muted">Select a user to start chatting</p>
                </div>

                <div className="row g-4">
                  {users && (
                    <>
                      {/* Patient User */}
                      <div className="col-12 col-md-6">
                        <div 
                          className="card h-100 user-card" 
                          style={{
                            borderRadius: '15px',
                            border: '2px solid #e9ecef',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                          onClick={() => handleUserSelect('patient')}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.borderColor = '#28a745';
                            e.currentTarget.style.boxShadow = '0 10px 25px rgba(40, 167, 69, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = '#e9ecef';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <div className="card-body text-center p-4">
                            <div className="mb-3">
                              <div 
                                className="rounded-circle mx-auto d-flex align-items-center justify-content-center"
                                style={{
                                  width: '80px',
                                  height: '80px',
                                  background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                                  color: 'white'
                                }}
                              >
                                <i className="fas fa-user fa-2x"></i>
                              </div>
                            </div>
                            <h5 className="card-title fw-bold">{users.patient.name}</h5>
                            <p className="card-text text-muted mb-3">{users.patient.email}</p>
                            <span className="badge bg-success px-3 py-2" style={{ borderRadius: '20px' }}>
                              {users.patient.role.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Doctor User */}
                      <div className="col-12 col-md-6">
                        <div 
                          className="card h-100 user-card" 
                          style={{
                            borderRadius: '15px',
                            border: '2px solid #e9ecef',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                          onClick={() => handleUserSelect('doctor')}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.borderColor = '#007bff';
                            e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 123, 255, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = '#e9ecef';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <div className="card-body text-center p-4">
                            <div className="mb-3">
                              <div 
                                className="rounded-circle mx-auto d-flex align-items-center justify-content-center"
                                style={{
                                  width: '80px',
                                  height: '80px',
                                  background: 'linear-gradient(135deg, #007bff 0%, #6610f2 100%)',
                                  color: 'white'
                                }}
                              >
                                <i className="fas fa-user-md fa-2x"></i>
                              </div>
                            </div>
                            <h5 className="card-title fw-bold">{users.doctor.name}</h5>
                            <p className="card-text text-muted mb-3">{users.doctor.email}</p>
                            <span className="badge bg-primary px-3 py-2" style={{ borderRadius: '20px' }}>
                              {users.doctor.role.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="text-center mt-5">
                  <p className="small text-muted">
                    <i className="fas fa-info-circle me-2"></i>
                    This is a simplified chat application for educational purposes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSelection;