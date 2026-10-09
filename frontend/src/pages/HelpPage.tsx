import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ExternalLink, Mail, Github, BookOpen, Keyboard, Zap, Shield, Heart, MessageSquare, Star, Code, Type, GitBranch, Palette, Settings, HelpCircle, ArrowRight, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { cn } from '../utils';

const helpCategories = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    icon: BookOpen,
    articles: [
      { id: 'quick-start', title: 'Quick Start Guide', content: 'Learn how to create your first note, organize with folders, and use tags.' },
      { id: 'creating-notes', title: 'Creating Notes', content: 'Different note types: Markdown, Flowcharts, Diagrams, Code, and Text.' },
      { id: 'organizing', title: 'Organizing with Folders & Tags', content: 'Create nested folders, color-code tags, and filter your notes.' },
      { id: 'search', title: 'Search & Filters', content: 'Powerful search with filters, saved searches, and keyboard shortcuts.' },
    ],
  },
  {
    id: 'editor',
    label: 'Editor',
    icon: Type,
    articles: [
      { id: 'markdown', title: 'Markdown Syntax', content: 'Complete Markdown reference with examples for headings, lists, tables, code blocks, and more.' },
      { id: 'shortcuts', title: 'Keyboard Shortcuts', content: 'Boost productivity with keyboard shortcuts for formatting, navigation, and actions.' },
      { id: 'auto-save', title: 'Auto-save & Versions', content: 'How auto-save works, version history, and restoring previous versions.' },
      { id: 'preview', title: 'Live Preview', content: 'Split view, preview mode, and table of contents navigation.' },
    ],
  },
  {
    id: 'flowcharts',
    label: 'Flowcharts & Diagrams',
    icon: GitBranch,
    articles: [
      { id: 'mermaid-basics', title: 'Mermaid Basics', content: 'Introduction to Mermaid syntax for flowcharts, sequences, and diagrams.' },
      { id: 'flowchart-types', title: 'Flowchart Types', content: 'Flowcharts, sequence diagrams, class diagrams, mindmaps, and more.' },
      { id: 'templates', title: 'Using Templates', content: 'Pre-built templates for common diagram types.' },
      { id: 'exporting', title: 'Exporting Diagrams', content: 'Export as SVG, PNG, or PDF for presentations and documents.' },
    ],
  },
  {
    id: 'customization',
    label: 'Customization',
    icon: Palette,
    articles: [
      { id: 'themes', title: 'Themes & Appearance', content: 'Light, dark, and system themes. Custom colors and fonts.' },
      { id: 'editor-settings', title: 'Editor Settings', content: 'Vim mode, line numbers, word wrap, toolbar, and status bar.' },
      { id: 'layout', title: 'Layout Options', content: 'Sidebar width, editor modes, and panel arrangements.' },
    ],
  },
  {
    id: 'account',
    label: 'Account & Security',
    icon: Shield,
    articles: [
      { id: 'oauth', title: 'OAuth Login', content: 'Sign in with Google, GitHub, or Microsoft.' },
      { id: 'password', title: 'Password Management', content: 'Change password, reset, and security best practices.' },
      { id: 'data-export', title: 'Data Export & Import', content: 'Backup your data and restore from exports.' },
      { id: 'deletion', title: 'Account Deletion', content: 'How to delete your account and what happens to your data.' },
    ],
  },
  {
    id: 'troubleshooting',
    label: 'Troubleshooting',
    icon: AlertCircle,
    articles: [
      { id: 'sync-issues', title: 'Sync Issues', content: 'Notes not syncing? Check connection and try manual sync.' },
      { id: 'performance', title: 'Performance Tips', content: 'Large workspaces, slow rendering, and optimization.' },
      { id: 'browser-support', title: 'Browser Support', content: 'Supported browsers and known limitations.' },
    ],
  },
];

const keyboardShortcuts = [
  { keys: ['⌘', 'K'], description: 'Open search' },
  { keys: ['⌘', 'N'], description: 'New note' },
  { keys: ['⌘', 'S'], description: 'Save note' },
  { keys: ['⌘', 'B'], description: 'Bold' },
  { keys: ['⌘', 'I'], description: 'Italic' },
  { keys: ['⌘', 'E'], description: 'Inline code' },
  { keys: ['⌘', '1'], description: 'Heading 1' },
  { keys: ['⌘', '2'], description: 'Heading 2' },
  { keys: ['⌘', '3'], description: 'Heading 3' },
  { keys: ['⌘', 'Shift', '8'], description: 'Bullet list' },
  { keys: ['⌘', 'Shift', '7'], description: 'Numbered list' },
  { keys: ['⌘', 'Shift', 'Q'], description: 'Quote block' },
  { keys: ['⌘', 'Shift', 'X'], description: 'Strikethrough' },
  { keys: ['⌘', 'Enter'], description: 'Save note' },
  { keys: ['Esc'], description: 'Close modals/menus' },
  { keys: ['⌘', '/'], description: 'Toggle preview' },
  { keys: ['⌘', 'Shift', 'F'], description: 'Fullscreen editor' },
];

