import React from 'react';
import { Link } from 'react-router-dom';
import strings from '../i18n';

const Footer: React.FC = () => (
  <footer className="bg-light py-3 mt-auto">
    <div className="container d-flex flex-column flex-md-row justify-content-between align-items-center">
      <div className="mb-2 mb-md-0">
        <Link to="/" className="mx-2 text-decoration-none">
          {strings.footer.home}
        </Link>
        <Link to="/search" className="mx-2 text-decoration-none">
          {strings.footer.search}
        </Link>
        <Link to="/my" className="mx-2 text-decoration-none">
          {strings.footer.history}
        </Link>
      </div>
      <small className="text-muted">
        &copy; {new Date().getFullYear()} {strings.footer.copyRight}
      </small>
    </div>
  </footer>
);

export default Footer;
