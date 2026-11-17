import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ResetPasswordPage() {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [reNewPassword, setReNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== reNewPassword) {
      setError('პაროლები არ ემთხვევა ერთმანეთს');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      // შეცვალე შენი ბექენდის რეალური URL-ით, თუ სხვა ენდპოინტი გაქვს
      const response = await fetch(`http://127.0.0.1:8000/api/users/password-reset-confirm/${uid}/${token}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            password: newPassword,
            password_confirm: reNewPassword, // დაამატე ეს ველი, რომელიც მეორე ინპუთის მნიშვნელობას ინახავს!
        }),
      });

      if (response.ok) {
        setMessage('პაროლი წარმატებით შეიცვალა! გადადიხართ ავტორიზაციის გვერდზე...');
        setTimeout(() => navigate('/'), 3000);
      } else {
        const data = await response.json();
        setError(data.detail || data.new_password?.[0] || 'შეცდომა მოხდა სცადეთ თავიდან');
      }
    } catch (err) {
      setError('კავშირის შეცდომა სერვერთან');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '80px auto', background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#111' }}>ახალი პაროლის დაყენება</h2>
      
      {error && <div style={{ background: '#ffe3e3', color: '#c92a2a', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '14px' }}>{error}</div>}
      {message && <div style={{ background: '#ebfbee', color: '#2b8a3e', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '14px' }}>{message}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#444' }}>ახალი პაროლი</label>
          <input 
            type="password" 
            value={newPassword} 
            onChange={(e) => setNewPassword(e.target.value)} 
            required 
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#444' }}>გაიმეორეთ ახალი პაროლი</label>
          <input 
            type="password" 
            value={reNewPassword} 
            onChange={(e) => setReNewPassword(e.target.value)} 
            required 
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ background: '#e30613', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}
        >
          {loading ? 'იტვირთება...' : 'პაროლის შეცვლა'}
        </button>
      </form>
    </div>
  );
}