export function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('getting-started');
  const [activeArticle, setActiveArticle] = useState<string | null>(null);

  const filteredCategories = helpCategories.map(cat => ({
    ...cat,
    articles: cat.articles.filter(a =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(cat => cat.articles.length > 0);

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <HelpCircle className="w-7 h-7 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Help Center</h1>
          <p className="text-secondary-500 dark:text-secondary-400">Find answers, learn features, and get the most out of Notes</p>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search help articles..."
              className="input pl-10 w-full"
            />
          </div>
        </div>

        <div className="flex">
          <aside className="w-64 border-r border-secondary-200 dark:border-secondary-700 overflow-y-auto">
            <nav className="p-4 space-y-2" aria-label="Help categories">
              {filteredCategories.map(category => {
                const Icon = category.icon;
                const isExpanded = expandedCategory === category.id;
                return (
                  <div key={category.id} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors',
                        isExpanded
                          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                          : 'text-secondary-700 hover:bg-secondary-100 dark:text-secondary-300 dark:hover:bg-secondary-800'
                      )}
                      aria-expanded={isExpanded}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium truncate">{category.label}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                    </button>
                    {isExpanded && (
                      <div className="bg-secondary-50 dark:bg-secondary-800/50 divide-y divide-secondary-200 dark:divide-secondary-700">
                        {category.articles.map(article => (
                          <button
                            key={article.id}
                            onClick={() => setActiveArticle(article.id)}
                            className={cn(
                              'w-full px-3 py-2 text-left text-sm transition-colors',
                              activeArticle === article.id
                                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                                : 'text-secondary-600 hover:bg-secondary-200 dark:text-secondary-400 dark:hover:bg-secondary-700'
                            )}
                          >
                            {article.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>

          <div className="flex-1 overflow-y-auto p-6">
            {activeArticle ? (
              <ArticleView article={helpCategories.flatMap(c => c.articles).find(a => a.id === activeArticle)!} onBack={() => setActiveArticle(null)} />
            ) : (
              <WelcomeView />
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SupportCard icon={MessageSquare} title="Contact Support" description="Can't find what you're looking for? Our team is here to help." action="Email Us" iconRight={ArrowRight} />
        <SupportCard icon={Github} title="Report a Bug" description="Found an issue? Report it on our GitHub repository." action="View Issues" iconRight={ExternalLink} />
        <SupportCard icon={Star} title="Feature Requests" description="Have an idea? Submit a feature request and vote on others." action="Submit Idea" iconRight={ArrowRight} />
      </div>
    </div>
  );
}

function WelcomeView() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-3">Welcome to Notes Help</h2>
        <p className="text-secondary-600 dark:text-secondary-400 max-w-xl mx-auto">
          Select a category from the sidebar or search for a topic to get started.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <QuickStartCard icon={Zap} title="Quick Start" description="Create your first note in 30 seconds" steps={['Click "New Note"', 'Start typing in Markdown', 'Auto-saves instantly']} />
        <QuickStartCard icon={Keyboard} title="Keyboard Shortcuts" description="Master the editor with 20+ shortcuts" steps={['⌘K - Search', '⌘N - New note', '⌘S - Save', '⌘B/I/E - Format']} />
        <QuickStartCard icon={GitBranch} title="Flowcharts" description="Create diagrams with Mermaid syntax" steps={['Select Flowchart type', 'Write Mermaid code', 'Click Render', 'Export as SVG/PNG']} />
        <QuickStartCard icon={Palette} title="Customize" description="Make Notes yours" steps={['Light/Dark/System theme', 'Font family & size', 'Editor layout', 'Vim mode']} />
      </div>

      <div className="border-t border-secondary-200 dark:border-secondary-700 pt-8">
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Popular Articles</h3>
        <div className="space-y-2">
          {[
            { title: 'Markdown Syntax Reference', category: 'Editor', icon: Code },
            { title: 'Organizing with Folders & Tags', category: 'Getting Started', icon: GitBranch },
            { title: 'Keyboard Shortcuts Cheatsheet', category: 'Editor', icon: Keyboard },
            { title: 'Creating Flowcharts with Mermaid', category: 'Flowcharts', icon: GitBranch },
            { title: 'Exporting & Backing Up Data', category: 'Account', icon: Shield },
          ].map(item => (
            <button key={item.title} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors text-left">
              <item.icon className="w-5 h-5 text-primary-600" />
              <div className="flex-1 text-left">
                <p className="font-medium text-secondary-900 dark:text-white">{item.title}</p>
                <p className="text-xs text-secondary-500">{item.category}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-secondary-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArticleView({ article, onBack }: { article: any; onBack: () => void }) {
  return (
    <div className="max-w-3xl space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-secondary-500 hover:text-secondary-700">
        <ChevronLeft className="w-4 h-4" />
        Back to categories
      </button>
      <article className="prose prose-secondary dark:prose-invert max-w-none">
        <h1>{article.title}</h1>
        <div className="prose-content">
          <p>{article.content}</p>
          <h2>Detailed Guide</h2>
          <p>This is a placeholder for the full article content. In a production app, this would be loaded from a CMS or markdown files.</p>
          <h3>Key Points</h3>
          <ul>
            <li>Point 1: Detailed explanation</li>
            <li>Point 2: Another important detail</li>
            <li>Point 3: Additional information</li>
          </ul>
          <h3>Examples</h3>
          <pre><code>{`// Example code block
function hello() {
  console.log("Hello, World!");
}`}</code></pre>
        </div>
      </article>
    </div>
  );
}

function QuickStartCard({ icon: Icon, title, description, steps }: any) {
  return (
    <div className="card p-5 hover:shadow-md transition-shadow h-full">
      <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-primary-600" />
      </div>
      <h3 className="font-semibold text-secondary-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-secondary-500 mb-4">{description}</p>
      <ol className="space-y-2 text-sm">
        {steps.map((step: string, i: number) => (
          <li key={i} className="flex items-center gap-2 text-secondary-600 dark:text-secondary-400">
            <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center text-xs font-medium">{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

function SupportCard({ icon: Icon, title, description, action, iconRight: IconRight }: any) {
  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-primary-600" />
      </div>
      <h3 className="font-semibold text-secondary-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-secondary-500 mb-4">{description}</p>
      <button className="btn-secondary text-sm flex items-center gap-1">
        {action}
        <IconRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}