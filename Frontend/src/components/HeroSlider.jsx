import { useState, useEffect } from 'react';
import slide1 from '../assets/slide1.jpg';
import slide2 from '../assets/slide2.jpg';
import slide3 from '../assets/slide3.jpg';
import slide4 from '../assets/slide4.jpg';
import './HeroSlider.css';

const slides = [slide1, slide2, slide3, slide4];

export default function HeroSlider({ children }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  // სურვილისამებრ: ყოველ 6 წამში ავტომატურად გადართვა
  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hero-slider-container">
      {/* მიმდინარე ფონის სურათი */}
      <div
        className="hero-slide"
        style={{ backgroundImage: `url(${slides[currentIndex]})` }}
      >
        <div className="hero-overlay"></div>
      </div>

      {/* მარცხენა და მარჯვენა ისრები */}
      <button type="button" className="slider-arrow left" onClick={prevSlide} aria-label="წინა სურათი">
        &#10094;
      </button>

      <button type="button" className="slider-arrow right" onClick={nextSlide} aria-label="შემდეგი სურათი">
        &#10095;
      </button>

      {/* აქ ჩაჯდება ძებნის პანელი, რომელსაც App.jsx-დან გადავცემთ */}
      {children}
    </div>
  );
}