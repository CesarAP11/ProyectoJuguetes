import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import Sidebar from './Sidebar';
import Topbar from './Topbar';

function AppLayout() {
    const [sidebarAbierto, setSidebarAbierto] = useState(false);

    return (
        <div className="min-h-screen bg-slate-950">
            <Sidebar
                abierto={sidebarAbierto}
                onCerrar={() => setSidebarAbierto(false)}
            />

            <section className="min-h-screen lg:pl-72">
                <Topbar onAbrirSidebar={() => setSidebarAbierto(true)} />

                <main className="p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </section>
        </div>
    );
}

export default AppLayout;