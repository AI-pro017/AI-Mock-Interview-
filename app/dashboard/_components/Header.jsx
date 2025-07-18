"use client"
import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { Bell, UserCircle, LogOut, User } from 'lucide-react'
import Link from 'next/link'
import SubscriptionStatus from './SubscriptionStatus'

function Header({ pageTitle }) {
    const { data: session } = useSession();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    return (
        <header className='w-full h-16 bg-[#111827] border-b border-gray-700 flex items-center justify-between sticky top-0 z-30 px-4'>
            {/* Left side with logo and page title */}
            <div className='flex items-center gap-3'>
                <Link href="/dashboard" className="flex items-center gap-3">
                    <Image
                        src="/favicon.jpg"
                        alt="logo"
                        width={40}
                        height={40}
                        className="rounded-md"
                    />
                    <h2 className="font-bold text-lg text-white">{pageTitle}</h2>
                </Link>
            </div>
            
            {/* Right side with subscription status, notification and user profile */}
            <div className='flex items-center gap-6'>
                {/* Subscription Status */}
                <SubscriptionStatus />
                
                {/* Notification */}
                <Bell className='h-5 w-5 text-slate-400 hover:text-white cursor-pointer transition-colors' />
                
                {/* User Profile */}
                <div className='relative' ref={dropdownRef}>
                    <button onClick={() => setDropdownOpen(!dropdownOpen)} className='flex items-center gap-3 focus:outline-none'>
                        <UserCircle className='h-8 w-8 text-slate-500' />
                        <span className='text-sm font-medium text-slate-200 hidden sm:block'>{session?.user?.name || 'Guest'}</span>
                    </button>

                    {dropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-[#1a2234] border border-slate-700 rounded-md shadow-lg py-1 z-40">
                            <Link href="/dashboard/profile" className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">
                                <User className="w-4 h-4 mr-2" />
                                My Account
                            </Link>
                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}

export default Header
