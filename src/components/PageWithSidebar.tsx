import { Suspense } from 'react';
import { FavoriteContentList } from './FavoriteContentList';

interface Props {
  children: React.ReactNode;
  maxWidth?: '3xl' | '4xl' | '6xl';
  showSidebar?: boolean;
}

export function PageWithSidebar({
  children,
  maxWidth = '3xl',
  showSidebar = true,
}: Props) {
  const maxWidthClass =
    maxWidth === '6xl'
      ? 'max-w-6xl'
      : maxWidth === '4xl'
        ? 'max-w-4xl'
        : 'max-w-3xl';

  if (!showSidebar) {
    return (
      <div className="bg-zinc-50 dark:bg-black">
        <main className={`mx-auto ${maxWidthClass} px-4 py-8 sm:px-6 lg:px-8`}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="bg-zinc-50 dark:bg-black">
      <main className={`mx-auto ${maxWidthClass} px-4 py-8 sm:px-6 lg:px-8`}>
        <div className="lg:flex lg:flex-row-reverse lg:gap-8">
          {/* Right sidebar */}
          <aside className="mb-6 lg:mb-0 lg:w-80 lg:shrink-0">
            <div className="lg:sticky lg:top-8 lg:space-y-4">
              <Suspense fallback={null}>
                <FavoriteContentList maxItems={5} />
              </Suspense>
            </div>
          </aside>

          {/* Main content */}
          <div className="lg:flex-1 lg:min-w-0">{children}</div>
        </div>
      </main>
    </div>
  );
}
