import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../images/schedulo-icon.png';
import useAuth from '../hooks/useAuth';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarImage } from './ui/avatar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from './ui/dropdown-menu';

export default function Header() {
	const { user, loggedIn, logout } = useAuth();
	const navigate = useNavigate();
	const defaultAvatar = '/default-avatar.svg';
	const userAvatar = user?.image_url || defaultAvatar;
	const [pendingCount, setPendingCount] = useState(0);

	useEffect(() => {
		if (loggedIn) {
			loadPendingRequests();
			const interval = setInterval(loadPendingRequests, 30000);
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
		<header className="sticky top-0 z-[60] w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container flex h-16 items-center justify-between">
				<Link to={loggedIn ? "/app" : "/"} className="flex items-center space-x-2">
					<img src={logo} alt="Schedulo" className="h-8 w-8" />
					<span className="font-bold text-2xl">Schedulo</span>
				</Link>

				<div className="flex items-center gap-3">
					{loggedIn ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button className="relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full">
									<Avatar className="h-9 w-9">
										<AvatarImage src={userAvatar} alt={user?.first_name || 'Profile'} />
									</Avatar>
									{pendingCount > 0 && (
										<Badge variant="destructive" className="absolute z-50 -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
											{pendingCount}
										</Badge>
									)}
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="w-56" align="end">
								<DropdownMenuLabel>
									<div className="flex items-center gap-3">
										<Avatar className="h-10 w-10">
											<AvatarImage src={userAvatar} alt={user?.first_name || 'Profile'} />
										</Avatar>
										<div className="flex flex-col space-y-1 text-left">
											<p className="text-sm font-medium leading-none">{user?.first_name} {user?.last_name}</p>
											<p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
										</div>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem onSelect={() => navigate('/')}>
									<span>Home</span>
								</DropdownMenuItem>
								<DropdownMenuItem onSelect={() => navigate('/profile')}>
									<span>Profile</span>
									{pendingCount > 0 && (
										<Badge variant="destructive" className="ml-2 h-5 px-1.5">
											{pendingCount}
										</Badge>
									)}
								</DropdownMenuItem>
								<DropdownMenuItem onSelect={() => navigate('/app/invites')}>
									<div className="flex items-center justify-between w-full">
										<span>Event Invites</span>
									</div>
								</DropdownMenuItem>
								<DropdownMenuItem onSelect={() => navigate('/chat')}>
									<span>Chat</span>
								</DropdownMenuItem>
								<DropdownMenuItem onSelect={() => navigate('/app/trash')}>
									<span>Trash</span>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem onSelect={handleLogout}>
									<span className="text-destructive">Log out</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					) : (
						<>
							<Link to="/login">
								<Button variant="ghost" size="sm">Login</Button>
							</Link>
							<Link to="/signup">
								<Button variant="default" size="sm">Sign Up</Button>
							</Link>
						</>
					)}
				</div>
			</div>
		</header>
	);
}
