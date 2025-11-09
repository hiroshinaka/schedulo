import React from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
	return (
		<header className="w-full bg-white border-b border-slate-200">
			<div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
				<Link to="/" className="text-xl font-bold text-slate-900">Schedulo</Link>
				<nav className="flex items-center gap-4">
					<Link to="/login" className="text-sm text-slate-600 hover:text-slate-900">Login</Link>
					<Link to="/app" className="ml-2 inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm rounded-md hover:bg-slate-700">Open App</Link>
				</nav>
			</div>
		</header>
	);
}
