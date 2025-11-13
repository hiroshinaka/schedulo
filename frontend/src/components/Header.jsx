import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../images/schedulo-high-resolution-logo.png';
import useAuth from '../hooks/useAuth';

export default function Header() {
	const { user, loggedIn, logout } = useAuth();
	const navigate = useNavigate();

	const handleLogout = async () => {
		await logout();
		navigate('/');
	};

	return (
		<header className="w-full brand-bg brand-border" style={{ borderBottom: '1px solid rgba(10,22,83,0.06)' }}>
			<div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
				<Link to="/" className="flex items-center gap-3">
					<img src={logo} alt="Schedulo" style={{ width: 40, backgroundColor: 'var(--brand-contrast)', borderRadius: 6 }} />
				</Link>

				<nav className="flex items-center gap-3">
					{loggedIn ? (
						<>
							<span className="text-sm brand-text">{user?.first_name || user?.email || 'Me'}</span>
							<button
								onClick={handleLogout}
								className="ml-2 inline-flex items-center px-4 py-2"
								style={{ backgroundColor: 'var(--brand-main)', color: 'var(--brand-contrast)', borderRadius: 6, fontSize: 14 }}
							>
								Log out
							</button>
						</>
					) : (
						<>
							<Link to="/login" className="text-sm brand-text hover:underline">Login</Link>
							<Link to="/signup" className="ml-2 inline-flex items-center px-4 py-2" style={{ backgroundColor: 'var(--brand-contrast)', color: 'var(--brand-main)', border: '1px solid rgba(10,22,83,0.08)', borderRadius: 6, fontSize: 14 }}>Sign Up</Link>
						</>
					)}
				</nav>
			</div>
		</header>
	);
}
