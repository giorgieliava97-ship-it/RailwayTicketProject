import { useNavigate } from 'react-router-dom';
import './InfoCards.css';

import cancelImg from '../assets/cancel.jpg';
import discountsImg from '../assets/discounts.jpg';
import petsImg from '../assets/pets.jpg';
import airportImg from '../assets/airport.jpg';

const INFO_ITEMS = [
  {
    id: 'cancel-ticket',
    title: 'ბილეთის გაუქმება',
    image: cancelImg,
    path: '/profile?tab=purchased', // 🟢 გადაჰყავს მომხმარებელი პროფილის შეძენილი ბილეთების სექციაში
  },
  {
    id: 'discounts',
    title: 'საბავშვო/სტუდენტური ფასდაკლება',
    image: discountsImg,
    path: '/info/1',
  },
  {
    id: 'pets-luggage',
    title: 'შინაური ცხოველების/სპორტული ინვენტარის ტრანსპორტირება',
    image: petsImg,
    path: '/info/2',
  },
  {
    id: 'kutaisi-airport',
    title: 'სადგური ქუთაისის აეროპორტი',
    image: airportImg,
    path: '/info/3',
  },
];

export default function InfoCards() {
  const navigate = useNavigate();

  return (
    <section className="info-cards-section">
      <div className="info-cards-grid">
        {INFO_ITEMS.map((item) => (
          <div
            key={item.id}
            className="info-card"
            onClick={() => navigate(item.path)}
          >
            <div className="info-card-image-box">
              {item.image ? (
                <img src={item.image} alt={item.title} />
              ) : (
                <span className="info-card-placeholder">ფოტოს ადგილი ({item.id})</span>
              )}
            </div>
            <div className="info-card-title">{item.title}</div>
          </div>
        ))}
      </div>
    </section>
  );
}