import { Link } from "react-router-dom";
import bannerImg from "../../images/button-arrow.png"; // путь к иконке стрелки
import './MainBanner.css';


export default function MainBanner() {
  return (
    <section className="main-banner">
      <div className="container main-banner__content">
        <div className="main-banner__title text-muted">
          <h2>
            ЛЕТНЯЯ
            <br />
            КОЛЛЕКЦИЯ
          </h2>
        </div>
        <Link to="/catalog">
          <button className="main-banner__button">
            В каталог
            <img src={bannerImg} alt="стрелка" width="30px" />
          </button>
        </Link>
      </div>
    </section>
  );
}
