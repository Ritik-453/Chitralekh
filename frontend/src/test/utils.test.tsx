import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { PreferencesProvider } from '../context/PreferencesContext';
import { Toaster } from 'react-hot-toast';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import { cn, formatDate, formatRelativeTime, truncate, slugify, countWords, estimateReadingTime } from '../utils';

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <PreferencesProvider>
            {component}
            <Toaster />
          </PreferencesProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('LoginPage', () => {
  it('renders login form', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Sign in$/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    renderWithProviders(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /^Sign in$/i }));
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('validates email regex correctly', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test('invalid-email')).toBe(false);
    expect(emailRegex.test('you@example.com')).toBe(true);
  });
});

describe('RegisterPage', () => {
  it('renders register form', () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows validation errors', async () => {
    renderWithProviders(<RegisterPage />);
    // accept terms before submitting to allow form submission
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('shows password strength indicator', () => {
    renderWithProviders(<RegisterPage />);
    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'weak' } });
    expect(screen.getByText('Very weak')).toBeInTheDocument();

    fireEvent.change(passwordInput, { target: { value: 'StrongPass123' } });
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });
});

describe('cn utility', () => {
  it('joins class names', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('handles conditional classes', () => {
    expect(cn('a', true && 'b', false && 'c')).toBe('a b');
  });

  it('handles undefined and null', () => {
    expect(cn('a', undefined, null, 'b')).toBe('a b');
  });
});

describe('formatDate utility', () => {
  it('formats date correctly', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    expect(formatDate(date)).toBe('Jan 15, 2024');
  });

  it('handles string dates', () => {
    expect(formatDate('2024-01-15T10:30:00Z')).toBe('Jan 15, 2024');
  });
});

describe('formatRelativeTime utility', () => {
  it('formats recent time', () => {
    const now = new Date();
    const result = formatRelativeTime(now);
    expect(result).toContain('seconds ago');
  });
});

describe('truncate utility', () => {
  it('truncates long strings', () => {
    expect(truncate('Hello world this is a long string', 10)).toBe('Hello worl...');
  });

  it('returns original for short strings', () => {
    expect(truncate('Hi', 10)).toBe('Hi');
  });
});

describe('slugify utility', () => {
  it('creates slug from string', () => {
    expect(slugify('Hello World!')).toBe('hello-world');
    expect(slugify('Test 123')).toBe('test-123');
    expect(slugify('Special @#$% Characters')).toBe('special-characters');
  });
});

describe('countWords utility', () => {
  it('counts words correctly', () => {
    expect(countWords('Hello world')).toBe(2);
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
    expect(countWords('One')).toBe(1);
  });
});

describe('estimateReadingTime utility', () => {
  it('estimates reading time', () => {
    expect(estimateReadingTime(200)).toBe(1);
    expect(estimateReadingTime(400)).toBe(2);
    expect(estimateReadingTime(0)).toBe(1);
  });
});
