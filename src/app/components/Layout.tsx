import { Link, useLocation } from "react-router";
import { Leaf, Menu, X } from "lucide-react";
import { useState } from "react";

export function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/about", label: "About Us" },
    { to: "/login", label: "Sign In" },
    { to: "/admin", label: "Administration" },
  ];

  return (
    <div className="min-h-screen bg-[#060f1e] text-white flex flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#060f1e]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
              <Leaf className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-white tracking-tight">
              <span className="text-emerald-400">Earth</span>
              <span className="text-white/90">1.one</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm transition-colors ${
                  location.pathname === link.to
                    ? "text-emerald-400"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/get-started"
              className="px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#060f1e] text-sm transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white/70 hover:text-white"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#060f1e]/95 px-6 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`text-sm transition-colors ${
                  location.pathname === link.to
                    ? "text-emerald-400"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Page content */}
      <main className="flex-1 pt-16">{children}</main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-400" />
            <span className="text-white/50 text-sm">
              © 2026{" "}
              <span className="text-emerald-400">Earth</span>
              1.one — Project Finance & Carbon Trading Platform
            </span>
          </div>
          <div className="flex items-center gap-6 text-white/40 text-sm">
            <Link
              to="/about"
              className="hover:text-white/70 transition-colors"
            >
              About
            </Link>
            <Link
              to="/login"
              className="hover:text-white/70 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/admin"
              className="hover:text-white/70 transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}