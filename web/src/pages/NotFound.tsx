import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="px-6 py-20 text-center">
      <h1 className="text-5xl font-extrabold text-accent mb-3">404</h1>
      <p className="text-muted mb-6">Halaman tidak ditemukan.</p>
      <Link to="/" className="bg-accent hover:bg-accent2 rounded-full px-6 py-3 text-sm font-bold">
        Kembali ke Home
      </Link>
    </div>
  );
}
