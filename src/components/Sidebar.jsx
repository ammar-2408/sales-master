import React, { useState, useEffect } from 'react';
import { Shirt, LogOut, X, Download } from 'lucide-react';
import { menuItems } from '../config/navigation';

export default function Sidebar({ activeTab, setActiveTab, userProfileName, mobileMenuOpen, setMobileMenuOpen, onLogout, setViewingCustomer }) {

  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const handleNav = (id) => {
    setActiveTab(id);
    setViewingCustomer(null);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden bg-black/60 backdrop-blur-sm"
          style={{ touchAction: 'none' }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 w-64 md:w-60 flex flex-col z-40 bg-sidebar border-r border-line transition-transform duration-300 md:relative md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)', paddingLeft: 'var(--safe-left)' }}
      >
        {/* Brand */}
        <div
          className="flex items-center gap-3 px-4 py-4 cursor-pointer shrink-0 border-b border-line"
          onClick={() => handleNav('dashboard')}
        >
          <div className="p-2 rounded-lg bg-accent/15 text-accent shrink-0">
            <Shirt size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-base leading-tight text-fg">Sales Master</h1>
            <p className="text-xs truncate text-fg-subtle">{userProfileName || 'User'}</p>
          </div>
          <button
            aria-label="Close menu"
            className="ui-icon-btn md:hidden -mr-1.5"
            onClick={(e) => { e.stopPropagation(); setMobileMenuOpen(false); }}
          >
            <X size={18}/>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overscroll-contain">
          {menuItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 min-h-[2.5rem] rounded-lg text-sm font-medium text-left border-l-[3px] transition-colors duration-150 ${isActive ? 'text-accent bg-accent/10 border-accent' : 'text-fg-muted border-transparent hover:bg-white/5 hover:text-fg'}`}
              >
                <item.icon size={17} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-3 space-y-2 shrink-0 border-t border-line">
          {deferredPrompt && (
            <button onClick={handleInstallClick} className="ui-btn-primary w-full">
              <Download size={16}/> Install App
            </button>
          )}

          <button
            onClick={onLogout}
            className="ui-btn w-full text-danger border border-transparent hover:bg-danger/10 hover:border-danger/30"
          >
            <LogOut size={16}/> Logout
          </button>
        </div>
      </div>
    </>
  );
}