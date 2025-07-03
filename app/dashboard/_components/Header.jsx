"use client"
import React from 'react'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from 'next/link'
import { Bell, UserCircle } from 'lucide-react'

function Header() {
    const { data: session } = useSession();

    return (
        <header className='p-4 bg-slate-900/70 border-b border-slate-700/80 flex justify-end items-center sticky top-0 z-20 backdrop-blur-sm'>
            <div className='flex items-center gap-6'>
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
