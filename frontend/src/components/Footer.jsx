import React from 'react';


export default function Footer() {
    return (
        <footer className="py-8 relative z-50" style={{ backgroundColor: 'var(--brand-contrast)', borderTop: '1px solid rgba(10,22,83,0.06)' }}>
            <div className="max-w-full px-6 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="text-base font-medium text-center md:text-left" style={{ color: 'var(--brand-main)' }}>
                    © {new Date().getFullYear()} Schedulo · Built with React
                </div>
                <nav className="flex gap-8 text-sm font-normal">
                    <a className="transition-colors duration-200 ease-in-out" style={{ color: 'var(--brand-main)' }} href="#terms">Terms</a>
                    <a className="transition-colors duration-200 ease-in-out" style={{ color: 'var(--brand-main)' }} href="#privacy">Privacy</a>
                </nav>
            </div>
        </footer>
    );
}