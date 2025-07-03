import React from 'react'
import Header from './_components/Header'
import Sidebar from './_components/Sidebar'

function DashboardLayout({children}) {
  return (
    <div className="bg-gray-50">
      <Sidebar />
      <div className="ml-64">
        <Header />
        <main className="p-6 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout