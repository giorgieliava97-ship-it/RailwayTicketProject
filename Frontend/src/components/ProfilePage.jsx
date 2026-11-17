import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './ProfilePage.css';

export default function ProfilePage() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [user, setUser] = useState(null);
  const [ticketsData, setTicketsData] = useState({
    active_tickets: [],
    history_tickets: [],
    returned_tickets: []
  });
  const [savedPassengers, setSavedPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(tabParam || 'profile');
  
  const [expandedTicketIds, setExpandedTicketIds] = useState([]);

  // მგზავრების დამატების/რედაქტირების მოდალის სტატუსები
  const [isPassengerModalOpen, setIsPassengerModalOpen] = useState(false);
  const [editingPassengerId, setEditingPassengerId] = useState(null);
  const [passengerForm, setPassengerForm] = useState({
    firstName: '',
    lastName: '',
    personalId: '',
    birthDate: ''
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  
  // 🟢 კუსტომ მოდალების სტეიტები (ბილეთის დაბრუნების და წარმატების შეტყობინებისთვის)
  const [returnModal, setReturnModal] = useState({ isOpen: false, ticketId: null });
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });

  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    personalId: '',
    nationality: '',
    phoneNumber: '',
    gender: 'male'
  });

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [modalMessage, setModalMessage] = useState('');
  const [editError, setEditError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const fetchTicketsData = () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    fetch('http://127.0.0.1:8000/api/users/profile-tickets/', {
      headers: { 'Authorization': `Token ${token}` }
    })
      .then(res => res.json())
      .then(data => setTicketsData(data))
      .catch(err => console.error("Error fetching tickets:", err));
  };

  const fetchSavedPassengers = () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    fetch('http://127.0.0.1:8000/api/users/saved-passengers/', {
      headers: { 'Authorization': `Token ${token}` }
    })
      .then(res => res.json())
      .then(data => setSavedPassengers(Array.isArray(data) ? data : (data.results || [])))
      .catch(err => console.error("Error fetching passengers:", err));
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/');
      return;
    }

    const fetchProfile = fetch('http://127.0.0.1:8000/api/users/profile/', {
      headers: { 'Authorization': `Token ${token}` }
    }).then(res => res.json());

    const fetchTickets = fetch('http://127.0.0.1:8000/api/users/profile-tickets/', {
      headers: { 'Authorization': `Token ${token}` }
    }).then(res => res.json());

    const fetchPassengers = fetch('http://127.0.0.1:8000/api/users/saved-passengers/', {
      headers: { 'Authorization': `Token ${token}` }
    }).then(res => res.json());

    Promise.all([fetchProfile, fetchTickets, fetchPassengers])
      .then(([profileData, ticketsRes, passengersRes]) => {
        setUser(profileData);
        setEditForm({
          firstName: profileData.first_name || '',
          lastName: profileData.last_name || '',
          personalId: profileData.personal_id || '',
          nationality: profileData.nationality || 'საქართველო',
          phoneNumber: profileData.phone_number || '',
          gender: profileData.gender || 'male'
        });
        setTicketsData(ticketsRes);
        setSavedPassengers(Array.isArray(passengersRes) ? passengersRes : (passengersRes.results || []));
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading profile data:", err);
        setLoading(false);
      });
  }, [navigate]);

  // მგზავრის დამატება ან განახლება
  const handlePassengerSubmit = (e) => {
    e.preventDefault();

    // 🟢 11-ციფრიანი პირადი ნომრის ვალიდაცია
    const cleanPersonalId = passengerForm.personalId.trim();
    if (!/^\d{11}$/.test(cleanPersonalId)) {
      alert("პირადი ნომერი უნდა შედგებოდეს ზუსტად 11 ციფრისგან!");
      return;
    }

    const token = localStorage.getItem('authToken');
    const method = editingPassengerId ? 'PUT' : 'POST';
    const url = editingPassengerId 
      ? `http://127.0.0.1:8000/api/users/saved-passengers/${editingPassengerId}/` 
      : 'http://127.0.0.1:8000/api/users/saved-passengers/';

    fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`
      },
      body: JSON.stringify({
        first_name: passengerForm.firstName,
        last_name: passengerForm.lastName,
        personal_id: cleanPersonalId,
        birth_date: passengerForm.birthDate || null
      })
    })
    .then(async res => {
      if (!res.ok) throw new Error('შეცდომა მგზავრის შენახვისას');
      return res.json();
    })
    .then(() => {
      fetchSavedPassengers();
      setIsPassengerModalOpen(false);
      setEditingPassengerId(null);
      setPassengerForm({ firstName: '', lastName: '', personalId: '', birthDate: '' });
    })
    .catch(err => alert(err.message));
  };

  // მგზავრის წაშლა
  const handleDeletePassenger = (id) => {
    if (!window.confirm('ნამდვილად გსურთ მგზავრის წაშლა?')) return;
    const token = localStorage.getItem('authToken');

    fetch(`http://127.0.0.1:8000/api/users/saved-passengers/${id}/`, {
      method: 'DELETE',
      headers: { 'Authorization': `Token ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error('შეცდომა წაშლისას');
      fetchSavedPassengers();
    })
    .catch(err => alert(err.message));
  };

  const toggleExpand = (ticketId) => {
    setExpandedTicketIds(prev => 
      prev.includes(ticketId) 
        ? prev.filter(id => id !== ticketId) 
        : [...prev, ticketId]
    );
  };

  // 🟢 ბილეთის დაბრუნების გახსნა კუსტომ მოდალით
  const handleReturnTicket = (ticketId) => {
    setReturnModal({ isOpen: true, ticketId });
  };

  // 🟢 ბილეთის დაბრუნების დადასტურება
  const confirmReturnTicket = () => {
    const ticketId = returnModal.ticketId;
    setReturnModal({ isOpen: false, ticketId: null });
    
    const token = localStorage.getItem('authToken');
    fetch(`http://127.0.0.1:8000/api/tickets/${ticketId}/return_ticket/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'შეცდომა ბილეთის დაბრუნებისას');
      return data;
    })
    .then(data => {
      setSuccessModal({
        isOpen: true,
        message: data.message || `ბილეთი TKT-${ticketId} წარმატებით დაბრუნდა და ადგილი გათავისუფლდა.`
      });
      fetchTicketsData();
      setExpandedTicketIds(prev => prev.filter(id => id !== ticketId));
    })
    .catch(err => alert(err.message));
  };

  const handleDeactivate = () => {
    if (window.confirm('ნამდვილად გსურთ ანგარიშის დეაქტივაცია?')) {
      const token = localStorage.getItem('authToken');
      fetch('http://127.0.0.1:8000/api/users/deactivate/', {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` }
      }).then(() => {
        localStorage.clear();
        navigate('/');
        window.location.reload();
      });
    }
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    setEditError('');

    // 🟢 11-ციფრიანი პირადი ნომრის ვალიდაცია პროფილის რედაქტირებისთვისაც
    const cleanPersonalId = editForm.personalId.trim();
    if (!/^\d{11}$/.test(cleanPersonalId)) {
      setEditError("პირადი ნომერი უნდა შედგებოდეს ზუსტად 11 ციფრისგან!");
      return;
    }

    const token = localStorage.getItem('authToken');

    fetch('http://127.0.0.1:8000/api/users/profile/', {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}` 
      },
      body: JSON.stringify({
        first_name: editForm.firstName,
        last_name: editForm.lastName,
        personal_id: cleanPersonalId,
        nationality: editForm.nationality,
        phone_number: editForm.phoneNumber,
        gender: editForm.gender
      })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) {
        const firstKey = Object.keys(data)[0];
        const val = data[firstKey];
        throw new Error(Array.isArray(val) ? val[0] : (val || 'შეცდომა განახლებისას'));
      }
      return data;
    })
    .then(data => {
      setUser(data);
      localStorage.setItem('userName', data.first_name);
      setIsEditModalOpen(false);
      window.dispatchEvent(new Event('auth-changed'));
    })
    .catch(err => setEditError(err.message));
  };

  const handlePasswordChangeSubmit = (e) => {
    e.preventDefault();
    setModalMessage('');
    const token = localStorage.getItem('authToken');

    fetch('http://127.0.0.1:8000/api/users/password-change/', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}` 
      },
      body: JSON.stringify({
        old_password: passwordForm.oldPassword,
        new_password: passwordForm.newPassword,
        new_password_confirm: passwordForm.confirmPassword
      })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) {
        const firstKey = Object.keys(data)[0];
        const val = data[firstKey];
        throw new Error(Array.isArray(val) ? val[0] : (val || 'შეცდომა პაროლის შეცვლისას'));
      }
      return data;
    })
    .then(data => {
      setModalMessage(data.detail || 'პაროლი წარმატებით შეიცვალა!');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setModalMessage('');
      }, 1500);
    })
    .catch(err => setModalMessage(err.message));
  };

  const renderTicketsTable = (ticketsList, showReturnButton = false) => {
    if (!ticketsList || ticketsList.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '20px', color: '#777', fontSize: '14px' }}>
          მონაცემები არ მოიძებნა
        </div>
      );
    }

    return (
      <div style={{ width: '100%', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee', color: '#555' }}>
              <th style={{ padding: '12px' }}>კოდი</th>
              <th style={{ padding: '12px' }}>მატარებელი</th>
              <th style={{ padding: '12px' }}>გასვლის სადგური</th>
              <th style={{ padding: '12px' }}>დანიშნულების სადგური</th>
              <th style={{ padding: '12px' }}>გასვლის დრო</th>
              <th style={{ padding: '12px' }}>ჩასვლის დრო</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>დეტალები</th>
            </tr>
          </thead>
          <tbody>
            {ticketsList.map(t => {
              const isExpanded = expandedTicketIds.includes(t.id);
              const seatClassName = t.seat_class === 'SECOND' ? 'II კლასი' : t.seat_class === 'FIRST' ? 'I კლასი' : 'Business class';

              return (
                <>
                  <tr key={`row-${t.id}`} style={{ borderBottom: isExpanded ? 'none' : '1px solid #f2f2f2', background: isExpanded ? '#fafafa' : '#fff' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#e30613' }}>TKT-{t.id}</td>
                    <td style={{ padding: '12px' }}>№{t.trip?.train?.train_number || '804'}</td>
                    <td style={{ padding: '12px' }}>{t.board_station}</td>
                    <td style={{ padding: '12px' }}>{t.leave_station}</td>
                    <td style={{ padding: '12px' }}>{t.board_time ? t.board_time.replace('T', ' ').slice(0, 16) : ''}</td>
                    <td style={{ padding: '12px' }}>{t.leave_time ? t.leave_time.replace('T', ' ').slice(0, 16) : ''}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button 
                        onClick={() => toggleExpand(t.id)}
                        style={{ background: '#222', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                      >
                        {isExpanded ? '▲ დამალვა' : '▼ დეტალები'}
                      </button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr key={`expand-${t.id}`} style={{ borderBottom: '1px solid #f2f2f2', background: '#f8fafc' }}>
                      <td colSpan="7" style={{ padding: '20px' }}>
                        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                            <div>
                              <div style={{ fontSize: '11px', color: '#718096', marginBottom: '4px' }}>მგზავრი</div>
                              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2d3748' }}>{t.first_name} {t.last_name}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', color: '#718096', marginBottom: '4px' }}>პირადი ნომერი</div>
                              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2d3748' }}>{t.id_number || 'არ არის'}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', color: '#718096', marginBottom: '4px' }}>დაბადების თარიღი</div>
                              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2d3748' }}>{t.birth_date || 'არ არის'}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', color: '#718096', marginBottom: '4px' }}>ვაგონი / ადგილი / კლასი</div>
                              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#e30613' }}>ვაგონი 1, ადგილი №{t.seat_number} ({seatClassName})</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', color: '#718096', marginBottom: '4px' }}>ბილეთის ფასი</div>
                              <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#27ae60' }}>{t.price} ₾</div>
                            </div>
                          </div>

                          {showReturnButton && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #edf2f7', paddingTop: '15px', marginTop: '5px' }}>
                              <button 
                                onClick={() => handleReturnTicket(t.id)}
                                style={{ background: '#e30613', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                              >
                                🔄 ბილეთის დაბრუნება
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) return <div style={{textAlign: 'center', marginTop: '100px'}}>იტვირთება...</div>;
  if (!user) return <div style={{textAlign: 'center', marginTop: '100px'}}>მონაცემები ვერ მოიძებნა.</div>;

  return (
    <div className="profile-container">
      <div className="profile-bg-watermark">GR</div>

      <div className="profile-content-wrapper">
        
        {/* ტაბები */}
        <div className="profile-tabs">
          <span className={`profile-tab-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            👤 პროფილი
          </span>
          <span className={`profile-tab-item ${activeTab === 'purchased' ? 'active' : ''}`} onClick={() => setActiveTab('purchased')}>
            🚆 შეძენილი ბილეთები
          </span>
          <span className={`profile-tab-item ${activeTab === 'returned' ? 'active' : ''}`} onClick={() => setActiveTab('returned')}>
            🔄 დაბრუნებული ბილეთები
          </span>
          <span className={`profile-tab-item ${activeTab === 'passengers' ? 'active' : ''}`} onClick={() => setActiveTab('passengers')}>
            👥 დამახსოვრებული მგზავრები
          </span>
        </div>

        {/* 1. პროფილი */}
        {activeTab === 'profile' && (
          <div>
            <div className="profile-header-row">
              <h2 className="profile-title">{user.first_name} {user.last_name}</h2>
              <div className="profile-actions">
                <button className="profile-action-btn" onClick={() => { setIsEditModalOpen(true); setEditError(''); }}>
                  ✏️ მონაცემების რედაქტირება
                </button>
                <button className="profile-action-btn danger" onClick={handleDeactivate}>
                  ✖ ანგარიშის დეაქტივაცია
                </button>
              </div>
            </div>

            <div className="profile-grid">
              <div className="profile-input-group">
                <label>ქვეყანა</label>
                <input type="text" value={user.nationality || ''} readOnly />
              </div>
              <div className="profile-input-group">
                <label>საიდენტიფიკაციო ნომერი</label>
                <input type="text" value={user.personal_id || ''} readOnly />
              </div>
              <div className="profile-input-group">
                <label>ტელეფონი</label>
                <input type="text" value={user.phone_number || ''} readOnly />
              </div>
              <div className="profile-input-group">
                <label>ელ-ფოსტა</label>
                <input type="text" value={user.email || ''} readOnly />
              </div>
            </div>

            <div className="profile-password-section">
              <button className="profile-password-btn" onClick={() => { setIsPasswordModalOpen(true); setModalMessage(''); setPasswordForm({oldPassword: '', newPassword: '', confirmPassword: ''}); }}>
                🔒 პაროლის შეცვლა
              </button>
            </div>
          </div>
        )}

        {/* 2. შეძენილი ბილეთები */}
        {activeTab === 'purchased' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '16px', color: '#2d3748', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                აქტიური ბილეთები
              </h3>
              {renderTicketsTable(ticketsData.active_tickets, true)}
            </div>

            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '16px', color: '#2d3748', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                ისტორია
              </h3>
              {renderTicketsTable(ticketsData.history_tickets, false)}
            </div>
          </div>
        )}

        {/* 3. დაბრუნებული ბილეთები */}
        {activeTab === 'returned' && (
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '16px', color: '#2d3748', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              დაბრუნებული ბილეთები
            </h3>
            {renderTicketsTable(ticketsData.returned_tickets, false)}
          </div>
        )}

        {/* 4. დამახსოვრებული მგზავრები */}
        {activeTab === 'passengers' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <button 
                onClick={() => {
                  setEditingPassengerId(null);
                  setPassengerForm({ firstName: '', lastName: '', personalId: '', birthDate: '' });
                  setIsPassengerModalOpen(true);
                }}
                style={{
                  background: '#e30613',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                ➕ დამატება
              </button>
            </div>

            {savedPassengers.length === 0 ? (
              <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', textAlign: 'center', color: '#666' }}>
                დამახსოვრებული მგზავრები არ მოიძებნა.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {savedPassengers.map(p => (
                  <div key={p.id} style={{ background: '#fff', padding: '20px 24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '50px', fontSize: '14px', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#718096', marginBottom: '4px' }}>დაბადების თარიღი</div>
                        <div style={{ fontWeight: '600', color: '#2d3748' }}>{p.birth_date || 'არ არის'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#718096', marginBottom: '4px' }}>პირადი / პასპორტის №</div>
                        <div style={{ fontWeight: '600', color: '#2d3748' }}>{p.personal_id}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#718096', marginBottom: '4px' }}>სახელი გვარი</div>
                        <div style={{ fontWeight: '600', color: '#2d3748' }}>{p.first_name} {p.last_name}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                      <button 
                        onClick={() => {
                          setEditingPassengerId(p.id);
                          setPassengerForm({
                            firstName: p.first_name,
                            lastName: p.last_name,
                            personalId: p.personal_id,
                            birthDate: p.birth_date || ''
                          });
                          setIsPassengerModalOpen(true);
                        }}
                        style={{ background: 'none', border: 'none', color: '#e30613', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
                      >
                        ✏️ რედაქტირება
                      </button>
                      <button 
                        onClick={() => handleDeletePassenger(p.id)}
                        style={{ background: 'none', border: 'none', color: '#e53935', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
                      >
                        ✖ წაშლა
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* 🟢 ბილეთის დაბრუნების დასტურის კუსტომ მოდალი */}
      {returnModal.isOpen && (
        <div className="auth-modal-overlay" onClick={() => setReturnModal({ isOpen: false, ticketId: null })}>
          <div className="auth-modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '420px', background: '#fff', padding: '30px', borderRadius: '16px', position: 'relative', border: '2px solid rgba(227, 6, 19, 0.4)', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'}}>
            <div style={{fontSize: '36px', marginBottom: '10px'}}>⚠️</div>
            <h3 style={{marginTop: 0, marginBottom: '15px', color: '#2d3748', fontSize: '18px'}}>
              ნამდვილად გსურთ ბილეთის (TKT-{returnModal.ticketId}) დაბრუნება?
            </h3>
            <p style={{fontSize: '13px', color: '#718096', marginBottom: '25px'}}>
              ბილეთის გაუქმების შემთხვევაში ადგილი ავტომატურად გათავისუფლდება.
            </p>
            <div style={{display: 'flex', gap: '12px', justifyContent: 'center'}}>
              <button 
                onClick={() => setReturnModal({ isOpen: false, ticketId: null })}
                style={{padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e0', background: '#fff', color: '#4a5568', fontWeight: 'bold', cursor: 'pointer', flex: 1}}
              >
                გაუქმება
              </button>
              <button 
                onClick={confirmReturnTicket}
                style={{padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#e30613', color: '#fff', fontWeight: 'bold', cursor: 'pointer', flex: 1}}
              >
                დიახ, დაბრუნება
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 წარმატების შეტყობინების კუსტომ მოდალი */}
      {successModal.isOpen && (
        <div className="auth-modal-overlay" onClick={() => setSuccessModal({ isOpen: false, message: '' })}>
          <div className="auth-modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '420px', background: '#fff', padding: '30px', borderRadius: '16px', position: 'relative', border: '2px solid rgba(39, 174, 96, 0.4)', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'}}>
            <div style={{fontSize: '36px', marginBottom: '10px'}}>🎉</div>
            <h3 style={{marginTop: 0, marginBottom: '15px', color: '#2d3748', fontSize: '18px'}}>
              ოპერაცია წარმატებულია
            </h3>
            <p style={{fontSize: '14px', color: '#4a5568', marginBottom: '25px', lineHeight: '1.5'}}>
              {successModal.message}
            </p>
            <button 
              onClick={() => setSuccessModal({ isOpen: false, message: '' })}
              style={{width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: '#27ae60', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px'}}
            >
              კარგი
            </button>
          </div>
        </div>
      )}

      {/* მგზავრის დამატების/რედაქტირების მოდალი */}
      {isPassengerModalOpen && (
        <div className="auth-modal-overlay" onClick={() => setIsPassengerModalOpen(false)}>
          <div className="auth-modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '500px', background: '#fff', padding: '40px', borderRadius: '16px', position: 'relative', border: '2px solid #e53935'}}>
            <button className="auth-close-btn" onClick={() => setIsPassengerModalOpen(false)}>×</button>
            
            <h2 style={{marginTop: 0, marginBottom: '20px'}}>{editingPassengerId ? 'მგზავრის რედაქტირება' : 'ახალი მგზავრის დამატება'}</h2>

            <form onSubmit={handlePassengerSubmit}>
              <div className="auth-input-group" style={{marginBottom: '15px'}}>
                <label><span style={{color: 'red'}}>*</span> სახელი</label>
                <input 
                  type="text" 
                  value={passengerForm.firstName} 
                  onChange={(e) => setPassengerForm({...passengerForm, firstName: e.target.value})} 
                  required 
                  style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box', marginTop: '6px'}}
                />
              </div>

              <div className="auth-input-group" style={{marginBottom: '15px'}}>
                <label><span style={{color: 'red'}}>*</span> გვარი</label>
                <input 
                  type="text" 
                  value={passengerForm.lastName} 
                  onChange={(e) => setPassengerForm({...passengerForm, lastName: e.target.value})} 
                  required 
                  style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box', marginTop: '6px'}}
                />
              </div>

              {/* პირადი ნომერი 11 ციფრიანი ვალიდაციით და required ატრიბუტით */}
              <div className="auth-input-group" style={{marginBottom: '15px'}}>
                <label><span style={{color: 'red'}}>*</span> პირადი / პასპორტის N (11 ციფრი)</label>
                <input 
                  type="text" 
                  maxLength={11}
                  value={passengerForm.personalId} 
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPassengerForm({...passengerForm, personalId: val});
                  }} 
                  placeholder="შეიყვანეთ 11 ციფრიანი პირადი ნომერი"
                  required 
                  style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box', marginTop: '6px'}}
                />
              </div>

              {/* 🟢 დაბადების თარიღი ახლა სავალდებულოა */}
              <div className="auth-input-group" style={{marginBottom: '20px'}}>
                <label><span style={{color: 'red'}}>*</span> დაბადების თარიღი</label>
                <input 
                  type="date" 
                  value={passengerForm.birthDate} 
                  onChange={(e) => setPassengerForm({...passengerForm, birthDate: e.target.value})} 
                  required 
                  style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box', marginTop: '6px'}}
                />
              </div>

              {/* 🟢 ღილაკი დაიბლოკება, სანამ ოთხივე ველი არ შეივსება */}
              <button 
                type="submit" 
                disabled={!passengerForm.firstName.trim() || !passengerForm.lastName.trim() || passengerForm.personalId.length !== 11 || !passengerForm.birthDate}
                className="auth-submit-btn" 
                style={{
                  width: '100%', 
                  padding: '14px', 
                  background: (!passengerForm.firstName.trim() || !passengerForm.lastName.trim() || passengerForm.personalId.length !== 11 || !passengerForm.birthDate) ? '#ccc' : '#e53935', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontWeight: 'bold', 
                  cursor: (!passengerForm.firstName.trim() || !passengerForm.lastName.trim() || passengerForm.personalId.length !== 11 || !passengerForm.birthDate) ? 'not-allowed' : 'pointer'
                }}
              >
                {editingPassengerId ? 'ცვლილებების შენახვა' : 'დამატება'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* რედაქტირების მოდალი */}
      {isEditModalOpen && (
        <div className="auth-modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="auth-modal-content large-modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '750px', background: '#fff', padding: '40px', borderRadius: '16px', position: 'relative', border: '2px solid #e53935'}}>
            <button className="auth-close-btn" onClick={() => setIsEditModalOpen(false)}>×</button>
            
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px'}}>
              <h2 style={{margin: 0, fontSize: '24px'}}>მონაცემების რედაქტირება</h2>
              <div style={{fontSize: '28px', fontWeight: '900', color: '#e53935'}}>GR</div>
            </div>

            {editError && <div style={{color: 'red', marginBottom: '15px', fontSize: '14px', background: '#ffebee', padding: '10px', borderRadius: '6px'}}>{editError}</div>}

            <form onSubmit={handleUpdateSubmit}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px'}}>
                <div className="auth-input-group">
                  <label><span style={{color: 'red'}}>*</span> სახელი</label>
                  <input type="text" value={editForm.firstName} onChange={(e) => setEditForm({...editForm, firstName: e.target.value})} required />
                </div>
                
                {/* 🟢 პირადი ნომერი 11 ციფრიანი ვალიდაციით პროფილის რედაქტირებისას */}
                <div className="auth-input-group">
                  <label><span style={{color: 'red'}}>*</span> პირადი ნომერი (11 ციფრი)</label>
                  <input 
                    type="text" 
                    maxLength={11}
                    value={editForm.personalId} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setEditForm({...editForm, personalId: val});
                    }} 
                    required 
                  />
                </div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px'}}>
                <div className="auth-input-group">
                  <label><span style={{color: 'red'}}>*</span> გვარი</label>
                  <input type="text" value={editForm.lastName} onChange={(e) => setEditForm({...editForm, lastName: e.target.value})} required />
                </div>
                <div className="auth-input-group">
                  <label><span style={{color: 'red'}}>*</span> მოქალაქეობა</label>
                  <select value={editForm.nationality} onChange={(e) => setEditForm({...editForm, nationality: e.target.value})} style={{width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #ddd', background: '#fafafa', boxSizing: 'border-box'}}>
                    <option value="საქართველო">საქართველო</option>
                    <option value="გერმანია">გერმანია</option>
                    <option value="აშშ">აშშ</option>
                    <option value="დიდი ბრიტანეთი">დიდი ბრიტანეთი</option>
                    <option value="საფრანგეთი">საფრანგეთი</option>
                    <option value="უკრაინა">უკრაინა</option>
                    <option value="თურქეთი">თურქეთი</option>
                  </select>
                </div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
                <div className="auth-input-group">
                  <label><span style={{color: 'red'}}>*</span> ტელეფონი</label>
                  <input type="text" value={editForm.phoneNumber} onChange={(e) => setEditForm({...editForm, phoneNumber: e.target.value})} required />
                </div>
                <div className="auth-input-group">
                  <label><span style={{color: 'red'}}>*</span> სქესი</label>
                  <select value={editForm.gender} onChange={(e) => setEditForm({...editForm, gender: e.target.value})} style={{width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #ddd', background: '#fafafa', boxSizing: 'border-box'}}>
                    <option value="male">მამრობითი</option>
                    <option value="female">მდედრობითი</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="auth-submit-btn" style={{width: '100%', padding: '14px', background: '#e53935', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'}}>
                დასრულება
              </button>
            </form>
          </div>
        </div>
      )}

      {/* პაროლის შეცვლის მოდალი */}
      {isPasswordModalOpen && (
        <div className="auth-modal-overlay" onClick={() => setIsPasswordModalOpen(false)}>
          <div className="auth-modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '500px', background: '#fff', padding: '40px', borderRadius: '16px', position: 'relative', border: '2px solid #e53935'}}>
            <button className="auth-close-btn" onClick={() => setIsPasswordModalOpen(false)}>×</button>
            
            <h2 style={{marginTop: 0, marginBottom: '20px'}}>პაროლის შეცვლა</h2>

            {modalMessage && (
              <div style={{color: modalMessage.includes('შეიცვალა') ? 'green' : 'red', marginBottom: '15px', fontSize: '14px', background: modalMessage.includes('შეიცვალა') ? '#e8f5e9' : '#ffebee', padding: '10px', borderRadius: '6px'}}>
                {modalMessage}
              </div>
            )}

            <form onSubmit={handlePasswordChangeSubmit}>
              <div className="auth-input-group" style={{marginBottom: '15px'}}>
                <label><span style={{color: 'red'}}>*</span> ძველი პაროლი</label>
                <input 
                  type="password" 
                  placeholder="ძველი პაროლი" 
                  value={passwordForm.oldPassword} 
                  onChange={(e) => setPasswordForm({...passwordForm, oldPassword: e.target.value})} 
                  required 
                  style={{width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box', marginTop: '6px'}}
                />
              </div>

              <div className="auth-input-group" style={{marginBottom: '15px'}}>
                <label><span style={{color: 'red'}}>*</span> ახალი პაროლი</label>
                <input 
                  type="password" 
                  placeholder="ახალი პაროლი" 
                  value={passwordForm.newPassword} 
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})} 
                  required 
                  style={{width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box', marginTop: '6px'}}
                />
              </div>

              <div className="auth-input-group" style={{marginBottom: '20px'}}>
                <label><span style={{color: 'red'}}>*</span> გაიმეორეთ ახალი პაროლი</label>
                <input 
                  type="password" 
                  placeholder="გაიმეორეთ ახალი პაროლი" 
                  value={passwordForm.confirmPassword} 
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} 
                  required 
                  style={{width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box', marginTop: '6px'}}
                />
              </div>

              <button type="submit" className="auth-submit-btn" style={{width: '100%', padding: '14px', background: '#e53935', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'}}>
                პაროლის შეცვლა
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}