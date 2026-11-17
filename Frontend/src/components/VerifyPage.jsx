import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function VerifyPage() {
  const { uid, token } = useParams();
  const [statusText, setStatusText] = useState('მიმდინარეობს ვერიფიკაცია...');
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/users/verify/${uid}/${token}/`)
      .then(res => res.json())
      .then(data => {
        if (data.detail) {
          setStatusText('ანგარიში წარმატებით გააქტიურდა! გადახვალთ მთავარ გვერდზე...');
          setTimeout(() => navigate('/'), 3000);
        } else {
          setStatusText('ვერიფიკაციის ბმული არასწორია ან ვადაგასულია.');
        }
      })
      .catch(() => setStatusText('შეცდომა სერვერთან კავშირისას.'));
  }, [uid, token, navigate]);

  return (
    <div style={{ textAlign: 'center', marginTop: '100px', fontSize: '20px', fontFamily: 'sans-serif' }}>
      <h2>საქართველოს რკინიგზა - ანგარიშის ვერიფიკაცია</h2>
      <p>{statusText}</p>
    </div>
  );
}