import { Link } from 'react-router-dom';

export const BrandLogo = () => {
  return (
    <Link className="brand-logo flex items-center gap-2 transition-opacity hover:opacity-80" to="/">
      <span className="brand-logo__icon text-2xl">🎧</span>
      <span className="text-lg font-bold">
        Smart <span className="text-primary">Curator</span>
      </span>
    </Link>
  );
};
