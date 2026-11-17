import { useState, useEffect } from 'react';
import './AuthModal.css';

export default function AuthModal({ isOpen, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [registerStep, setRegisterStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [activeInfoModal, setActiveInfoModal] = useState(null); // 'terms' ან 'privacy'
  const [infoModalData, setInfoModalData] = useState(null);
  const [infoLoading, setInfoLoading] = useState(false);

  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: 'male',
    email: '',
    phoneNumber: '',
    personalId: '',
    nationality: 'საქართველო',
    password: '',
    passwordConfirm: '',
    agreeTerms: false,
    agreePrivacy: false
  });

  const [resetEmail, setResetEmail] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 🟢 ტექსტების დინამიურად წამოღება ბექენდიდან ID-ის მიხედვით
  useEffect(() => {
    if (!activeInfoModal) {
      setInfoModalData(null);
      return;
    }

    setInfoLoading(true);
    // 9 - წესები და პირობები, 11 - კონფიდენციალურობის პოლიტიკა
    const pageId = activeInfoModal === 'terms' ? 9 : 11;

    fetch(`http://127.0.0.1:8000/api/info-pages/${pageId}/`)
      .then(res => res.json())
      .then(data => {
        setInfoModalData(data);
        setInfoLoading(false);
      })
      .catch(err => {
        console.error("Error fetching info page:", err);
        setInfoLoading(false);
      });
  }, [activeInfoModal]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    setError('');
    if (!formData.firstName || !formData.lastName || !formData.personalId || !formData.nationality || !formData.gender) {
      setError('გთხოვთ შეავსოთ ყველა სავალდებულო ველი პირველ ეტაპზე.');
      return;
    }
    setRegisterStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    let endpoint = '';
    let payload = {};

    if (isForgotPassword) {
      endpoint = 'http://127.0.0.1:8000/api/users/password-reset/';
      payload = { email: resetEmail };
    } else if (isLogin) {
      endpoint = 'http://127.0.0.1:8000/api/users/login/';
      payload = { login_id: loginId, password: loginPassword };
    } else {
      if (!formData.agreeTerms || !formData.agreePrivacy) {
        setError('გთხოვთ დაეთანხმოთ წესებსა და პირობებს და კონფიდენციალურობის პოლიტიკას.');
        return;
      }
      endpoint = 'http://127.0.0.1:8000/api/users/register/';
      payload = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        gender: formData.gender,
        email: formData.email,
        phone_number: formData.phoneNumber,
        personal_id: formData.personalId,
        nationality: formData.nationality,
        password: formData.password,
        password_confirm: formData.passwordConfirm
      };
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const firstKey = Object.keys(data)[0];
        const val = data[firstKey];
        setError(Array.isArray(val) ? val[0] : (val || 'შეცდომა მონაცემებში'));
        return;
      }

      if (isForgotPassword) {
        setSuccessMsg(data.detail || 'პაროლის აღდგენის ინსტრუქცია გამოგზავნილია ელ-ფოსტაზე.');
      } else if (isLogin) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userId', data.user_id);
        localStorage.setItem('userName', data.first_name); // 🟢 აქ ინახება სახელი
        
        setSuccessMsg('წარმატებით შეხვედით ანგარიშში!');
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1000);
      } else {
        setSuccessMsg('რეგისტრაცია წარმატებით დასრულდა! გთხოვთ შეამოწმოთ თქვენი ელ-ფოსტა ანგარიშის გასააქტიურებლად.');
        setTimeout(() => {
          setIsLogin(true);
          setRegisterStep(1);
          setSuccessMsg('');
        }, 3000);
      }

    } catch (err) {
      setError('კავშირის შეცდომა სერვერთან.');
    }
  };
  
  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-content large-modal" onClick={(e) => e.stopPropagation()}>
        
        <button className="auth-close-btn" onClick={onClose}>×</button>

        <div className="auth-header-row">
          <h2 className="auth-title">
            {isForgotPassword ? 'პაროლის აღდგენა' : (isLogin ? 'შესვლა' : 'რეგისტრაცია')}
          </h2>
          <div className="auth-logo-text">GR</div>
        </div>

        {!isForgotPassword && (
          <div className="auth-switch-section">
            <span className="auth-switch-text">
              {isLogin ? 'არ ხარ დარეგისტრირებული?' : 'უკვე გაქვს ანგარიში?'}
            </span>
            <button 
              className="auth-switch-link" 
              onClick={() => { setIsLogin(!isLogin); setRegisterStep(1); setError(''); setSuccessMsg(''); }}
            >
              {isLogin ? 'რეგისტრაცია' : 'შესვლა'}
            </button>
          </div>
        )}

        {!isLogin && !isForgotPassword && (
          <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', fontSize: '14px'}}>
            <span style={{color: '#666'}}>რეგისტრაცია</span>
            <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
              <span style={{
                background: registerStep === 1 ? '#e53935' : '#ccc', 
                color: '#fff', borderRadius: '50%', width: '22px', height: '22px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold'
              }}>1</span>
              <span style={{
                background: registerStep === 2 ? '#e53935' : '#ccc', 
                color: '#fff', borderRadius: '50%', width: '22px', height: '22px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold'
              }}>2</span>
            </div>
          </div>
        )}

        {error && <div style={{color: 'red', marginBottom: '15px', fontSize: '14px'}}>{error}</div>}
        {successMsg && <div style={{color: 'green', marginBottom: '15px', fontSize: '14px'}}>{successMsg}</div>}

        <form className="auth-form" onSubmit={isLogin || (!isLogin && registerStep === 2) || isForgotPassword ? handleSubmit : handleNextStep}>
          
          {isForgotPassword ? (
            <div className="auth-input-group">
              <label><span style={{color: 'red'}}>*</span> შეიყვანეთ რეგისტრირებული ელ-ფოსტა</label>
              <input 
                type="email" 
                placeholder="example@mail.ge" 
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required 
              />
              <button type="submit" className="auth-submit-btn" style={{marginTop: '15px'}}>
                აღდგენის ბმულის გაგზავნა
              </button>
              <button 
                type="button" 
                className="auth-switch-link" 
                style={{marginTop: '15px', display: 'block', textAlign: 'center'}}
                onClick={() => { setIsForgotPassword(false); setError(''); setSuccessMsg(''); }}
              >
                ← უკან შესვლაზე
              </button>
            </div>
          ) : isLogin ? (
            <div className="login-form-container">
              <div className="auth-input-group">
                <label><span style={{color: 'red'}}>*</span> ელ-ფოსტა / ტელეფონის ნომერი</label>
                <input 
                  type="text" 
                  placeholder="ელ-ფოსტა ან ტელეფონი" 
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  required 
                />
              </div>

              <div className="auth-input-group password-group">
                <label><span style={{color: 'red'}}>*</span> პაროლი</label>
                <div className="password-input-wrapper">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="პაროლი" 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required 
                  />
                  <button 
                    type="button" 
                    className="eye-btn" 
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="auth-forgot-section">
                <button 
                  type="button" 
                  className="auth-switch-link" 
                  onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMsg(''); }}
                >
                  დაგავიწყდა პაროლი?
                </button>
              </div>

              <button type="submit" className="auth-submit-btn">
                შესვლა
              </button>
            </div>
          ) : registerStep === 1 ? (
            <div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                <div className="auth-input-group">
                  <label><span style={{color: 'red'}}>*</span> სახელი</label>
                  <input type="text" name="firstName" placeholder="სახელი" value={formData.firstName} onChange={handleChange} required />
                </div>
                <div className="auth-input-group">
                  <label><span style={{color: 'red'}}>*</span> პირადი ნომერი / პასპორტის ნომერი</label>
                  <input type="text" name="personalId" placeholder="პირადი ნომერი" value={formData.personalId} onChange={handleChange} required />
                </div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px'}}>
                <div className="auth-input-group">
                  <label><span style={{color: 'red'}}>*</span> გვარი</label>
                  <input type="text" name="lastName" placeholder="გვარი" value={formData.lastName} onChange={handleChange} required />
                </div>
                <div className="auth-input-group">
                  <label><span style={{color: 'red'}}>*</span> მოქალაქეობა</label>
                  <select name="nationality" value={formData.nationality} onChange={handleChange} style={{width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #ddd', background: '#fafafa'}}>
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

              <div className="auth-input-group" style={{marginTop: '10px'}}>
                <label><span style={{color: 'red'}}>*</span> სქესი</label>
                <select name="gender" value={formData.gender} onChange={handleChange} style={{width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #ddd', background: '#fafafa'}}>
                  <option value="male">მამრობითი</option>
                  <option value="female">მდედრობითი</option>
                </select>
              </div>

              <button type="submit" className="auth-submit-btn" style={{marginTop: '25px'}}>
                შემდეგი
              </button>
            </div>
          ) : (
            <div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                <div className="auth-input-group">
                  <label><span style={{color: 'red'}}>*</span> ელ-ფოსტა</label>
                  <input type="email" name="email" placeholder="ელ-ფოსტა" value={formData.email} onChange={handleChange} required />
                </div>
                <div className="auth-input-group">
                  <label><span style={{color: 'red'}}>*</span> ტელეფონი</label>
                  <div style={{display: 'flex', gap: '5px'}}>
                    <span style={{padding: '14px 10px', background: '#eee', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px'}}>+995</span>
                    <input type="text" name="phoneNumber" placeholder="599123456" value={formData.phoneNumber} onChange={handleChange} required style={{flex: 1}} />
                  </div>
                </div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px'}}>
                <div className="auth-input-group password-group">
                  <label><span style={{color: 'red'}}>*</span> პაროლი</label>
                  <div className="password-input-wrapper">
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      name="password"
                      placeholder="პაროლი" 
                      value={formData.password} 
                      onChange={handleChange} 
                      required 
                    />
                    <button 
                      type="button" 
                      className="eye-btn" 
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                <div className="auth-input-group password-group">
                  <label><span style={{color: 'red'}}>*</span> გაიმეორეთ პაროლი</label>
                  <div className="password-input-wrapper">
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'} 
                      name="passwordConfirm"
                      placeholder="გაიმეორეთ პაროლი" 
                      value={formData.passwordConfirm} 
                      onChange={handleChange} 
                      required 
                    />
                    <button 
                      type="button" 
                      className="eye-btn" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{display: 'flex', flexDirection: 'column', gap: '12px', margin: '20px 0', fontSize: '14px'}}>
                <label style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'}}>
                  <input type="checkbox" name="agreeTerms" checked={formData.agreeTerms} onChange={handleChange} />
                  <span style={{color: '#e53935', textDecoration: 'underline'}} onClick={(e) => { e.preventDefault(); setActiveInfoModal('terms'); }}>
                    ვეთანხმები წესებს
                  </span>
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'}}>
                  <input type="checkbox" name="agreePrivacy" checked={formData.agreePrivacy} onChange={handleChange} />
                  <span style={{color: '#e53935', textDecoration: 'underline'}} onClick={(e) => { e.preventDefault(); setActiveInfoModal('privacy'); }}>
                    ვეთანხმები კონფიდენციალურობის პოლიტიკას
                  </span>
                </label>
              </div>

              <div style={{display: 'flex', gap: '15px', marginTop: '20px'}}>
                <button type="button" className="auth-submit-btn" style={{background: '#666', width: '30%'}} onClick={() => setRegisterStep(1)}>
                  უკან
                </button>
                <button type="submit" className="auth-submit-btn" style={{flex: 1}}>
                  რეგისტრაციის დასრულება
                </button>
              </div>
            </div>
          )}

        </form>

      </div>

      {/* --- წესებისა და პოლიტიკის პოპაპი (იტვირთება API-დან) --- */}
      {activeInfoModal && (
        <div className="auth-modal-overlay" style={{zIndex: 11000}} onClick={() => setActiveInfoModal(null)}>
          <div className="auth-modal-content wide-info-modal" onClick={(e) => e.stopPropagation()}>
            <button className="auth-close-btn" onClick={() => setActiveInfoModal(null)}>×</button>
            
            <h2 className="auth-title" style={{marginBottom: '20px'}}>
              {infoModalData ? infoModalData.title : (activeInfoModal === 'terms' ? 'წესები და პირობები' : 'კონფიდენციალურობის პოლიტიკა')}
            </h2>

            <div className="info-modal-body" style={{maxHeight: '65vh', overflowY: 'auto', lineHeight: '1.7', color: '#333', fontSize: '15px', paddingRight: '15px', textAlign: 'left'}}>
              {infoLoading ? (
                <p style={{textAlign: 'center', padding: '30px'}}>იტვირთება...</p>
              ) : infoModalData && infoModalData.content_blocks ? (
                infoModalData.content_blocks.map((block, index) => {
                  if (block.type === 'heading') {
                    return <h4 key={index} style={{fontSize: '17px', fontWeight: '700', marginTop: '20px', marginBottom: '10px'}}>{block.text}</h4>;
                  } else if (block.type === 'bullet') {
                    return <li key={index} style={{marginBottom: '8px', marginLeft: '20px'}}>{block.text}</li>;
                  } else {
                    return <p key={index} style={{marginBottom: '14px'}}>{block.text}</p>;
                  }
                })
              ) : (
                <p style={{textAlign: 'center', color: 'red'}}>ინფორმაცია ვერ მოიძებნა.</p>
              )}
            </div>

            <button 
              type="button" 
              className="auth-submit-btn" 
              style={{marginTop: '25px'}}
              onClick={() => setActiveInfoModal(null)}
            >
              დახურვა
            </button>
          </div>
        </div>
      )}

    </div>
  );
}