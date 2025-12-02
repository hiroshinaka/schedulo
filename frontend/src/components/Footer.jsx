import React from 'react';

export default function Footer() {
    return (
        <footer className="border-t bg-background">
            <div className="container flex flex-col md:flex-row items-center justify-between gap-4 py-8">
                <div className="text-sm text-muted-foreground text-center md:text-left">
                    © {new Date().getFullYear()} Schedulo · Built with React
                </div>
                <nav className="flex gap-6 text-sm">
                    <a className="text-muted-foreground transition-colors hover:text-foreground" href="#terms">
                        Terms
                    </a>
                    <a className="text-muted-foreground transition-colors hover:text-foreground" href="#privacy">
                        Privacy
                    </a>
                </nav>
            </div>
        </footer>
    );
}