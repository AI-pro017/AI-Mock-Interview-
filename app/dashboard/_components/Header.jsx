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
import { Bell } from 'lucide-react'

function Header() {
    const { data: session } = useSession();
    const userImage = session?.user?.image || '/default-avatar.svg';

    return (
        <div className='py-4 px-6 shadow-sm border-b flex justify-end items-center bg-white'>
            <div className="flex items-center gap-4">
                <button className="p-2 rounded-full hover:bg-gray-100">
                    <Bell className="h-5 w-5 text-gray-600" />
                </button>
                
                {session?.user ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div className="flex items-center gap-2 cursor-pointer">
                                <Image 
                                    src={userImage} 
                                    alt='user' 
                                    width={36} 
                                    height={36}
                                    className='rounded-full'
                                />
                                <div className="hidden md:block">
                                    <p className="text-sm font-medium">{session.user.name}</p>
                                </div>
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <Link href="/dashboard/profile">
                                <DropdownMenuItem className="cursor-pointer">Profile</DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/sign-in' })}>
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <Link href="/sign-in" className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'>
                        Login
                    </Link>
                )}
            </div>
        </div>
    )
}

export default Header
