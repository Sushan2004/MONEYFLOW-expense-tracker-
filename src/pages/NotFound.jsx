import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';

export default function NotFound() {
  return (
    <div className="notfound">
      <section className="notfound__card" aria-labelledby="notfound-title">
        <div className="notfound__icon" aria-hidden="true">
          <Icon name="search" size={22} />
        </div>
        <div className="notfound__big">404</div>
        <div className="notfound__copy">
          <h1 id="notfound-title" className="notfound__title">Page not found</h1>
          <p className="notfound__message">
            The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          </p>
        </div>
        <div className="notfound__actions">
          <Link to="/dashboard" className="btn btn--primary">
            <Icon name="home" size={14} />
            Go to Dashboard
          </Link>
          <Link to="/" className="btn btn--secondary">
            Back to Home
          </Link>
        </div>
      </section>
    </div>
  );
}
