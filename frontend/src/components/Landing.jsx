import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
import useAuth from '../hooks/useAuth';

export default function Landing(){
  const { loggedIn } = useAuth();
  
  return (
    <div className="flex-1">
      {/* Hero Section */}
      <section className="relative overflow-hidden pb-16 pt-20 md:pb-24 md:pt-28 lg:pb-32 lg:pt-36">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
        <div className="absolute left-0 right-0 top-32 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary opacity-20 blur-[100px]"></div>
        
        <div className="container flex max-w-[64rem] flex-col items-center gap-6 text-center">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium bg-muted/50 backdrop-blur-sm">
            <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs font-semibold mr-2">New</span>
            <span className="text-muted-foreground">Introducing smart scheduling suggestions</span>
          </div>
          
          <h1 className="font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-balance leading-tight">
            Schedule smarter,
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"> collaborate better</span>
          </h1>
          
          <p className="max-w-[46rem] text-lg leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            A modern calendar experience for teams and individuals. Organize meetings, manage invites, and stay in sync with everyone that matters.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            {loggedIn ? (
              <Link to="/app">
                <Button size="lg" className="h-11 px-8 text-base shadow-sm hover:shadow-md transition-shadow">
                  Go to Calendar
                  <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/signup">
                  <Button size="lg" className="h-11 px-8 text-base shadow-sm hover:shadow-md transition-shadow">
                    Get Started Free
                    <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg" className="h-11 px-8 text-base">Sign In</Button>
                </Link>
              </>
            )}
          </div>
          
          <div className="mt-4 flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Free to use</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No credit card</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Privacy first</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-16 md:py-20 lg:py-24">
        <div className="mx-auto max-w-[58rem] text-center mb-12">
          <h2 className="text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">Everything you need</h2>
          <p className="mt-4 text-lg text-muted-foreground">Powerful features to help you stay organized and productive</p>
        </div>
        
        <div className="mx-auto grid justify-center gap-6 sm:grid-cols-2 md:max-w-[64rem] lg:grid-cols-3">
          <Card className="relative overflow-hidden border-2 transition-all hover:shadow-lg hover:border-primary/50">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl"></div>
            <CardHeader className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <CardTitle className="text-xl">Smart Scheduling</CardTitle>
              <CardDescription className="text-base">
                Quickly create events with recurring options. Manage one-time or repeated meetings effortlessly.
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="relative overflow-hidden border-2 transition-all hover:shadow-lg hover:border-primary/50">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl"></div>
            <CardHeader className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <CardTitle className="text-xl">Team Collaboration</CardTitle>
              <CardDescription className="text-base">
                Invite friends and colleagues to events. Chat, share availability, and coordinate seamlessly.
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="relative overflow-hidden border-2 transition-all hover:shadow-lg hover:border-primary/50">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl"></div>
            <CardHeader className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <CardTitle className="text-xl">Privacy Focused</CardTitle>
              <CardDescription className="text-base">
                Your data belongs to you. No tracking, no ads, just a clean calendar experience you can trust.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    </div>
  );
}
