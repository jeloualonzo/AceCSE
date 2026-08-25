import React from 'react';
import { AdminNav } from './AdminNav';

/** Desktop admin sidebar. The mobile equivalent is a panel under the header. */
export const AdminSidebar: React.FC = () => {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 md:sticky md:top-16 md:flex md:h-[calc(100vh-4rem)] md:flex-col md:self-start md:overflow-y-auto dark:border-slate-800 dark:bg-slate-900">
      <AdminNav />
    </aside>
  );
};
