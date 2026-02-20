import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DocSection {
  title: string;
  items: { title: string; href: string }[];
}

const DOCS_STRUCTURE_PT: DocSection[] = [
  {
    title: 'Primeiros Passos',
    items: [
      { title: 'Introdução', href: '/docs' },
      { title: 'Começando', href: '/docs/getting-started' },
    ],
  },
  {
    title: 'Gatos',
    items: [
      { title: 'Gerenciar Gatos', href: '/docs/cats/managing-cats' },
      { title: 'Perfis dos Gatos', href: '/docs/cats/cat-profiles' },
    ],
  },
  {
    title: 'Alimentações',
    items: [
      { title: 'Registrar Alimentações', href: '/docs/feeding/recording-feedings' },
      { title: 'Histórico', href: '/docs/feeding/feeding-history' },
    ],
  },
  {
    title: 'Residências',
    items: [
      { title: 'Criar Residência', href: '/docs/households/creating-households' },
      { title: 'Gerenciar Membros', href: '/docs/households/managing-members' },
      { title: 'Entrar em Residência', href: '/docs/households/joining-household' },
    ],
  },
  {
    title: 'Agendamentos',
    items: [
      { title: 'Gerenciar Agendamentos', href: '/docs/schedules/managing-schedules' },
    ],
  },
  {
    title: 'Peso',
    items: [
      { title: 'Acompanhamento', href: '/docs/weight/tracking-weight' },
      { title: 'Metas de Peso', href: '/docs/weight/weight-goals' },
    ],
  },
  {
    title: 'Geral',
    items: [
      { title: 'Estatísticas', href: '/docs/statistics' },
      { title: 'Notificações', href: '/docs/notifications' },
      { title: 'Perfil e Configurações', href: '/docs/profile-settings' },
      { title: 'Solução de Problemas', href: '/docs/troubleshooting' },
    ],
  },
];

const DOCS_STRUCTURE_EN: DocSection[] = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Introduction', href: '/docs/en' },
      { title: 'Getting Started', href: '/docs/en/getting-started' },
    ],
  },
  {
    title: 'Cats',
    items: [
      { title: 'Managing Cats', href: '/docs/en/cats/managing-cats' },
      { title: 'Cat Profiles', href: '/docs/en/cats/cat-profiles' },
    ],
  },
  {
    title: 'Feedings',
    items: [
      { title: 'Recording Feedings', href: '/docs/en/feeding/recording-feedings' },
      { title: 'Feeding History', href: '/docs/en/feeding/feeding-history' },
    ],
  },
  {
    title: 'Households',
    items: [
      { title: 'Creating Households', href: '/docs/en/households/creating-households' },
      { title: 'Managing Members', href: '/docs/en/households/managing-members' },
      { title: 'Joining Household', href: '/docs/en/households/joining-household' },
    ],
  },
  {
    title: 'Schedules',
    items: [
      { title: 'Managing Schedules', href: '/docs/en/schedules/managing-schedules' },
    ],
  },
  {
    title: 'Weight',
    items: [
      { title: 'Weight Tracking', href: '/docs/en/weight/tracking-weight' },
      { title: 'Weight Goals', href: '/docs/en/weight/weight-goals' },
    ],
  },
  {
    title: 'General',
    items: [
      { title: 'Statistics', href: '/docs/en/statistics' },
      { title: 'Notifications', href: '/docs/en/notifications' },
      { title: 'Profile & Settings', href: '/docs/en/profile-settings' },
      { title: 'Troubleshooting', href: '/docs/en/troubleshooting' },
    ],
  },
];

const DOCS_DIR = path.join(process.cwd(), 'docs', 'user-guide');

function getDocContent(slug: string, locale: string): { content: string; title: string } | null {
  const baseDir = locale === 'en' ? path.join(DOCS_DIR, 'en') : DOCS_DIR;
  const filePath = slug === '' 
    ? path.join(baseDir, 'README.md')
    : path.join(baseDir, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);
  
  return {
    content,
    title: data.title || (locale === 'en' ? 'Documentation' : 'Documentação'),
  };
}

export function generateStaticParams() {
  const params: { slug: string[] }[] = [];
  
  // Portuguese docs
  params.push({ slug: [] });
  DOCS_STRUCTURE_PT.forEach((section) => {
    section.items.forEach((item) => {
      const slug = item.href.replace('/docs/', '').replace(/^\//, '');
      if (slug) {
        params.push({ slug: slug.split('/') });
      }
    });
  });
  
  // English docs
  params.push({ slug: ['en'] });
  DOCS_STRUCTURE_EN.forEach((section) => {
    section.items.forEach((item) => {
      const slug = item.href.replace('/docs/en/', '').replace(/^\//, '');
      if (slug) {
        params.push({ slug: ['en', ...slug.split('/')] });
      }
    });
  });
  
  return params;
}

export default async function DocsPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const resolvedParams = await params;
  const slugArray = resolvedParams.slug || [];
  
  // Detect locale from first segment
  const isEnglish = slugArray[0] === 'en';
  const locale = isEnglish ? 'en' : 'pt';
  const docSlug = isEnglish ? slugArray.slice(1).join('/') : slugArray.join('/');
  
  const docStructure = locale === 'en' ? DOCS_STRUCTURE_EN : DOCS_STRUCTURE_PT;
  const doc = getDocContent(docSlug, locale);
  
  if (!doc) {
    notFound();
  }

  const currentHref = docSlug === '' ? (locale === 'en' ? '/docs/en' : '/docs') : `/docs/${slugArray.join('/')}`;
  
  const otherLocale = locale === 'en' ? 'pt' : 'en';
  const otherLocaleHref = locale === 'en' 
    ? (docSlug === '' ? '/docs' : `/docs/${docSlug}`)
    : (docSlug === '' ? '/docs/en' : `/docs/en/${docSlug}`);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className="w-64 min-h-screen border-r bg-card p-4 hidden md:block">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {locale === 'en' ? 'Documentation' : 'Documentação'}
            </h2>
            <Link
              href={otherLocaleHref}
              className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80"
            >
              {locale === 'en' ? 'PT' : 'EN'}
            </Link>
          </div>
          <nav className="space-y-4">
            {docStructure.map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`block px-2 py-1 rounded text-sm hover:bg-accent ${
                          currentHref === item.href ? 'bg-accent font-medium' : ''
                        }`}
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>
        
        <main className="flex-1 p-8 max-w-4xl">
          <div className="mb-4 md:hidden flex items-center gap-2">
            <Link
              href={otherLocaleHref}
              className="text-sm px-3 py-1 rounded bg-secondary hover:bg-secondary/80"
            >
              {locale === 'en' ? 'Português' : 'English'}
            </Link>
          </div>
          <article className="prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {doc.content}
            </ReactMarkdown>
          </article>
        </main>
      </div>
    </div>
  );
}
