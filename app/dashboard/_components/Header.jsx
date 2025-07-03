"use client"
import React from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { Bell, UserCircle } from 'lucide-react'
import Link from 'next/link'

function Header({ pageTitle }) {
    const { data: session } = useSession();

    return (
        <header className='w-full bg-[#111827] border-b border-gray-700 flex justify-between items-center sticky top-0 z-30'>
            {/* Left side with logo and page title */}
            <div className='flex items-center p-4'>
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
            
            {/* Right side with notification and user profile */}
            <div className='flex items-center gap-6 p-4 pr-6'>
                <Bell className='h-5 w-5 text-slate-400 hover:text-white cursor-pointer transition-colors' />
                <div className='flex items-center gap-3'>
                    {session?.user?.image ? (
                        <Image src={session.user.image} alt={session.user.name || 'User'} width={32} height={32} className='rounded-full ring-2 ring-slate-700' />
                    ) : (
                        <UserCircle className='h-8 w-8 text-slate-500' />
                    )}
                    <span className='text-sm font-medium text-slate-200 hidden sm:block'>{session?.user?.name || 'Guest'}</span>
                </div>
            </div>
        </header>
    )
}

export default Header
