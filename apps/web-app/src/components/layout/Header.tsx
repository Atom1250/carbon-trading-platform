'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserMenu } from './UserMenu';

interface HeaderProps {
  onMenuToggle?: () => void;
  notificationCount?: number;
}

export function Header({ onMenuToggle, notificationCount = 0 }: HeaderProps) {
  return (
    <header className="header" role="banner">
      <div className="header__inner">
        <div className="header__left">
          <button
            className="header__menu-toggle"
            onClick={onMenuToggle}
            aria-label="Toggle navigation menu"
          >
            <span aria-hidden="true">☰</span>
          </button>
          <Link href="/dashboard" className="header__logo" aria-label="Carbon Trading Platform home">
            <span className="header__logo-text">CTP</span>
          </Link>
        </div>

        <div className="header__right">
          <button
            className="header__notifications"
            aria-label={
              notificationCount > 0
                ? `${notificationCount} notifications`
                : 'No notifications'
            }
          >
            <span aria-hidden="true">🔔</span>
            {notificationCount > 0 && (
              <span className="header__notifications-badge" aria-hidden="true">
                {notificationCount}
              </span>
            )}
          </button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
