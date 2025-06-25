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
  

function Header() {

    const { data: session } = useSession();


  return (
    <div className='p-5 shadow-sm border-b flex justify-between bg-white'>
        <div>
            {/* Search Bar */}
        </div>
        <div>
            {session?.user ? (
                 <DropdownMenu>
                 <DropdownMenuTrigger>
                    <Image src={session.user.image || '/default-avatar.png'} alt='user' width={40} height={40}
                        className='rounded-full'
                    />
                 </DropdownMenuTrigger>
                 <DropdownMenuContent>
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
                <a href="/sign-in" className='px-4 py-2 bg-blue-500 text-white rounded-md'>Login</a>
            )}
           
        </div>
    </div>
  )
}

export default Header
