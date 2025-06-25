import React from 'react'
import Header from './_components/Header'
import Sidebar from './_components/Sidebar'

function DashboardLayout({children}) {
  return (
    <div>
      <Sidebar />
      <div className="ml-64">
        <Header />
        <main className="p-8 bg-gray-50 min-h-screen">
            {children}
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout