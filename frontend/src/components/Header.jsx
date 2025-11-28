import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../images/schedulo-high-resolution-logo.png';
import useAuth from '../hooks/useAuth';

export default function Header() {
	const { user, loggedIn, logout } = useAuth();
	const navigate = useNavigate();
	const defaultAvatar = '/default-avatar.svg';
	const userAvatar = user?.image_url || defaultAvatar;
	const [pendingCount, setPendingCount] = useState(0);

	useEffect(() => {
		if (loggedIn) {
			loadPendingRequests();
			const interval = setInterval(loadPendingRequests, 30000); // not sure if this will cause performance issues
			return () => clearInterval(interval);
		}
	}, [loggedIn]);

	const loadPendingRequests = async () => {
		try {
			const res = await fetch('/api/profile/unread-requests-count', { credentials: 'include' });
			const data = await res.json();
			if (data.ok) {
				setPendingCount(data.count || 0);
			}
		} catch (err) {
			console.error('Failed to load pending requests', err);
		}
	};

	window.addEventListener('friend-requests-viewed', loadPendingRequests);

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
							<Link to="/profile" className="relative flex items-center gap-2 hover:opacity-80 transition-opacity">
								<img 
									src={userAvatar} 
									alt={user?.first_name || 'Profile'} 
									className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
								/>
								{pendingCount > 0 && (
									<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
										{pendingCount}
									</span>
								)}
							</Link>
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
