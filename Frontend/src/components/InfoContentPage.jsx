import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './InfoContentPage.css';

export default function InfoContentPage() {
  const { id } = useParams(); // იღებს URL-დან ID-ს
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/api/info-pages/${id}/`)
      .then(res => {
        if (!res.ok) {
          throw new Error('გვერდი ვერ მოიძებნა');
        }
        return res.json();
      })
      .then(data => {
        setPageData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching info page:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="info-page-wrapper"><p style={{ textAlign: 'center', padding: '50px' }}>იტვირთება...</p></div>;
  if (error) return <div className="info-page-wrapper"><p style={{ textAlign: 'center', padding: '50px', color: 'red' }}>შეცდომა: {error}</p></div>;
  if (!pageData) return null;

  return (
    <div className="info-page-wrapper">
      <div className="info-page-container">
        <h2 className="info-page-title">{pageData.title}</h2>
        <div className="info-page-content">
          {pageData.content_blocks && pageData.content_blocks.map((block, index) => {
            if (block.type === 'heading') {
              return (
                <h3 key={index} style={{ fontSize: '18px', fontWeight: '700', color: '#111', textAlign: 'center', marginTop: '35px', marginBottom: '15px' }}>
                  {block.text}
                </h3>
              );
            } else if (block.type === 'bullet') {
              return (
                <p key={index} style={{ margin: '10px 0 10px 15px', textAlign: 'left', lineHeight: '1.7' }}>
                  • {block.text}
                </p>
              );
            } else {
              return (
                <p key={index} style={{ margin: '14px 0', textAlign: 'left', lineHeight: '1.8' }}>
                  {block.text}
                </p>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
}