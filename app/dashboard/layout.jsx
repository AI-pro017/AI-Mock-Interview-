"use client"
import React from 'react'
import Header from './_components/Header'
import Sidebar from './_components/Sidebar'

function dashboardLayout({ children }) {
    return (
        <div>
            <Sidebar />
            <div className='md:ml-64'>
                <Header />
                {children}
            </div>
        </div>
    )
}

export default dashboardLayout